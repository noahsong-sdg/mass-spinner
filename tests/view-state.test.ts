import test from 'node:test';
import assert from 'node:assert/strict';
import {rendererPresentation} from '../src/view-state.js';
test('apparatus selection hides all live render surfaces independently of GPU readiness or failure',()=>{
 for(const ready of [false,true])for(const failed of [false,true]){
  const state=rendererPresentation('rotating',ready,failed,true,true);
  assert.equal(state.canvasHidden,true);assert.equal(state.posterHidden,true);assert.equal(state.loadingHidden,true);
  assert.equal(state.status,'');
 }
 assert.equal(rendererPresentation('rotating',true,false,true,false).canvasHidden,false);
});
test('failed GPU reports its error without substituting a static image',()=>{
 const first=rendererPresentation('rotating',false,true,false);
 assert.equal(first.canvasHidden,true);assert.equal(first.posterHidden,true);assert.equal(first.status,'3D unavailable');
 assert.equal(rendererPresentation('centrifuge',false,true,false).posterHidden,true);
 assert.deepEqual(rendererPresentation('icr',false,true,false),first);
});
test('initialization keeps the static poster hidden; chart-only models do not expose a hidden live canvas',()=>{
 assert.equal(rendererPresentation('rotating',false,false,true).posterHidden,true);
 const live=rendererPresentation('rotating',true,false,true);assert.equal(live.canvasHidden,false);assert.equal(live.posterHidden,true);assert.match(live.status,/WebGPU/);
 assert.match(rendererPresentation('icr',true,false,false).status,/WebGL2/);
 for(const mode of ['centrifuge','gyro','doublewell-dynamics','ionization','rotatingmagnetic'])assert.equal(rendererPresentation(mode,true,false,true).canvasHidden,true);
});
