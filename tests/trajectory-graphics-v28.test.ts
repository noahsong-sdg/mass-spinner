import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {simulate,DEFAULT_CONFIG,AMU,E_CHARGE,sourceVelocity,step,firstHit,type Particle} from '../src/physics.js';
import {collisionProbability,elasticCollision} from '../src/collisions.js';

test('display polylines resolve gyration even at the largest allowed physical step',()=>{
 const omega=E_CHARGE*.1/(40*AMU),c={...DEFAULT_CONFIG,voltage:0,particlesPerSpecies:1,
  parallelEV:.001,dt:.0299/omega,duration:8*Math.PI/omega};
 const result=simulate(c);
 for(const s of result.species){
  const rho=Math.sqrt(2*E_CHARGE*c.perpendicularEV/(s.massU*AMU))/(E_CHARGE*c.magneticT/(s.massU*AMU));
  const points=s.paths[0].positions;assert.ok(points.length>100);
  for(let i=1;i<points.length;i++)assert.ok(Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1])<=.101*rho,
   'a displayed chord must resolve a gyro angle of at most 0.1 rad');
 }
});

test('frozen pre-sampling fixtures retain unaffected orbit and RNG results across the collector correction',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/graphics-v28-before-path.json',import.meta.url),'utf8'));
 assert.ok(fixture.some(r=>r.species.some(s=>s.wall>0||s.end>0)),'baseline must include real collected ions');
 assert.ok(fixture.some(r=>r.species.some(s=>s.impacts.length>0)),'baseline must include nonempty impact records');
 assert.ok(fixture.some(r=>r.species.some(s=>s.collisions>0)),'baseline must include actual seeded collisions');
 for(const expected of fixture){
  const result=simulate(expected.config);
  assert.deepEqual(result.config,expected.config);assert.equal(result.cutoffMassU,expected.cutoffMassU);
  result.species.forEach((actual,i)=>{
   const prior=expected.species[i];
   if(prior.impacts.length===0){
    const {paths,...rest}=actual;assert.deepEqual(rest,prior);
   }else{
    // v28 saved chord-localized events. Preserve that historical evidence;
    // those event coordinates and their derived impact residual are precisely
    // what v32 corrects. Counts, bins, source samples, full steps and RNG stay fixed
    // for these fixtures; independent analytic event tests cover new coordinates.
    const {paths,impacts,maxRelativeImpactEnergyError,...unchanged}=actual;
    const {impacts:oldImpacts,maxRelativeImpactEnergyError:oldResidual,...oldUnchanged}=prior;
    assert.deepEqual(unchanged,oldUnchanged);
    assert.deepEqual(impacts.map(p=>p.destination),oldImpacts.map(p=>p.destination));
    assert.ok(Number.isFinite(maxRelativeImpactEnergyError));
    for(const hit of impacts){
     assert.ok(hit.time>=0&&hit.time<=result.config.duration);
     assert.ok(hit.position.every(Number.isFinite)&&Number.isFinite(hit.kineticEV)&&hit.kineticEV>=0);
     if(hit.destination==='wall')assert.ok(Math.abs(Math.hypot(hit.position[0],hit.position[1])-result.config.radius)<1e-10);
     else assert.equal(hit.position[2],hit.destination==='source'?0:result.config.length);
    }
   }
  });
 }
});

test('every sampled-particle collision retains its position as a visible path corner',()=>{
 // Replay a single field-free particle independently at every physical step,
 // so the check knows actual collision positions, not just their total count.
 const c={...DEFAULT_CONFIG,magneticT:0,voltage:0,particlesPerSpecies:1,dt:1e-8,duration:2e-5,
  neutralDensityM3:1e21,neutralCrossSectionM2:1e-19,neutralMassU:1};
 const result=simulate(c);
 const rng=(seed:number)=>{let state=seed>>>0;return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};};
 const source=rng(c.seed),r=c.sourceRadius*Math.sqrt(source()),angle=source()*2*Math.PI,phase=source()*2*Math.PI;
 for(const s of result.species){
  const random=rng(c.seed^0x9e3779b9),vertices:number[][]=[];
  let p:Particle={position:[r*Math.cos(angle),r*Math.sin(angle),0],
   velocity:sourceVelocity(s.massU,c.perpendicularEV,c.parallelEV,0,phase,'fixed',()=>0)};
  for(let time=0;time<c.duration;){
   const dt=Math.min(c.dt,c.duration-time),next=step(p,0,dt,()=>({electric:[0,0,0],magnetic:[0,0,0]}));
   if(firstHit(p.position,next.position,c))break;
   if(random()<collisionProbability(Math.hypot(...next.velocity),c.neutralDensityM3,c.neutralCrossSectionM2,dt)){
    vertices.push(next.position);next.velocity=elasticCollision(next.velocity,s.massU,c.neutralMassU,random).ionVelocity;
   }
   p=next;time+=dt;
  }
  assert.ok(vertices.length>0);assert.equal(vertices.length,s.collisions);
  for(const vertex of vertices)assert.ok(s.paths[0].positions.some(p=>p.every((v,i)=>v===vertex[i])),'retain every collision corner');
  for(let i=1;i<s.paths[0].positions.length;i++)assert.notDeepEqual(s.paths[0].positions[i],s.paths[0].positions[i-1]);
 }
});
