import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {setupStudies} from '../src/study-ui.js';
import {renderPlots} from '../src/laboratory.js';
import {DEFAULT_CONFIG,simulate,type RunConfig} from '../src/physics.js';

// Source-unit harness only: real study orchestration, summaries, curves and export
// handler; no browser, network, Worker implementation or deployed-page access.
class Element {
 value:string|number='';disabled=false;hidden=false;textContent='';href='';download='';
 children:Element[]=[];attributes:Record<string,string>={};
 listeners=new Map<string,((event:unknown)=>unknown)[]>();
 constructor(public tag='div'){}
 addEventListener(type:string,callback:(event:unknown)=>unknown){
  this.listeners.set(type,[...(this.listeners.get(type)??[]),callback]);
 }
 append(...children:Element[]){this.children.push(...children);}
 replaceChildren(...children:Element[]){this.children=children;}
 setAttribute(name:string,value:string){this.attributes[name]=value;}
 fire(type:string){return Promise.all((this.listeners.get(type)??[]).map(callback=>callback({target:this})));}
 click(){return this.disabled?Promise.resolve([]):this.fire('click');}
}
type Pending={config:RunConfig;signal:AbortSignal;resolve:(result:ReturnType<typeof simulate>)=>void};
function harness(t:TestContext){
 const ids=['repeat-study','scan-study','cancel-study','export-study','study-plots','study-metrics','study-status',
  'study-batches','scan-parameter','scan-min','scan-max','scan-points','study-panel'];
 const elements=new Map(ids.map(id=>[id,new Element()]));
 const get=(id:string)=>elements.get(id)!;
 get('study-batches').value='4';get('scan-parameter').value='voltage';
 get('scan-min').value='200';get('scan-max').value='600';get('scan-points').value='3';
 const originalDocument=(globalThis as unknown as {document?:unknown}).document;
 const anchors:Element[]=[],blobs:Blob[]=[];
 (globalThis as unknown as {document:unknown}).document={getElementById:get,
  createElement:(tag:string)=>{const el=new Element(tag);if(tag==='a')anchors.push(el);return el;},
  createElementNS:(_namespace:string,tag:string)=>new Element(tag)};
 t.after(()=>{(globalThis as unknown as {document?:unknown}).document=originalDocument;});
 t.mock.method(URL,'createObjectURL',(blob:Blob)=>{blobs.push(blob);return `blob:study-${blobs.length}`;});
 t.mock.method(URL,'revokeObjectURL',()=>{});
 // Revoke scheduling itself is not under test; don't leave a one-second timer.
 t.mock.method(globalThis,'setTimeout',((callback:()=>void)=>{callback();return 0;}) as typeof setTimeout);
 let mode='rotating';
 let config:RunConfig={...DEFAULT_CONFIG,mode:'rotating',particlesPerSpecies:2,duration:1e-6,
  species:[{massU:40,chargeState:1},{massU:84,chargeState:1}]};
 const pending:Pending[]=[];
 const ui=setupStudies(()=>mode,()=>structuredClone(config),(_selected:string,c:RunConfig,signal:AbortSignal)=>
  new Promise<ReturnType<typeof simulate>>(resolve=>pending.push({config:c,signal,resolve})));
 ui.invalidate();
 return {get,ui,pending,blobs,anchors,setConfig:(next:RunConfig)=>{config=next;},getConfig:()=>config,
  setMode:(next:string)=>{mode=next;}};
}
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
const resolve=(p:Pending)=>p.resolve(simulate(p.config));

test('settings invalidation prevents a late worker from rendering or exporting stale study output',async t=>{
 const h=harness(t),run=h.get('repeat-study').click();
 assert.equal(h.pending.length,1);assert.equal(h.get('repeat-study').disabled,true);
 const old=h.pending[0];
 h.setConfig({...h.getConfig(),voltage:600});h.ui.invalidate();
 assert.equal(old.signal.aborted,true);assert.equal(h.get('export-study').disabled,true);
 resolve(old);await run;
 assert.equal(h.get('study-plots').children.length,0);assert.equal(h.get('study-metrics').textContent,'');
 assert.match(h.get('study-status').textContent,/Settings changed/);
 // Even a synthetic click, which bypasses the disabled-button user boundary,
 // cannot export the obsolete private result.
 await h.get('export-study').fire('click');assert.equal(h.blobs.length,0);
 assert.equal(h.get('repeat-study').disabled,false);assert.equal(h.get('scan-study').disabled,false);
});

