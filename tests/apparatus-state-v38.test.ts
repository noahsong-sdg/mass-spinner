import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {componentDestination,appendComponentActions} from '../src/component-actions.js';

test('component actions navigate original panels without editing model configuration',()=>{
 assert.deepEqual(componentDestination('target',{level:'2'}),{panel:'target',selector:'#coupled-filmThicknessM',settings:true});
 assert.equal(componentDestination('coils',{level:'3',model:'centrifuge',closure:'corotating'}).selector,null);
 assert.equal(componentDestination('coils',{level:'3',model:'centrifuge',closure:'magnetic-gaussian'}).selector,'#gaussian-field');
 assert.equal(componentDestination('electrodes',{level:'3',model:'centrifuge'}).selector,'#rotation');
 assert.equal(componentDestination('electrodes',{level:'3',model:'icr'}).selector,'#rf-amplitude');
 assert.equal(componentDestination('source',{level:'3',model:'icr'}).selector,'#energy');
 for(const id of ['vessel','insulators','seals','fittings','supports'])for(const model of ['rotating','icr','doublewell','doublewell-dynamics','gyro','curved'])assert.equal(componentDestination(id,{level:'3',model}).selector,null,`${model}: ${id}`);
 for(const id of ['beamline','support'])assert.deepEqual(componentDestination(id,{level:'2'}),{panel:'controls',selector:null});
 assert.equal(componentDestination('rf-source',{level:'2'}).selector,'#fusion-beamCurrentA');assert.equal(componentDestination('accelerator',{level:'2'}).selector,'#fusion-beamEnergyKeV');
 const dom=new JSDOM('<div id="readout"></div>'),node=dom.window.document.querySelector('#readout')!;let parameters=0,results=0;
 appendComponentActions(node,{parameters:()=>parameters++,results:()=>results++});appendComponentActions(node,{parameters:()=>parameters++,results:()=>results++});
 const buttons=node.querySelectorAll('button');assert.equal(buttons.length,2);buttons[0].click();buttons[1].click();assert.equal(parameters,1);assert.equal(results,1);
});
