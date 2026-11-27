/** Internal request/result contract shared by the bundled worker and its UI callers. */
import type {RunConfig, simulate} from './physics.js';
import type {EquilibriumConfig, solveEquilibrium} from './equilibrium-model.js';
import type {GeometryConfig, GeometryMode, geometry} from './geometries.js';
import type {TransportConfig, TransportMode, transport} from './transport.js';
import type {DoublewellConfig, simulateDoublewell} from './doublewell-dynamics.js';
import type {CoupledTargetConfig, simulateCoupledTarget} from './coupled-target.js';
import type {FusionBeamConfig} from './fusion-reactor.js';
import type {FuelConfig, simulateFuelCentrifuge} from './fuel-centrifuge.js';
import type {FuelTransportResult} from './fuel-transport.js';
import type {FuelOperation, FuelResume} from './fuel-operation.js';
import type {computeFuelOperatingMap} from './fuel-experiments.js';
import type {FuelSpatialExperimentConfig, simulateFuelSpatialExperiment} from './fuel-spatial-experiment.js';

export type FuelWorkerResult = ReturnType<typeof simulateFuelCentrifuge> & {transport?: FuelTransportResult};
export type SimulationRequest =
 | {id:number; kind:'orbit'; config:RunConfig}
 | {id:number; kind:'centrifuge'; config:EquilibriumConfig}
 | {id:number; kind:'geometry'; model:GeometryMode; config:GeometryConfig}
 | {id:number; kind:'transport'; model:TransportMode; config:TransportConfig}
 | {id:number; kind:'doublewell-dynamics'; config:DoublewellConfig}
 | {id:number; kind:'coupled-target'; schemaVersion:1; beam:FusionBeamConfig; config:CoupledTargetConfig}
 | {id:number; kind:'fuel-centrifuge'; schemaVersion:1; config:FuelConfig; includeTransport?:boolean; operation?:FuelOperation; resume?:FuelResume}
 | {id:number; kind:'fuel-operating-map'; schemaVersion:1; config:FuelConfig; options?:Parameters<typeof computeFuelOperatingMap>[1]}
 | {id:number; kind:'fuel-spatial-experiment'; schemaVersion:1; config:FuelSpatialExperimentConfig};
export type SimulationResultByKind = {
 orbit:ReturnType<typeof simulate>;
 centrifuge:ReturnType<typeof solveEquilibrium>;
 geometry:ReturnType<typeof geometry>;
 transport:ReturnType<typeof transport>;
 'doublewell-dynamics':ReturnType<typeof simulateDoublewell>;
 'coupled-target':ReturnType<typeof simulateCoupledTarget>;
 'fuel-centrifuge':FuelWorkerResult;
 'fuel-operating-map':ReturnType<typeof computeFuelOperatingMap>;
 'fuel-spatial-experiment':ReturnType<typeof simulateFuelSpatialExperiment>;
};
export type SimulationResult<R extends SimulationRequest> = SimulationResultByKind[R['kind']];
