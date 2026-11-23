import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {forceDiagram,setupForceDiagram,turningReference,turningDensity} from '../src/guide-force.js';
const near=(a:number,b:number,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test('inward acceleration bends motion without changing speed; free motion stays tangent',()=>{
 for(const angle of [0,.1,.5,1]){
  const s=turningReference(angle),h=1e-5,a=turningReference(angle-h),b=turningReference(angle+h);
  near(Math.hypot(s.x,s.y),1);near(Math.hypot(s.vx,s.vy),1);near(s.vx*s.ax+s.vy*s.ay,0);
  near((b.x-a.x)/(2*h),s.vx);near((b.y-a.y)/(2*h),s.vy);
  near((b.vx-a.vx)/(2*h),s.ax);near((b.vy-a.vy)/(2*h),s.ay);
  near(s.ax,-s.x);near(s.ay,-s.y);near(s.freeX,1);near(s.freeY,-angle);
  if(angle>0)assert.ok(Math.hypot(s.freeX,s.freeY)>1,'free motion leaves the circle tangentially');
 }
});
test('the density reference obeys ideal isothermal radial force balance for each isotope',()=>{
 const masses=[6.0151228874,7.0160034366];
 for(const mass of masses){
  assert.equal(turningDensity(0,mass),1);
  for(const r of [.1,.5,.9]){
   const h=1e-5,logSlope=(Math.log(turningDensity(r+h,mass))-Math.log(turningDensity(r-h,mass)))/(2*h);
   near(logSlope*1.380649e-23*500/(mass*1.66053906892e-27*1500**2),r);
  }
 }
 assert.ok(turningDensity(1,masses[1])>turningDensity(1,masses[0]));
 near(turningDensity(1,masses[0]),5.09,.01);near(turningDensity(1,masses[1]),6.68,.01);
});
test('the pressure diagram combines unequal opposing forces into an inward net force',t=>{
 const dom=new JSDOM(forceDiagram());t.after(()=>dom.window.close());
 const line=(selector:string)=>{const n=dom.window.document.querySelector(selector)!;return Number(n.getAttribute('x2'))-Number(n.getAttribute('x1'));};
 assert.equal(line('[data-pressure-inner]'),36);assert.equal(line('[data-pressure-outer]'),-66);
 assert.equal(line('[data-pressure-net]'),line('[data-pressure-inner]')+line('[data-pressure-outer]'));
 assert.match(dom.window.document.querySelector('[data-turning-note]')!.textContent!,/not a wall/);
});
test('each force step starts paused and supports exact scrubbing, replay and visibility pause',t=>{
 const dom=new JSDOM(forceDiagram());t.after(()=>dom.window.close());
 const win=dom.window as unknown as Window & typeof globalThis,figure=win.document.querySelector<HTMLElement>('figure')!;
 let callback:FrameRequestCallback|undefined,notify:IntersectionObserverCallback|undefined;
 win.requestAnimationFrame=fn=>{callback=fn;return 1;};win.cancelAnimationFrame=()=>{callback=undefined;};
 Object.defineProperty(win,'IntersectionObserver',{value:class{constructor(fn:IntersectionObserverCallback){notify=fn;}observe(){}}});
 Object.defineProperty(win,'matchMedia',{value:()=>({matches:false})});setupForceDiagram(figure,win);
 const range=figure.querySelector('input')!,play=figure.querySelector<HTMLButtonElement>('[data-turning-play]')!;
 assert.equal(figure.dataset.motion,'paused');assert.equal(range.disabled,false);
 play.click();callback!(0);callback!(50);assert.equal(figure.dataset.motion,'running');
 const dot=figure.querySelector('[data-turning-dot]')!;assert.notEqual(dot.getAttribute('cx'),'225');
 play.click();assert.equal(callback,undefined);assert.equal(figure.dataset.motion,'paused');
 for(const choice of figure.querySelectorAll<HTMLButtonElement>('[data-turning-step]')){
  choice.click();assert.equal(figure.dataset.motion,'paused');assert.equal(range.value,'0');
  assert.equal(figure.querySelectorAll('[aria-pressed=true]').length,1);
  const visible=[...figure.querySelectorAll<HTMLElement>('[data-turning-panel]')].filter(p=>!p.hidden);assert.equal(visible.length,1);assert.equal(visible[0].dataset.turningPanel,choice.dataset.turningStep);
  range.value='100';range.dispatchEvent(new win.Event('input'));assert.equal(play.textContent,'Replay motion');
 }
 assert.match(figure.querySelector('[data-turning-ratios]')!.textContent!,/5.09×.*6.68×/);
 figure.querySelector<HTMLButtonElement>('[data-turning-replay]')!.click();callback!(0);
 for(let time=50;time<=7950;time+=50)callback!(time);
 assert.equal(figure.dataset.motion,'running');callback!(8000);assert.equal(figure.dataset.motion,'paused');assert.equal(range.value,'100');
 play.click();notify!([{isIntersecting:true} as IntersectionObserverEntry],{} as IntersectionObserver);assert.equal(figure.dataset.motion,'running');
 notify!([{isIntersecting:false} as IntersectionObserverEntry],{} as IntersectionObserver);assert.equal(figure.dataset.motion,'paused');
 play.click();Object.defineProperty(win.document,'hidden',{value:true});win.document.dispatchEvent(new win.Event('visibilitychange'));assert.equal(figure.dataset.motion,'paused');
});
