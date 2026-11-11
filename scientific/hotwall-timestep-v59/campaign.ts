/** Execute only in safe-dev. Preserve early/off-knot and late-switch evidence. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation,type FuelOperation} from '../../src/fuel-operation.js';
import {sampleFuelTransport,type FuelTransportSnapshot} from '../../src/fuel-transport.js';

const destination=process.argv[2];assert.ok(destination);mkdirSync(destination,{recursive:false});
const thermal={...DEFAULT_FUEL_THERMAL,enabled:true,spatial:{material:'tungsten' as const,thicknessM:.001,cells:16},gas:{conductivityWMK:.1}};
const offsets=Array.from({length:101},(_,i)=>1e-7*10**(i*Math.log10(2e5)/100));
const setups=[
 {name:'hot-wall-startup',config:DEFAULT_FUEL_CENTRIFUGE,operation:{schemaVersion:1 as const,events:[],thermal}},
 {name:'hot-wall-switches',config:{...DEFAULT_FUEL_CENTRIFUGE,currentA:0},operation:{schemaVersion:1 as const,
  events:[{timeS:.650137,currentA:.03},{timeS:.750137,currentA:0},{timeS:.850137,currentA:.03}],thermal}},
];
const summaries=[];
function distance(a:FuelTransportSnapshot[],b:FuelTransportSnapshot[]){
 const maximum={ionRelative:0,neutralRelative:0,gasK:0,pressureRelative:0,speciesCDF:0};
 for(let j=0;j<a.length;j++){
  const aa=a[j],bb=b[j],ag=aa.thermal!.gas!,bg=bb.thermal!.gas!;
  maximum.ionRelative=Math.max(maximum.ionRelative,Math.abs(aa.ionRadS-bb.ionRadS)/Math.max(1,Math.abs(bb.ionRadS)));
  maximum.neutralRelative=Math.max(maximum.neutralRelative,Math.abs(aa.neutralRadS-bb.neutralRadS)/Math.max(1,Math.abs(bb.neutralRadS)));
  let light=0,heavy=0;const pressureScale=Math.max(...bg.pressurePa);
  for(let i=0;i<ag.temperatureK.length;i++){
   maximum.gasK=Math.max(maximum.gasK,Math.abs(ag.temperatureK[i]-bg.temperatureK[i]));
   maximum.pressureRelative=Math.max(maximum.pressureRelative,Math.abs(ag.pressurePa[i]-bg.pressurePa[i])/pressureScale);
   light+=aa.lightMass[i]-bb.lightMass[i];heavy+=aa.heavyMass[i]-bb.heavyMass[i];
   maximum.speciesCDF=Math.max(maximum.speciesCDF,Math.abs(light),Math.abs(heavy));
  }
 }
 return maximum;
}
for(const setup of setups){
 const starts=[0,...setup.operation.events.map(e=>e.timeS)];
 const times=[...new Set([0,...Array.from({length:64},(_,i)=>((i+1)/64)**2),...starts,
  ...starts.flatMap(start=>offsets.map(offset=>start+offset).filter(t=>t<=1))])].sort((a,b)=>a-b);
 const rotor=simulateFuelCentrifuge(setup.config);
 const run=(steps:number)=>{
  const started=performance.now(),model=simulateFuelOperation(rotor,setup.operation as FuelOperation,{cells:64,steps});
  let minimumGasK=Infinity,minimumSpecies=Infinity,maxThermalResidual=0;
  for(const s of model.checkpoints!){
   minimumGasK=Math.min(minimumGasK,s.thermal!.gas!.minK);
   minimumSpecies=Math.min(minimumSpecies,...s.lightMass,...s.heavyMass);
   maxThermalResidual=Math.max(maxThermalResidual,s.thermal!.relativeResidual);
  }
  assert.ok(minimumGasK>0&&minimumSpecies>=0&&maxThermalResidual<2e-8);
  assert.ok(model.maxBalanceError<2e-8&&model.maxAngularMomentumRelativeError<2e-8&&model.maxEnergyRelativeError<2e-8);
  const sampled=times.map(time=>sampleFuelTransport(model,time));
  const record={steps,acceptedSteps:model.checkpoints!.length-1,seconds:(performance.now()-started)/1000,
   minimumGasK,minimumSpecies,maxThermalResidual,maxAngularResidual:model.maxAngularMomentumRelativeError,
   maxMechanicalResidual:model.maxEnergyRelativeError,maxSpeciesResidual:model.maxBalanceError};
  writeFileSync(`${destination}/${setup.name}-${steps}.json`,JSON.stringify({config:setup.config,operation:setup.operation,record,sampled}));
  console.log(JSON.stringify({name:setup.name,...record}));return {record,sampled};
 };
 const reference=run(8192),errors=[];
 for(const steps of [512,1024,2048,4096]){
  const result=run(steps);errors.push({...result.record,maximum:distance(result.sampled,reference.sampled)});
 }
 assert.ok(errors[0].maximum.ionRelative<.03&&errors[0].maximum.neutralRelative<.03,'Existing 3% live rotor gate');
 for(let i=1;i<errors.length;i++)for(const key of Object.keys(errors[i].maximum) as (keyof ReturnType<typeof distance>)[])
  assert.ok(errors[i].maximum[key]<.8*errors[i-1].maximum[key],`${setup.name} failed ${key} refinement`);
 summaries.push({name:setup.name,commonTimes:times.length,referenceSteps:8192,referenceAcceptedSteps:reference.record.acceptedSteps,errors});
}
writeFileSync(`${destination}/summary.json`,JSON.stringify({scope:'Fixed spatial grid; conditional timestep refinement, not continuum or device calibration.',summaries},null,2));
console.log(JSON.stringify({summaries}));
