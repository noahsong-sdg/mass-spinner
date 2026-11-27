import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAY_DEFAULTS,readExperience} from '../src/experience-state.js';
import {setupExperience} from '../src/experience-ui.js';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import type {FuelRunState} from '../src/scenario-state.js';

test('legacy shared playground settings retain their fixed collisionless interpretation',()=>{
 const settings={field:.15,voltage:620,energy:3,massB:41};
 assert.deepEqual(readExperience('?level=1&v=1&field=.15&voltage=620&energy=3&massB=41'),
  {level:'1',settings,invalid:false});
});
test('stale, blank, nonfinite, out-of-range and off-step links restore the whole default experiment',()=>{
 for(const suffix of ['v=99&field=.2','v=1&field=','v=1&field=Infinity','v=1&field=1e999',
  'v=1&voltage=10000','v=1&voltage=401','v=1&massB=-4']){
  const state=readExperience('?level=1&'+suffix);assert.equal(state.invalid,true);assert.deepEqual(state.settings,PLAY_DEFAULTS);
 }
 assert.equal(readExperience('?level=2').level,'2');assert.equal(readExperience('?level=old').level,'2');
});
test('new sessions start at the centrifuge while implicit v1 introductory links retain their model',()=>{
 for(const search of ['', '?utm_source=shared','?level=obsolete'])assert.equal(readExperience(search).level,'2');
 assert.deepEqual(readExperience('?v=1&field=.15'),{level:'1',settings:{...PLAY_DEFAULTS,field:.15},invalid:false});
 for(const level of ['1','2','3','4'])assert.equal(readExperience('?level='+level).level,level);
});

test('playground pins its source, cancels old work and clears stale asynchronous share confirmation',async t=>{
 const nodes=new Map<string,any>();
 const node=(id:string)=>{
  if(!nodes.has(id))nodes.set(id,{value:'',checked:true,hidden:false,textContent:'',dataset:{},events:new Map(),
   addEventListener(type:string,fn:()=>unknown){this.events.set(type,fn);},setAttribute(){},dispatchEvent(){}});
  return nodes.get(id);
 };
 const buttons=['1','2','3','4'].map(level=>({...node('level-'+level),dataset:{level}}));
 const body=node('body');body.dataset={level:'1'};
 const document={body,getElementById:node,querySelectorAll:(selector:string)=>selector==='button[data-level]'?buttons:[body,...buttons]};
 const location={search:'?level=3',href:'https://example.com/?level=3'};
 let copied!:()=>void;
 const globals={document,location,navigator:{clipboard:{writeText:()=>new Promise<void>(resolve=>copied=resolve)}},history:{replaceState(_a:unknown,_b:unknown,url:URL){location.href=url.href;}}};
 for(const [key,value]of Object.entries(globals)){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
 }
 let cancelled=0,runs=0;
 const ui=setupExperience({invalidate:()=>cancelled++,selectMode:()=>runs++,showView:()=>{}});
 assert.equal(body.events.has('click'),false,'ordinary page clicks must not enter a level');
 node('neutral-density').value='1e18';node('mass-a').value='190';node('charge-b').value='3';
 buttons[0].events.get('click')();
 assert.equal(ui.level,'1');assert.equal(node('neutral-density').value,'0');
 assert.equal(node('mass-a').value,'40');assert.equal(node('charge-b').value,'1');
 assert.equal(node('resolution').value,'2e-8');assert.equal(node('particles').value,'96');
 assert.equal(node('random-seed').value,'42');assert.equal(node('system').value,'rotating');
 const pending=node('share-playground').events.get('click')();
 assert.equal(node('share-link').hidden,false);
 node('field').value='.2';ui.sync();copied();await pending;
 assert.equal(node('share-link').hidden,true);assert.equal(node('share-status').textContent,'');
 const before=runs;buttons[1].events.get('click')();
 assert.equal(ui.level,'2');assert.equal(node('live-update').checked,false);assert.equal(runs,before);
 assert.equal(cancelled,3);
});


test('tutorial undo validates pending inputs and history before context changes while sharing still requires acceptance',async t=>{
 const dom=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.org/?level=2'}),doc=dom.window.document;
 const controls=doc.createElement('div');controls.innerHTML='<select id="marathon-apparatus"><option value="centrifuge">Centrifuge</option><option value="source">Source</option></select><input id="fuel-currentA" type="number" min="0" max="0.2" value="0.031"><input id="fuel-durationS" type="number" min="0" max="60" value="1"><input id="fuel-thermal-enabled" type="checkbox" checked>';doc.body.append(controls);
 for(const [key,value]of Object.entries({document:doc,location:dom.window.location,history:dom.window.history,navigator:dom.window.navigator})){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
 }
 let history:FuelRunState={initialCurrentA:.03,events:[{timeS:.1,currentA:.031}],mode:'transport',timeS:.25};
 const flags:boolean[]=[];const ui=setupExperience({selectMode(){},invalidate(){},showView(){},fuelCentrifuge:{captureRun({validate=true}={}){flags.push(validate);if(validate)throw new Error('Wait for an accepted centrifuge run before sharing.');return structuredClone(history);},restoreRun(saved){if(saved)history=structuredClone(saved);}}});
 t.after(()=>{ui.dispose();dom.window.close();});
 const originalHistory=structuredClone(history);
 assert.throws(()=>ui.capture(),/accepted centrifuge run/);
 const saved=ui.capture({requireAccepted:false});assert.equal(saved.version,3);if(saved.version===3)assert.deepEqual(saved.fuelRun,originalHistory);
 assert.equal(saved.controls['fuel-currentA'],.031);assert.equal(saved.controls['fuel-thermal-enabled'],true);
 const apparatus=doc.getElementById('marathon-apparatus') as HTMLSelectElement;apparatus.value='source';apparatus.dispatchEvent(new dom.window.Event('change'));
 history={initialCurrentA:0,events:[],mode:'equilibrium',timeS:0};
 assert.equal(ui.restore(saved),true);assert.equal(apparatus.value,'centrifuge');assert.deepEqual(history,originalHistory);
 const current=doc.getElementById('fuel-currentA') as HTMLInputElement;current.value='.3';assert.throws(()=>ui.capture({requireAccepted:false}),/Invalid setting/);
 current.value='.031';history.events=[{timeS:2,currentA:.031}];assert.throws(()=>ui.capture({requireAccepted:false}),/Current events/);
 history=structuredClone(originalHistory);doc.getElementById('share-playground')!.click();await Promise.resolve();
 assert.match(doc.getElementById('share-status')!.textContent!,/accepted centrifuge run/);assert.equal(flags.at(-1),true);
});
