import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import ts from 'typescript';
import {createLazyScene} from '../src/legacy-scene.ts';

test('the real default static module graph excludes the legacy renderer and WebGPU backend',()=>{
 const visited=new Set<string>(),external=new Set<string>();
 function walk(file:string){
  if(visited.has(file))return;
  visited.add(file);
  const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  for(const statement of source.statements){
   if(!ts.isImportDeclaration(statement)&&!ts.isExportDeclaration(statement))continue;
   const specifier=statement.moduleSpecifier;
   if(!specifier||!ts.isStringLiteral(specifier))continue;
   const name=specifier.text;
   if(!name.startsWith('.')){external.add(name);continue;}
   let dependency=resolve(dirname(file),name);
   if(!existsSync(dependency)&&dependency.endsWith('.js'))dependency=dependency.slice(0,-3)+'.ts';
   if(['.js','.ts'].includes(extname(dependency)))walk(dependency);
  }
 }
 walk(resolve('src/main.js'));
 assert.equal(visited.has(resolve('src/legacy-renderer.js')),false);
 assert.equal(external.has('three/webgpu'),false);
 assert.ok(visited.has(resolve('src/legacy-scene.ts')),'the activation owner remains in the initial graph');
 assert.match(readFileSync('src/legacy-renderer.js','utf8'),/from 'three\/webgpu'/);
});

test('production first-use import deduplicates, cancels hidden initialization and rehydrates accepted state',async()=>{
 const source=readFileSync('src/main.js','utf8');
 const initialize=source.slice(source.indexOf('async function initScene()'),source.indexOf('function updateReadouts()'))
  .replace("import('./legacy-renderer.js')",'loadModule()');
 assert.match(initialize,/await loadModule\(\)/);
 const state={needed:false},counts={loads:0,created:0,initialized:0,disposed:0,cleared:0};
 let finishLoad!:(value:unknown)=>void,finishInit!:()=>void,startInit!:()=>void,accepted:unknown;
 const moduleReady=new Promise(resolve=>{finishLoad=resolve;});
 const initializing=new Promise<void>(resolve=>{startInit=resolve;});
 const module={createLegacyRenderer(options:any){
  counts.created++;
  return {async initScene(){counts.initialized++;await new Promise<void>(resolve=>{finishInit=resolve;startInit();});accepted=options.getLatest();},dispose(){counts.disposed++;}};
 }};
 const construct=new Function('$','loadModule','state','createLazyScene','counts',`
  let gpuReady=false,gpuFailed=false,legacyRenderer,latest=null,view='fields';
  const config=()=>({}),mode=()=> 'rotating',legacyNeeded=()=>state.needed,sceneVisibility=()=>{},inspectors={clear(){counts.cleared++;}};
  const rendererFailure=error=>{throw error;};
  ${initialize}
  const lazy=createLazyScene(legacyNeeded,initScene,rendererFailure);
  return {ensure:()=>lazy.ensure(),reset:()=>lazy.reset(),latest:value=>{latest=value;},ready:()=>gpuReady};`);
 const app=construct(()=>({}),()=>{counts.loads++;return moduleReady;},state,createLazyScene,counts);
 await app.ensure();assert.equal(counts.loads,0);
 state.needed=true;
 const first=app.ensure();assert.equal(app.ensure(),first);await Promise.resolve();assert.equal(counts.loads,1);
 state.needed=false;finishLoad(module);await first;
 assert.equal(counts.created,0,'hiding during import allocates no graphics resource');
 state.needed=true;
 const second=app.ensure();assert.equal(app.ensure(),second);
 await initializing;
 assert.equal(counts.created,1);assert.equal(counts.initialized,1);
 const latest={kind:'rotating',result:{tag:'newly accepted while loading'}};app.latest(latest);finishInit();await second;
 assert.equal(accepted,latest);assert.equal(app.ready(),true);
 await app.ensure();assert.equal(counts.created,1);
 app.reset();assert.equal(counts.disposed,1);assert.equal(counts.cleared,1);assert.equal(app.ready(),false);
});
