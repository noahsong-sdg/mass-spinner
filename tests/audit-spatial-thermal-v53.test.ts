import test from 'node:test';
import assert from 'node:assert/strict';
import {createFuelLiner,tungstenThermalProperties,invertTungstenEnthalpy,initialFuelLinerEnergy,fuelLinerState,advanceFuelLiner,advanceFuelThermal} from '../src/fuel-thermal.js';

// Independent published constitutive oracles, deliberately not differentiated
// or integrated from production enthalpy/conductivity implementations.
const cp=(T:number)=>{const t=T/1000;return (23.95930+2.639680*t+1.257750*t*t-.254642*t*t*t-.048407/(t*t))/.18384;};
function integrate(f:(T:number)=>number,a:number,b:number){
 const n=1024,h=(b-a)/n;let value=f(a)+f(b);
 for(let i=1;i<n;i++)value+=(i%2?4:2)*f(a+i*h);
 return h*value/3;
}
const enthalpy=(T:number)=>integrate(cp,300,T);
const entropy=(T:number)=>integrate(t=>cp(t)/t,300,T);
const psi=(T:number)=>149.441*T-.045466*T*T/2+13.193e-6*T**3/3-1.484e-9*T**4/4-3.866e6/T;
const sum=(values:readonly number[])=>values.reduce((a,b)=>a+b,0);
function root(f:(T:number)=>number,lo:number,hi:number){
 for(let j=0;j<90;j++){const mid=(lo+hi)/2;if(f(mid)>0)hi=mid;else lo=mid;}
 return (lo+hi)/2;
}
function close(actual:number,expected:number,absolute:number,message:string){
 assert.ok(Math.abs(actual-expected)<=absolute,`${message}: ${actual} versus ${expected}; tolerance ${absolute}`);
}
const isolated={gasWallWK:0,coolingWK:0,coolantK:500};

test('solid material energy integrates NIST cp, preserves units and rejects extrapolation',()=>{
 for(const T of [300,400,800,1200,1800,1900]){
  const p=tungstenThermalProperties(T);
  close(p.heatCapacityJKgK,cp(T),1e-9,'Molar-to-mass heat capacity');
  close(p.specificEnthalpyJKg,enthalpy(T),2e-6,'Stored energy is integral of published heat capacity');
  close(invertTungstenEnthalpy(p.specificEnthalpyJKg),T,2e-8,'Enthalpy inverse');
  assert.ok(p.conductivityWMK>0&&p.heatCapacityJKgK>0);
 }
 const a=tungstenThermalProperties(500),b=tungstenThermalProperties(1500);
 assert.ok(Math.abs((b.specificEnthalpyJKg-a.specificEnthalpyJKg)-b.heatCapacityJKgK*1000)>1000,
  'The case must distinguish integrated cp from endpoint cp times temperature change.');
 for(const T of [299.99,1900.01,NaN,Infinity])assert.throws(()=>tungstenThermalProperties(T),RangeError);
 assert.throws(()=>invertTungstenEnthalpy(-1),RangeError,'Negative enthalpy would extrapolate below 300 K.');
});

test('cylindrical shell geometry has the correct physical mass and constant temperatures are stationary',()=>{
 const radiusM=.11,lengthM=.37,thicknessM=.024;
 const grid=createFuelLiner({radiusM,lengthM,thicknessM,cells:7});
 const volume=Math.PI*lengthM*((radiusM+thicknessM)**2-radiusM**2);
 close(sum(grid.volumesM3),volume,1e-15,'Annular volume, including pi and full length');
 close(sum(grid.massesKg),19250*volume,1e-10,'Fixed reference mass (Tolias 19.25 g/cm³ at room temperature)');
 const old=initialFuelLinerEnergy(grid,650),state=advanceFuelLiner(grid,old,650,0,5,{gasWallWK:700,coolingWK:300,coolantK:650});
 for(const T of state.temperatureK)close(T,650,1e-7,'Uniform equilibrium must remain stationary');
 close(state.gasExchangeJ,0,1e-6,'No gas heat exchange at equilibrium');
 close(state.coolingEnergyJ,0,1e-6,'No coolant heat exchange at equilibrium');
});

