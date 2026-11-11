import test,{beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CONFIG} from '../src/physics.js';
import {DEFAULT_DOUBLEWELL} from '../src/doublewell-dynamics.js';
const messages: {id:number;kind?:string;result?:unknown;error?:string}[]=[];
beforeEach(()=>{messages.length=0;});
const surface={onmessage:null as null|((event:{data:unknown})=>void),postMessage:(value:typeof messages[number])=>messages.push(value)};
(globalThis as unknown as {self:typeof surface}).self=surface;
await import('../src/worker.js');
test('coupled double-well dynamics uses its own typed worker kind and preserves physical inventory',()=>{
 surface.onmessage!({data:{id:400,kind:'doublewell-dynamics',config:{...DEFAULT_DOUBLEWELL,particlesPerSpecies:16,duration:1e-6}}});
 const reply=messages.at(-1)!;assert.equal(reply.error,undefined);assert.equal(reply.kind,'doublewell-dynamics');
 const r=reply.result as ReturnType<typeof import('../src/doublewell-dynamics.js').simulateDoublewell>;
 assert.equal(r.config.collisions,true);assert.ok(r.collisions.pairs>0);
 assert.ok(r.species.every(s=>s.active+s.wall+s.end+s.source===s.injected));
 assert.ok(r.conservation.maxEnergyResidual<1e-4);
});
test('live cumulative scattering and independent axial resolution survive actual worker dispatch',()=>{
 const config={...DEFAULT_DOUBLEWELL,particlesPerSpecies:16,duration:1e-6,collisionScattering:'nanbu',
  collisionMethod:'axisymmetric',collisionSourceAligned:true,collisionAxialCells:6};
 surface.onmessage!({data:{id:401,kind:'doublewell-dynamics',config}});
 const reply=messages.at(-1)!;assert.equal(reply.id,401);assert.equal(reply.error,undefined);
 const result=reply.result as ReturnType<typeof import('../src/doublewell-dynamics.js').simulateDoublewell>;
 assert.equal(result.config.collisionScattering,'nanbu');assert.equal(result.scatteringMethod,'nanbu');
 assert.equal(result.spatialCollision.nominalAxialCells,6);assert.ok(result.collisions.pairs>0);
 assert.equal(result.spatialCollision.sourceInterfacesFitted,true);
});
test('worker dispatches orbit and equilibrium contracts and rejects the obsolete request shape',()=>{
  surface.onmessage!({data:{id:1,kind:'orbit',config:{...DEFAULT_CONFIG,particlesPerSpecies:1}}});
  surface.onmessage!({data:{id:2,kind:'centrifuge',config:{radius:.48,rotationRadS:10000,ionTemperatureEV:5,electronTemperatureEV:5,species:[{massU:40,chargeState:1,axisFraction:.5},{massU:84,chargeState:1,axisFraction:.5}]}}});
  surface.onmessage!({data:{id:3,config:DEFAULT_CONFIG}});
  assert.equal(messages[0].kind,'orbit');assert.ok(messages[0].result);assert.equal(messages[0].error,undefined);
  assert.equal(messages[1].kind,'centrifuge');assert.ok(messages[1].result);assert.equal(messages[1].error,undefined);
  assert.equal(messages[2].id,3);assert.match(messages[2].error!,/Unknown simulation kind/);
});

test('every added geometry/transport model dispatches through the real worker and returns finite curves',async()=>{
 const {DEFAULT_GEOMETRY}=await import('../src/geometries.js');
 const {DEFAULT_TRANSPORT}=await import('../src/transport.js');
 for(const [kind,models,config]of [
  ['geometry',['gyro','curved','doublewell','mirror','azimuthal','poms'],DEFAULT_GEOMETRY],
  ['transport',['advection','diffusion','mobility','ionization','transit'],DEFAULT_TRANSPORT],
 ] as const)for(const model of models){
  surface.onmessage!({data:{id:99,kind,model,config}});
  const message=messages.at(-1)!;assert.equal(message.error,undefined,`${model}: ${message.error}`);
  const result=message.result as {curves:{x:number[];y:number[]}[];assumptions:string[]};
  assert.ok(result.curves.length>0,model);assert.ok(result.assumptions.length>0);
  result.curves.forEach(curve=>{assert.equal(curve.x.length,curve.y.length);assert.ok(curve.x.every(Number.isFinite));assert.ok(curve.y.every(Number.isFinite));});
 }
});

test('worker routes both centrifuge closures and bulk boundary without changing the legacy kind',()=>{
 const config={radius:.48,rotationRadS:10000,ionTemperatureEV:5,electronTemperatureEV:5,bins:100,
  species:[{massU:40,chargeState:1,axisFraction:.5},{massU:84,chargeState:1,axisFraction:.5}],
  compositionBoundary:'bulk',bulkFractionA:.4,magneticT:.1,densityWidthM:.25,axisDensityM3:1e17};
 for(const closure of ['corotating','gaussian']){
  surface.onmessage!({data:{id:100,kind:'centrifuge',config:{...config,closure}}});
  const message=messages.at(-1)!;assert.equal(message.error,undefined);
  const result=message.result as {composition:{actualFractionA:number};model?:string};
  assert.ok(Math.abs(result.composition.actualFractionA-.4)<1e-9);
  assert.equal(result.model,closure==='gaussian'?'prescribed-gaussian':undefined);
 }
});
