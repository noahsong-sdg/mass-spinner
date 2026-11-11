/** Real production adaptive trajectories, same observation protocol as v60. VM only. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../../src/fuel-centrifuge.js';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../../src/fuel-operation.js';
import {sampleFuelTransport} from '../../src/fuel-transport.js';
import {conductances} from '../../src/fuel-thermal.js';
import {fuelExportGzipBlob} from '../../src/fuel-export.js';

const destination=process.argv[2],mode=process.argv[3];assert.ok(destination);mkdirSync(destination,{recursive:false});
const config={...DEFAULT_FUEL_CENTRIFUGE,durationS:mode.startsWith('early')?.002:mode==='robin'?.02:1,
 ...(mode==='robin'?{currentA:0,radialDiffusivityM2S:1e-30}:{})};
const number=config.pressurePa*Math.PI*config.radiusM**2*config.lengthM/(1.380649e-23*config.gasK);
const times=[...new Set([0,...Array.from({length:161},(_,i)=>1e-7*1e7**(i/160)),
 ...Array.from({length:64},(_,i)=>((i+1)/64)**2),1])].filter(t=>t<=config.durationS).sort((a,b)=>a-b);
if(mode==='robin'&&!times.includes(config.durationS))times.push(config.durationS);
const cases=['candidate','early-candidate','storage'].includes(mode)?[[256,.000000625]]:mode==='fine-qualified'?[[128,.000000625],[512,.000000625]]:
 mode==='spatial'?[[128,.0000025],[512,.0000025],[256,.000000625]]:
 mode==='early-qualified'?[[64,.000000625],[128,.000000625],[256,.000000625],[512,.000000625]]:
 mode==='pilot'?[[256,.001]]:mode==='tight'||mode==='early-tight'?[[128,.000025],[256,.000025],[512,.000025],[256,.00000625]]:
 mode==='robin'?[[64,.001],[256,.0000025],[256,.000000625]]:
 [[64,.001],[128,.001],[256,.001],[256,.0005]];
for(const [cells,rtol] of cases){
 const operation={schemaVersion:1 as const,events:[],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true,
  ...(mode==='robin'?{coolingWK:0}:{}),spatial:{material:'tungsten' as const,thicknessM:.001,cells:16},
  gas:{conductivityWMK:.1,accuracy:{relativeTolerance:rtol,temperatureToleranceK:Number(Math.max(1e-7,rtol/10).toPrecision(12))}}}};
 const start=performance.now(),model=simulateFuelOperation(simulateFuelCentrifuge(config),operation,{cells,steps:512});
 const record={cells,wallCells:16,steps:512,acceptedSteps:model.checkpoints!.length-1,seconds:(performance.now()-start)/1000,
  maxSpeciesResidual:model.maxBalanceError,maxAngularResidual:model.maxAngularMomentumRelativeError,
  maxMechanicalResidual:model.maxEnergyRelativeError,maxThermalResidual:0,minimumGasK:Infinity,minimumMass:Infinity,
  minWallInnerK:Infinity,maxWallInnerK:-Infinity,maxFrozenInventoryDifference:0,maxPhysicalGasSourceJ:0};
 for(const s of model.checkpoints!){
  record.maxThermalResidual=Math.max(record.maxThermalResidual,s.thermal!.relativeResidual);
  record.minimumGasK=Math.min(record.minimumGasK,s.thermal!.gas!.minK);
  record.minimumMass=Math.min(record.minimumMass,...s.lightMass,...s.heavyMass);
  record.minWallInnerK=Math.min(record.minWallInnerK,s.thermal!.spatial!.innerK);
  record.maxWallInnerK=Math.max(record.maxWallInnerK,s.thermal!.spatial!.innerK);
  record.maxPhysicalGasSourceJ=Math.max(record.maxPhysicalGasSourceJ,Math.abs(s.energy.slipDissipationJ)+
   Math.abs(s.thermal!.ohmicEnergyJ)+Math.abs(s.energy.redistributionWorkJ));
  for(const row of [s.lightMass,s.heavyMass])for(const p of row)
   record.maxFrozenInventoryDifference=Math.max(record.maxFrozenInventoryDifference,Math.abs(p-1/cells));
 }
 assert.ok(record.minimumGasK>0&&record.minimumMass>=0&&Math.max(record.maxSpeciesResidual,record.maxAngularResidual,
  record.maxMechanicalResidual,record.maxThermalResidual)<2e-8);
 const sampled=times.map(timeS=>{const s=sampleFuelTransport(model,timeS),solid=conductances(model.thermalLiner!,
  s.thermal!.spatial!.temperatureK,{...operation.thermal});
  return {timeS,ionRadS:s.ionRadS,neutralRadS:s.neutralRadS,lightMass:s.lightMass,heavyMass:s.heavyMass,
   cellEnergyJ:s.thermal!.gas!.cellEnergyJ,temperatureK:s.thermal!.gas!.temperatureK,pressurePa:s.thermal!.gas!.pressurePa,
   gasEnergyJ:s.thermal!.gasEnergyJ,wallInnerK:s.thermal!.spatial!.innerK,
   slipDissipationJ:s.energy.slipDissipationJ,ohmicEnergyJ:s.thermal!.ohmicEnergyJ,redistributionWorkJ:s.energy.redistributionWorkJ,
   wallHeatJ:s.thermal!.gasEnergyJ-model.checkpoints![0].thermal!.gasEnergyJ-s.energy.slipDissipationJ-
    s.thermal!.ohmicEnergyJ-s.energy.redistributionWorkJ,
   wallFluxW:(s.thermal!.spatial!.innerK-s.thermal!.gas!.temperatureK.at(-1)!)/
    (1/solid.inner+1/(8*Math.PI*config.lengthM*.1*cells))};});
 const packet={config,operation,record,number,sampled,timeControl:model.timeControl};
 if(mode==='candidate'){
  const {checkpoints,snapshots,...rest}=model;
  let expected=Buffer.byteLength(JSON.stringify({model:'marathon-centrifuge',result:{transport:{...rest,checkpoints:[],snapshots:[]}}}));
  for(const rows of [checkpoints!,snapshots])expected+=rows.reduce((total,s)=>total+Buffer.byteLength(JSON.stringify(s)),Math.max(0,rows.length-1));
  const blob=await fuelExportGzipBlob({model:'marathon-centrifuge',result:{transport:model}});
  assert.equal(blob.type,'application/gzip');assert.ok(expected>536870888);assert.ok(blob.size<expected);
  const hash=createHash('sha256');let bytes=0;
  for await(const chunk of blob.stream().pipeThrough(new DecompressionStream('gzip'))){hash.update(chunk);bytes+=chunk.length;}
  assert.equal(bytes,expected);
  const sha256=hash.digest('hex');assert.equal(sha256,'b39a70aef724b30f5d7bf54ba8718534306c6753793e06500783bbcc142d0cb9');
  console.log(JSON.stringify({fullHistoryExport:{compressedBytes:blob.size,decompressedBytes:bytes,sha256,singleStringLimitExceeded:true,
   compressedRoundTripMatchesFinalCExactly:true,streamedWithoutMaterializingText:true,allAcceptedKnots:checkpoints!.length}}));
 }
 if(mode==='storage'){
  const bytes=model.checkpoints!.reduce((total,s)=>total+Buffer.byteLength(JSON.stringify(s)),0);
  console.log(JSON.stringify({serializedCheckpointBytes:bytes,checkpointCount:model.checkpoints!.length,
   maximumSingleV8String:536870888,singleStringFits:bytes<=536870888}));
 }
 writeFileSync(`${destination}/n${cells}-r${rtol}.json`,JSON.stringify(packet));
 console.log(JSON.stringify({record,timeControl:model.timeControl}));
}
