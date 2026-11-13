import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupExperience} from '../src/experience-ui.js';

const html=readFileSync('index.html','utf8');

test('centrifuge is primary and the other three playgrounds are disclosed under Advanced',()=>{
 const nav=html.match(/<nav class="level-navigation"[^>]*>([\s\S]*?)<\/nav>/)![1];
 assert.deepEqual([...nav.matchAll(/<button data-level="(\d)" aria-pressed="(?:true|false)">([^<]+)<\/button>/g)]
  .map(match=>[match[1],match[2]]),[['2','Centrifuge'],['1','Mass Spinner'],['3','Models'],['4','Research']]);
 assert.match(nav,/<details id="advanced-simulators"[^>]*><summary>Advanced<\/summary>/);
 assert.match(nav,/<div id="advanced-marathon"><\/div>/);
 for(const text of ['Rotating ions & collection','Beam, target & neutron output','02 / BEAM–TARGET PLAYGROUND',
  'level-description','level-boundary','learning-path-heading','level-introduction'])assert.ok(!html.includes(text),text);
 assert.equal([...html.matchAll(/<h1\b/g)].length,1);
 assert.match(html,/<h1 id="level-title" class="visually-hidden">/);
 assert.ok(!html.match(/<div class="level-actions">[\s\S]*?<\/div>/)![0].includes('level-title'),
  'page heading must remain outside the share action hidden in advanced playgrounds');
});

test('scientific limits remain available while active errors and diagnostics stay outside disclosures',()=>{
 const sourceInfo=html.match(/<details class="fusion-model-notes model-info">([\s\S]*?)<\/details>/)![1];
 assert.match(sourceInfo,/^<summary>Model info<\/summary>/);
 assert.ok(sourceInfo.includes('not a calibrated Marathon machine'));
 assert.ok(sourceInfo.includes('Neither is a measured LiT energy scan'));
 assert.ok(sourceInfo.includes('Surface regeneration and fuel recycling do not produce replacement tritium'));
 assert.ok(sourceInfo.includes('https://www.marathonfusion.com/beam-driven-fusion/'));
 const statuses=new Set(['fusion-status','plot-status','model-validity','run-status','replay-status','share-status']);
 let depth=0;
 for(const tag of html.matchAll(/<\/?[a-z][^>]*>/gi)){
  if(/^<details\b/.test(tag[0]))depth++;
  if(/^<\/details>/.test(tag[0]))depth--;
  const id=tag[0].match(/\bid="([^"]+)"/)?.[1];
  if(id&&statuses.has(id)){assert.equal(depth,0,id+' must remain visible when populated');statuses.delete(id);}
  assert.ok(depth>=0,'unbalanced disclosure');
 }
 assert.equal(depth,0);assert.equal(statuses.size,0);
});

test('original controls keep their units, ranges and unique integration mounts',()=>{
 for(const [id,min,max,step]of [['field','0.04','0.25','0.01'],['voltage','0','800','20'],
  ['energy','0','20','0.5'],['play-mass-b','20','200','1']]){
  const input=html.match(new RegExp(`<input id="${id}"[^>]+>`))![0];
  for(const [name,value]of Object.entries({min,max,step}))assert.ok(input.includes(`${name}="${value}"`),id+' '+name);
  assert.ok(html.includes(`for="${id}"`));
 }
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(ids.length,new Set(ids).size,'no duplicate mount or control IDs');
 for(const id of ['experiment-label','experiment-title','experiment-subtitle','system-scope','equilibrium-caption',
  'fusion-apparatus','fusion-inspector','fusion-controls','fusion-readouts','target-exposure','target-loading',
  'replay-plots','separator-inspector'])assert.ok(ids.includes(id),id);
});

test('switching all playgrounds changes the accessible title without recreating subtitle nodes',t=>{
 const nodes=new Map<string,any>([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],{
  value:'',checked:true,hidden:false,textContent:'',dataset:{},events:new Map(),
  addEventListener(type:string,handler:()=>unknown){this.events.set(type,handler);},setAttribute(){},dispatchEvent(){},
 }]));
 const node=(id:string)=>{assert.ok(nodes.has(id),'handler requested absent DOM node: '+id);return nodes.get(id);};
 const buttons=['1','2','3','4'].map(level=>({dataset:{level},events:new Map(),
  addEventListener(type:string,handler:()=>unknown){this.events.set(type,handler);},setAttribute(){}}));
 const location={search:'?level=1',href:'https://example.com/?level=1'};
 const document={body:{dataset:{}},getElementById:(id:string)=>nodes.get(id)??null,querySelectorAll:()=>buttons};
 const globals={document,location,history:{replaceState(_a:unknown,_b:unknown,url:URL){location.href=url.href;}}};
 for(const [key,value]of Object.entries(globals)){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
 }
 const ui=setupExperience({invalidate(){},selectMode(){},showView(){},showResearch(){}});
 for(const [index,title]of ['Mass Spinner','Marathon centrifuge','Models','Research'].entries()){
  buttons[index].events.get('click')();
  assert.equal(ui.level,String(index+1));assert.equal(node('level-title').textContent,title);
  assert.equal(node('share-playground').hidden,false);
 }
});
