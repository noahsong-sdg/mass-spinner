import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPlots} from '../src/laboratory.js';
import {requestSimulation} from '../src/worker-client.js';
import {gaussianCentrifuge} from '../src/gaussian-centrifuge.js';
import {equilibriumPresentation} from '../src/focused-diagnostics.js';

// Executes the actual SVG generator without a browser, network or GPU.
class Element {
 children:Element[]=[];attributes:Record<string,string>={};textContent='';className='';
 constructor(public tag='div'){}
 append(...children:Element[]){this.children.push(...children);}
 replaceChildren(...children:Element[]){this.children=children;}
 setAttribute(key:string,value:string){this.attributes[key]=value;}
 addEventListener(){}
}

test('constant nonzero scientific plots preserve their SI magnitude instead of padding by an arbitrary unit',t=>{
 const before=(globalThis as unknown as {document?:unknown}).document;
 (globalThis as unknown as {document:unknown}).document={createElement:(tag:string)=>new Element(tag),
  createElementNS:(_ns:string,tag:string)=>new Element(tag)};
 t.after(()=>{(globalThis as unknown as {document?:unknown}).document=before;});
 const ticksFor=(value:number,curve?:{label:string;x:number[];y:number[];xLabel:string;yLabel:string})=>{
  const host=new Element();
  renderPlots(host,[curve??{label:'Pθ',x:[0,1,2],y:[value,value,value],xLabel:'Time (ms)',yLabel:'Mean Pθ (kg m²/s)'}]);
  const svg=host.children[0].children.find(c=>c.tag==='svg')!;
  return svg.children.filter(c=>c.tag==='text'&&c.attributes.x==='65').map(c=>Number(c.textContent));
 };
 for(const value of [2e-23,-2e-23]){
  const ticks=ticksFor(value);assert.equal(ticks.length,5);
  assert.ok(ticks.every(v=>Math.abs(v-value)<.2*Math.abs(value)),`A constant ${value} SI curve should remain on its physical scale; got ${ticks}`);
 }
 assert.deepEqual(ticksFor(0),[-1,-.5,0,.5,1],'An identically zero curve keeps its existing finite fallback axis');
 const result=gaussianCentrifuge({radius:.2,rotationRadS:0,ionTemperatureEV:5,electronTemperatureEV:5,
  magneticT:.06,densityWidthM:.1,axisDensityM3:1e18,bins:10,
  species:[{massU:40,chargeState:1,axisFraction:.5},{massU:84,chargeState:1,axisFraction:.5}]});
 const inertia=equilibriumPresentation(result,.7).curves.find(c=>c.yLabel==='Omitted electron-inertia force ratio')!;
 assert.equal(new Set(inertia.y).size,1,'The actual zero-rotation Gaussian closure has constant omitted-inertia ratio');
 assert.ok(ticksFor(inertia.y[0],inertia).every(v=>Math.abs(v-inertia.y[0])<.2*inertia.y[0]));
});

test('a synchronous worker-message failure rejects and releases the allocated worker',async()=>{
 let terminated=0;
 const controller=new AbortController();
 const worker={onmessage:null,onerror:null,postMessage:()=>{throw new DOMException('Message cannot be cloned','DataCloneError');},terminate:()=>terminated++};
 await assert.rejects(requestSimulation({},controller.signal,()=>worker as unknown as Worker),{name:'DataCloneError'});
 assert.equal(terminated,1,'Failed submission must not retain its allocated worker');
 controller.abort();assert.equal(terminated,1,'Failed submission must remove its abort listener');
});
