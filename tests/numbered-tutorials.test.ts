import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {JSDOM} from 'jsdom';
import {numberedTutorials,guideActions} from '../src/guide-topics.js';
import {understandingPage} from '../scripts/understanding-page.mjs';
import {setupGuideReader} from '../src/guide-reader.js';

const revision='8cab091a3458a050142049f9227238d18e51b53d';
test('03–06 are self-contained readers with rendered math, diagrams, valid control actions and sequential links',t=>{
 assert.deepEqual(numberedTutorials.map(part=>part.number),['03','04','05','06']);
 for(const tutorial of numberedTutorials){
  const source=readFileSync(`docs/UNDERSTANDING-MASS-SPINNER-${tutorial.number}.md`,'utf8');
  const dom=new JSDOM(understandingPage(source,revision,tutorial),{url:`https://example.org/tutorial-${tutorial.number}.html`});t.after(()=>dom.window.close());
  const doc=dom.window.document;
  assert.match(doc.title,new RegExp(`^Tutorial ${Number(tutorial.number)}`));assert.equal(doc.querySelectorAll('h1').length,1);
  assert.ok(doc.querySelector('#reader-status[role=status][aria-live=polite]'));
  assert.equal(doc.querySelectorAll('.equation math').length,[...source.matchAll(/^```math$/gm)].length);
  assert.equal(doc.querySelectorAll('.katex-error').length,0);
  for(const topic of tutorial.topics){
   const heading=doc.getElementById(topic.id)!;assert.equal(heading.textContent,topic.heading);
   assert.equal(heading.nextElementSibling?.tagName,'P','motivation precedes diagrams and actions');
  }
  for(const svg of doc.querySelectorAll('figure svg')){
   assert.equal(svg.getAttribute('role'),'img');
   for(const id of svg.getAttribute('aria-labelledby')!.split(' '))assert.ok(doc.getElementById(id)?.textContent);
  }
  for(const link of doc.querySelectorAll<HTMLAnchorElement>('[data-guide-action]')){
   assert.ok(guideActions.has(link.dataset.guideAction!));assert.equal(new URL(link.href).searchParams.get('try'),link.dataset.guideAction);
   const instruction=link.closest('p,li')!;assert.ok(instruction,'actions belong to their motivating instructions');
   assert.equal(instruction.querySelectorAll('[data-guide-action]').length,1,'introduce only one action in an instruction');
  }
  assert.equal(doc.querySelectorAll('.try-actions').length,0,'readers must not reintroduce automatic chapter shortcut banks');
  assert.ok(doc.querySelector('[data-guide-action]'),'each reader still connects its experiments to the simulator');
  for(const link of doc.querySelectorAll<HTMLAnchorElement>('a[href*="github.com"]')){
   const path=link.pathname.split(`/blob/${revision}/`)[1];assert.ok(path,'source links use the producing revision');assert.ok(existsSync(path));
  }
  for(const [,href]of source.matchAll(/\]\(([^)]+)\)/g))if(!href.startsWith('/')&&!href.startsWith('https:'))assert.ok(existsSync(resolve('docs',href.split('#')[0])));
  assert.equal(doc.querySelectorAll('a[href*="UNDERSTANDING-MASS-SPINNER-"]').length,0,'website reading links stay in the HTML readers');
  setupGuideReader(dom.window);assert.equal(doc.querySelector('#guide-chapter'),null);
  assert.deepEqual([...doc.querySelectorAll<HTMLAnchorElement>('.guide-contents a')].map(a=>a.hash),tutorial.topics.map(topic=>`#${topic.id}`));
 }
});

test('03–06 state the prerequisites and boundaries needed to interpret their experiments',()=>{
 const read=(part:string)=>readFileSync(`docs/UNDERSTANDING-MASS-SPINNER-${part}.md`,'utf8');
 assert.match(read('03'),/New run to remove earlier power switches/);
 assert.match(read('03'),/Set Run duration to 1 s/);
 assert.match(read('03'),/The two species have the same local temperature/);
 assert.match(read('04'),/0.08 is 8%, not 0.08%/);
 assert.match(read('04'),/necessary upstream pressure and gas load are higher/);
 assert.match(read('05'),/do not change lithium transport/);
 assert.match(read('05'),/not total plant inventory/);
 assert.match(read('05'),/Fusion thermal power to 1000 MW/);
 assert.match(read('05'),/processing time to 100 s/);
 assert.match(read('05'),/burn fraction to 0\.05/);
 assert.match(read('05'),/positive power and time, and a burn fraction below one/);
 assert.match(read('06'),/not a statistical confidence interval/);
 assert.match(read('06'),/disagreement, not experimental accuracy/);
});

function reader(number:string){
 const tutorial=numberedTutorials.find(part=>part.number===number)!;
 return new JSDOM(understandingPage(readFileSync(`docs/UNDERSTANDING-MASS-SPINNER-${number}.md`,'utf8'),revision,tutorial),{url:`https://example.org/tutorial-${number}.html`});
}

test('heat-flow examples send energy down every temperature gradient and have no flow at equal temperature',t=>{
 const dom=reader('03');t.after(()=>dom.window.close());const doc=dom.window.document,figure=doc.querySelector<HTMLElement>('[data-heat-example]')!;
 assert.equal(figure.dataset.motion,'paused','the unscripted explanation is static');
 assert.equal(figure.querySelectorAll('button:not([disabled])').length,0);
 setupGuideReader(dom.window);
 for(const [name,sign,phrase]of [['gas',1,/flows outward/],['wall',-1,/flows inward/],['equal',0,/no heat flow by conduction/]] as const){
  figure.querySelector<HTMLButtonElement>(`[data-heat-select="${name}"]`)!.click();
  assert.equal(figure.dataset.case,name);assert.equal(figure.querySelectorAll('[aria-pressed=true]').length,1);
  assert.match(figure.querySelector('[data-heat-reading]')!.textContent!,phrase);
  const temperatures=figure.querySelector(`[data-heat-case="${name}"][data-temperatures]`)!.getAttribute('data-temperatures')!.split(',').map(Number);
  const curve=figure.querySelector(`[data-heat-case="${name}"] .heat-profile`)!.getAttribute('d')!;
  const [,axis,firstControl]=/^M50 (\d+)C95 (\d+)/.exec(curve)!;assert.equal(axis,firstControl,'axis symmetry requires zero radial gradient at r = 0');
  for(let i=1;i<temperatures.length;i++)assert.equal(Math.sign(temperatures[i-1]-temperatures[i]),sign,'q = -k dT/dr for positive conductivity');
  const flow=figure.querySelector(`.heat-flow[data-heat-case="${name}"]`);
  if(sign===0)assert.equal(flow,null,'uniform temperature must not suggest heat transfer');
  else for(const arrow of flow!.querySelectorAll('path')){
   const [,start,end]=/M(\d+) 262H(\d+)/.exec(arrow.getAttribute('d')!)!;
   assert.equal(Math.sign(Number(end)-Number(start)),sign);
  }
 }
 assert.match(figure.textContent!,/not the heat-flow rate/);assert.match(figure.textContent!,/excludes gas motion and temperature jumps at interfaces/);
});

test('heat motion respects reduced motion and keeps pause independent of the selected explanation',t=>{
 const dom=reader('03');t.after(()=>dom.window.close());const figure=dom.window.document.querySelector<HTMLElement>('[data-heat-example]')!;
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:true})});setupGuideReader(dom.window);
 const motion=figure.querySelector<HTMLButtonElement>('[data-heat-motion]')!;
 assert.equal(figure.dataset.motion,'paused');assert.equal(motion.textContent,'Play motion');
 figure.querySelector<HTMLButtonElement>('[data-heat-select="wall"]')!.click();assert.equal(figure.dataset.motion,'paused');
 motion.click();assert.equal(figure.dataset.motion,'running');assert.equal(motion.textContent,'Pause motion');
 motion.click();assert.equal(figure.dataset.motion,'paused');
});

