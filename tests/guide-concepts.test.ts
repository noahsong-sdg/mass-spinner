import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {conceptDiagram,spinReference,spinAngles} from '../scripts/guide-concepts.js';
import {startPage} from '../scripts/start-page.mjs';
import {understandingPage} from '../scripts/understanding-page.mjs';
import {guideTopics,numberedTutorials} from '../src/guide-topics.js';
import {setupGuideReader} from '../src/guide-reader.js';
import {guideDiagram} from '../scripts/guide-diagrams.mjs';

const near=(a:number,b:number,tolerance=2e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('density markers preserve cylindrical inventory across rotation and temperature cases',t=>{
 const dom=new JSDOM(guideDiagram('composition'));t.after(()=>dom.window.close());
 const doc=dom.window.document,dots=doc.querySelectorAll<SVGElement>('.density-dot');assert.equal(dots.length,96);
 for(const [species,mass]of [['light',6.0151228874],['heavy',7.0160034366]] as const){
  const points=[...doc.querySelectorAll<SVGElement>(`.density-${species}`)];assert.equal(points.length,48);
  for(const [j,dot]of points.entries()){
   const radii:Record<string,number>={};
   for(const [id,speed,temperature]of [['rest',0,500],['spin',1500,500],['warm',1500,1000]] as const){
    const x=parseFloat(dot.style.getPropertyValue(`--${id}-x`)),y=parseFloat(dot.style.getPropertyValue(`--${id}-y`));
    const r2=(x*x+y*y)/90**2,beta=mass*1.66053906892e-27*speed**2/(2*1.380649e-23*temperature);
    near(beta===0?r2:Math.expm1(beta*r2)/Math.expm1(beta),(j+.5)/48);
    assert.ok(r2>0&&r2<1);radii[id]=r2;
   }
   assert.ok(radii.spin>radii.warm&&radii.warm>radii.rest);
  }
 }
});
test('turning markers integrate the same speeds as the spin-up curves',()=>{
 for(const k of [1,2])for(const cut of [2,Infinity])for(const time of [.01,.5,1.9,2.1,3.9]){
  const h=1e-5,a=spinAngles(time-h,k,cut),b=spinAngles(time+h,k,cut),speed=spinReference(time,k,cut);
  for(const kind of ['ion','neutral'] as const)near((b[kind]-a[kind])/(2*h),speed[kind]);
 }
});
test('the animated spin reference solves the driven two-population equations and conserves collision momentum',()=>{
 for(const coupling of [1,2])for(const cut of [2,Infinity]){
  assert.deepEqual(spinReference(0,coupling,cut),{ion:0,neutral:0,total:0});
  for(const time of [.01,.5,1.9,2.1,3.9]){
   const a=spinReference(time,coupling,cut),h=1e-5;
   const before=spinReference(time-h,coupling,cut),after=spinReference(time+h,coupling,cut);
   near(a.ion+a.neutral,Math.min(time,cut));
   near((after.ion-before.ion)/(2*h),(time<cut?1:0)-coupling*(a.ion-a.neutral));
   near((after.neutral-before.neutral)/(2*h),coupling*(a.ion-a.neutral));
   assert.ok(a.ion>=a.neutral&&a.neutral>=0);
  }
  const left=spinReference(2-1e-8,coupling,cut),right=spinReference(2+1e-8,coupling,cut);
  near(left.ion,right.ion,3e-8);near(left.neutral,right.neutral,3e-8);
 }
 const weak=spinReference(1,1),strong=spinReference(1,2);
 near(weak.total,strong.total);assert.ok(strong.neutral>weak.neutral&&strong.ion<weak.ion);
});

test('reference factors preserve the fixed conditions and distinguish exponent from purity',t=>{
 for(const [id,expected]of [['bias',[1.2,1.2**4,Math.sqrt(1.2)]],['magnetic',[1,.25]],['inventory',[1,39/19,2]]] as const){
  const dom=new JSDOM(conceptDiagram(id)!);t.after(()=>dom.window.close());
  assert.deepEqual([...dom.window.document.querySelectorAll('[data-ratio]')].map(n=>Number(n.getAttribute('data-ratio'))),expected);
  assert.match(dom.window.document.querySelector('figcaption')!.textContent!,id==='bias'?/do not multiply purity/:id==='magnetic'?/Constant-torque/:/Steady-flow/);
 }
});

test('tutorial sections use a diagram, a comparison table or a direct explanation as needed',t=>{
 const revision='8cab091a3458a050142049f9227238d18e51b53d';
 const readers=[startPage(),understandingPage(readFileSync('docs/UNDERSTANDING-MASS-SPINNER-02.md','utf8'),revision),
  ...numberedTutorials.map(part=>understandingPage(readFileSync(`docs/UNDERSTANDING-MASS-SPINNER-${part.number}.md`,'utf8'),revision,part))];
 for(const html of readers){
  const dom=new JSDOM(html);t.after(()=>dom.window.close());const doc=dom.window.document;
  assert.doesNotMatch(doc.body.textContent!,/Next: .*→/,'adjacent sections need no next links');
  const ids=[...doc.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
  for(const heading of doc.querySelectorAll('h2[id]')){
   if(heading.id==='path')continue; // This section links to further reading.
   if(doc.title.startsWith('Tutorial 5')&&['architecture','electricity'].includes(heading.id)){
    let content='';for(let n=heading.nextElementSibling;n&&n.tagName!=='H2';n=n.nextElementSibling)content+=n.outerHTML;
    assert.match(content,heading.id==='architecture'?/Stellarator[\s\S]*Inertial confinement/:/data-equation-plot="plant-electricity"/);continue;
   }
   if(doc.title.startsWith('Tutorial 5')&&heading.id==='jobs'){
    let table:Element|null=null;
    for(let n=heading.nextElementSibling;n&&n.tagName!=='H2';n=n.nextElementSibling)if(n.tagName==='TABLE')table=n;
    assert.equal(table?.querySelectorAll('tbody tr').length,3,'compare the three processes without a decorative animation');continue;
   }
   if(doc.title.startsWith('Tutorial 2')&&['energy','collection'].includes(heading.id)){
    const target=heading.id==='energy'?'/tutorial-03.html#budget':'/tutorial-04.html#sample';
    let linked=false;
    for(let n=heading.nextElementSibling;n&&n.tagName!=='H2';n=n.nextElementSibling)if(n.querySelector(`a[href="${target}"]`))linked=true;
    assert.ok(linked,'a short transition must link to its full explanation');continue;
   }
   if((doc.title.startsWith('Tutorial 2')&&heading.id==='limits')||(doc.title.startsWith('Tutorial 6')&&heading.id==='questions'))continue;
   if(doc.title.startsWith('Tutorial 6')&&heading.id==='sensitivity'){
    const section=doc.body.textContent!;
    assert.match(section,/Diffusivity changes how fast atoms move.*mass distribution and gas inertia/s);
    assert.ok(doc.querySelector('[data-guide-action="pin"]'));assert.ok(doc.querySelector('[data-guide-action="diffusion"]'));
    assert.equal(doc.querySelector('[data-concept-example="compare"]'),null,'the collision example cannot explain diffusivity');continue;
   }
   let visual=false;
   for(let n=heading.nextElementSibling;n&&n.tagName!=='H2';n=n.nextElementSibling){if(n.matches('figure')||n.querySelector('figure'))visual=true;}
   assert.ok(visual,heading.textContent!);
  }
  for(const svg of doc.querySelectorAll('figure svg'))for(const id of svg.getAttribute('aria-labelledby')!.split(' '))assert.ok(doc.getElementById(id));
 }
 assert.ok(guideTopics.find(topic=>topic.id==='path'),'the existing further-reading anchor stays valid');
});

test('diagram choices affect only their own figure and motion starts paused when reduced motion is requested',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:true})});setupGuideReader(dom.window);
 const figures=dom.window.document.querySelectorAll<HTMLElement>('[data-concept-example]');assert.ok(figures.length>=3);
 for(const figure of figures){
  assert.equal(figure.dataset.motion,'paused');
  assert.equal(figure.dataset.motionStarted,undefined);
  const choices=figure.querySelectorAll<HTMLButtonElement>('[data-concept-select]');
  for(const choice of choices){
   assert.equal(choice.disabled,false);choice.click();
   assert.equal(figure.dataset.state,choice.dataset.conceptSelect);
   assert.equal(figure.querySelectorAll('[aria-pressed=true]').length,1);
   const visible=[...figure.querySelectorAll('[data-concept-panel]')].filter(n=>!n.hasAttribute('hidden'));
   assert.equal(visible.length,1);assert.equal(visible[0].getAttribute('data-concept-panel'),choice.dataset.conceptSelect);
   assert.equal(figure.querySelector('[data-concept-reading]')!.textContent,figure.querySelector<HTMLTemplateElement>(`[data-concept-description="${choice.dataset.conceptSelect}"]`)!.content.textContent);
  }
  const motion=figure.querySelector<HTMLButtonElement>('[data-concept-motion]');
  if(motion&&!motion.hidden){motion.click();assert.equal(figure.dataset.motion,'running');assert.equal(figure.dataset.motionStarted,'true');motion.click();assert.equal(figure.dataset.motion,'paused');assert.equal(figure.dataset.motionStarted,'true');}
 }
 const css=readFileSync('web-assets/guide.css','utf8');
 assert.match(css,/\[data-concept-panel\]\[hidden\]\{display:none\}/);
 assert.match(css,/concept-reveal/,'the two speed curves must reveal the same time range');
 assert.match(css,/\.concept-example\[data-motion=paused\] \.concept-rotor,\.concept-example\[data-motion=paused\] \.concept-packet\{animation-play-state:paused\}/);
 assert.match(css,/\.concept-example:not\(\[data-motion-started\]\) \.concept-reveal\{animation:none\}/,'show the full static reference before a reduced-motion reader starts playback');
});


test('the Doppler reference uses an offset chord and offers motion only for states with animated paths',t=>{
 const dom=new JSDOM(conceptDiagram('diagnostic')!,{url:'https://example.org/tutorial-06.html'});t.after(()=>dom.window.close());
 setupGuideReader(dom.window);const doc=dom.window.document,motion=doc.querySelector<HTMLButtonElement>('[data-concept-motion]')!;
 assert.equal(motion.hidden,true);
 doc.querySelector<HTMLButtonElement>('[data-concept-select="1"]')!.click();assert.equal(motion.hidden,false);
 const panel=doc.querySelector('[data-concept-panel="1"]')!;
 const axisY=Number(panel.querySelector('.concept-vessel')!.getAttribute('cy'));
 const chordY=Number(/M25 (\d+)H250/.exec(panel.querySelector('.concept-flow')!.getAttribute('d')!)![1]);
 assert.notEqual(chordY,axisY,'a center chord has zero line-of-sight velocity for pure axisymmetric rotation');
 for(const point of panel.querySelectorAll('.concept-sample'))assert.equal(Number(point.getAttribute('cy')),chordY);
 doc.querySelector<HTMLButtonElement>('[data-concept-select="0"]')!.click();assert.equal(motion.hidden,true);
});
