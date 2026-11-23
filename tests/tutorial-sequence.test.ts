import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {startPage} from '../scripts/start-page.mjs';
import {documentationPage} from '../scripts/documentation-page.mjs';
import {understandingPage} from '../scripts/understanding-page.mjs';
import {numberedTutorials} from '../src/guide-topics.js';

const read=(number:string)=>readFileSync(`docs/UNDERSTANDING-MASS-SPINNER-${number}.md`,'utf8');
const revision='a'.repeat(40);

test('each detailed calculation has one tutorial and keeps its physical limits',()=>{
 const sources=new Map(['02','03','04','05','06'].map(number=>[number,read(number)]));
 for(const [equation,owner] of [['power','03'],['slip','03'],['energy','03'],['conduction','03'],['collection','04'],['diffusion','02'],['torque','02']] as const){
  const found=[...sources].flatMap(([number,text])=>[...text.matchAll(new RegExp(`<!-- equation:${equation} -->`,'g'))].map(()=>number));
  assert.deepEqual(found,[owner],`${equation} must have one detailed explanation`);
 }
 const heat=sources.get('03')!;
 for(const phrase of ['When both populations have the same angular speed','Specified heat fractions','numerical loss and physical heat as separate terms',
  'does not calculate full fluid momentum and energy transport','does not calculate ionization or separate electron and ion temperatures'])assert.ok(heat.includes(phrase),phrase);
 const collection=sources.get('04')!;
 assert.match(collection,/empty cut has no defined purity/);assert.match(collection,/light recovery is undefined/);
 assert.match(collection,/plot probe does not move the 3D collection marker/);
 assert.match(collection,/starts a new run.*do not calculate extraction flow/);
});

test('the separation factor example uses the fourth power for speed and square root for temperature',()=>{
 const source=read('02');
 const fast=/Starting from α = ([\d.]+), the new factor is 1\.20⁴ ≈ ([\d.]+)\./.exec(source)!;
 const warm=/Starting from α = ([\d.]+), the new factor is √1\.20 ≈ ([\d.]+)\./.exec(source)!;
 assert.ok(Math.abs(Number(fast[2])-Number(fast[1])**4)<.0005);
 assert.ok(Math.abs(Number(warm[2])-Math.sqrt(Number(warm[1])))<.0005);
 assert.match(source,/They do not directly multiply α, purity or recovery/);
});

test('tutorial handoffs resolve to real sections and leave simulator action context intact',t=>{
 const pages=new Map([
  ['/start.html',startPage()],['/guide.html',understandingPage(read('02'),revision)],['/learn.html',documentationPage()],
  ...numberedTutorials.map(part=>[`/tutorial-${part.number}.html`,understandingPage(read(part.number),revision,part)]),
 ].map(([path,html])=>{
  const dom=new JSDOM(html,{url:`https://example.org${path}`});t.after(()=>dom.window.close());
  return [path,dom.window.document] as const;
 }));
 for(const [path,doc] of pages){
  for(const link of doc.querySelectorAll<HTMLAnchorElement>('a[href]')){
   const url=new URL(link.href);
   if(url.origin!=='https://example.org')continue;
   const target=pages.get(url.pathname);
   if(target&&url.hash)assert.ok(target.getElementById(url.hash.slice(1)),`${path} → ${url.pathname}${url.hash}`);
   if(link.hasAttribute('data-guide-action')){
    assert.equal(url.searchParams.get('try'),link.dataset.guideAction);
    const lesson=new URL(url.searchParams.get('lesson')!,'https://example.org');
    assert.equal(lesson.pathname,path);
    assert.ok(doc.getElementById(lesson.hash.slice(1)),`${path}: action must retain its section`);
   }
  }
 }
 const steps=pages.get('/start.html')!.querySelectorAll('.walkthrough-step');
 assert.equal(steps.length,7);
 for(const step of steps){
  const reading=step.querySelector<HTMLAnchorElement>('[data-learning-explanation] a')!;
  assert.ok(reading,'each practical explanation must link to its detailed topic');
  assert.ok(pages.get(new URL(reading.href).pathname)?.getElementById(new URL(reading.href).hash.slice(1)));
 }
 for(const [id,href] of [['energy','/tutorial-03.html#budget'],['collection','/tutorial-04.html#sample'],['limits','/tutorial-06.html#questions']]){
  const heading=pages.get('/guide.html')!.getElementById(id)!;
  assert.ok(heading,'old section addresses must remain available');
  const nodes:Element[]=[];
  for(let node=heading.nextElementSibling;node&&node.tagName!=='H2';node=node.nextElementSibling)nodes.push(node);
  assert.ok(nodes.some(node=>node.querySelector(`a[href="${href}"]`)),id);
 }
});