test('the collection illustration uses cylindrical equilibrium integrals and preserves the full inventory',t=>{
 const dom=reader('04');t.after(()=>dom.window.close());const figure=dom.window.document.querySelector<HTMLElement>('[data-collection-example]')!;
 const samples=JSON.parse(figure.dataset.cutValues!) as [number,number,number|null,number][];
 assert.equal(samples.length,101);assert.deepEqual(samples[0],[0,0,null,0]);assert.deepEqual(samples[100],[50,50,.5,1]);
 const beta=[20,40].map(m=>m*1.66053906892e-27*1000**2/(2*1.380649e-23*500));
 for(const [index,[light,heavy,purity,recovery]]of samples.entries()){
  const r=index/100,expected=beta.map(b=>Math.expm1(b*r*r)/Math.expm1(b));
  assert.ok(Math.abs(light-50*expected[0])<1e-12);assert.ok(Math.abs(heavy-50*expected[1])<1e-12);
  assert.ok(Math.abs(recovery-expected[0])<1e-14);
  if(index>0){assert.ok(Math.abs(purity!-light/(light+heavy))<1e-14);assert.ok(recovery>=samples[index-1][3]);}
 }
 for(const [species,className]of ['cut-light','cut-heavy'].entries()){
  const dots=[...figure.querySelectorAll<SVGElement>(`.${className}`)];assert.equal(dots.length,50);
  for(const [i,dot]of dots.entries()){
   const r=Number(dot.dataset.cutParticle),cdf=Math.expm1(beta[species]*r*r)/Math.expm1(beta[species]);
   assert.ok(Math.abs(cdf-(i+.5)/50)<2e-9,'visual samples follow the same radial inventory, not uniformly spaced radii');
  }
 }
 assert.match(figure.textContent!,/not your run/);assert.match(figure.textContent!,/The model does not calculate extraction flow/);
});

