import assert from 'node:assert/strict';
import test from 'node:test';
import {createFuelLiner,initialFuelLinerEnergy,advanceFuelThermal} from '../src/fuel-thermal.js';

const config={radiusM:.12,lengthM:.5,thicknessM:.012,cells:4};
const edges=[.12,.120001,.1201,.131999,.132];

test('explicit liner edges resolve thin interface cells without changing the full annulus',()=>{
 const grid=createFuelLiner({...config,radiusEdgesM:edges});
 assert.deepEqual(grid.radiusEdgesM,edges);
 assert.ok(Math.abs(grid.volumesM3.reduce((a,b)=>a+b,0)-Math.PI*.5*(.132**2-.12**2))<1e-17);
 edges[1]=.120002;
 assert.equal(grid.radiusEdgesM[1],.120001,'Caller edits cannot mutate an accepted grid');
 edges[1]=.120001;
 const next=advanceFuelThermal(grid,initialFuelLinerEnergy(grid,1000),500,.000678584,1e-8,
  {gasWallWK:1000,coolingWK:1,coolantK:500},()=>({gasEnergyJ:0,dragEnergyJ:0,payload:null}));
 assert.ok(next.gasK>500&&next.gasK<1000);
 assert.ok(next.minK>=500&&next.maxK<=1000);
 assert.ok(Math.abs(next.residualJ)<1e-7);
});

test('custom liner edges must match geometry and be strictly increasing',()=>{
 for(const radiusEdgesM of [edges.slice(1),[.119,.120001,.1201,.131999,.132],
  [.12,.120001,.1201,.131999,.133],[.12,.1201,.1201,.131999,.132],
  [.12,.121,.1201,.131999,.132],[.12,.120001,NaN,.131999,.132]]){
  assert.throws(()=>createFuelLiner({...config,radiusEdgesM}),RangeError);
 }
 assert.throws(()=>createFuelLiner({...config,cells:256,radiusEdgesM:edges}),RangeError);
 for(const invalid of [null,false,0,''])
  assert.throws(()=>createFuelLiner({...config,radiusEdgesM:invalid as unknown as number[]}),RangeError);
});

test('omitting explicit edges preserves the uniform grid exactly',()=>{
 assert.deepEqual(createFuelLiner(config).radiusEdgesM,
  Array.from({length:5},(_,i)=>config.radiusM+config.thicknessM*i/config.cells));
});

test('legacy uniform nonbinary spacing retains its original arithmetic',()=>{
 const legacy={...config,thicknessM:.1,cells:3};
 assert.deepEqual(createFuelLiner(legacy).radiusEdgesM,
  Array.from({length:4},(_,i)=>legacy.radiusM+legacy.thicknessM*i/legacy.cells));
});
