import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptiveCollisionCells,collisionDensityDiagnostics} from '../src/collision-locality.js';
import {collideCoulombCell} from '../src/coulomb.js';
import {AMU,type Vec} from '../src/physics.js';
import {DEFAULT_DOUBLEWELL,simulateDoublewell,validateDoublewell} from '../src/doublewell-dynamics.js';

function cloud(){
 const points:{position:Vec;velocity:Vec;massU:number;chargeState:number}[]=[];
 for(let x=-4;x<=4;x++)for(let y=-4;y<=4;y++)if(x*x+y*y<25)for(let z=0;z<6;z++)
  points.push({position:[x/5,y/5,(z+.5)/6],velocity:[100*x+700,200*y-500,400*z+100],massU:points.length%2?40:84,chargeState:1});
 return points;
}
const settings={radius:1,length:1,weight:2,target:32,maxDepth:15};

test('adaptive geometric leaves partition representatives once with exact physical inventory and disjoint bounds',()=>{
 const points=cloud(),cells=adaptiveCollisionCells(points,settings);
 assert.ok(cells.length>1);
 assert.equal(cells.flatMap(c=>c.ions).length,points.length);
 assert.equal(new Set(cells.flatMap(c=>c.ions)).size,points.length);
 for(const c of cells){
  assert.ok(c.volumeM3>0&&c.depth<=settings.maxDepth);
  assert.ok(c.ions.length>=settings.target/4);
  assert.equal(c.densityM3*c.volumeM3,c.ions.length*settings.weight);
  for(const p of c.ions)for(let axis=0;axis<3;axis++)assert.ok(p.position[axis]>=c.bounds.low[axis]&&p.position[axis]<=c.bounds.high[axis]);
 }
 for(let i=0;i<cells.length;i++)for(let j=0;j<i;j++)assert.ok([0,1,2].some(axis=>
  cells[i].bounds.low[axis]>=cells[j].bounds.high[axis]||cells[j].bounds.low[axis]>=cells[i].bounds.high[axis]));
 assert.ok(cells.reduce((sum,c)=>sum+c.volumeM3,0)<=Math.PI*(1+1e-13));
 assert.equal(collisionDensityDiagnostics(cells,settings.weight).representedInventory,points.length*settings.weight);
});

test('adaptive leaf pairing preserves exact mixed-ion kinetic invariants without a torque projection',()=>{
 const points=cloud(),momentum=()=>[0,1,2].map(axis=>points.reduce((sum,p)=>sum+p.massU*AMU*p.velocity[axis],0));
 const energy=()=>points.reduce((sum,p)=>sum+p.massU*AMU*p.velocity.reduce((s,v)=>s+v*v,0)/2,0);
 const beforeP=momentum(),beforeE=energy();let state=42;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 let pairs=0;
 for(const cell of adaptiveCollisionCells(points,{...settings,weight:1e15}))
  pairs+=collideCoulombCell(cell.ions,cell.densityM3,10,1e-5,random).pairs;
 assert.ok(pairs>100);
 assert.ok(Math.abs(energy()/beforeE-1)<1e-13);
 for(let i=0;i<3;i++)assert.ok(Math.abs(momentum()[i]-beforeP[i])<1e-12*Math.max(Math.abs(beforeP[i]),1e-30));
});

test('adaptive depth bounds stop an unresolved point cluster with finite density rather than shrinking without limit',()=>{
 const points=Array.from({length:32},()=>({position:[0,0,.5] as Vec}));
 const cells=adaptiveCollisionCells(points,{...settings,target:16,maxDepth:3});
 assert.equal(cells.length,1);assert.equal(cells[0].depth,3);
 assert.ok(Number.isFinite(cells[0].densityM3));assert.ok(cells[0].ions.length>16);
});

test('legacy missing-method configurations retain the fixed collision trajectories exactly',()=>{
 const c={...DEFAULT_DOUBLEWELL,particlesPerSpecies:32,duration:4e-6};
 const legacy=simulateDoublewell(c),explicit=simulateDoublewell({...c,collisionMethod:'fixed'});
 assert.deepEqual(legacy.history,explicit.history);
 assert.deepEqual(legacy.species,explicit.species);
 assert.deepEqual(legacy.conservation,explicit.conservation);
 assert.equal(legacy.spatialCollision.method,'fixed');
});

test('actual adaptive pulse preserves source/sink inventories and signed flux budgets while exposing numerical torque',()=>{
 const r=simulateDoublewell({...DEFAULT_DOUBLEWELL,collisionMethod:'adaptive',collisionTarget:32,
  particlesPerSpecies:64,duration:2e-5});
 assert.ok(r.collisions.pairs>100);
 assert.ok(r.collisions.maxPairSeparationM>0&&r.collisions.pairSeparationSquaredSumM2>0);
 for(const h of r.history)for(const s of h.species)assert.equal(s.active+s.wall+s.end+s.source,64);
 assert.ok(r.conservation.maxEnergyResidual<3e-6);
 assert.ok(r.conservation.maxCorrectedMomentumResidual<3e-6);
 assert.equal(r.spatialCollision.method,'adaptive');
 assert.ok(!r.metrics.some(m=>m.label.includes('Collision cell width')||m.label.includes('Axial cell length')));
 assert.equal(r.metrics.find(m=>m.label==='Adaptive target occupancy')!.value,32);
 const active=r.species.reduce((sum,s)=>sum+s.active,0),weight=r.spatialCollision.initial.representedInventory/128;
 assert.equal(r.spatialCollision.final.representedInventory,active*weight);
 assert.ok(r.assumptions.some(s=>s.includes('Position-selected leaves can bias density')));
});

test('density moment export separates empirical self-counting and preserves undefined empty-cell estimates',()=>{
 const cell={ions:[{},{},{}],volumeM3:4},d=collisionDensityDiagnostics([cell],2);
 assert.equal(d.empiricalDensitySquaredIntegral,9);
 assert.equal(d.selfExcludedDensitySquaredIntegral,6);
 const empty=collisionDensityDiagnostics([],2);
 assert.equal(empty.representedInventory,0);assert.equal(empty.markerMeanCellDensityM3,null);
 assert.equal(empty.minimumOccupancy,null);
 const r=simulateDoublewell({...DEFAULT_DOUBLEWELL,collisions:false,duration:1e-7});
 assert.ok(Number.isNaN(r.metrics.find(m=>m.label==='RMS pair separation')!.value));
});

test('locality settings enforce actual partition and configuration invariants',()=>{
 assert.throws(()=>adaptiveCollisionCells([{position:[2,0,0] as Vec}],settings),/inside/);
 assert.throws(()=>adaptiveCollisionCells([], {...settings,maxDepth:25}),/depth/);
 assert.throws(()=>validateDoublewell({...DEFAULT_DOUBLEWELL,collisionMethod:'unknown' as 'fixed'}),/locality/);
 assert.throws(()=>validateDoublewell({...DEFAULT_DOUBLEWELL,collisionTarget:2}),/locality/);
 assert.throws(()=>validateDoublewell({...DEFAULT_DOUBLEWELL,collisionMaxDepth:NaN}),/locality/);
});
