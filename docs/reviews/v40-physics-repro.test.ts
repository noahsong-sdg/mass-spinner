// Audit witness: copy this file to audit-tests/ before VM execution so the
// production imports below resolve. It asserts the observed metadata loss,
// not the desired corrected behavior; it is not a permanent regression gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {simulateCoupledTarget,DEFAULT_COUPLED_TARGET} from '../src/coupled-target.ts';
import {DEFAULT_FUSION_BEAM} from '../src/fusion-reactor.ts';
import {surfaceState} from '../src/surface-state.ts';
import {createSurfaceLayer} from '../src/surface-layer.js';

test('audit witness: D-rich zero-T surface loses the production D–T-only neutron scope',()=>{
 const source={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,
  materialColumnM2:1e21,targetColumnM2:0,beamAreaM2:.001,beamCurrentA:.001,exposureS:.01};
 const config={...DEFAULT_COUPLED_TARGET,depthCells:2,backingCells:1,
  samples:10,cooldownS:0,maxStepS:.01};
 const result=simulateCoupledTarget(source,config);
 assert.equal(result.reactionOutput.reaction,'D–T');
 assert.match(result.reactionOutput.limitation,/D–D branches are omitted/);
 assert.ok(result.history.every(state=>state.tritiumFraction.every(t=>t===0)
  &&state.deuteriumFraction.every(d=>d===1)&&state.neutronRateS===0));
 const packet=surfaceState({model:'beam-target',settings:config,result,
  acceptedModel:'beam-target',acceptedSettings:config,source,acceptedSource:source,
  selectedState:result.initial});
 assert.equal(packet.status,'ready');
 if(packet.status!=='ready')throw new Error(packet.reason);
 assert.equal(packet.snapshot.scalars.find(s=>s.id==='neutron-rate')?.value,0);
 assert.ok(!packet.snapshot.unsupported.some(text=>text.includes('D–D')));
 const dom=new JSDOM('<main></main>');
 const layer=createSurfaceLayer(dom.window.document.querySelector('main')!);
 try{
  layer.update(packet,config);
  assert.match(layer.panel.textContent!,/neutron rate 0 s⁻¹ \(whole assembly\)/);
  assert.doesNotMatch(layer.panel.textContent!,/D–T|D–D/);
 }finally{layer.dispose();dom.window.close();}
});