test('stationary material-domain endpoints are accepted without clipping or a false domain exit',()=>{
 const grid=createFuelLiner({radiusM:.11,lengthM:.37,thicknessM:.024,cells:7});
 for(const T of [300,1900]){
  const old=initialFuelLinerEnergy(grid,T);
  const state=advanceFuelLiner(grid,old,T,0,1,{gasWallWK:500,coolingWK:500,coolantK:T});
  for(const actual of state.temperatureK)close(actual,T,1e-7,'Constant endpoint equilibrium');
  close(sum(state.cellEnergyJ),sum(old),1e-5,'Stationary endpoint energy');
 }
});

test('material domain applies to the solid state, and actual domain exits reject without changing old state',()=>{
 const grid=createFuelLiner({radiusM:.1,lengthM:.3,thicknessM:.002,cells:4}),old=initialFuelLinerEnergy(grid,500),saved=[...old];
 const valid=advanceFuelLiner(grid,old,2500,0,.01,{gasWallWK:.01,coolingWK:0,coolantK:100});
 assert.ok(valid.temperatureK.every(T=>T>=500&&T<501),'A hotter gas can transfer a small amount of heat while the solid remains in range.');
 assert.throws(()=>advanceFuelLiner(grid,old,2500,0,1e5,{gasWallWK:1e4,coolingWK:0,coolantK:500}),RangeError,
  'A forced solid state above 1900 K must not be clipped to the property boundary.');
 assert.throws(()=>advanceFuelLiner(grid,old,500,0,1e5,{gasWallWK:0,coolingWK:1e4,coolantK:100}),RangeError,
  'A forced solid state below 300 K must not be clipped to the property boundary.');
 assert.deepEqual(old,saved,'Rejected proposals must leave the accepted state immutable.');
});

test('nonuniform insulated liner conserves enthalpy, produces entropy and reaches the enthalpy equilibrium',()=>{
 const grid=createFuelLiner({radiusM:.1,lengthM:.3,thicknessM:.04,cells:6});
 const initialT=[350,500,650,1000,1300,1600];
 let energy=initialT.map((T,i)=>grid.massesKg[i]*enthalpy(T));
 const initialEnergy=sum(energy),totalMass=sum(grid.massesKg);
 const target=root(T=>totalMass*enthalpy(T)-initialEnergy,300,1900);
 let oldEntropy=sum(initialT.map((T,i)=>grid.massesKg[i]*entropy(T)));
 for(let step=0;step<40;step++){
  const next=advanceFuelLiner(grid,energy,500,0,25,isolated);
  const newEntropy=sum(next.temperatureK.map((T,i)=>grid.massesKg[i]*entropy(T)));
  close(sum(next.cellEnergyJ),initialEnergy,2e-7*initialEnergy,'Insulated total cell enthalpy');
  assert.ok(newEntropy>=oldEntropy-1e-7,'Internal heat conduction must not decrease entropy.');
  assert.ok(Math.min(...next.temperatureK)>=350-1e-6&&Math.max(...next.temperatureK)<=1600+1e-6,
   'No-source conduction must respect the initial temperature hull.');
  oldEntropy=newEntropy;energy=next.cellEnergyJ;
 }
 const final=fuelLinerState(grid,energy);
 for(const T of final.temperatureK)close(T,target,2e-3,'Nonlinear enthalpy equilibrium');
 const arithmetic=sum(initialT.map((T,i)=>grid.massesKg[i]*T))/totalMass;
 assert.ok(Math.abs(target-arithmetic)>10,'The oracle must distinguish nonlinear from constant heat capacity.');
});

