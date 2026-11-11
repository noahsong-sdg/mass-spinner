import test from 'node:test';
import assert from 'node:assert/strict';
import {axisymmetricCollisionCells,collideAxisymmetricCell,cylindricalVelocity} from '../src/axisymmetric-collisions.ts';
import {collideCoulombCell,type CoulombScatteringMethod} from '../src/coulomb.ts';
import {DEFAULT_DOUBLEWELL,simulateDoublewell} from '../src/doublewell-dynamics.ts';
import {executeSeed} from '../src/convergence.ts';
import {AMU,type Vec} from '../src/physics.ts';

const rng=(seed:number)=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
const close=(a:number,b:number,tolerance=1e-11)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const ring=(r:number,phi:number,v:Vec,massU=40,z=.2)=>({massU,chargeState:1,
 position:[r*Math.cos(phi),r*Math.sin(phi),z] as Vec,
 velocity:[v[0]*Math.cos(phi)-v[1]*Math.sin(phi),v[0]*Math.sin(phi)+v[1]*Math.cos(phi),v[2]] as Vec});

test('ring wrapper forwards the selected angular law and retains the physical finite-gap torque',()=>{
 const initial=Array.from({length:17},(_,i)=>ring(.05+.002*i,i*.61,[1200-i*500,500+i*61,3000-i*101],i%2?84:40));
 const finalByMethod:Vec[][]=[];
 for(const method of ['takizuka-abe','nanbu'] as CoulombScatteringMethod[]){
  const ions=structuredClone(initial),local=initial.map(p=>({...p,velocity:cylindricalVelocity(p.position,p.velocity)}));
  const before=ions.reduce((sum,p)=>sum+p.massU*AMU*(p.position[0]*p.velocity[1]-p.position[1]*p.velocity[0]),0);
  let torque=0;
  const actual=collideAxisymmetricCell(ions,1e19,10,2e-6,rng(57),(a,b,impulse)=>{
   torque+=(Math.hypot(a.position[0],a.position[1])-Math.hypot(b.position[0],b.position[1]))*impulse[1];
  },method);
  const expected=collideCoulombCell(local,1e19,10,2e-6,rng(57),undefined,method);
  assert.deepEqual(actual,expected);
  ions.forEach((p,i)=>cylindricalVelocity(p.position,p.velocity).forEach((v,k)=>close(v,local[i].velocity[k])));
  const after=ions.reduce((sum,p)=>sum+p.massU*AMU*(p.position[0]*p.velocity[1]-p.position[1]*p.velocity[0]),0);
  assert.ok(Math.abs(after-before-torque)<1e-36,'raw torque remains the measured radial-gap impulse; no projection');
  finalByMethod.push(ions.map(p=>p.velocity));
 }
 assert.notDeepEqual(finalByMethod[0],finalByMethod[1],'the new method must actually reach the ring collision backend');
});

test('independently refined radial and axial meshes retain exact full-cylinder volumes and particle weights',()=>{
 for(const radialCells of [3,6,12])for(const axialCells of [3,9,18]){
  const radius=.2,length=.6,weight=7e12;
  const ions=Array.from({length:radialCells*axialCells},(_,i)=>ring((i%radialCells+.5)*radius/radialCells,i*.17,[0,0,0],40,(Math.floor(i/radialCells)+.5)*length/axialCells));
  const cells=axisymmetricCollisionCells(ions,{radius,length,weight,radialCells,axialCells});
  assert.equal(cells.length,radialCells*axialCells);
  close(cells.reduce((sum,c)=>sum+c.volumeM3,0),Math.PI*radius**2*length,1e-14);
  close(cells.reduce((sum,c)=>sum+c.volumeM3*c.densityM3,0),ions.length*weight,1e-14);
 }
});

test('live and convergence paths honor explicit axial locality without changing collisionless trajectories',()=>{
 const c={...DEFAULT_DOUBLEWELL,collisionMethod:'axisymmetric' as const,collisionSourceAligned:true,
  cellsAcross:6,particlesPerSpecies:32,duration:2e-7,dt:1e-7,collisions:false};
 const a=simulateDoublewell({...c,collisionAxialCells:3}),b=simulateDoublewell({...c,collisionAxialCells:9});
 assert.equal(a.spatialCollision.nominalRadialCells,6);assert.equal(b.spatialCollision.nominalRadialCells,6);
 assert.equal(a.spatialCollision.nominalAxialCells,3);assert.equal(b.spatialCollision.nominalAxialCells,9);
 assert.deepEqual(a.history,b.history);assert.deepEqual(a.species,b.species);
 const record=executeSeed({id:'independent-axial',config:{...c,collisionAxialCells:9}},42);
 assert.equal(record.status,'complete');assert.equal(record.numericalGeometry?.baseAxialCells,9);
 close(record.numericalGeometry!.baseAxialLengthM,c.length/9);
});
