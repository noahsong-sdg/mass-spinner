import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation,type FuelOperation} from '../src/fuel-operation.js';

// Independent monatomic entropy, integrated tungsten Cp/T and face laws.
// No production gas, property, conductance, entropy or stepping helper.
const k=1.380649e-23,u=1.66053906892e-27,molarMass=.18384,density=19250;
const aCp=23.95930,bCp=.002639680,cCp=.000001257750,dCp=-.000000000254642,eCp=-48407;
const sum=(values:readonly number[])=>values.reduce((a,b)=>a+b,0);
function wallEntropy(a:number,b:number){
 const delta=b-a;
 return (aCp*Math.log1p(delta/a)+bCp*delta+cCp*delta*(a+b)/2+
  dCp*delta*(a*a+a*b+b*b)/3+eCp*delta*(a+b)/(2*a*a*b*b))/molarMass;
}
function wallEnergy(a:number,b:number){
 return (b-a)*(aCp+bCp*(a+b)/2+cCp*(a*a+a*b+b*b)/3+
  dCp*(a**3+a*a*b+a*b*b+b**3)/4+eCp/(a*b))/molarMass;
}
const conductivity=(t:number)=>149.441-.045466*t+.000013193*t*t-.000000001484*t**3+3866000/(t*t);

for(const switched of [false,true])test(`adaptive accepted half-step entropy and independent first law (${switched?'current switches':'startup'})`,()=>{
 const config={...DEFAULT_FUEL_CENTRIFUGE,currentA:switched?0:.03,durationS:.1},n=16,nw=4,thickness=.001;
 const thermal={...DEFAULT_FUEL_THERMAL,enabled:true,spatial:{material:'tungsten' as const,thicknessM:thickness,cells:nw},
  gas:{conductivityWMK:.1,accuracy:{relativeTolerance:.001,temperatureToleranceK:.0001}}};
 const events:FuelOperation['events']=switched?[{timeS:.0650137,currentA:.03},{timeS:.0750137,currentA:0},{timeS:.0850137,currentA:.03}]:[];
 const model=simulateFuelOperation(simulateFuelCentrifuge(config),{schemaVersion:1,events,thermal},{cells:n,steps:16});
 const rows=model.checkpoints!,volume=Math.PI*config.radiusM**2*config.lengthM,number=config.pressurePa*volume/(k*config.gasK);
 assert.equal(rows.length,2*model.timeControl!.acceptedPairs+1,'Audit every accepted half-step, excluding rejected trials.');
 assert.ok(model.timeControl!.maxErrorRatio<=1&&model.timeControl!.rejectedSteps>0);
 const fractions=[config.lightFraction,1-config.lightFraction],masses=[6.0151228874*u,7.0160034366*u];
 const edges=Array.from({length:nw+1},(_,i)=>config.radiusM+thickness*i/nw);
 const centers=Array.from({length:nw},(_,i)=>Math.sqrt(edges[i]*edges[i+1]));
 const wallMass=centers.map((_,i)=>density*Math.PI*config.lengthM*(edges[i+1]-edges[i])*(edges[i+1]+edges[i]));
 const ionInertia=.5*number*sum(masses.map((mass,s)=>mass*fractions[s]))*config.radiusM**2*config.ionFraction/(1-config.ionFraction);
 const gasEntropy=(state:typeof rows[number])=>k*number*sum([state.lightMass,state.heavyMass].flatMap((p,s)=>p.map((v,i)=>
  fractions[s]*v*(1.5*Math.log(state.thermal!.gas!.temperatureK[i]/config.gasK)-Math.log(v*n)))));
 const inertia=(state:typeof rows[number])=>number*config.radiusM**2*sum([state.lightMass,state.heavyMass].flatMap((p,s)=>
  p.map((v,i)=>fractions[s]*masses[s]*v*(i+.5)/n)));
 const kinetic=(state:typeof rows[number])=>.5*(state.ionAngularMomentumKgM2S**2/ionInertia+state.neutralAngularMomentumKgM2S**2/inertia(state));
 let entropyChange=0,minimumStep=Infinity,minimumMargin=Infinity,maximumFirstLaw=0;
 for(let j=1;j<rows.length;j++){
  const a=rows[j-1],b=rows[j],dt=b.timeS-a.timeS,gasA=a.thermal!.gas!,gasB=b.thermal!.gas!;
  const ta=a.thermal!.spatial!.temperatureK,tb=b.thermal!.spatial!.temperatureK;
  assert.ok(dt>0&&[...gasB.temperatureK,...tb].every(t=>Number.isFinite(t)&&t>0));
  for(const p of [b.lightMass,b.heavyMass])assert.ok(p.every(v=>v>0)&&Math.abs(sum(p)-1)<2e-10);
  let gasEnergy=0;
  for(let i=0;i<n;i++){
   const particles=number*(fractions[0]*b.lightMass[i]+fractions[1]*b.heavyMass[i]);
   const expected=1.5*k*particles*gasB.temperatureK[i];gasEnergy+=expected;
   assert.ok(Math.abs(gasB.cellEnergyJ[i]-expected)<2e-12*expected);
   assert.ok(Math.abs(gasB.pressurePa[i]-k*particles*gasB.temperatureK[i]/(volume/n))<2e-12*gasB.pressurePa[i]);
  }
  const cooling=b.thermal!.coolingEnergyJ-a.thermal!.coolingEnergyJ;
  const dEntropy=gasEntropy(b)-gasEntropy(a)+sum(tb.map((t,i)=>wallMass[i]*wallEntropy(ta[i],t)))+cooling/thermal.coolantK;
  const scale=k*number+sum(a.thermal!.spatial!.cellEnergyJ.map((h,i)=>Math.abs(h)/Math.min(ta[i],tb[i])));
  const roundoff=128*Number.EPSILON*scale;
  let production=0;
  for(let species=0;species<2;species++){
   const pa=species?a.heavyMass:a.lightMass,pb=species?b.heavyMass:b.lightMass;
   let transfer=0;
   for(let i=0;i<n-1;i++){
    transfer+=pa[i]-pb[i];
    const force=masses[species]*b.neutralRadS**2*config.radiusM**2/(2*k*n)*(.5/gasB.temperatureK[i]+.5/gasB.temperatureK[i+1]);
    production+=k*number*fractions[species]*transfer*(Math.log(pb[i]*gasB.temperatureK[i]/(pb[i+1]*gasB.temperatureK[i+1]))+force);
   }
  }
  for(let i=0;i<n-1;i++)production+=dt*4*Math.PI*config.lengthM*thermal.gas.conductivityWMK*(i+1)*
   (gasB.temperatureK[i]-gasB.temperatureK[i+1])**2/(gasB.temperatureK[i]*gasB.temperatureK[i+1]);
  const inner=1/(1/thermal.gasWallWK+Math.log(centers[0]/config.radiusM)/(2*Math.PI*config.lengthM*conductivity(tb[0]))+
   1/(8*Math.PI*config.lengthM*thermal.gas.conductivityWMK*n));
  production+=dt*inner*(gasB.temperatureK[n-1]-tb[0])**2/(gasB.temperatureK[n-1]*tb[0]);
  for(let i=0;i<nw-1;i++){
   const conductance=2*Math.PI*config.lengthM/(Math.log(edges[i+1]/centers[i])/conductivity(tb[i])+
    Math.log(centers[i+1]/edges[i+1])/conductivity(tb[i+1]));
   production+=dt*conductance*(tb[i]-tb[i+1])**2/(tb[i]*tb[i+1]);
  }
  production+=cooling*(1/thermal.coolantK-1/tb[nw-1]);
  const slip=b.energy.slipDissipationJ-a.energy.slipDissipationJ;
  const ohmic=dt*(a.currentA!)**2*Math.log(1/config.driveInnerFraction)/(2*Math.PI*config.lengthM*config.conductivitySm);
  production+=(slip+ohmic)*sum(b.lightMass.map((p,i)=>(fractions[0]*p+fractions[1]*b.heavyMass[i])/gasB.temperatureK[i]));
  production+=(b.energy.dragDissipationJ-a.energy.dragDissipationJ)/tb[0];
  assert.ok(production>=-roundoff,`Negative endpoint entropy production: ${production}`);
  assert.ok(dEntropy>=-roundoff,`Adaptive gas/solid/coolant entropy decreased: ${dEntropy}`);
  assert.ok(dEntropy-production>=-roundoff,`Adaptive entropy concavity bound failed: ${dEntropy-production}`);
  entropyChange+=dEntropy;minimumStep=Math.min(minimumStep,dEntropy);minimumMargin=Math.min(minimumMargin,dEntropy-production);
  const solidEnergy=sum(tb.map((t,i)=>wallMass[i]*wallEnergy(ta[i],t)));
  const firstLaw=gasEnergy-sum(gasA.cellEnergyJ)+solidEnergy+kinetic(b)-kinetic(a)+
   b.energy.numericalDissipationJ-a.energy.numericalDissipationJ-(b.energy.driveWorkJ-a.energy.driveWorkJ)-ohmic+cooling;
  const energyScale=sum(a.thermal!.spatial!.cellEnergyJ.map(Math.abs))+Math.abs(solidEnergy)+Math.abs(gasEnergy);
  assert.ok(Math.abs(firstLaw)<=256*Number.EPSILON*energyScale+2e-11*(Math.abs(solidEnergy)+Math.abs(cooling)),`Adaptive independent first law failed: ${firstLaw}`);
  maximumFirstLaw=Math.max(maximumFirstLaw,Math.abs(firstLaw));
 }
 assert.ok(entropyChange>0&&minimumStep>0,'Both controls must exercise irreversible hot-wall exchange.');
 console.log('v61 independent adaptive entropy/first law',JSON.stringify({switched,acceptedKnots:rows.length,
  rejectedSteps:model.timeControl!.rejectedSteps,entropyChangeJK:entropyChange,minimumStepJK:minimumStep,
  minimumBoundMarginJK:minimumMargin,maximumFirstLawJ:maximumFirstLaw}));
});
