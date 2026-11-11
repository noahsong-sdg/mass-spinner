import test from 'node:test';
import assert from 'node:assert/strict';
import {HG197_HALF_LIFE_HOURS,HG197M_HALF_LIFE_HOURS,HG197M_IT_BRANCH,AU195_HALF_LIFE_DAYS,BLANKET_PAPER_CASE,mercury197Batch,mercury197GroundStateBatch,gold195ResidualFraction,blanketOpticalDepth} from '../src/blanket-reference.js';
import {setupBlanketExplorer} from '../src/blanket-ui.js';

test('ground-state decay matches half-life, conserves atoms and resolves very short cooldown',()=>{
 assert.deepEqual(mercury197GroundStateBatch(0),{mercury197:1,gold197:0});
 const half=mercury197GroundStateBatch(HG197_HALF_LIFE_HOURS);assert.equal(half.mercury197,.5);assert.equal(half.gold197,.5);
 for(const hours of [1e-15,1,64.14,500,1e8]){
  const a=mercury197GroundStateBatch(hours);assert.ok(a.mercury197>=0&&a.gold197>=0);
  assert.ok(Math.abs(a.mercury197+a.gold197-1)<2e-16);
  assert.ok(Math.abs(a.mercury197-2**(-hours/HG197_HALF_LIFE_HOURS))<2e-16);
 }
 assert.ok(mercury197GroundStateBatch(1e-15).gold197>0,'small daughter yield must not cancel');
 assert.deepEqual(mercury197GroundStateBatch(1e8),{mercury197:0,gold197:1});
});
test('independent impurity curve stays separate, normalized and has its documented half-life',()=>{
 assert.equal(gold195ResidualFraction(0),1);assert.equal(gold195ResidualFraction(AU195_HALF_LIFE_DAYS),.5);
 assert.ok(Math.abs(gold195ResidualFraction(10*AU195_HALF_LIFE_DAYS)-1/1024)<1e-18);
 for(const invalid of [-1,NaN,Infinity]){assert.throws(()=>mercury197GroundStateBatch(invalid),RangeError);assert.throws(()=>gold195ResidualFraction(invalid),RangeError);}
 assert.ok(Object.isFrozen(BLANKET_PAPER_CASE));
 assert.equal(BLANKET_PAPER_CASE.mercury198Enrichment,.9);assert.equal(BLANKET_PAPER_CASE.elementalMercuryAtomFraction,.85);
});
test('two-parent solution conserves atoms and agrees with independent midpoint ODE evolution',()=>{
 const lg=Math.LN2/HG197_HALF_LIFE_HOURS,lm=Math.LN2/HG197M_HALF_LIFE_HOURS;
 for(const f of [0,.25,1]){
  let g=1-f,m=f,a=0;const dt=.01,steps=50000;
  for(let i=0;i<steps;i++){
   const dg=HG197M_IT_BRANCH*lm*m-lg*g,dm=-lm*m,da=(1-HG197M_IT_BRANCH)*lm*m+lg*g;
   const gh=g+dt/2*dg,mh=m+dt/2*dm;
   g+=dt*(HG197M_IT_BRANCH*lm*mh-lg*gh);m+=dt*(-lm*mh);a+=dt*((1-HG197M_IT_BRANCH)*lm*mh+lg*gh);
  }
  const batch=mercury197Batch(500,f);
  assert.ok(Math.abs(batch.mercury197-g)<2e-10);assert.ok(Math.abs(batch.mercury197m-m)<2e-10);assert.ok(Math.abs(batch.gold197-a)<2e-10);
  for(const hours of [0,1e-15,.1,23.8,64.14,500,1e8]){
   const b=mercury197Batch(hours,f);assert.ok(Object.values(b).every(v=>v>=0&&v<=1));assert.ok(Math.abs(b.mercury197+b.mercury197m+b.gold197-1)<3e-16);
  }
 }
 for(const t of [0,.01,1,500]){const b=mercury197Batch(t),g=mercury197GroundStateBatch(t);assert.ok(Math.abs(b.gold197-g.gold197)<1e-16);assert.equal(b.mercury197,g.mercury197);assert.equal(b.mercury197m,0);}
 for(const f of [-1,1.01,NaN,Infinity])assert.throws(()=>mercury197Batch(1,f),RangeError);
});
test('optical-depth limits expose capture saturation versus declining per-inventory utilization',()=>{
 assert.deepEqual(blanketOpticalDepth(0),{interceptedFraction:0,inventoryUtilization:1});
 assert.ok(blanketOpticalDepth(1e-20).interceptedFraction>0);assert.equal(blanketOpticalDepth(1e-20).inventoryUtilization,1);
 assert.ok(Math.abs(blanketOpticalDepth(1).interceptedFraction-(1-1/Math.E))<1e-16);
 let previous=blanketOpticalDepth(0);for(const t of [.1,1,8,100]){const next=blanketOpticalDepth(t);assert.ok(next.interceptedFraction>previous.interceptedFraction);assert.ok(next.inventoryUtilization<previous.inventoryUtilization);previous=next;}
 for(const invalid of [-1,NaN,Infinity])assert.throws(()=>blanketOpticalDepth(invalid),RangeError);
});

