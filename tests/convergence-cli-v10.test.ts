import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DEFAULT_DOUBLEWELL} from '../src/doublewell-dynamics.js';
import {validateConvergencePlan} from '../src/convergence.js';

const runner=resolve('scripts/run-convergence.ts');
const run=(args:string[])=>spawnSync(process.execPath,['--import','tsx',runner,...args],{encoding:'utf8'});
const plan={id:'cli-regression',description:'Small controlled runner test',seeds:[11,22],
 levels:[{id:'tiny',config:{...DEFAULT_DOUBLEWELL,particlesPerSpecies:8,collisions:false,dt:1e-7,duration:1e-7}}],
 comparisons:[],tolerances:{fraction:.01,radiusFraction:.01,temperatureEV:.1,timeFraction:.02,
 normalizedAngularMomentum:.001,maxRawMomentumResidual:.001,maxUnresolvedExposure:.01,minimumSeeds:2}};

test('version-10 prospective plans preserve released physical case, seeds and error budgets',()=>{
 const prior=JSON.parse(readFileSync('assets/convergence-default-200us-v1.summary.json','utf8')).plan;
 const numerical=new Set(['particlesPerSpecies','cellsAcross','dt','seed','collisions','collisionMethod','collisionSourceAligned','randomSource']);
 const physical=(c:object)=>Object.fromEntries(Object.entries(c).filter(([k])=>!numerical.has(k)).sort(([a],[b])=>a.localeCompare(b)));
 assert.deepEqual(physical(DEFAULT_DOUBLEWELL),physical(prior.levels[0].config));
 for(const file of ['assets/convergence-axisymmetric-refinement-plan-v10.json','assets/convergence-axisymmetric-fine-dt-plan-v10.json']){
  const declared=JSON.parse(readFileSync(file,'utf8'));validateConvergencePlan(declared);
  assert.deepEqual(declared.seeds,prior.seeds);assert.deepEqual(declared.tolerances,prior.tolerances);
  for(const level of declared.levels){
   assert.deepEqual(physical(level.config),physical(prior.levels[0].config));
   assert.equal(level.config.collisionMethod,'axisymmetric');assert.equal(level.config.collisionSourceAligned,true);
   assert.ok(2*level.config.particlesPerSpecies*Math.ceil(level.config.duration/level.config.dt)<=8e7);
  }
 }
});

test('convergence CLI rejects unsupported methods and ambiguous custom-plan overrides before running',()=>{
 for(const args of [['--method','ignored'],['--plan','missing.json'],['--plan','missing.json','--output','unused.json','--method','axisymmetric'],['--source-aligned']]){
  const result=run(args);assert.notEqual(result.status,0);
  assert.match(result.stderr,/Use --method|Custom plans require|requires --method axisymmetric/);
 }
});

test('convergence CLI preserves existing historical raw, compact and Markdown evidence',()=>{
 const directory=mkdtempSync(join(tmpdir(),'mass-spinner-convergence-'));
 try{
  const input=join(directory,'plan.json');writeFileSync(input,JSON.stringify(plan));
  for(const suffix of ['.json','.summary.json','.md']){
   const output=join(directory,'evidence.json'),existing=join(directory,'evidence'+suffix);
   const stale='Historical version-9 evidence: do not replace';writeFileSync(existing,stale);
   const result=run(['--plan',input,'--output',output]);
   assert.notEqual(result.status,0);assert.match(result.stderr,/Refusing to overwrite/);
   assert.equal(readFileSync(existing,'utf8'),stale);rmSync(existing);
  }
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('custom convergence CLI executes declared case and exports current version and source identity',()=>{
 const directory=mkdtempSync(join(tmpdir(),'mass-spinner-convergence-'));
 try{
  const input=join(directory,'plan.json'),output=join(directory,'result.json');
  writeFileSync(input,JSON.stringify(plan));
  const result=run(['--plan',input,'--output',output]);assert.equal(result.status,0,result.stderr);
  const artifact=JSON.parse(readFileSync(output,'utf8'));
  assert.equal(artifact.modelVersion,10);assert.equal(artifact.schemaVersion,1);
  assert.deepEqual(artifact.plan,plan);assert.equal(artifact.runs.length,2);
  assert.equal(artifact.summary.status,'unknown');
  assert.ok(artifact.sourceFiles['scripts/run-convergence.ts']);
  for(const executed of artifact.runs){assert.equal(executed.status,'complete');assert.equal(executed.sourceHash,artifact.sourceHash);assert.equal(executed.executionMode,'interactive');}
  assert.ok(!artifact.summary.checks.some((check:{name:string;status:string})=>check.name.endsWith(': complete batch')&&check.status==='fail'));
  assert.equal(JSON.parse(readFileSync(output.replace('.json','.summary.json'),'utf8')).sourceHash,artifact.sourceHash);
  assert.match(readFileSync(output.replace('.json','.md'),'utf8'),/Gate: UNKNOWN/);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('custom convergence CLI forwards declared research mode to the actual whole runs',()=>{
 const directory=mkdtempSync(join(tmpdir(),'mass-spinner-convergence-'));
 try{
  const input=join(directory,'plan.json'),output=join(directory,'result.json');
  const research={...plan,executionMode:'research'};writeFileSync(input,JSON.stringify(research));
  const result=run(['--plan',input,'--output',output]);assert.equal(result.status,0,result.stderr);
  const artifact=JSON.parse(readFileSync(output,'utf8'));
  assert.deepEqual(artifact.plan,research);assert.equal(artifact.runs.length,2);
  for(const executed of artifact.runs){assert.equal(executed.status,'complete');assert.equal(executed.executionMode,'research');}
  assert.ok(!artifact.summary.checks.some((check:{name:string;status:string})=>check.name.endsWith(': complete batch')&&check.status==='fail'));
  assert.equal(artifact.summary.status,'unknown','Tiny smoke cases cannot establish scientific convergence.');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
