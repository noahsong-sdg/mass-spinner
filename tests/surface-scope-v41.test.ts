import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {simulateCoupledTarget,DEFAULT_COUPLED_TARGET} from '../src/coupled-target.js';
import {DEFAULT_FUSION_BEAM} from '../src/fusion-reactor.js';
import {surfaceState} from '../src/surface-state.js';
import {createSurfaceLayer} from '../src/surface-layer.js';

function scenario(targetColumnM2:number){
 const source={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,
  materialColumnM2:1e21,targetColumnM2,beamAreaM2:.001,beamCurrentA:.001,exposureS:.01};
 const config={...DEFAULT_COUPLED_TARGET,depthCells:2,backingCells:1,samples:10,cooldownS:0,maxStepS:.01};
 const result=simulateCoupledTarget(source,config);
 const request={model:'beam-target',settings:config,result,acceptedModel:'beam-target',acceptedSettings:config,
  source,acceptedSource:source,selectedState:result.final};
 return {source,config,result,request};
}

test('target surface preserves D–T reaction identity and omitted branches in the actual 3D inspector',()=>{
 for(const column of [0,1e21]){
  const {config,result,request}=scenario(column),packet=surfaceState(request);
  assert.equal(packet.status,'ready');if(packet.status!=='ready')throw new Error(packet.reason);
  const scalar=packet.snapshot.scalars.find(value=>value.id==='neutron-rate');
  assert.ok(scalar);assert.equal(scalar.value,result.final.neutronRateS);
  assert.equal(scalar.label,'D–T neutron rate');
  assert.ok(packet.snapshot.unsupported.includes(result.reactionOutput.limitation));
  if(column===0){assert.equal(scalar.value,0);assert.ok(result.final.deuteriumFraction.every(value=>value===1));}
  const dom=new JSDOM('<main></main>'),layer=createSurfaceLayer(dom.window.document.querySelector('main')!);
  try{
   layer.update(packet,config);
   assert.match(layer.panel.textContent!,/D–T neutron rate /);
   const info=[...layer.panel.querySelectorAll('details')].find(node=>node.querySelector('summary')?.textContent==='Model info');
   assert.ok(info);assert.ok(info.textContent!.includes(result.reactionOutput.limitation));
   assert.match(info.textContent!,/D–D branches are omitted/);
  }finally{layer.dispose();dom.window.close();}
 }
});

test('older or unsupported target reaction metadata cannot publish a generic neutron scalar',()=>{
 const {request,result}=scenario(0);
 for(const reactionOutput of [undefined,{...result.reactionOutput,reaction:'D–D'},{...result.reactionOutput,limitation:''}]){
  const packet=surfaceState({...request,result:{...result,reactionOutput}});
  assert.equal(packet.status,'invalid');if(packet.status!=='invalid')throw new Error('Missing reaction scope was accepted.');
  assert.match(packet.reason,/reaction scope/);
 }
});

test('published coverage distinguishes current coupled target, retained references and bounded material studies',()=>{
 const coverage=readFileSync('web-assets/CORE-COVERAGE.md','utf8');
 const rows=coverage.split('\n').filter(line=>line.startsWith('|'));
 const coupled=rows.find(line=>line.startsWith('| Coupled target evolution |'));
 assert.ok(coupled);assert.match(coupled,/depth-resolved conduction/);assert.match(coupled,/temperature-dependent diffusion/);
 assert.match(coupled,/renewal/);assert.match(coupled,/recomputed.*stopping/);assert.match(coupled,/uncalibrated/);
 const references=rows.find(line=>line.startsWith('| Retained target references |'));
 assert.ok(references);assert.match(references,/bulk/);assert.match(references,/well-mixed/);assert.match(references,/not the live coupled target/);
 const film=rows.find(line=>line.startsWith('| Finite-film implantation reference |'));
 assert.ok(film);assert.match(film,/recorded/);assert.match(film,/not a live retention law/);
 assert.match(coverage,/D–D branches are omitted/);
 assert.match(coverage,/H-1 first-capture/);assert.match(coverage,/does not change the generic-ion separator/);
});
