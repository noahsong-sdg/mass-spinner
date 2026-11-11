import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupDoublewellControls,doublewellConfig} from '../src/doublewell-ui.js';
import {DEFAULT_DOUBLEWELL,simulateDoublewell,validateDoublewell} from '../src/doublewell-dynamics.js';
import {executeSeed,validateConvergencePlan,type ConvergencePlan} from '../src/convergence.js';

test('actual controls expose cumulative scattering and independent axial cells without losing baseline settings',t=>{
 const page=new JSDOM(readFileSync('index.html','utf8')),prior=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:page.window.document});
 t.after(()=>{page.window.close();if(prior)Object.defineProperty(globalThis,'document',prior);else Reflect.deleteProperty(globalThis,'document');});
 let edits=0;setupDoublewellControls(()=>edits++);
 const select=(key:string)=>page.window.document.getElementById('dw-'+key) as HTMLSelectElement;
 const change=(key:string,value:string)=>{select(key).value=value;select(key).dispatchEvent(new page.window.Event('change'));};
 assert.equal(select('collisionScattering').value,'takizuka-abe');
 assert.equal(doublewellConfig(DEFAULT_DOUBLEWELL.species).collisionScattering,'takizuka-abe','the UI records its legacy baseline explicitly');
 assert.equal(select('collisionAxialCells').disabled,true);
 assert.equal(doublewellConfig(DEFAULT_DOUBLEWELL.species).collisionAxialCells,undefined);
 change('collisionScattering','nanbu');change('collisionMethod','axisymmetric');change('collisionAxialCells','9');
 assert.equal(select('collisionAxialCells').disabled,false);
 const c=doublewellConfig(DEFAULT_DOUBLEWELL.species);
 assert.equal(c.collisionScattering,'nanbu');assert.equal(c.collisionAxialCells,9);assert.equal(edits,3);
 const r=simulateDoublewell({...c,particlesPerSpecies:16,duration:1e-6});
 assert.equal(r.scatteringMethod,'nanbu');assert.equal(r.spatialCollision.nominalAxialCells,9);
 assert.ok(r.assumptions.some(a=>a.includes('Higher angular moments')));
 change('collisionAxialCells','0');assert.equal(doublewellConfig(DEFAULT_DOUBLEWELL.species).collisionAxialCells,undefined);
 change('collisionMethod','fixed');assert.equal(select('collisionAxialCells').disabled,true);
});

test('omitted method retains legacy TA and collision-off dynamics are independent of sampler/locality settings',()=>{
 const base={...DEFAULT_DOUBLEWELL,particlesPerSpecies:32,duration:2e-6};
 const legacy=simulateDoublewell(base),explicit=simulateDoublewell({...base,collisionScattering:'takizuka-abe'});
 assert.equal(legacy.scatteringMethod,'takizuka-abe','omitted API settings remain the old method');
 for(const key of ['history','species','conservation','collisions'] as const)assert.deepEqual(explicit[key],legacy[key]);
 const off=simulateDoublewell({...base,collisions:false});
 const alternate=simulateDoublewell({...base,collisions:false,collisionScattering:'nanbu',collisionMethod:'axisymmetric',collisionAxialCells:9});
 for(const key of ['history','species','conservation','collisions'] as const)assert.deepEqual(alternate[key],off[key]);
 for(const collisionAxialCells of [0,-1,1.5,1025,NaN])assert.throws(()=>validateDoublewell({...base,collisionAxialCells}),/axial ring cells/);
 assert.throws(()=>validateDoublewell({...base,collisionScattering:'unknown' as never}),/TA or Nanbu/);
});

test('executed convergence geometry records independent axial count and rejects undeclared/coarsened changes',()=>{
 const base={...DEFAULT_DOUBLEWELL,particlesPerSpecies:16,duration:1e-7,collisionMethod:'axisymmetric' as const,collisionAxialCells:9};
 const run=executeSeed({id:'ring',config:base},101);
 assert.equal(run.status,'complete');assert.equal(run.numericalGeometry?.baseAxialCells,9);
 assert.equal(run.numericalGeometry?.baseAxialLengthM,base.length/9);
 assert.equal(run.raw?.spatialCollision.nominalAxialCells,9);
 const plan:ConvergencePlan={id:'independent-axes',description:'Declared settings only',seeds:[101,202],
  levels:[{id:'a',config:base},{id:'b',config:{...base,cellsAcross:6}}],comparisons:[{kind:'spatial',coarse:'a',fine:'b'}],
  tolerances:{fraction:.01,radiusFraction:.01,temperatureEV:.1,timeFraction:.02,normalizedAngularMomentum:.001,maxRawMomentumResidual:.001,maxUnresolvedExposure:.01,minimumSeeds:6}};
 validateConvergencePlan(plan);
 plan.levels[1].config={...base,collisionAxialCells:18};validateConvergencePlan(plan);
 plan.levels[1].config={...base,cellsAcross:6,collisionAxialCells:6};assert.throws(()=>validateConvergencePlan(plan),/improve/);
 plan.comparisons[0].kind='method';plan.levels[1].config={...base,collisionScattering:'nanbu'};validateConvergencePlan(plan);
 plan.levels[1].config={...base,collisionScattering:'takizuka-abe'};assert.throws(()=>validateConvergencePlan(plan),/executed collision/);
 plan.comparisons[0].kind='timestep';plan.levels[1].config={...base,dt:base.dt/2,collisionScattering:'nanbu'};
 assert.throws(()=>validateConvergencePlan(plan),/undeclared/);
});
