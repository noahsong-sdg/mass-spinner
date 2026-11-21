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
 callback!(0);callback!(50);assert.equal(figure.dataset.collected,'0','a moving atom counts only after arrival');
 assert.notEqual(doc.querySelector('[data-sample-atom="0"]')!.getAttribute('transform'),'translate(0 0)');
 for(let time=100;time<=600;time+=50)callback!(time);
 assert.equal(figure.dataset.collected,'1');
 play.click();assert.equal(callback,undefined);assert.equal(figure.dataset.motion,'paused');
 range.value='0';range.dispatchEvent(new win.Event('input'));assert.match(doc.querySelector('[data-sample-purity]')!.textContent!,/undefined/);
 play.click();callback!(0);callback!(50);Object.defineProperty(doc,'hidden',{value:true});doc.dispatchEvent(new win.Event('visibilitychange'));
 assert.equal(figure.dataset.motion,'paused');assert.equal(callback,undefined);
});
