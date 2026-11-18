import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createReactorHeatInset} from '../src/reactor-heat-inset.js';
import type {BeamMotionState} from '../src/reactor-motion.js';

function selected(overrides:Partial<BeamMotionState>={}):BeamMotionState{
 return {kind:'beam',basis:'selected target state',timeS:1,energyKeV:100,areaM2:.02,
  particleRateS:0,neutronRateS:0,neutronEnergyMeV:null,depositedPowerW:0,
  temperatureK:[700,600,450,400],heatFacesWM2:[0,100,1000,10000,100000],
  heatGeometry:{faceDepthM:[0,.5e-6,2e-6,.001002,.004002],filmThicknessM:2e-6,backingThicknessM:.004},...overrides};
}
function fixture(t:TestContext){
 const dom=new JSDOM('<div id="parent"></div>');t.after(()=>dom.window.close());
 const parent=dom.window.document.getElementById('parent')!,inset=createReactorHeatInset(parent);
 const bars=()=>Array.from(inset.element.querySelectorAll<SVGLineElement>('line')).filter(n=>n.querySelector('title'));
 const paths=()=>Array.from(inset.element.querySelectorAll<SVGPathElement>('path'));
 return {inset,bars,paths};
}
const numbers=(path:SVGPathElement)=>(path.getAttribute('d')!.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)??[]).map(Number);
const extent=(path:SVGPathElement)=>{const p=numbers(path),x=[p[0],p[2],p[4]],y=[p[1],p[3],p[5]];return [Math.max(...x)-Math.min(...x),Math.max(...y)-Math.min(...y)];};
const sameExtent=(path:SVGPathElement,expected:number[])=>extent(path).forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-10));

test('heat inset expands film and backing separately but keeps true relative face depths',t=>{
 const f=fixture(t),state=selected();f.inset.update(state);
 assert.match(f.inset.element.querySelector('figcaption')!.textContent!,/depth expanded separately/i);
 assert.match(f.inset.element.textContent!,/Film · 2 µm/);assert.match(f.inset.element.textContent!,/Backing · 4000 µm/);
 assert.match(f.inset.element.querySelector('svg')!.getAttribute('aria-label')!,/physical face depths.*each material expanded separately/);
 const strips=Array.from(f.inset.element.querySelectorAll<SVGRectElement>('rect'));
 assert.equal(strips.length,2);
 const bars=f.bars();assert.equal(bars.length,6,'the interface belongs to both separately expanded strips');
 for(let region=0;region<2;region++){
  const x=Number(strips[region].getAttribute('x')),width=Number(strips[region].getAttribute('width'));
  const positions=bars.slice(region*3,region*3+3).map(b=>(Number(b.getAttribute('x1'))-x)/width);
  for(const [i,expected]of [0,.25,1].entries())assert.ok(Math.abs(positions[i]-expected)<1e-12,'face position follows depth, not cell index');
 }
});

test('heat shading is local to each face and does not change when an unrelated maximum changes',t=>{
 const f=fixture(t),state=selected();f.inset.update(state);
 const before=f.bars().map(b=>Number(b.getAttribute('opacity')));
 assert.equal(before[0],0);assert.ok(before[1]>0&&before[1]<before[2]);
 assert.ok(before[3]<before[4]&&before[4]<before[5]);
 state.heatFacesWM2[state.heatFacesWM2.length-1]=1e9;f.inset.update(state);
 const after=f.bars().map(b=>Number(b.getAttribute('opacity')));
 assert.deepEqual(after.slice(0,-1),before.slice(0,-1));assert.ok(after.at(-1)!>before.at(-1)!);
});

test('heat refinement retains legible fixed-size animated direction glyphs with bounded count',t=>{
 const f=fixture(t);f.inset.update(selected());const coarse=extent(f.paths()[0]);
 assert.ok(coarse[0]>=6&&coarse[1]>=8,'direction remains legible in the 288-unit inset');
 const n=64,film=2e-6,back=.004;
 f.inset.update(selected({heatGeometry:{filmThicknessM:film,backingThicknessM:back,
  faceDepthM:[...Array.from({length:n+1},(_,i)=>film*i/n),...Array.from({length:n},(_,i)=>film+back*(i+1)/n)]},
  heatFacesWM2:Array.from({length:2*n+1},(_,i)=>i===0?0:1000)}));
 assert.ok(f.paths().length>0&&f.paths().length<=20,'refinement cannot create an unreadable stack of chevrons');
 for(const p of f.paths())sameExtent(p,coarse);
 const before=f.paths()[0].getAttribute('d');f.inset.tick(.5);assert.notEqual(f.paths()[0].getAttribute('d'),before);
 for(const p of f.paths())sameExtent(p,coarse);
 // Fixed glyph size alone is insufficient: equal-flux tie ordering must not
 // cluster all selected arrows into the first few refined cells.
 for(const phase of [0,.5,.999]){
  f.inset.tick(phase);
  for(const strip of f.inset.element.querySelectorAll<SVGRectElement>('rect')){
   const x=Number(strip.getAttribute('x')),width=Number(strip.getAttribute('width'));
   const tips=f.paths().map(p=>numbers(p)[2]).filter(v=>v>=x-3&&v<=x+width+3).sort((a,b)=>a-b);
   assert.ok(tips.length>=3,'each material retains distributed direction cues');
   for(let i=1;i<tips.length;i++)assert.ok(tips[i]-tips[i-1]>=12,'chevrons must remain separated beyond their width and animation sweep');
  }
 }
});

