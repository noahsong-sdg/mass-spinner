import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createResearchLoader,setupResearchViewer} from '../src/research-ui.js';

class Node {
 children:Node[]=[];attributes:Record<string,string>={};events:Record<string,()=>void>={};
 textContent='';value='';disabled=false;
 constructor(public tag='div'){}
 append(...children:Node[]){this.children.push(...children);}
 replaceChildren(...children:Node[]){this.children=children;}
 setAttribute(key:string,value:string){this.attributes[key]=value;}
 addEventListener(key:string,handler:()=>void){this.events[key]=handler;}
}
function dom(t:any){
 const nodes=new Map<string,Node>(),get=(id:string)=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)!;};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{getElementById:get,
  createElement:(tag:string)=>new Node(tag),createElementNS:(_ns:string,tag:string)=>new Node(tag)}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 return get;
}
const packet=()=>JSON.parse(readFileSync('web-assets/research-recordings.json','utf8'));

test('recording load shares an active request and retries a failed first attempt',async()=>{
 let requests=0,finish!:(value:any)=>void;
 const viewer={data:'saved moments'},load=createResearchLoader(()=>{requests++;return new Promise(resolve=>{finish=resolve;});});
 const first=load(),same=load();assert.equal(first,same);await Promise.resolve();assert.equal(requests,1);
 finish(null);assert.equal(await first,null);
 const retry=load();await Promise.resolve();assert.equal(requests,2);finish(viewer);assert.equal(await retry,viewer);
 assert.equal(await load(),viewer);assert.equal(requests,2);
});

test('an unexpectedly rejected loading request can also be retried',async()=>{
 let requests=0;const viewer={data:'saved moments'},load=createResearchLoader(async()=>{if(++requests===1)throw new Error('network');return viewer;});
 await assert.rejects(load(),/network/);assert.equal(await load(),viewer);assert.equal(requests,2);
});

test('failed replay clears stale moments and retry restores exact saved data',async t=>{
 const get=dom(t),data=packet();let succeeds=false;
 const load=createResearchLoader(()=>setupResearchViewer(async()=>succeeds?{ok:true,json:async()=>data}:{ok:false}));
 get('replay-scale').textContent='old scale';get('replay-time-value').textContent='old time';get('replay-tensors').append(new Node('old tensor'));
 assert.equal(await load(),null);assert.equal(get('replay-case').disabled,true);assert.equal(get('replay-time').disabled,true);
 assert.equal(get('replay-scale').textContent,'');assert.equal(get('replay-time-value').textContent,'—');assert.equal(get('replay-tensors').children.length,0);
 succeeds=true;assert.ok(await load());assert.equal(get('replay-case').disabled,false);assert.equal(get('replay-time').disabled,false);
 get('replay-case').value=data.cases[2].id;get('replay-case').events.change();get('replay-time').value='20';get('replay-time').events.input();
 assert.equal(get('replay-tensors').children[0].children[1].textContent,data.cases[2].states[20].temperatureTensorEV[0].map((row:number[])=>row.map(v=>v.toPrecision(5).padStart(11)).join(' ')).join('\n'));
 assert.match(get('replay-status').textContent,/WITHHELD/);
});

test('all six replay components have distinct plotted and legend styles',async t=>{
 const get=dom(t),data=packet();await setupResearchViewer(async()=>({ok:true,json:async()=>data}));
 assert.equal(get('replay-plots').children.length,3);
 const expected=['#a4c4b1|','#a4c4b1|7 4','#a4c4b1|2 4','#d2956b|','#d2956b|7 4','#d2956b|2 4'];
 for(const figure of get('replay-plots').children){
  const svg=figure.children[1];
  const curves=svg.children.filter(n=>n.tag==='path'&&n.attributes['stroke-width']==='2'&&!n.attributes.d.endsWith('h20'));
  assert.deepEqual(curves.map(n=>`${n.attributes.stroke}|${n.attributes['stroke-dasharray']??''}`),expected);
  const legends=svg.children.filter(n=>n.tag==='path'&&n.attributes.d.endsWith('h20'));
  assert.deepEqual(legends.map(n=>`${n.attributes.stroke}|${n.attributes['stroke-dasharray']??''}`),expected);
 }
});
