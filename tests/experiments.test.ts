import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CONFIG,simulate} from '../src/physics.js';
import {runOrbitStudy,studyConfigurations,type Study} from '../src/experiments.js';
import {studyCurves} from '../src/study-presentation.js';
const config={...DEFAULT_CONFIG,species:[{massU:40,chargeState:1},{massU:84,chargeState:1}],particlesPerSpecies:2,duration:1e-6};
const study:Study={kind:'scan',batches:4,parameter:'voltage',minimum:200,maximum:600,points:3};

test('scans snapshot actual operating points and change only the selected physical parameter',()=>{
 const points=studyConfigurations(config,study);
 assert.deepEqual(points.map(p=>p.config.voltage),[200,400,600]);
 const masses=studyConfigurations(config,{...study,parameter:'massB',minimum:50,maximum:100});
 assert.deepEqual(masses.map(p=>p.config.species![1].massU),[50,75,100]);
 assert.equal(config.species[1].massU,84);
 assert.throws(()=>studyConfigurations({...config,mode:'icr'},{...study}));
 assert.throws(()=>studyConfigurations(config,{...study,parameter:'massB',minimum:0}));
});

test('studies pair scan seeds, report completion and cannot publish after cancellation',async()=>{
 const calls:{seed:number;voltage:number}[]=[],progress:number[]=[];
 const result=await runOrbitStudy(config,study,new AbortController().signal,async c=>{
  calls.push({seed:c.seed,voltage:c.voltage});return simulate(c);
 },n=>progress.push(n));
 assert.equal(result.points.length,3);assert.equal(progress.at(-1),12);
 assert.equal(new Set(calls.slice(0,4).map(c=>c.seed)).size,4);
 assert.deepEqual(calls.slice(0,4).map(c=>c.seed),calls.slice(4,8).map(c=>c.seed));
 const curves=studyCurves(result);
 const cold=curves.filter(c=>c.yLabel.startsWith('Cold stability'));
 assert.equal(cold.length,3);
 assert.ok(Math.abs(cold[0].y[2]/cold[0].y[0]-3)<1e-12,'stability ratio scales with voltage');
 assert.ok(result.points.every(p=>p.coldReference?.species.every(s=>s.transitTimeS>0)));
 const recovery=curves.filter(c=>c.yLabel.startsWith('Injected-ion'));
 assert.equal(recovery.length,4);
 assert.ok(recovery.every(c=>c.low!.every((v,i)=>v<=c.y[i]&&c.high![i]>=c.y[i])));
 const controller=new AbortController();let count=0;
 await assert.rejects(runOrbitStudy(config,study,controller.signal,async c=>{
  count++;controller.abort();return simulate(c);
 }),{name:'AbortError'});
 assert.equal(count,1);
});