class Node{
 children:Node[]=[];attributes:Record<string,string>={};events=new Map<string,()=>void>();
 textContent='';className='';id='';htmlFor='';type='';min:string|number='';max:string|number='';step:string|number='';value:string|number='';open=false;href='';
 constructor(public tag='div'){}
 append(...children:Node[]){this.children.push(...children);}replaceChildren(...children:Node[]){this.children=children;}
 setAttribute(k:string,v:string){this.attributes[k]=v;}addEventListener(k:string,f:()=>void){this.events.set(k,f);}
}
const all=(n:Node):Node[]=>[n,...n.children.flatMap(all)];
const text=(n:Node):string=>n.textContent+n.children.map(text).join(' ');
test('actual optional explorer handler updates both decay fractions and clears stale invalid plots',t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:(tag:string)=>new Node(tag),createElementNS:(_ns:string,tag:string)=>new Node(tag),
  createTextNode:(text:string)=>Object.assign(new Node('#text'),{textContent:text})}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 const host=new Node(),view=setupBlanketExplorer(host),input=all(host).find(n=>n.id==='blanket-cooldown-hours')!;
 assert.equal(view.panel.tag,'details');assert.equal(view.panel.open,false);assert.equal(view.render.id,'blanket-render');
 assert.match(text(host),/Ground-state/);assert.match(text(host),/initial mixture is assumed/);assert.match(text(host),/not recalculated/);
 const outputs=()=>all(host).filter(n=>n.tag==='output');assert.equal(outputs()[2].textContent,'100.000%');assert.equal(outputs()[4].textContent,'0.000%');
 for(const endpoint of [0,500,HG197_HALF_LIFE_HOURS]){
  input.value=endpoint;input.events.get('input')!();
  assert.equal(outputs()[2].textContent,`${(100*mercury197GroundStateBatch(endpoint).mercury197).toFixed(3)}%`);
  assert.equal(outputs()[4].textContent,`${(100*mercury197GroundStateBatch(endpoint).gold197).toFixed(3)}%`);
  assert.equal(all(host).filter(n=>n.tag==='svg').length,3);
  for(const n of all(host))for(const v of Object.values(n.attributes))assert.doesNotMatch(v,/NaN|Infinity/);
 }
 input.value=-1;input.events.get('input')!();assert.equal(outputs()[2].textContent,'—');assert.equal(outputs()[4].textContent,'—');
 assert.match(text(host),/requires finite nonnegative/);assert.equal(all(host).filter(n=>n.tag==='svg').length,2,'independent reference plots remain');
 input.value=64.14;input.events.get('input')!();assert.equal(outputs()[4].textContent,'50.000%');assert.equal(all(host).filter(n=>n.tag==='svg').length,3);
 const isomer=all(host).find(n=>n.id==='blanket-isomer-fraction')!;isomer.value=1;isomer.events.get('input')!();assert.notEqual(outputs()[4].textContent,'50.000%');
 const depth=all(host).find(n=>n.id==='blanket-optical-depth')!;const before=text(host).split('Frozen transport')[1].split('These figures')[0];
 for(const tau of [0,8]){depth.value=tau;depth.events.get('input')!();assert.equal(text(host).split('Frozen transport')[1].split('These figures')[0],before);}
 depth.value=-1;depth.events.get('input')!();assert.match(text(host),/Optical depth requires/);assert.equal(all(host).filter(n=>n.tag==='svg').length,2);
});
