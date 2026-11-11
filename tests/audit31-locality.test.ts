import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DOUBLEWELL,simulateDoublewell,type DoublewellConfig} from '../src/doublewell-dynamics.ts';
import {validateConvergencePlan,type ConvergencePlan} from '../src/convergence.ts';
import {axisymmetricGrid,axisymmetricCollisionCells} from '../src/axisymmetric-collisions.ts';
import {collisionDensityDiagnostics} from '../src/collision-locality.ts';
import type {Vec} from '../src/physics.ts';

const base:DoublewellConfig={...DEFAULT_DOUBLEWELL,particlesPerSpecies:32,duration:2e-6,
 collisionMethod:'adaptive' as const,collisionScattering:'nanbu' as const};
const plan=(a:DoublewellConfig=base,b:DoublewellConfig={...base,cellsAcross:12}):ConvergencePlan=>({
 id:'executed-locality-only',description:'No unused input may count as refinement',seeds:[101,202],
 levels:[{id:'a',config:a},{id:'b',config:b}],comparisons:[{kind:'spatial',coarse:'a',fine:'b'}],
 tolerances:{fraction:.01,radiusFraction:.01,temperatureEV:.1,timeFraction:.02,
 normalizedAngularMomentum:.001,maxRawMomentumResidual:.001,maxUnresolvedExposure:.01,minimumSeeds:6},
});

test('adaptive collisions do not execute the Cartesian cellsAcross input',()=>{
 const a=simulateDoublewell({...base,cellsAcross:2}),b=simulateDoublewell({...base,cellsAcross:12});
 for(const key of ['history','species','conservation','collisions','spatialCollision','regimeHistory'] as const)
  assert.deepEqual(a[key],b[key],key);
 assert.ok(a.collisions.pairs>0);
});

test('an unused Cartesian resolution cannot count as adaptive spatial refinement',()=>{
 assert.throws(()=>validateConvergencePlan(plan()),/executed|adaptive|spatial/i);
 const fixed={...base,collisionMethod:'fixed' as const};
 validateConvergencePlan(plan(fixed,{...fixed,cellsAcross:6}));
 const ring={...base,collisionMethod:'axisymmetric' as const,collisionAxialCells:9};
 validateConvergencePlan(plan(ring,{...ring,cellsAcross:6}));
 validateConvergencePlan(plan(ring,{...ring,collisionAxialCells:18}));
 const adaptive=plan(base,{...base,collisionTarget:16});
 adaptive.comparisons[0].kind='method';validateConvergencePlan(adaptive);
});

test('collision-off trajectories do not execute either scattering or spatial collision choices',()=>{
 const off={...base,collisions:false,collisionMethod:'fixed' as const,cellsAcross:2};
 const a=simulateDoublewell(off);
 for(const change of [{collisionScattering:'takizuka-abe' as const},{cellsAcross:12}]){
  const b=simulateDoublewell({...off,...change});
  for(const key of ['history','species','conservation','collisions'] as const)assert.deepEqual(a[key],b[key]);
 }
});

test('collision-off angular selectors cannot count as executed method comparisons',()=>{
 const off={...base,collisions:false},p=plan(off,{...off,collisionScattering:'takizuka-abe'});
 p.comparisons[0].kind='method';assert.throws(()=>validateConvergencePlan(p),/enabled|collision/i);
});

test('collision-off cell counts cannot count as spatial refinement, without restricting orbit refinements',()=>{
 const off={...base,collisions:false,collisionMethod:'fixed' as const};
 assert.throws(()=>validateConvergencePlan(plan(off,{...off,cellsAcross:12})),/enabled|collision/i);
 const time=plan(off,{...off,dt:off.dt/2});time.comparisons[0].kind='timestep';validateConvergencePlan(time);
 const particle=plan(off,{...off,particlesPerSpecies:64});particle.comparisons[0].kind='particle';validateConvergencePlan(particle);
 const effect=plan(off,{...off,collisions:true});effect.comparisons=[];
 effect.physicalEffect={control:'a',collisional:'b'};validateConvergencePlan(effect);
});

test('source-fitted independent ring axes preserve exact volume and marker inventory',()=>{
 for(const radialCells of [2,3,6,12])for(const axialCells of [3,9,18]){
  const s={radius:.23,length:.71,radialCells,axialCells,radiusBreakM:.081,axialBreakM:.173};
  const grid=axisymmetricGrid(s),ions:{position:Vec}[]=[];
  for(let i=1;i<grid.radialEdgesM.length;i++)for(let j=1;j<grid.axialEdgesM.length;j++)
   ions.push({position:[(grid.radialEdgesM[i-1]+grid.radialEdgesM[i])/2,0,
    (grid.axialEdgesM[j-1]+grid.axialEdgesM[j])/2]});
  const weight=5e10,cells=axisymmetricCollisionCells(ions,{...s,weight});
  const volume=cells.reduce((sum,c)=>sum+c.volumeM3,0);
  assert.ok(Math.abs(volume/(Math.PI*s.radius**2*s.length)-1)<2e-14);
  assert.ok(Math.abs(cells.reduce((sum,c)=>sum+c.volumeM3*c.densityM3,0)/(weight*ions.length)-1)<2e-14);
  assert.equal(cells.flatMap(c=>c.ions).length,ions.length);
 }
});

test('fixed-cell self exclusion is unbiased under an independently enumerated sampling law',()=>{
 // Four independent markers occupy two equal-probability physical cells.
 // Enumerate all 2^4 position outcomes, rather than use collision RNG or
 // estimate a confidence interval from mutually interacting particles.
 const weight=7,volume=.3;let expected=0;
 for(let bits=0;bits<16;bits++){
  const n=[0,0];for(let j=0;j<4;j++)n[(bits>>>j)&1]++;
  const cells=n.map(count=>({ions:Array(count).fill(null),volumeM3:volume}));
  expected+=collisionDensityDiagnostics(cells,weight).selfExcludedDensitySquaredIntegral/16;
 }
 const independent=4*3*weight**2/(2*volume);
 assert.ok(Math.abs(expected/independent-1)<1e-15);
});