test('the radius control updates the whole inner volume, counts, purity and recovery, including empty and full cuts',t=>{
 const dom=reader('04');t.after(()=>dom.window.close());const doc=dom.window.document,figure=doc.querySelector<HTMLElement>('[data-collection-example]')!;
 const input=figure.querySelector<HTMLInputElement>('input[type=range]')!;assert.equal(input.disabled,true);setupGuideReader(dom.window);assert.equal(input.disabled,false);
 const samples=JSON.parse(figure.dataset.cutValues!) as [number,number,number|null,number][];
 for(const index of [0,1,25,65,100,0]){
  input.value=String(index);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  const [light,heavy,purity,recovery]=samples[index];
  assert.equal(figure.querySelector('[data-cut-area]')!.getAttribute('r'),String(110*index/100));
  assert.equal(figure.querySelector('[data-cut-light]')!.textContent,index===1?'<0.1':light.toFixed(1));assert.equal(figure.querySelector('[data-cut-heavy]')!.textContent,index===1?'<0.1':heavy.toFixed(1));
  assert.equal(figure.querySelector('[data-cut-purity]')!.textContent,purity===null?'undefined':`${(purity*100).toFixed(1)}%`);
  assert.equal(figure.querySelector('[data-cut-recovery]')!.textContent,index===1?'<0.1%':`${(recovery*100).toFixed(1)}%`);
  for(const dot of figure.querySelectorAll<SVGElement>('[data-cut-particle]'))assert.equal(dot.classList.contains('cut-outside'),Number(dot.dataset.cutParticle)>index/100);
  assert.equal(figure.querySelector('[data-cut-reading]')!.getAttribute('aria-live'),'polite');
 }
});
