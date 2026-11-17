import {requestSimulation,requestSimulationWithIdentity} from '../../src/worker-client.js';
import type {SimulationRequest} from '../../src/worker-types.js';
import type {simulate} from '../../src/physics.js';
import type {solveEquilibrium} from '../../src/equilibrium-model.js';

declare const orbit:Extract<SimulationRequest,{kind:'orbit'}>;
declare const equilibrium:Extract<SimulationRequest,{kind:'centrifuge'}>;
declare const dynamic:Record<string,unknown>;

const orbitResult:Promise<ReturnType<typeof simulate>>=requestSimulation(orbit);
const equilibriumResult:Promise<ReturnType<typeof solveEquilibrium>>=requestSimulation(equilibrium);
void orbitResult.then(result=>{
 result.species[0].massU;
 // @ts-expect-error An orbit result cannot expose equilibrium profiles.
 result.profiles;
});
void equilibriumResult.then(result=>{
 result.profiles[0].radius;
 // @ts-expect-error Equilibrium results cannot expose collected orbit paths.
 result.species[0].paths;
});
void requestSimulationWithIdentity(orbit).then(reply=>{
 reply.result.species[0].paths;
 reply.producingCode?.sourceHash;
 // @ts-expect-error Identity envelopes retain the selected solver result type.
 reply.result.profiles;
});
void requestSimulation(dynamic).then(result=>{
 // @ts-expect-error Unvalidated dynamic requests cannot claim a solver result shape.
 result.species;
});
void requestSimulationWithIdentity(dynamic).then(reply=>{
 // @ts-expect-error Adding provenance cannot validate an unknown result shape.
 reply.result.species;
});
// @ts-expect-error A malformed request may use the dynamic boundary, but its result stays unknown.
const invalidResult:Promise<ReturnType<typeof simulate>>=requestSimulation({id:1,kind:'orbit',config:'invalid'});
void invalidResult;
