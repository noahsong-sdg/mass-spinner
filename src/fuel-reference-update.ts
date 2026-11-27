import {simulateFuelCentrifuge,type FuelConfig} from './fuel-centrifuge.js';
import {fuelTransportCollection,type FuelTransportCheckpoint,type FuelTransportResult} from './fuel-transport.js';
import type {FuelCurrentEvent} from './fuel-operation.js';

const referenceInputs:ReadonlySet<keyof FuelConfig>=new Set([
 'application','cutFraction','stages','feedStage','pumpSpeedM3S','conductanceM3S',
 'fusionMW','burnFraction','loopTimeS','linerConductanceWK','lithiumSeed',
]);
type FuelReferenceResult=ReturnType<typeof simulateFuelCentrifuge>&{transport?:FuelTransportResult};

/** These inputs change estimates or inventory cuts, not the accepted physical history. */
export function isFuelReferenceInput(key:keyof FuelConfig,thermalEnabled=false){
 return referenceInputs.has(key)||key==='linerK'&&!thermalEnabled;
}

/** Recalculate reference outputs without integrating the physical trajectory again. */
export function updateFuelReferences(result:FuelReferenceResult,nextConfig:FuelConfig,recordedEvents?:readonly FuelCurrentEvent[]):FuelReferenceResult{
 const transport=result.transport,thermalEnabled=transport?.operation?.thermal.enabled??false;
 const events=transport?.operation?.events??recordedEvents;
 if(!events)throw new RangeError('Reference updates need the recorded current history.');
 for(const key of Object.keys(result.config) as (keyof FuelConfig)[]){
  if(result.config[key]!==nextConfig[key]&&!isFuelReferenceInput(key,thermalEnabled))
   throw new RangeError(`Reference updates cannot change physical input ${key}.`);
 }
 const reference=simulateFuelCentrifuge(nextConfig,events);
 if(!transport)return {...result,...reference};
 const cutChanged=nextConfig.cutFraction!==transport.cutFraction;
 const project=<T extends FuelTransportCheckpoint>(state:T):T=>({...state,
  collection:fuelTransportCollection(state.lightMass,state.heavyMass,transport.lightFraction,nextConfig.cutFraction)});
 const {durationS:_duration,currentA:_current,...setup}=reference.config;
 return {...result,...reference,transport:{...transport,cutFraction:nextConfig.cutFraction,
  snapshots:cutChanged?transport.snapshots.map(project):transport.snapshots,
  ...(transport.checkpoints?{checkpoints:cutChanged?transport.checkpoints.map(project):transport.checkpoints}:{}),
  ...(transport.operation?{operation:{...transport.operation,setup}}:{}),
 }};
}
