import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceTargetConduction, type TargetConductionConfig} from '../src/target-conduction.ts';
import {firstFlightRay,simulateFirstFlightNeutrons} from '../src/neutron-transport.ts';
import {simulateCoupledTarget,DEFAULT_COUPLED_TARGET} from '../src/coupled-target.ts';
import {DEFAULT_FUSION_BEAM} from '../src/fusion-reactor.ts';
import {stoppingForComposition,binImplantationDepths} from '../src/target-material.ts';
import {E_CHARGE} from '../src/physics.ts';
import {readFileSync} from 'node:fs';

const close=(actual:number,expected:number,relative=1e-9,absolute=1e-12)=>
 assert.ok(Math.abs(actual-expected)<=absolute+relative*Math.abs(expected),`${actual} != ${expected}`);

test('independent layered steady heat flux includes half-cells and contact resistances',()=>{
 const cells=[
  {widthM:.001,conductivityWMK:1,volumetricHeatCapacityJm3K:1e6},
  {widthM:.002,conductivityWMK:5,volumetricHeatCapacityJm3K:2e6},
  {widthM:.001,conductivityWMK:2,volumetricHeatCapacityJm3K:3e6},
 ];
 const config:TargetConductionConfig={cells,contactResistanceM2KPerW:[.02,.01],
  coolantK:300,backHeatTransferWM2K:400,backContactResistanceM2KPerW:.004};
 const q=500,temperature=[0,0,300+q*(.001/4+.004+1/400)];
 temperature[1]=temperature[2]+q*(.002/10+.01+.001/4);
 temperature[0]=temperature[1]+q*(.001/2+.02+.002/10);
 const result=advanceTargetConduction(config,temperature,10,[q,0,0]);
 for(let i=0;i<3;i++)close(result.temperatureK[i],temperature[i],1e-8);
 close(result.coolantJm2,q*10,1e-8);close(result.storedChangeJm2,0,0,1e-6);
});

test('independent thermal balance and maximum principle on a closed heterogeneous mesh',()=>{
 const cells=[1,2,3,4].map((x,i)=>({widthM:x*.001,conductivityWMK:2+i,
  volumetricHeatCapacityJm3K:(i+1)*1e6}));
 const initial=[400,310,350,290],config:TargetConductionConfig={cells,coolantK:300,backHeatTransferWM2K:0};
 for(const duration of [0,1e-6,.01,10]){
  const result=advanceTargetConduction(config,initial,duration,[0,0,0,0]);
  const energy=result.temperatureK.reduce((sum,t,i)=>sum+cells[i].widthM*cells[i].volumetricHeatCapacityJm3K*(t-initial[i]),0);
  close(energy,0,0,2e-7);close(result.coolantJm2,0,0,1e-12);
  for(const t of result.temperatureK)assert.ok(t>=290-1e-10&&t<=400+1e-10);
 }
 const heat=[100,200,0,0],duration=.03;
 const result=advanceTargetConduction(config,initial,duration,heat);
 const stored=result.temperatureK.reduce((sum,t,i)=>sum+cells[i].widthM*cells[i].volumetricHeatCapacityJm3K*(t-initial[i]),0);
 close(stored,300*duration,1e-9,2e-7);close(result.depositedJm2,300*duration,1e-12);
});

test('independent one-cell cooling approaches exponential with first-order time refinement',()=>{
 const width=.001,k=100,cV=1e6,h=10000,q=10000,total=.2;
 const capacity=width*cV,g=1/(width/(2*k)+1/h),exact=300+q/g*(1-Math.exp(-g*total/capacity));
 const config:TargetConductionConfig={cells:[{widthM:width,conductivityWMK:k,volumetricHeatCapacityJm3K:cV}],
  coolantK:300,backHeatTransferWM2K:h};
 const errors:number[]=[];
 for(const steps of [10,20,40]){
  let temperature=[300],coolant=0;
  for(let i=0;i<steps;i++){
   const result=advanceTargetConduction(config,temperature,total/steps,[q]);
   temperature=result.temperatureK;coolant+=result.coolantJm2;
  }
  errors.push(Math.abs(temperature[0]-exact));
  close(capacity*(temperature[0]-300)+coolant,q*total,1e-9,1e-7);
 }
 for(let i=0;i<2;i++)assert.ok(errors[i]/errors[i+1]>=1.6&&errors[i]/errors[i+1]<=2.4,JSON.stringify(errors));
});

test('independent insulated cosine mode converges under joint depth/time refinement',()=>{
 const length=.01,alpha=1e-5,k=10,cV=k/alpha,total=.04,errors:number[]=[];
 for(const n of [8,16,32]){
  const dx=length/n,steps=n*n/8,config:TargetConductionConfig={
   cells:Array.from({length:n},()=>({widthM:dx,conductivityWMK:k,volumetricHeatCapacityJm3K:cV})),
   coolantK:300,backHeatTransferWM2K:0};
  let temperature=Array.from({length:n},(_,i)=>300+10*Math.cos(Math.PI*(i+.5)/n));
  for(let j=0;j<steps;j++)temperature=advanceTargetConduction(config,temperature,total/steps,Array(n).fill(0)).temperatureK;
  const decay=Math.exp(-alpha*Math.PI**2*total/length**2);
  errors.push(Math.max(...temperature.map((t,i)=>Math.abs(t-(300+10*decay*Math.cos(Math.PI*(i+.5)/n))))));
 }
 for(let i=0;i<2;i++)assert.ok(errors[i]/errors[i+1]>=2.5&&errors[i]/errors[i+1]<=5,JSON.stringify(errors));
});