for(const coolantK of [350,1700])test(`finite-step solid plus prescribed reservoirs obeys the second law (${coolantK} K coolant)`,()=>{
 const grid=createFuelLiner({radiusM:.1,lengthM:.3,thicknessM:.02,cells:8}),gasK=900;
 const initialT=Array.from({length:8},(_,i)=>450+100*i);
 let energy=initialT.map((T,i)=>grid.massesKg[i]*enthalpy(T));
 let previous=sum(initialT.map((T,i)=>grid.massesKg[i]*entropy(T))),external=0;
 const initialEnergy=sum(energy);let qGas=0,qCool=0;
 for(let step=0;step<24;step++){
  const next=advanceFuelLiner(grid,energy,gasK,0,.4,{gasWallWK:600,coolingWK:300,coolantK});
  qGas+=next.gasExchangeJ;qCool+=next.coolingEnergyJ;
  external+=-next.gasExchangeJ/gasK+next.coolingEnergyJ/coolantK;
  const total=sum(next.temperatureK.map((T,i)=>grid.massesKg[i]*entropy(T)))+external;
  assert.ok(total>=previous-1e-7,'Shell and external thermal reservoirs must produce nonnegative total entropy.');
  close(sum(next.cellEnergyJ)-initialEnergy,qGas-qCool,2e-7*initialEnergy,'Signed external heat closes solid energy');
  assert.ok(next.temperatureK.every(T=>T>=350-1e-6&&T<=1700+1e-6));
  previous=total;energy=next.cellEnergyJ;
 }
 assert.ok(qCool*(coolantK<450?1:-1)>0,'Exercise both directions of coolant heat transfer.');
});

test('radial variable-conductivity Robin solution converges to the continuous Kirchhoff/log-radius oracle',()=>{
 const radiusM=.1,lengthM=.3,thicknessM=.02,gasK=1100,coolantK=500,gasWallWK=500,coolingWK=350;
 const radiusOuter=radiusM+thicknessM,logResistance=Math.log(radiusOuter/radiusM)/(2*Math.PI*lengthM);
 // Q>0 passes from gas to liner to coolant. Surface temperatures are set by
 // independent films; the solid Kirchhoff transform supplies the spatial law.
 const upper=(gasK-coolantK)/(1/gasWallWK+1/coolingWK);
 const Q=root(q=>q*logResistance-psi(gasK-q/gasWallWK)+psi(coolantK+q/coolingWK),0,upper);
 const inner=gasK-Q/gasWallWK;
 const errors:number[]=[];
 for(const cells of [4,8,16]){
  const grid=createFuelLiner({radiusM,lengthM,thicknessM,cells});
  let energy=initialFuelLinerEnergy(grid,750),state=fuelLinerState(grid,energy),lastGas=0,lastCool=0;
  for(let step=0;step<128;step++){
   const next=advanceFuelLiner(grid,energy,gasK,0,5,{gasWallWK,coolingWK,coolantK});
   state=next;energy=next.cellEnergyJ;lastGas=next.gasExchangeJ/5;lastCool=next.coolingEnergyJ/5;
  }
  const error=Math.max(...grid.radiusCentersM.map((r,i)=>{
   const targetPsi=psi(inner)-Q*Math.log(r/radiusM)/(2*Math.PI*lengthM);
   return Math.abs(state.temperatureK[i]-root(T=>psi(T)-targetPsi,300,1900));
  }));
  errors.push(error);
  close(lastGas,lastCool,.001,'Steady heat current is equal at both surfaces');
  close(lastGas,Q,Math.max(1e-4,.001*Q),'Continuous nonlinear cylindrical heat current');
 }
 assert.ok(errors[1]<.8*errors[0]&&errors[2]<.8*errors[1],`Spatial error must decrease on each refinement: ${errors}`);
 assert.ok(errors[2]<.05,`Refined profile should be within .05 K of the continuous oracle: ${errors}`);
});

