import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation,type FuelOperation} from '../src/fuel-operation.js';

// Independent ideal-monatomic entropy, integrated solid Cp/T and face laws.
// No production gas, property, conductance, entropy or rotor-step helper is used.
const K=1.380649e-23,U=1.66053906892e-27,M=.18384,rho=19250;
const A=23.95930,B=.002639680,C=.000001257750,D=-.000000000254642,E=-48407;
const sum=(v:readonly number[])=>v.reduce((a,b)=>a+b,0);
function solidEntropyChange(a:number,b:number){
 const delta=b-a;
 return (A*Math.log1p(delta/a)+B*delta+C*delta*(a+b)/2+
  D*delta*(a*a+a*b+b*b)/3+E*delta*(a+b)/(2*a*a*b*b))/M;
}
function solidEnergyChange(a:number,b:number){
 return (b-a)*(A+B*(a+b)/2+C*(a*a+a*b+b*b)/3+
  D*(a**3+a*a*b+a*b*b+b**3)/4+E/(a*b))/M;
}
const conductivity=(t:number)=>149.441-.045466*t+.000013193*t*t-.000000001484*t**3+3866000/(t*t);

for(const switched of [false,true])test(`independent hot-wall gas/solid/coolant entropy and first law at every accepted knot (${switched?'late switches':'startup'})`,()=>{
 const c={...DEFAULT_FUEL_CENTRIFUGE,currentA:switched?0:.03},n=64,nw=16,thickness=.001;
 const thermal={...DEFAULT_FUEL_THERMAL,enabled:true,spatial:{material:'tungsten' as const,thicknessM:thickness,cells:nw},gas:{conductivityWMK:.1}};
 const events:FuelOperation['events']=switched?[{timeS:.650137,currentA:.03},{timeS:.750137,currentA:0},{timeS:.850137,currentA:.03}]:[];
 const model=simulateFuelOperation(simulateFuelCentrifuge(c),{schemaVersion:1,events,thermal},{cells:n,steps:512});
 const rows=model.checkpoints!,volume=Math.PI*c.radiusM**2*c.lengthM,number=c.pressurePa*volume/(K*c.gasK);
 const fractions=[c.lightFraction,1-c.lightFraction],masses=[6.0151228874*U,7.0160034366*U];
 const wallEdges=Array.from({length:nw+1},(_,i)=>c.radiusM+thickness*i/nw);
 const wallCenters=Array.from({length:nw},(_,i)=>Math.sqrt(wallEdges[i]*wallEdges[i+1]));
 const wallMass=wallCenters.map((_,i)=>rho*Math.PI*c.lengthM*(wallEdges[i+1]-wallEdges[i])*(wallEdges[i+1]+wallEdges[i]));
 const ionI=.5*number*sum(masses.map((m,s)=>m*fractions[s]))*c.radiusM**2*c.ionFraction/(1-c.ionFraction);
 const gasEntropy=(s:typeof rows[number])=>K*number*sum([s.lightMass,s.heavyMass].flatMap((p,species)=>p.map((v,i)=>fractions[species]*v*(1.5*Math.log(s.thermal!.gas!.temperatureK[i]/c.gasK)-Math.log(v*n)))));
 const inertia=(s:typeof rows[number])=>number*c.radiusM**2*sum([s.lightMass,s.heavyMass].flatMap((p,species)=>p.map((v,i)=>fractions[species]*masses[species]*v*(i+.5)/n)));
 const kinetic=(s:typeof rows[number])=>.5*(s.ionAngularMomentumKgM2S**2/ionI+s.neutralAngularMomentumKgM2S**2/inertia(s));
 let entropyChange=0,minimumStep=Infinity,minimumMargin=Infinity,maximumFirstLawJ=0;
 for(let j=1;j<rows.length;j++){
  const a=rows[j-1],b=rows[j],dt=b.timeS-a.timeS,ga=a.thermal!.gas!,gb=b.thermal!.gas!;
  const ta=a.thermal!.spatial!.temperatureK,tb=b.thermal!.spatial!.temperatureK;
  assert.ok(dt>0,'Every accepted integration knot must advance physical time.');
  assert.ok([...gb.temperatureK,...tb].every(t=>Number.isFinite(t)&&t>0));
  for(const p of [b.lightMass,b.heavyMass])assert.ok(p.every(v=>v>0)&&Math.abs(sum(p)-1)<2e-10);
  let gasEnergy=0;
  for(let i=0;i<n;i++){
   const particles=number*(fractions[0]*b.lightMass[i]+fractions[1]*b.heavyMass[i]);
   const expected=1.5*K*particles*gb.temperatureK[i];gasEnergy+=expected;
   assert.ok(Math.abs(gb.cellEnergyJ[i]-expected)<2e-12*expected);
   assert.ok(Math.abs(gb.pressurePa[i]-K*particles*gb.temperatureK[i]/(volume/n))<2e-12*gb.pressurePa[i]);
  }
  const dCooling=b.thermal!.coolingEnergyJ-a.thermal!.coolingEnergyJ;
  const dSolidEntropy=sum(tb.map((t,i)=>wallMass[i]*solidEntropyChange(ta[i],t)));
  const dEntropy=gasEntropy(b)-gasEntropy(a)+dSolidEntropy+dCooling/thermal.coolantK;
  const entropyScale=K*number+sum(a.thermal!.spatial!.cellEnergyJ.map((h,i)=>Math.abs(h)/Math.min(ta[i],tb[i])));
  const entropyRoundoff=128*Number.EPSILON*entropyScale;
  // SG face force, including the exact endpoint centrifugal-work contribution.
  let lowerBound=0;
  for(let species=0;species<2;species++){
   const pa=species?a.heavyMass:a.lightMass,pb=species?b.heavyMass:b.lightMass;
   let transfer=0;
   for(let i=0;i<n-1;i++){
    transfer+=pa[i]-pb[i];
    const z=masses[species]*b.neutralRadS**2*c.radiusM**2/(2*K*n)*(.5/gb.temperatureK[i]+.5/gb.temperatureK[i+1]);
    lowerBound+=K*number*fractions[species]*transfer*(Math.log(pb[i]*gb.temperatureK[i]/(pb[i+1]*gb.temperatureK[i+1]))+z);
   }
  }
  for(let i=0;i<n-1;i++)lowerBound+=dt*4*Math.PI*c.lengthM*thermal.gas.conductivityWMK*(i+1)*
   (gb.temperatureK[i]-gb.temperatureK[i+1])**2/(gb.temperatureK[i]*gb.temperatureK[i+1]);
  const inner=1/(1/thermal.gasWallWK+Math.log(wallCenters[0]/c.radiusM)/(2*Math.PI*c.lengthM*conductivity(tb[0]))+
   1/(8*Math.PI*c.lengthM*thermal.gas.conductivityWMK*n));
  lowerBound+=dt*inner*(gb.temperatureK[n-1]-tb[0])**2/(gb.temperatureK[n-1]*tb[0]);
  for(let i=0;i<nw-1;i++){
   const g=2*Math.PI*c.lengthM/(Math.log(wallEdges[i+1]/wallCenters[i])/conductivity(tb[i])+
    Math.log(wallCenters[i+1]/wallEdges[i+1])/conductivity(tb[i+1]));
   lowerBound+=dt*g*(tb[i]-tb[i+1])**2/(tb[i]*tb[i+1]);
  }
  lowerBound+=dCooling*(1/thermal.coolantK-1/tb[nw-1]);
  const dSlip=b.energy.slipDissipationJ-a.energy.slipDissipationJ;
  const ohmic=dt*(a.currentA!)**2*Math.log(1/c.driveInnerFraction)/(2*Math.PI*c.lengthM*c.conductivitySm);
  lowerBound+=(dSlip+ohmic)*sum(b.lightMass.map((p,i)=>(fractions[0]*p+fractions[1]*b.heavyMass[i])/gb.temperatureK[i]));
  lowerBound+=(b.energy.dragDissipationJ-a.energy.dragDissipationJ)/tb[0];
  assert.ok(lowerBound>=-entropyRoundoff,`Negative endpoint entropy production: ${lowerBound}`);
  assert.ok(dEntropy>=-entropyRoundoff,`Gas/solid/coolant entropy decreased: ${dEntropy}`);
  assert.ok(dEntropy-lowerBound>=-entropyRoundoff,`Entropy concavity/production bound failed: ${dEntropy-lowerBound}`);
  minimumStep=Math.min(minimumStep,dEntropy);minimumMargin=Math.min(minimumMargin,dEntropy-lowerBound);entropyChange+=dEntropy;
  const dWall=sum(tb.map((t,i)=>wallMass[i]*solidEnergyChange(ta[i],t)));
  const firstLaw=gasEnergy-sum(ga.cellEnergyJ)+dWall+kinetic(b)-kinetic(a)+
   b.energy.numericalDissipationJ-a.energy.numericalDissipationJ-(b.energy.driveWorkJ-a.energy.driveWorkJ)-ohmic+dCooling;
  const energyScale=sum(a.thermal!.spatial!.cellEnergyJ.map(Math.abs))+Math.abs(dWall)+Math.abs(gasEnergy);
  assert.ok(Math.abs(firstLaw)<=256*Number.EPSILON*energyScale+2e-11*(Math.abs(dWall)+Math.abs(dCooling)),`Independent first law failed: ${firstLaw}`);
  maximumFirstLawJ=Math.max(maximumFirstLawJ,Math.abs(firstLaw));
 }
 assert.ok(entropyChange>0&&minimumStep>0,'Both cases must exercise actual irreversible hot-wall heat flow.');
 console.log('v59 independent hot-wall entropy/first law',JSON.stringify({switched,acceptedKnots:rows.length,entropyChangeJK:entropyChange,minimumStepJK:minimumStep,minimumBoundMarginJK:minimumMargin,maximumFirstLawJ}));
});
