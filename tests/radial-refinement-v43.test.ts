import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {radialRefinementSettings} from '../src/radial-refinement.js';
import {solveEquilibrium,type EquilibriumConfig} from '../src/equilibrium-model.js';
import {centrifugeDiagnostics} from '../src/centrifuge-diagnostics.js';

const config:EquilibriumConfig={radius:.48,rotationRadS:10000,ionTemperatureEV:5,electronTemperatureEV:5,bins:400,
 species:[{massU:20,chargeState:1,axisFraction:.5},{massU:22,chargeState:1,axisFraction:.5}]};

test('finest supported radial state has no reference, so no identical-grid estimate can execute',()=>{
 const finest={...config,bins:2000};
 assert.equal(radialRefinementSettings(finest),null);
 assert.equal(finest.bins,2000);
});

test('actual radial click handler refuses the cap and names the two executed grids',async()=>{
 const main=readFileSync('src/main.js','utf8'),start=main.indexOf("$('refine').addEventListener('click'");
 const end=main.indexOf("$('compare').addEventListener('click'",start);
 assert.ok(start>=0&&end>start,'Production refinement callback exists');
 for(const bins of [2000,400,1000]){
  let click:()=>Promise<void>=async()=>{throw new Error('Callback was not registered');};
  const executed:number[]=[],settings={...config,bins};
  const elements={refine:{disabled:false,addEventListener:(_event:string,handler:()=>Promise<void>)=>{click=handler;}},
   'refinement-status':{textContent:''},'radial-cut':{value:'.5'}};
  runInNewContext(main.slice(start,end),{
   $:(id:string)=>elements[id as keyof typeof elements],latest:{kind:'centrifuge',settings,result:solveEquilibrium(settings)},revision:1,
   refinementController:undefined,AbortController,radialRefinementSettings,numeric:(value:number)=>String(value),
   calculate:async(kind:string,fine:EquilibriumConfig)=>{assert.equal(kind,'centrifuge');executed.push(fine.bins!);return solveEquilibrium(fine);},
   equilibriumPresentation:(result:ReturnType<typeof solveEquilibrium>)=>({diagnostics:centrifugeDiagnostics(result)})
  });
  await click();
  if(bins===2000){
   assert.deepEqual(executed,[]);assert.equal(elements.refine.disabled,true);
   assert.match(elements['refinement-status'].textContent,/No finer supported grid; radial convergence unassessed/);
   assert.doesNotMatch(elements['refinement-status'].textContent,/inventory relative change/);
  }else{
   assert.deepEqual(executed,[bins*2]);assert.equal(elements.refine.disabled,false);
   assert.match(elements['refinement-status'].textContent,new RegExp(`${bins}\\s*→\\s*${bins*2}`));
   assert.match(elements['refinement-status'].textContent,/Radial quadrature check only/);
  }
 }
});

test('supported radial refinements preserve physics and execute strictly larger grids',()=>{
 for(const [coarseBins,fineBins]of [[400,800],[1000,2000],[1500,2000]]){
  const coarse={...config,bins:coarseBins},fine=radialRefinementSettings(coarse)!;
  assert.equal(fine.bins,fineBins);assert.ok(fine.bins>coarse.bins);
  assert.deepEqual(fine,{...coarse,bins:fineBins});
  const a=solveEquilibrium(coarse),b=solveEquilibrium(fine);
  assert.equal(a.profiles.length,coarseBins+1);assert.equal(b.profiles.length,fineBins+1);
  assert.notEqual(a.profiles.at(-1)!.ionDensities[0],a.profiles[0].ionDensities[0],'Nonuniform witness');
 }
});
