import {simulate,type RunConfig} from './physics.js';
import {solveEquilibrium,type EquilibriumConfig} from './equilibrium-model.js';
import {geometry,type GeometryMode,type GeometryConfig} from './geometries.js';
import {transport,type TransportMode,type TransportConfig} from './transport.js';
import {simulateDoublewell,type DoublewellConfig} from './doublewell-dynamics.js';
import {simulateCoupledTarget,type CoupledTargetConfig} from './coupled-target.js';
import type {FusionBeamConfig} from './fusion-reactor.js';
import {workerProducingCode} from './worker-identity.js';
import {simulateFuelCentrifuge,type FuelConfig} from './fuel-centrifuge.js';
import {simulateFuelTransport} from './fuel-transport.js';
import {simulateFuelOperation,validateFuelOperation,type FuelOperation,type FuelResume} from './fuel-operation.js';
import {computeFuelOperatingMap} from './fuel-experiments.js';
type Request={id:number;kind:'orbit';config:RunConfig}
 |{id:number;kind:'centrifuge';config:EquilibriumConfig}
 |{id:number;kind:'geometry';model:GeometryMode;config:GeometryConfig}
 |{id:number;kind:'transport';model:TransportMode;config:TransportConfig}
 |{id:number;kind:'doublewell-dynamics';config:DoublewellConfig}
 |{id:number;kind:'coupled-target';schemaVersion:1;beam:FusionBeamConfig;config:CoupledTargetConfig}
 |{id:number;kind:'fuel-centrifuge';schemaVersion:1;config:FuelConfig;includeTransport?:boolean;operation?:FuelOperation;resume?:FuelResume}
 |{id:number;kind:'fuel-operating-map';schemaVersion:1;config:FuelConfig;options?:Parameters<typeof computeFuelOperatingMap>[1]};
self.onmessage=(event:MessageEvent<Request>)=>{
 const request=event.data;
 try{
  let result;
  switch(request.kind){
   case 'orbit':result=simulate(request.config);break;
   case 'centrifuge':result=solveEquilibrium(request.config);break;
   case 'geometry':result=geometry(request.model,request.config);break;
   case 'transport':result=transport(request.model,request.config);break;
   case 'doublewell-dynamics':result=simulateDoublewell(request.config);break;
   case 'fuel-centrifuge':
    if(request.schemaVersion!==1||!Number.isSafeInteger(request.id)||request.id<0)
     throw new RangeError('Unsupported fuel-centrifuge worker protocol.');
    {if(request.includeTransport&&request.operation)validateFuelOperation(request.operation,request.config.durationS);
     const rotor=simulateFuelCentrifuge(request.config,request.includeTransport?request.operation?.events:undefined);
     result=request.includeTransport?{...rotor,transport:request.operation?simulateFuelOperation(rotor,request.operation,{},request.resume):simulateFuelTransport(rotor)}:rotor;}break;
   case 'fuel-operating-map':
    if(request.schemaVersion!==1||!Number.isSafeInteger(request.id)||request.id<0)throw new RangeError('Unsupported fuel-operating-map worker protocol.');
    result=computeFuelOperatingMap(request.config,request.options);break;
   case 'coupled-target':
    if(request.schemaVersion!==1||!Number.isSafeInteger(request.id)||request.id<0)
     throw new RangeError('Unsupported coupled-target worker protocol.');
    result=simulateCoupledTarget(request.beam,request.config);break;
   default:throw new Error('Unknown simulation kind.');
  }
  self.postMessage({id:request.id,kind:request.kind,result,producingCode:workerProducingCode,...(['coupled-target','fuel-centrifuge','fuel-operating-map'].includes(request.kind)?{schemaVersion:1}:{})});
 }catch(error){self.postMessage({id:request.id,error:error instanceof Error?error.message:String(error),
  ...(['coupled-target','fuel-centrifuge','fuel-operating-map'].includes(request.kind)?{kind:request.kind,schemaVersion:1}:{})});}
};
