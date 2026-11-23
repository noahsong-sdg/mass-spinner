import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {viewsDiagram,setupViewsDiagram,viewExampleFrame} from '../src/guide-views.js';
import {viewExampleData} from '../scripts/guide-view-data.js';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelTransport,sampleFuelTransport} from '../src/fuel-transport.js';
const data=viewExampleData();

test('gas-view examples use the existing coupled solver and a separate final bulk reference',()=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:.06}),transport=simulateFuelTransport(rotor);
 for(const time of [0,.25,1]){
  const actual=viewExampleFrame(data,time),expected=sampleFuelTransport(transport,time);
  assert.deepEqual(actual.cdf,[expected.lightCDF,expected.heavyCDF]);
  assert.equal(actual.ion,expected.ionRadS*.12);assert.equal(actual.gas,expected.neutralRadS*.12);
  assert.equal(actual.ionPhase,expected.ionPhaseRad);assert.equal(actual.gasPhase,expected.neutralPhaseRad);
 }
 assert.equal(data.reference.gas,rotor.samples.at(-1)!.neutralMS);
 assert.notEqual(data.reference.gas,data.frames.at(-1)!.gas,'bulk and changing-inertia references must stay separate');
 for(const time of [.007,.137,.999])for(const cdf of viewExampleFrame(data,time).cdf){
  assert.equal(cdf[0],0);assert.ok(Math.abs(cdf.at(-1)!-1)<1e-12);
  for(let i=1;i<cdf.length;i++)assert.ok(cdf[i]>=cdf[i-1]);
 }
});

test('the four views preserve coupled data, distinguish references, and reveal plots only up to selected time',t=>{
 const dom=new JSDOM(viewsDiagram(data));t.after(()=>dom.window.close());
 const doc=dom.window.document,figure=doc.querySelector<HTMLElement>('figure')!;
 setupViewsDiagram(figure);
 const time=figure.querySelector<HTMLInputElement>('input')!,play=figure.querySelector<HTMLButtonElement>('[data-view-play]')!;
 const select=(mode:string)=>figure.querySelector<HTMLButtonElement>(`[data-view-mode="${mode}"]`)!.click();
 const line=()=>figure.querySelector('[data-view-line="0"]')!.getAttribute('d');
 assert.equal(figure.dataset.motion,'paused','no automatic motion, including with reduced motion');
 assert.match(figure.querySelector('[data-view-reading]')!.textContent!,/total gas density, not isotope percentage/);
 assert.equal(line(),'M48 210');
 time.value='.5';time.dispatchEvent(new dom.window.Event('input'));
 const snapshot=figure.querySelector('[data-view-gas]')!.innerHTML,speed=figure.querySelector('[data-view-speeds]')!.textContent,path=line();
 assert.equal(figure.querySelectorAll('[data-view-gas] circle').length,80);
 assert.equal(figure.querySelectorAll('[data-view-ions] circle').length,20);
 const sampled=viewExampleFrame(data,.5);
 for(const [species,cls]of [[0,'light'],[1,'heavy']] as const){
  const dots=figure.querySelectorAll<SVGCircleElement>(`[data-view-gas] .view-${cls}`),cdf=sampled.cdf[species];
  dots.forEach((dot,i)=>{
   const r2=((Number(dot.getAttribute('cx'))-160)**2+(Number(dot.getAttribute('cy'))-140)**2)/105**2;
   const position=r2*(cdf.length-1),cell=Math.floor(position);
   const probability=cdf[cell]+(position-cell)*(cdf[cell+1]-cdf[cell]);
   assert.ok(Math.abs(probability-(i+.5)/dots.length)<1e-12,'marker radius must represent its solved species inventory');
  });
 }

 assert.equal(figure.querySelectorAll('[data-view-arrows] path').length,12);
 assert.ok(path!.includes('L174 '));assert.ok(!path!.includes('L300 '),'no future speed curve');
 select('spin');
 assert.equal(time.value,'0.5');assert.equal(figure.querySelector('[data-view-gas]')!.innerHTML,snapshot);
 assert.equal(figure.querySelector('[data-view-speeds]')!.textContent,speed);assert.equal(line(),path);
 assert.equal(figure.querySelector<SVGElement>('[data-view-density]')!.style.display,'none');
 assert.equal(figure.querySelectorAll('[data-view-arrows] path').length,0);
 select('equilibrium');assert.equal(time.disabled,true);assert.notEqual(figure.querySelector('[data-view-speeds]')!.textContent,speed);
 assert.match(figure.querySelector('[data-view-reading]')!.textContent!,/does not show the coupled run/);
 assert.equal(figure.querySelector<SVGElement>('[data-view-route]')!.style.display,'none');
 select('flow');assert.equal(figure.querySelector<SVGElement>('[data-view-route]')!.style.display,'');
 assert.match(figure.querySelector('[data-view-reading]')!.textContent!,/does not give a chamber velocity or an extraction path/);
 assert.equal(figure.querySelectorAll('[aria-pressed=true]').length,1);
 select('transport');assert.equal(time.disabled,false);assert.equal(line(),path);
 time.value='1';time.dispatchEvent(new dom.window.Event('input'));select('flow');
 assert.equal(play.textContent,'Play example','reference mode must not inherit the coupled replay label');
 const ids=[...doc.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
});

test('play advances the same time, phases, and curves; pause and page exit stop animation',t=>{
 const dom=new JSDOM(viewsDiagram(data));t.after(()=>dom.window.close());
 const win=dom.window,figure=win.document.querySelector<HTMLElement>('figure')!;
 let callback:FrameRequestCallback|null=null,cancelled=0;
 Object.defineProperty(win,'requestAnimationFrame',{value:(fn:FrameRequestCallback)=>{callback=fn;return 1;}});
 Object.defineProperty(win,'cancelAnimationFrame',{value:()=>{callback=null;cancelled++;}});
 setupViewsDiagram(figure);
 const play=figure.querySelector<HTMLButtonElement>('[data-view-play]')!,time=figure.querySelector<HTMLInputElement>('input')!;
 const before=figure.querySelector('[data-view-gas]')!.innerHTML;
 play.click();assert.equal(figure.dataset.motion,'running');
 for(let i=0;i<=30;i++){const next=callback!;callback=null;next(i*100);}
 assert.ok(time.valueAsNumber>.24&&time.valueAsNumber<.26);
 assert.notEqual(figure.querySelector('[data-view-gas]')!.innerHTML,before);
 play.click();assert.equal(callback,null);assert.equal(figure.dataset.motion,'paused');
 figure.querySelector<HTMLButtonElement>('[data-view-mode="flow"]')!.click();
 const selected=time.value,packet=figure.querySelector('[data-view-packet]')!.getAttribute('cx');
 play.click();for(let i=0;i<=10;i++){const next=callback!;callback=null;next(i*100);}
 assert.equal(time.value,selected,'reference playback must not change the coupled time');
 assert.notEqual(figure.querySelector('[data-view-packet]')!.getAttribute('cx'),packet);
 assert.equal(Number(figure.querySelector('[data-view-packet]')!.getAttribute('cx')),100,'throughput takes four screen seconds per cycle');
 win.dispatchEvent(new win.Event('pagehide'));assert.equal(callback,null);assert.equal(cancelled,2);
});