test('independent first-flight planar channels obey exact layered Beer-Lambert probabilities',()=>{
 for(const cosine of [1,.4,1e-4])for(const tau of [0,1e-14,.3,1000]){
  const result=firstFlightRay([
   {name:'A',thicknessM:.2,totalMInv:tau*5,absorptionMInv:tau*2,detectorEfficiency:.7},
   {name:'B',thicknessM:.3,totalMInv:2,absorptionMInv:2,detectorEfficiency:.2},
  ],cosine);
  const a=-Math.expm1(-tau/cosine),b=Math.exp(-tau/cosine)*-Math.expm1(-.6/cosine);
  close(result.firstAbsorbed,.4*a+b,2e-12,2e-15);
  close(result.firstScatteredUnresolved,.6*a,2e-12,2e-15);
  close(result.uncollidedEscaped,Math.exp(-(tau+.6)/cosine),2e-12,2e-15);
  close(result.detected,.7*.4*a+.2*b,2e-12,2e-15);
  close(result.firstAbsorbed+result.firstScatteredUnresolved+result.uncollidedEscaped,1,1e-12);
 }
});

test('independent first-flight vacuum is a solid angle, not source-area flux',()=>{
 for(const distance of [0,.1,10,1e8]){
  const area=Math.PI,rate=3e12,result=simulateFirstFlightNeutrons({sourceRateS:rate,
   sourceEnergyMeV:14.1,distanceM:distance,sampleAreaM2:area,
   layers:[{name:'vacuum',thicknessM:1,totalMInv:0,absorptionMInv:0}],angularSamples:16});
  const h=Math.hypot(distance,1),fraction=1/(2*h*(h+distance));
  close(result.fractions.uncollidedEscaped,fraction,2e-12,0);
  close(result.rates.uncollidedEscaped,rate*fraction,2e-12,0);
  close(result.detectionRateS,0,0,0);close(result.fractionResidual,0,0,1e-12);
 }
});

test('independent finite-cylinder side escape survives far-field angular cancellation',()=>{
 const distance=1e8,result=simulateFirstFlightNeutrons({sourceRateS:1,sourceEnergyMeV:14.1,
  distanceM:distance,sampleAreaM2:Math.PI,angularSamples:4096,
  layers:[{name:'absorber',thicknessM:distance,totalMInv:1/distance,absorptionMInv:1/distance}]});
 // At radius/distance=1e-8, the far-field geometric error is O(1e-16).
 // Independent area-coordinate integral retains finite ray angle through u.
 const samples=200000;let mean=0;
 for(let i=0;i<samples;i++){
  const u=(i+.5)/samples,tau=Math.min(1,1/Math.sqrt(u)-1);
  mean+=-Math.expm1(-tau)/samples;
 }
 const conditional=result.fractions.firstAbsorbed/result.geometry.interceptedFraction;
 close(conditional,mean,2e-4,0);
});

test('independent coupled beam-off limit preserves a closed equilibrated target',()=>{
 const beam={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,
  materialColumnM2:1e20,targetColumnM2:6e19,beamCurrentA:0,exposureS:.02};
 const config={...DEFAULT_COUPLED_TARGET,depthCells:2,samples:10,cooldownS:.01,maxStepS:.01};
 const result=simulateCoupledTarget(beam,config);
 close(result.final.timeS,.03,0,1e-14);
 for(const state of result.history){
  close(state.cumulativeNeutrons,0,0,0);close(state.incidentD,0,0,0);
  close(state.energy.depositedJ,0,0,0);
  for(const t of state.tritiumFraction)close(t,.6,0,2e-12);
  for(const t of state.temperatureK)close(t,config.coolantK,0,2e-12);
 }
});

test('independent coupled empty-tritium beam heats the target without fusion',()=>{
 const beam={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,
  materialColumnM2:1e20,targetColumnM2:0,beamCurrentA:.01,exposureS:.02};
 const config={...DEFAULT_COUPLED_TARGET,depthCells:2,samples:10,cooldownS:0,maxStepS:.01};
 const result=simulateCoupledTarget(beam,config);
 close(result.final.cumulativeNeutrons,0,0,0);
 assert.ok(result.final.energy.depositedJ>0);
 for(const state of result.history)for(const t of state.tritiumFraction)close(t,0,0,0);
});

