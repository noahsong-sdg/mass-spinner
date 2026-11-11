import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CONFIG,simulate,advanceOrbit,E_CHARGE,AMU} from '../src/physics.js';
import {arrivalCurves,collectionSummary} from '../src/ensemble.js';

test('actual orbit worker preserves t=0 source returns through competing-risk plots',async()=>{
 const messages:any[]=[];
 const surface={onmessage:null as null|((event:{data:unknown})=>void),postMessage:(message:any)=>messages.push(message)};
 (globalThis as any).self=surface;await import('../src/worker.js');
 const config={...DEFAULT_CONFIG,particlesPerSpecies:16,voltage:0,distribution:'thermal' as const,
  parallelEV:.01,axialTemperatureEV:100,dt:1e-8,duration:1e-6};
 surface.onmessage!({data:{id:3201,kind:'orbit',config}});
 const reply=messages.at(-1)!;assert.equal(reply.id,3201);assert.equal(reply.kind,'orbit');assert.equal(reply.error,undefined);
 const result=reply.result as ReturnType<typeof simulate>;
 assert.deepEqual(result,simulate(config));collectionSummary(result);
 const curves=arrivalCurves(result);
 result.species.forEach((s,i)=>{
  assert.ok(s.source>0);assert.equal(s.wall+s.end+s.source+s.remaining,s.injected);
  assert.ok(s.impacts.filter(p=>p.destination==='source').every(p=>p.time===0&&p.position[2]===0));
  const source=curves.find(c=>c.label===`${i?'B':'A'} source`)!;
  assert.equal(source.x[0],0);assert.equal(source.x[1],0);
  assert.equal(source.y[0],0);assert.equal(source.y[1],s.source/s.injected);
 });
});

test('noninteger final intervals stop at the requested horizon and retain arrival inventory',()=>{
 const config={...DEFAULT_CONFIG,magneticT:0,voltage:0,particlesPerSpecies:1,perpendicularEV:0,
  species:[{massU:40,chargeState:1},{massU:40,chargeState:1}],dt:1e-7,duration:1.235e-6};
 const vz=Math.sqrt(2*E_CHARGE*config.parallelEV/(40*AMU));
 // End plane lies exactly at the requested horizon. A small inward perturbation
 // must collect and a small outward perturbation must remain, independently of
 // whether floating point represents the exact tie as impact or still inside.
 for(const factor of [1-1e-8,1,1+1e-8]){
  const result=simulate({...config,length:vz*config.duration*factor});collectionSummary(result);arrivalCurves(result);
  for(const s of result.species){
   assert.equal(s.wall+s.end+s.source+s.remaining,1);
   if(factor<1)assert.equal(s.end,1);
   if(factor>1)assert.equal(s.remaining,1);
   for(const hit of s.impacts){
    assert.ok(hit.time<=config.duration&&hit.time>=0);
    assert.ok(Math.abs(hit.time-config.duration*factor)<1e-18);
    assert.equal(hit.position[2],result.config.length);
    assert.ok(Math.abs(hit.kineticEV-config.parallelEV)<1e-12);
   }
  }
 }
});

test('neutral resolution is checked on the proposed step before early end absorption',()=>{
 const config={...DEFAULT_CONFIG,magneticT:0,voltage:0,particlesPerSpecies:1,length:1e-7,
  dt:1e-8,duration:1e-8,neutralDensityM3:1e24,neutralCrossSectionM2:1e-19};
 assert.throws(()=>simulate(config),/Collision timestep unresolved/);
});

test('a point on the wall absorbs outward motion immediately but permits inward motion',()=>{
 const model={radius:1,length:1,magneticT:0,voltage:0};
 const outward=advanceOrbit({position:[1,0,.5],velocity:[.1,0,0]},1,.03,model);
 assert.equal(outward.elapsedS,0);assert.equal(outward.hit?.destination,'wall');
 assert.deepEqual(outward.particle.position,[1,0,.5]);assert.deepEqual(outward.particle.velocity,[.1,0,0]);
 const inward=advanceOrbit({position:[1,0,.5],velocity:[-.1,0,0]},1,.03,model);
 assert.equal(inward.hit,null);assert.equal(inward.elapsedS,.03);
 assert.ok(inward.particle.position[0]<1);
});
