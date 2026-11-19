import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {conceptDiagram,spinReference} from '../scripts/guide-concepts.js';
import {startPage} from '../scripts/start-page.mjs';
import {understandingPage} from '../scripts/understanding-page.mjs';
import {guideTopics,numberedTutorials} from '../src/guide-topics.js';
import {setupGuideReader} from '../src/guide-reader.js';

const near=(a:number,b:number,tolerance=2e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
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
 for(const [id,expected]of [['bias',[1,4,.5]],['magnetic',[1,.25]],['inventory',[1,39/19,2]]] as const){
  const dom=new JSDOM(conceptDiagram(id)!);t.after(()=>dom.window.close());
  assert.deepEqual([...dom.window.document.querySelectorAll('[data-ratio]')].map(n=>Number(n.getAttribute('data-ratio'))),expected);
  assert.match(dom.window.document.querySelector('figcaption')!.textContent!,id==='bias'?/do not multiply purity/:id==='magnetic'?/Constant-torque/:/Steady-flow/);
 }
});

test('every instructional section has a local visual with unique accessible SVG names',t=>{
 const revision='8cab091a3458a050142049f9227238d18e51b53d';
 const readers=[startPage(),understandingPage(readFileSync('docs/UNDERSTANDING-MASS-SPINNER-02.md','utf8'),revision),
  ...numberedTutorials.map(part=>understandingPage(readFileSync(`docs/UNDERSTANDING-MASS-SPINNER-${part.number}.md`,'utf8'),revision,part))];
 for(const html of readers){
  const dom=new JSDOM(html);t.after(()=>dom.window.close());const doc=dom.window.document;
  assert.doesNotMatch(doc.body.textContent!,/Next: .*→/,'adjacent sections need no next links');
  const ids=[...doc.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
  for(const heading of doc.querySelectorAll('h2[id]')){
   if(heading.id==='path')continue; // This section links to further reading.
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
  if(motion){motion.click();assert.equal(figure.dataset.motion,'running');motion.click();assert.equal(figure.dataset.motion,'paused');}
 }
 const css=readFileSync('web-assets/guide.css','utf8');
 assert.match(css,/\[data-concept-panel\]\[hidden\]\{display:none\}/);
 assert.match(css,/concept-reveal/,'the two speed curves must reveal the same time range');
});
