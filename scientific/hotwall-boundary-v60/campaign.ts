/** Joint gas/solid spatial and timestep qualification. Execute only in safe-dev.
 * Save canonical U,N; compare different meshes on identical physical annuli.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../../src/fuel-operation.js';
import {sampleFuelTransport,type FuelTransportResult,type FuelTransportSnapshot} from '../../src/fuel-transport.js';
import {conductances} from '../../src/fuel-thermal.js';
import {projectGasState} from './metrics.js';

const destination=process.argv[2];assert.ok(destination);mkdirSync(destination,{recursive:false});
const config={...DEFAULT_FUEL_CENTRIFUGE,durationS:process.argv[3]==='early'?.002:1};
const number=config.pressurePa*Math.PI*config.radiusM**2*config.lengthM/(1.380649e-23*config.gasK);
const times=[...new Set([0,...Array.from({length:161},(_,i)=>1e-7*1e7**(i/160)),
 ...Array.from({length:64},(_,i)=>((i+1)/64)**2),1])].filter(t=>t<=config.durationS).sort((a,b)=>a-b);
function flux(s:FuelTransportSnapshot,model:FuelTransportResult){
 const solid=conductances(model.thermalLiner!,s.thermal!.spatial!.temperatureK,{gasWallWK:.1,coolingWK:1,coolantK:500});
 return (s.thermal!.spatial!.innerK-s.thermal!.gas!.temperatureK.at(-1)!)/
  (1/solid.inner+1/(8*Math.PI*config.lengthM*.1*model.cells));
}
function run(cells:number,steps:number,wallCells=cells/4){
 const start=performance.now(),operation={schemaVersion:1 as const,events:[],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true,
  spatial:{material:'tungsten' as const,thicknessM:.001,cells:wallCells},gas:{conductivityWMK:.1}}};
 const model=simulateFuelOperation(simulateFuelCentrifuge(config),operation,{cells,steps});
 const record={cells,wallCells,steps,acceptedSteps:model.checkpoints!.length-1,seconds:(performance.now()-start)/1000,
  maxSpeciesResidual:model.maxBalanceError,maxAngularResidual:model.maxAngularMomentumRelativeError,
  maxMechanicalResidual:model.maxEnergyRelativeError,maxThermalResidual:0,minimumGasK:Infinity,minimumMass:Infinity};
 for(const s of model.checkpoints!){
  record.maxThermalResidual=Math.max(record.maxThermalResidual,s.thermal!.relativeResidual);
  record.minimumGasK=Math.min(record.minimumGasK,s.thermal!.gas!.minK);
  record.minimumMass=Math.min(record.minimumMass,...s.lightMass,...s.heavyMass);
 }
 assert.ok(record.minimumGasK>0&&record.minimumMass>=0&&Math.max(record.maxSpeciesResidual,record.maxAngularResidual,
  record.maxMechanicalResidual,record.maxThermalResidual)<2e-8);
 const sampled=times.map(t=>{const s=sampleFuelTransport(model,t);return {timeS:t,ionRadS:s.ionRadS,neutralRadS:s.neutralRadS,
  lightMass:s.lightMass,heavyMass:s.heavyMass,cellEnergyJ:s.thermal!.gas!.cellEnergyJ,
  temperatureK:s.thermal!.gas!.temperatureK,pressurePa:s.thermal!.gas!.pressurePa,
  gasEnergyJ:s.thermal!.gasEnergyJ,
  wallHeatJ:s.thermal!.gasEnergyJ-model.checkpoints![0].thermal!.gasEnergyJ-s.energy.slipDissipationJ-
   s.thermal!.ohmicEnergyJ-s.energy.redistributionWorkJ,
  wallFluxW:flux(s,model),wallInnerK:s.thermal!.spatial!.innerK};});
 writeFileSync(`${destination}/n${cells}-w${wallCells}-t${steps}.json`,JSON.stringify({config,operation,record,number,sampled}));
 console.log(JSON.stringify(record));return {record,sampled};
}
type Run=ReturnType<typeof run>;
function distance(a:Run,b:Run){
 const errors={ionRelative:0,neutralRelative:0,gasK:0,heatedCellRelative:0,wallFluxInitialLoadRelative:0,
  wallFluxRelative:0,wallHeatRelative:0,gasHeatRelative:0,
  pressureRelative:0,speciesCDF:0};
 const peak={gasK:0,heatedCellRelative:0,wallFluxRelative:0,wallFluxInitialLoadRelative:0,wallHeatRelative:0,gasHeatRelative:0};
 for(let j=1;j<times.length;j++){
  const aa=a.sampled[j],bb=b.sampled[j],fine=projectGasState(bb,a.record.cells,number,config.lightFraction);
  errors.ionRelative=Math.max(errors.ionRelative,Math.abs(aa.ionRadS-bb.ionRadS)/Math.max(1,Math.abs(bb.ionRadS)));
  errors.neutralRelative=Math.max(errors.neutralRelative,Math.abs(aa.neutralRadS-bb.neutralRadS)/Math.max(1,Math.abs(bb.neutralRadS)));
  let light=0,heavy=0;const pressureScale=Math.max(...bb.pressurePa);
  for(let i=0;i<a.record.cells;i++){
   const dt=Math.abs(aa.temperatureK[i]-fine.temperatureK[i]);
   if(dt>errors.gasK){errors.gasK=dt;peak.gasK=aa.timeS;}
   const heating=Math.abs(fine.temperatureK[i]-config.gasK);
   if(heating>=.1&&dt/heating>errors.heatedCellRelative){errors.heatedCellRelative=dt/heating;peak.heatedCellRelative=aa.timeS;}
   const projectedPressure=fine.cellEnergyJ[i]/(1.5*Math.PI*config.radiusM**2*config.lengthM/a.record.cells);
   errors.pressureRelative=Math.max(errors.pressureRelative,Math.abs(aa.pressurePa[i]-projectedPressure)/pressureScale);
   light+=aa.lightMass[i]-fine.lightMass[i];heavy+=aa.heavyMass[i]-fine.heavyMass[i];
   errors.speciesCDF=Math.max(errors.speciesCDF,Math.abs(light),Math.abs(heavy));
  }
  const q=Math.abs(aa.wallFluxW-bb.wallFluxW)/50; // Initial film-limited load, separate from local relative flux.
  if(q>errors.wallFluxInitialLoadRelative){errors.wallFluxInitialLoadRelative=q;peak.wallFluxInitialLoadRelative=aa.timeS;}
  const relativeFlux=Math.abs(aa.wallFluxW-bb.wallFluxW)/Math.abs(bb.wallFluxW);
  if(Math.abs(bb.wallFluxW)>=.5&&relativeFlux>errors.wallFluxRelative){errors.wallFluxRelative=relativeFlux;peak.wallFluxRelative=aa.timeS;}
  const relativeHeat=Math.abs(aa.wallHeatJ-bb.wallHeatJ)/Math.abs(bb.wallHeatJ);
  if(Math.abs(bb.wallHeatJ)>=1e-6&&relativeHeat>errors.wallHeatRelative){errors.wallHeatRelative=relativeHeat;peak.wallHeatRelative=aa.timeS;}
  const heat=Math.abs(bb.gasEnergyJ-b.sampled[0].gasEnergyJ),dh=Math.abs(aa.gasEnergyJ-bb.gasEnergyJ);
  if(heat>=1e-6&&dh/heat>errors.gasHeatRelative){errors.gasHeatRelative=dh/heat;peak.gasHeatRelative=aa.timeS;}
 }
 return {errors,peak,gates:{rotor:errors.ionRelative<.03&&errors.neutralRelative<.03,localGasK:errors.gasK<.1,
  localHeating:errors.heatedCellRelative<.05,wallFluxInitialLoad:errors.wallFluxInitialLoadRelative<.01,
  wallFlux:errors.wallFluxRelative<.01,wallHeat:errors.wallHeatRelative<.01,gasHeat:errors.gasHeatRelative<.01}};
}
const grids=process.argv[3]==='fine'?[[256,16384],[512,8192],[512,16384]]:
 process.argv[3]==='ref32'?[[512,32768]]:
 process.argv[3]==='extra'?[[64,16384],[128,16384],[64,8192,16],[64,8192,64],[512,32768]]:
 process.argv[3]==='early'?[[256,8192],[256,16384],[512,16384]]:
 process.argv[3]==='wall'?[[64,8192,16],[64,8192,64]]:
 process.argv[3]==='pilot'?[[64,512],[128,2048],[256,8192]]:
 [64,128,256].flatMap(n=>[512,2048,8192].map(t=>[n,t]));
const runs=grids.map(([n,t,w])=>run(n,t,w)),reference=runs.at(-1)!;
const comparisons=runs.slice(0,-1).map(result=>({cells:result.record.cells,steps:result.record.steps,...distance(result,reference)}));
const cross=runs.flatMap(a=>runs.filter(b=>a.record.cells===b.record.cells&&b.record.steps===a.record.steps*4||
 a.record.steps===b.record.steps&&b.record.cells===a.record.cells*2).map(b=>({a:a.record,b:b.record,...distance(a,b)})));
writeFileSync(`${destination}/summary.json`,JSON.stringify({scope:'Finite joint-reference qualification, not device or continuum validation.',
 times:times.length,thresholds:{localGasK:.1,heatedCellRelative:.05,minimumHeatingK:.1,wallFluxRelative:.01,gasHeatRelative:.01,
 minimumGasHeatJ:1e-6,minimumWallHeatJ:1e-6,minimumWallFluxW:.5,rotorRelative:.03},reference:reference.record,comparisons,cross},null,2));
console.log(JSON.stringify({comparisons}));
