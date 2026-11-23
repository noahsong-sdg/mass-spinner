import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {sampleAtoms,sampleInventory,sampleDiagram,setupSampleDiagram} from '../src/guide-sample.js';

test('sample collection preserves each isotope at every integer cut',()=>{
 assert.equal(sampleAtoms.length,1000);assert.equal(sampleAtoms.filter(a=>a.light).length,76);
 assert.equal(new Set(sampleAtoms.map(a=>`${a.x},${a.y}`)).size,1000);
 const moving=sampleAtoms.filter(a=>a.order>=0);assert.equal(new Set(moving.map(a=>a.order)).size,100);
 for(let n=0;n<=100;n++){
  const s=sampleInventory(n),arrived=moving.filter(a=>a.order<n);
  assert.equal(arrived.filter(a=>a.light).length,s.light);assert.equal(arrived.filter(a=>!a.light).length,s.heavy);
  assert.equal(s.light+s.heavy,n);assert.equal(s.light+s.remainingLight,76);assert.equal(s.heavy+s.remainingHeavy,924);
 }
 assert.equal(sampleInventory(0).purity,null);assert.equal(sampleInventory(100).purity,.1);assert.equal(sampleInventory(100).recovery,10/76);
 for(const n of [-1,101,.5,NaN,Infinity])assert.throws(()=>sampleInventory(n),RangeError);
});

test('collection waits for Play and visibility never overrides a manual sample count',t=>{
 for(const manual of [false,true]){
  const dom=new JSDOM(sampleDiagram());t.after(()=>dom.window.close());
  const win=dom.window as unknown as Window & typeof globalThis,figure=win.document.querySelector<HTMLElement>('figure')!;
  let notify:IntersectionObserverCallback|undefined;
  Object.defineProperty(win,'IntersectionObserver',{value:class{constructor(fn:IntersectionObserverCallback){notify=fn;}observe(){}}});
  Object.defineProperty(win,'matchMedia',{value:()=>({matches:false})});
  win.requestAnimationFrame=()=>1;win.cancelAnimationFrame=()=>{};
  setupSampleDiagram(figure,win);
  const visible=(ratio:number)=>notify!([{isIntersecting:ratio>0,intersectionRatio:ratio} as IntersectionObserverEntry],{} as IntersectionObserver);
  visible(.01);assert.equal(figure.dataset.motion,'paused');
  if(manual){
   const range=figure.querySelector('input')!;range.value='100';range.dispatchEvent(new win.Event('input'));
   visible(.25);assert.equal(figure.dataset.motion,'paused');assert.equal(figure.dataset.collected,'100');
  }else{
   visible(.25);assert.equal(figure.dataset.motion,'paused');
   figure.querySelector<HTMLButtonElement>('[data-sample-play]')!.click();assert.equal(figure.dataset.motion,'running');
   visible(.01);assert.equal(figure.dataset.motion,'running','a partially visible figure does not stop playback');
  }
  visible(0);assert.equal(figure.dataset.motion,'paused');
  visible(.5);assert.equal(figure.dataset.motion,'paused','re-entry does not override a pause');
 }
});

test('collection selects the entire inner region, including both isotopes',()=>{
 const inner=sampleAtoms.filter(a=>a.order>=0),outer=sampleAtoms.filter(a=>a.order<0);
 assert.equal(inner.length,100);assert.equal(inner.filter(a=>a.light).length,10);
 assert.equal(outer.length,900);assert.equal(outer.filter(a=>a.light).length,66);
 for(const atom of inner)assert.ok(Math.hypot(atom.x-165,atom.y-166)<49);
 for(const atom of outer)assert.ok(Math.hypot(atom.x-165,atom.y-166)>49);
 assert.equal(new Set(inner.map(a=>`${a.x+a.dx},${a.y+a.dy}`)).size,100);
 const light=inner.filter(a=>a.light);
 assert.ok(new Set(light.map(a=>Math.round((a.x+a.dx-445)/12))).size>=4,'light atoms do not form a sorted column');
 assert.ok(new Set(light.map(a=>Math.round((a.y+a.dy-114)/12))).size>=4,'light atoms do not form a sorted row');
 assert.match(sampleDiagram(),/We select|Collect all 100, not only the light atoms/);
});

test('the sample slider, playback, pause and replay move the same conserved atoms',t=>{
 const dom=new JSDOM(sampleDiagram(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());
 const win=dom.window as unknown as Window & typeof globalThis,doc=win.document;
 let callback:FrameRequestCallback|undefined;
 win.requestAnimationFrame=fn=>{callback=fn;return 1;};win.cancelAnimationFrame=()=>{callback=undefined;};
 Object.defineProperty(win,'matchMedia',{value:()=>({matches:true})});
 const figure=doc.querySelector<HTMLElement>('figure')!;setupSampleDiagram(figure,win);
 const range=doc.querySelector<HTMLInputElement>('input')!,play=doc.querySelector<HTMLButtonElement>('[data-sample-play]')!;
 assert.equal(figure.dataset.motion,'paused');assert.equal(range.disabled,false);
 range.value='100';range.dispatchEvent(new win.Event('input'));
 assert.match(doc.querySelector('[data-sample-purity]')!.textContent!,/10 \/ 100 · 10.0%/);
 assert.match(doc.querySelector('[data-sample-recovery]')!.textContent!,/10 \/ 76 = 13.2%/);
 for(const atom of sampleAtoms.filter(a=>a.order>=0))assert.equal(doc.querySelector(`[data-sample-atom="${atom.order}"]`)!.getAttribute('transform'),`translate(${atom.dx} ${atom.dy})`);
 doc.querySelector<HTMLButtonElement>('[data-sample-replay]')!.click();assert.equal(figure.dataset.collected,'0');assert.equal(figure.dataset.motion,'running');
 assert.match(doc.querySelector('[data-sample-reading]')!.textContent!,/^Both isotopes enter the sample/,'replay removes the previous result');
 callback!(0);callback!(50);assert.equal(figure.dataset.collected,'0','a moving atom counts only after arrival');
 assert.notEqual(doc.querySelector('[data-sample-atom="0"]')!.getAttribute('transform'),'translate(0 0)');
 for(let time=100;time<=1950;time+=50)callback!(time);
 assert.equal(figure.dataset.collected,'0','the first atom takes two seconds to arrive');
 callback!(2000);
 assert.equal(figure.dataset.collected,'1');
 for(let time=2050;time<=21750;time+=50)callback!(time);
 assert.equal(figure.dataset.collected,'99');callback!(21800);
 assert.equal(figure.dataset.collected,'100');assert.equal(figure.dataset.motion,'paused');
 play.click();callback!(0);callback!(50);
 play.click();assert.equal(callback,undefined);assert.equal(figure.dataset.motion,'paused');
 range.value='0';range.dispatchEvent(new win.Event('input'));assert.match(doc.querySelector('[data-sample-purity]')!.textContent!,/undefined/);
 play.click();callback!(0);callback!(50);Object.defineProperty(doc,'hidden',{value:true});doc.dispatchEvent(new win.Event('visibilitychange'));
 assert.equal(figure.dataset.motion,'paused');assert.equal(callback,undefined);
});