test('cancelling a partially completed study publishes nothing and a subsequent study exports a complete snapshot',async t=>{
 const h=harness(t),cancelled=h.get('repeat-study').click();
 resolve(h.pending[0]);await flush();
 assert.equal(h.pending.length,2);assert.match(h.get('study-status').textContent,/Completed 1\/4/);
 assert.equal(h.get('export-study').disabled,true);
 const late=h.pending[1];await h.get('cancel-study').click();
 assert.equal(late.signal.aborted,true);resolve(late);await cancelled;
 assert.equal(h.get('study-plots').children.length,0);
 assert.match(h.get('study-status').textContent,/cancelled; no partial result published/);
 await h.get('export-study').fire('click');assert.equal(h.blobs.length,0);

 h.setConfig({...h.getConfig(),voltage:500});
 const complete=h.get('repeat-study').click();
 for(let i=2;i<6;i++){assert.ok(h.pending[i]);resolve(h.pending[i]);await flush();}
 await complete;
 assert.equal(h.pending.length,6);assert.ok(h.get('study-plots').children.length>0);
 assert.equal(h.get('export-study').disabled,false);assert.equal(h.get('cancel-study').disabled,true);
 assert.match(h.get('study-status').textContent,/Complete · 4 independent batches/);
 await h.get('export-study').click();
 assert.equal(h.blobs.length,1);assert.equal(h.anchors.at(-1)!.download,'mass-spinner-study.json');
 const payload=JSON.parse(await h.blobs[0].text());
 assert.equal(payload.settings.voltage,500);assert.equal(payload.result.points.length,1);
 assert.equal(payload.result.points[0].summary.runs,4);
 assert.equal(payload.result.points[0].summary.species[0].injected,8);
 assert.equal(new Set(payload.result.seeds).size,4);
});

test('study-control changes cancel active work and switching to ICR resets the inapplicable DC scan range',async t=>{
 const h=harness(t),run=h.get('scan-study').click();
 h.get('study-batches').value='8';await h.get('study-batches').fire('input');
 assert.equal(h.pending[0].signal.aborted,true);resolve(h.pending[0]);await run;
 assert.equal(h.get('export-study').disabled,true);assert.equal(h.get('study-plots').children.length,0);
 h.setMode('icr');h.ui.show('icr');
 assert.equal(h.get('study-panel').hidden,false);assert.equal(h.get('scan-parameter').value,'magneticT');
 assert.equal(Number(h.get('scan-min').value),.06);assert.equal(Number(h.get('scan-max').value),.16);
 h.ui.show('centrifuge');assert.equal(h.get('study-panel').hidden,true);
});

test('an obsolete study settling during a new study cannot release its buttons or overwrite its status',async t=>{
 const h=harness(t),old=h.get('repeat-study').click();
 h.ui.invalidate();
 const current=h.get('repeat-study').click();
 assert.equal(h.pending.length,2);
 resolve(h.pending[0]);await old;
 assert.equal(h.get('repeat-study').disabled,true);assert.equal(h.get('scan-study').disabled,true);
 assert.equal(h.get('cancel-study').disabled,false);assert.equal(h.get('export-study').disabled,true);
 assert.match(h.get('study-status').textContent,/Running independent worker jobs/);
 for(let i=1;i<5;i++){resolve(h.pending[i]);await flush();}
 await current;
 assert.equal(h.get('export-study').disabled,false);assert.match(h.get('study-status').textContent,/Complete · 4/);
});


test('plot uncertainty bands remain separate across null and NaN bounds',t=>{
 const h=harness(t),host=h.get('study-plots');
 renderPlots(host,[{label:'Purity',x:[0,1,2,3,4,5,6,7],y:[.5,.5,.5,.5,.5,.5,.5,.5],
  low:[.4,.4,null,.4,.4,NaN,.4,.4],high:[.6,.6,null,.6,.6,NaN,.6,.6],
  xLabel:'Parameter',yLabel:'Purity'}]);
 const svg=host.children[0].children.find(child=>child.tag==='svg')!;
 const bands=svg.children.filter(child=>child.tag==='polygon');
 assert.equal(bands.length,3);
 const ranges=bands.map(band=>{
  const points=band.attributes.points.split(' ').map(pair=>pair.split(',').map(Number));
  assert.equal(points.length,4);assert.ok(points.flat().every(Number.isFinite));
  const xs=points.map(point=>point[0]);return [Math.min(...xs),Math.max(...xs)];
 });
 assert.deepEqual(ranges,[[75,75+675/7],[75+675*3/7,75+675*4/7],[75+675*6/7,750]]);
 assert.ok(ranges[0][1]<ranges[1][0]&&ranges[1][1]<ranges[2][0]);
});
