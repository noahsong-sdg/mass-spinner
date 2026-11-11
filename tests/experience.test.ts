import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAY_DEFAULTS,readExperience,playgroundLink} from '../src/experience-state.js';
import {setupExperience} from '../src/experience-ui.js';

test('shared playground settings round-trip without carrying advanced settings or an old fragment',()=>{
 const settings={field:.15,voltage:620,energy:3,massB:41};
 const link=playgroundLink('https://example.com/?level=3&neutral-density=1e18#failure-lab',settings);
 assert.deepEqual(readExperience(new URL(link).search),{level:'1',settings,invalid:false});
 assert.equal(new URL(link).hash,'');assert.ok(!link.includes('neutral-density'));
});
test('stale, blank, nonfinite, out-of-range and off-step links restore the whole default experiment',()=>{
 for(const suffix of ['v=99&field=.2','v=1&field=','v=1&field=Infinity','v=1&field=1e999',
  'v=1&voltage=10000','v=1&voltage=401','v=1&massB=-4']){
  const state=readExperience('?level=1&'+suffix);assert.equal(state.invalid,true);assert.deepEqual(state.settings,PLAY_DEFAULTS);
 }
 assert.equal(readExperience('?level=2').level,'2');assert.equal(readExperience('?level=old').level,'1');
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
