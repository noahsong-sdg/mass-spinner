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
  assert.match(doc.title,new RegExp(`^${tutorial.number}`));assert.equal(doc.querySelectorAll('h1').length,1);
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
  }
  for(const link of doc.querySelectorAll<HTMLAnchorElement>('a[href*="github.com"]')){
   const path=link.pathname.split(`/blob/${revision}/`)[1];assert.ok(path,'source links use the producing revision');assert.ok(existsSync(path));
  }
  for(const [,href]of source.matchAll(/\]\(([^)]+)\)/g))if(!href.startsWith('/')&&!href.startsWith('https:'))assert.ok(existsSync(resolve('docs',href.split('#')[0])));
  assert.equal(doc.querySelectorAll('a[href*="UNDERSTANDING-MASS-SPINNER-"]').length,0,'website reading links stay in the HTML readers');
  setupGuideReader(dom.window);const chapter=doc.querySelector<HTMLSelectElement>('#guide-chapter')!;
  chapter.value=tutorial.topics.at(-1)!.id;chapter.dispatchEvent(new dom.window.Event('change'));
  assert.equal(dom.window.location.hash,`#${chapter.value}`);
 }
});

test('03–06 state the prerequisites and boundaries needed to interpret their experiments',()=>{
 const read=(part:string)=>readFileSync(`docs/UNDERSTANDING-MASS-SPINNER-${part}.md`,'utf8');
 assert.match(read('03'),/New run to clear earlier power switches/);
 assert.match(read('03'),/Both species share one local temperature/);
 assert.match(read('04'),/0.08 means 8%, not 0.08%/);
 assert.match(read('04'),/higher required upstream pressure/);
 assert.match(read('05'),/do not change lithium transport/);
 assert.match(read('05'),/not total plant inventory/);
 assert.match(read('06'),/not a confidence interval/);
 assert.match(read('06'),/not successful device validation/);
});