for(const powerW of [0,1000])test(`coupled source is evaluated at the accepted implicit gas temperature (${powerW} W offset)`,()=>{
 const grid=createFuelLiner({radiusM:.1,lengthM:.3,thicknessM:.02,cells:4});
 const old=initialFuelLinerEnergy(grid,650),oldGasK=800,gasCapacityJK=2,dtS=.3,lossWK=.5;
 const state=advanceFuelThermal(grid,old,oldGasK,gasCapacityJK,dtS,isolated,
  gasK=>({gasEnergyJ:dtS*(powerW-lossWK*gasK),dragEnergyJ:0,payload:{evaluatedK:gasK}}));
 const expected=(gasCapacityJK*oldGasK+dtS*powerW)/(gasCapacityJK+dtS*lossWK);
 close(state.gasK,expected,2e-7,'Independent implicit source solution');
 close(state.payload.evaluatedK,state.gasK,2e-7,'Returned mechanics/source payload belongs to the accepted endpoint');
 close(gasCapacityJK*(state.gasK-oldGasK),dtS*(powerW-lossWK*state.gasK),1e-6,'Gas source first law, including a signed cooling source');
 close(sum(state.cellEnergyJ),sum(old),1e-6,'Disconnected liner is unchanged');
});

test('stiff negative thermal feedback remains a solvable implicit gas equation',()=>{
 const grid=createFuelLiner({radiusM:.1,lengthM:.3,thicknessM:.02,cells:4});
 const old=initialFuelLinerEnergy(grid,650),oldGasK=800,gasCapacityJK=2,dtS=10,lossWK=.5;
 const state=advanceFuelThermal(grid,old,oldGasK,gasCapacityJK,dtS,isolated,
  gasK=>({gasEnergyJ:-dtS*lossWK*gasK,dragEnergyJ:0,payload:gasK}));
 const expected=gasCapacityJK*oldGasK/(gasCapacityJK+dtS*lossWK);
 close(state.gasK,expected,2e-7,'Unique positive backward-Euler solution exists even when a Picard iteration is not contractive');
});

test('joint gas and insulated nonlinear liner conserve energy and increase total entropy',()=>{
 const grid=createFuelLiner({radiusM:.1,lengthM:.3,thicknessM:.04,cells:6});
 const initialT=[350,500,650,1000,1300,1600],initialGasK=1000,gasCapacityJK=80;
 let energy=initialT.map((T,i)=>grid.massesKg[i]*enthalpy(T)),gasK=initialGasK;
 const initialEnergy=sum(energy)+gasCapacityJK*gasK,totalMass=sum(grid.massesKg);
 const target=root(T=>totalMass*enthalpy(T)+gasCapacityJK*T-initialEnergy,300,1900);
 let previousEntropy=sum(initialT.map((T,i)=>grid.massesKg[i]*entropy(T)))+gasCapacityJK*Math.log(gasK);
 for(let step=0;step<80;step++){
  const oldGasK=gasK;
  const state=advanceFuelThermal(grid,energy,gasK,gasCapacityJK,3,
   {gasWallWK:1000,coolingWK:0,coolantK:500},()=>({gasEnergyJ:0,dragEnergyJ:0,payload:null}));
  close(gasCapacityJK*(state.gasK-oldGasK),-state.gasExchangeJ,2e-6,'Joint interface energy is equal and opposite');
  close(sum(state.cellEnergyJ)+gasCapacityJK*state.gasK,initialEnergy,2e-7*initialEnergy,'Closed gas plus solid total energy');
  const totalEntropy=sum(state.temperatureK.map((T,i)=>grid.massesKg[i]*entropy(T)))+gasCapacityJK*Math.log(state.gasK);
  assert.ok(totalEntropy>=previousEntropy-2e-7,'Joint implicit thermal exchange must produce nonnegative total entropy.');
  previousEntropy=totalEntropy;gasK=state.gasK;energy=state.cellEnergyJ;
 }
 close(gasK,target,.003,'Gas converges to shared nonlinear enthalpy equilibrium');
 for(const T of fuelLinerState(grid,energy).temperatureK)close(T,target,.003,'Every solid cell converges to the same equilibrium');
});