test('signed coolant power is separate from internal redistribution and reverses with the boundary flux',t=>{
 const f=fixture(t),state=selected({heatFacesWM2:[0,10000,0,0,0]});
 const internal=f.inset.update(state);assert.equal(internal.direction,'internal only');assert.ok(internal.coolantW===0);
 assert.match(f.inset.element.textContent!,/Coolant: 0 W.*internal redistribution/);assert.ok(f.inset.running);
 const out=f.inset.update({...state,heatFacesWM2:[0,0,0,0,500]});assert.equal(out.direction,'toward coolant');assert.equal(out.coolantW,10);
 assert.match(f.inset.element.textContent!,/To coolant: 10 W/);
 let p=numbers(f.paths().at(-1)!);assert.ok(p[2]>p[0],'positive heat points toward the back');
 const inward=f.inset.update({...state,heatFacesWM2:[0,0,0,0,-500]});assert.equal(inward.direction,'toward target');assert.equal(inward.coolantW,-10);
 assert.match(f.inset.element.textContent!,/From coolant: 10 W/);
 p=numbers(f.paths().at(-1)!);assert.ok(p[2]<p[0],'a hotter coolant reverses the arrow');
 const zero=f.inset.update({...state,heatFacesWM2:[0,0,0,0,0]});assert.equal(zero.direction,'none');assert.ok(zero.coolantW===0);assert.equal(f.paths().length,0);assert.equal(f.inset.running,false);
});

test('sparse nonzero boundary and internal fluxes survive visual sampling at refined resolution',t=>{
 const f=fixture(t),film=2e-6,back=.004,n=16;
 const faceDepthM=[0,film/2,film,...Array.from({length:n},(_,i)=>film+back*(i+1)/n)];
 const state=selected({heatGeometry:{faceDepthM,filmThicknessM:film,backingThicknessM:back},heatFacesWM2:faceDepthM.map(()=>0)});
 state.heatFacesWM2[state.heatFacesWM2.length-1]=5000;
 assert.equal(f.inset.update(state).direction,'toward coolant');assert.ok(f.paths().length>0,'the nonzero coolant boundary must not disappear between sampling strides');
 assert.ok(f.bars().some(b=>b.querySelector('title')!.textContent!.endsWith('5000 W/m²')));
 state.heatFacesWM2.fill(0);state.heatFacesWM2[6]=-5000;
 assert.equal(f.inset.update(state).direction,'internal only');assert.ok(f.paths().length>0,'a localized internal flux must not disappear between sampling strides');
 assert.ok(f.bars().some(b=>b.querySelector('title')!.textContent!.endsWith('-5000 W/m²')));
});

test('initial-source conditional budget and power reference do not claim solved coolant transport',t=>{
 const f=fixture(t),source=selected({basis:'initial source',timeS:null,heatGeometry:null,heatFacesWM2:[],temperatureK:[],depositedPowerW:1000});
 const initial=f.inset.update(source);assert.equal(initial.direction,'stopping budget');assert.equal(initial.coolantW,null);
 assert.match(f.inset.element.textContent!,/conditional stopping budget.*If the transmitted beam stops here: 1000 W.*No depth temperature is predicted/);
 assert.ok(f.paths().length>0);assert.doesNotMatch(f.inset.element.textContent!,/(To|From) coolant/);
 assert.equal(f.inset.update({...source,depositedPowerW:0}).direction,'none');assert.equal(f.paths().length,0);assert.equal(f.inset.running,false);
 const reference=f.inset.update({kind:'power-reference'});assert.equal(reference.direction,'reference');assert.equal(reference.coolantW,null);
 assert.match(f.inset.element.textContent!,/reference direction.*Direction only; no heat transport is calculated/);assert.ok(f.inset.running);
 f.inset.element.hidden=true;assert.equal(f.inset.running,false);
});
