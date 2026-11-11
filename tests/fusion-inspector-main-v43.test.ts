import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {setupApparatus} from '../src/apparatus-ui.js';
import {setupComponentInspectors} from '../src/component-inspector.js';
import {fusionComponents} from '../src/component-catalog.ts';
import {componentDestination,appendComponentActions} from '../src/component-actions.js';

test('actual main fusion wiring publishes one action bar after primary part and generic readouts',async t=>{
 const dom=new JSDOM('<div id="model-apparatus"></div><div id="fusion-apparatus"></div><div id="tutorial-insights"></div><div id="separator-inspector"></div><details><div id="fusion-inspector"></div></details><svg class="beam-schematic"></svg><canvas id="scene"></canvas><select id="centrifuge-closure"><option value="corotating">Corotating</option></select>');
 const doc=dom.window.document;const previous=Object.getOwnPropertyDescriptor(globalThis,'IntersectionObserver');
 Object.defineProperty(globalThis,'IntersectionObserver',{configurable:true,value:class{observe(){}disconnect(){}}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'IntersectionObserver',previous);else Reflect.deleteProperty(globalThis,'IntersectionObserver');dom.window.close();});
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const inspect=source.slice(source.indexOf('function inspectComponent('),source.indexOf('const loadResearch='));
 const wiring=source.slice(source.indexOf('inspectors=setupComponentInspectors('),source.indexOf('const blanketExplorer='));
 const calls:unknown[]=[];
 const workspace={open:(panel:string)=>calls.push(['open',panel]),focusRelated:(panel:string,selector:string)=>calls.push(['focus',panel,selector])};
 const construct=new Function('$','THREE','setupComponentInspectors','setupApparatus','setupTutorialInsights','fusionComponents','componentDestination','appendComponentActions','workspace','document',`
  let inspectors,apparatus,tutorialInsights,fusionApparatus,hardware,camera,gpuReady=false;
  const experience={level:'2'},view='render',mode=()=> 'rotating',marathon={target:{focusSetting:selector=>workspace.focusRelated('target-settings',selector)}};
  ${inspect}
  ${wiring}
  return {inspectors,fusionApparatus};`);
 const app=construct((id:string)=>doc.getElementById(id),THREE,(options:any)=>setupComponentInspectors({...options,document:doc}),setupApparatus,()=>{},fusionComponents,componentDestination,appendComponentActions,workspace,doc);
 t.after(()=>app.fusionApparatus.dispose());
 // The part callback uses the actual wrapper path; generic synchronization happens first.
 app.fusionApparatus.select('target',true,{materialBasis:'Specific film material',geometryBasis:'Specific film geometry'},'LiT film');
 const primary=app.fusionApparatus.readout;
 assert.equal(primary.querySelector('h3').textContent,'LiT film');assert.match(primary.textContent,/Specific film material/);
 assert.equal(primary.querySelectorAll('.component-actions').length,1);
 assert.equal(calls.filter(value=>JSON.stringify(value)===JSON.stringify(['open','inspect'])).length,1);
 let bar=primary.querySelector('.component-actions');bar.children[0].click();bar.children[1].click();
 assert.ok(calls.some(value=>JSON.stringify(value)===JSON.stringify(['focus','target','#coupled-filmThicknessM'])));
 assert.ok(calls.some(value=>Array.isArray(value)&&value[0]==='focus'&&value[1]==='target'&&value[2]===undefined));
 // Native/generic selection must append actions after syncSelection replaces primary content.
 app.inspectors.fusion.select('substrate');
 assert.equal(primary.querySelector('h3').textContent,'Cooled substrate');
 assert.doesNotMatch(primary.textContent,/Specific film material/);assert.equal(primary.querySelectorAll('.component-actions').length,1);
 assert.equal(calls.filter(value=>JSON.stringify(value)===JSON.stringify(['open','inspect'])).length,2);
 bar=primary.querySelector('.component-actions');bar.children[0].click();
 assert.ok(calls.some(value=>JSON.stringify(value)===JSON.stringify(['focus','target','#coupled-backHeatTransferWM2K'])));
 assert.equal(doc.querySelector('#fusion-inspector .component-actions'),null);
});