test('independent composition endpoints and vacancies match compiled upstream atomic branches',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/geant4-atomic-stopping-v35.json',import.meta.url),'utf8'));
 assert.ok(Array.isArray(fixture));
 for(const energy of [.5/.6,1,20,100,500]){
  const rows=fixture.filter((r:any)=>r.energyKeV===energy);
  const lithium=rows.find((r:any)=>r.z===3&&r.massU===7),deuterium=rows.find((r:any)=>r.z===1&&r.massU===2),
   tritium=rows.find((r:any)=>r.z===1&&r.massU===3);
  assert.ok(lithium&&deuterium&&tritium);
  for(const [t,d]of [[1,0],[0,1],[0,0],[.4,.3]]){
   const actual=stoppingForComposition(energy,{tritiumFraction:t,deuteriumFraction:d});
   for(const key of ['electronicKeVM2','nuclearKeVM2']as const)
    close(actual[key],lithium[key]+t*tritium[key]+d*deuterium[key],3e-14,0);
  }
 }
});

test('independent implantation histogram preserves missing incidents and downstream escape',()=>{
 const result=binImplantationDepths([0,1,2],[0,.2,.8,1,1.2,1.8,2,2.5],10);
 assert.deepEqual(result.counts,[3,3]);assert.deepEqual(result.cellFractions,[.3,.3]);
 close(result.beyondTargetFraction,.2,0,0);close(result.unclassifiedFraction,.2,0,0);
 close(result.cellFractions.reduce((a,b)=>a+b,0)+result.beyondTargetFraction+result.unclassifiedFraction,1,0,1e-15);
});

test('independent coupled uniform release and renewal match scalar exponential limits',()=>{
 const beam={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,
  materialColumnM2:1e20,targetColumnM2:6e19,beamCurrentA:0,exposureS:.05};
 const config={...DEFAULT_COUPLED_TARGET,depthCells:2,samples:10,cooldownS:0,maxStepS:2e-5,
  releaseAttemptRateS:.2,renewalRateS:.3,renewalTritiumFraction:.1};
 const result=simulateCoupledTarget(beam,config),duration=.05,lambda=.5;
 const t=.06+(.6-.06)*Math.exp(-lambda*duration),d=.54+(.4-.54)*Math.exp(-lambda*duration);
 for(const actual of result.final.tritiumFraction)close(actual,t,0,2e-7);
 for(const actual of result.final.deuteriumFraction)close(actual,d,0,2e-7);
 for(const actual of result.final.vacancyFraction)close(actual,1-t-d,0,2e-7);
 const integralT=.06*duration+(.6-.06)*-Math.expm1(-lambda*duration)/lambda;
 close(result.final.releasedT/(beam.materialColumnM2*beam.beamAreaM2),lambda*integralT,2e-5,1e-12);
});

test('independent coupled pulse ledger includes partial periods and shuts off during cooldown',()=>{
 const beam={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,
  materialColumnM2:1e20,targetColumnM2:6e19,beamCurrentA:.01,exposureS:.073};
 const config={...DEFAULT_COUPLED_TARGET,depthCells:2,samples:10,cooldownS:.01,maxStepS:.01,
  pulsePeriodS:.03,pulseDuty:.4,replacementProbability:.4};
 const result=simulateCoupledTarget(beam,config),onS=.036;
 close(result.final.beamOnS,onS,0,2e-14);close(result.final.incidentD,beam.beamCurrentA/E_CHARGE*onS,1e-12);
 for(const endpoint of [0,.012,.03,.042,.06,.072,.073,.083])
  assert.ok(result.history.some(s=>Math.abs(s.timeS-endpoint)<1e-14));
 for(const s of result.history){
  const inventory=beam.materialColumnM2*beam.beamAreaM2;
  const normalization=inventory+s.incidentD+s.addedT+s.addedD;
  for(const residual of Object.values(s.atomResiduals))assert.ok(Math.abs(residual)<=1e-9*normalization);
  close(s.energy.incidentBeamJ+s.energy.nuclearJ,s.energy.depositedJ+s.energy.neutronJ+s.energy.escapingAlphaJ,1e-9,1e-10);
  close(s.energy.depositedJ,s.energy.storedChangeJ+s.energy.coolantJ,1e-9,1e-8);
  for(let i=0;i<config.depthCells;i++){
   assert.ok(s.tritiumFraction[i]>=0&&s.deuteriumFraction[i]>=0&&s.vacancyFraction[i]>=0);
   close(s.tritiumFraction[i]+s.deuteriumFraction[i]+s.vacancyFraction[i],1,0,1e-9);
  }
  if(s.timeS>=beam.exposureS){assert.equal(s.neutronRateS,0);assert.equal(s.assemblyHeatW,0);}
 }
});

test('independent coupled renewal can create a reaction channel from initially absent tritium',()=>{
 const beam={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,
  materialColumnM2:1e20,targetColumnM2:0,beamCurrentA:.01,exposureS:.01};
 const config={...DEFAULT_COUPLED_TARGET,depthCells:2,samples:10,cooldownS:0,maxStepS:.001,
  renewalRateS:.2,renewalTritiumFraction:1};
 const result=simulateCoupledTarget(beam,config);
 assert.equal(result.initial.neutronRateS,0);assert.ok(result.final.cumulativeNeutrons>0);
 assert.ok(result.final.addedT>0);assert.ok(result.final.tritiumFraction.every(t=>t>0));
});
