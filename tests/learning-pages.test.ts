import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {learningPages} from '../scripts/learning-pages.mjs';
import {learningPath} from '../src/learning-path.js';
import {guideActions} from '../src/guide-topics.js';

test('learning sequence publishes six freely selectable questions and usable section anchors',t=>{
 const pages=learningPages();assert.equal(Object.keys(pages).length,7);
 for(const [name,html]of Object.entries(pages)){
  const dom=new JSDOM(html,{url:`https://example.org/${name}`});t.after(()=>dom.window.close());const doc=dom.window.document;
  assert.ok(doc.querySelector('h1'));assert.ok(doc.querySelector('[data-guide-simulator]'));
  assert.equal(doc.querySelectorAll('iframe').length,0);
  for(const option of doc.querySelectorAll<HTMLOptionElement>('#guide-chapter option'))assert.ok(doc.getElementById(option.value),`${name}: ${option.value}`);
  for(const a of doc.querySelectorAll<HTMLAnchorElement>('a[href^="/learn"]'))assert.ok(pages[a.pathname.slice(1)],`${name}: ${a.pathname}`);
  for(const a of doc.querySelectorAll<HTMLAnchorElement>('[data-guide-action]')){
   assert.ok(guideActions.has(a.dataset.guideAction!),`${name}: unknown action ${a.dataset.guideAction}`);
   assert.equal(new URL(a.href).searchParams.get('try'),a.dataset.guideAction);
  }
 }
});

test('each experiment motivates a prediction, preserves optional feedback and asks a new transfer case',()=>{
 for(const module of learningPath)for(const e of module.experiments){
  assert.ok(e.baseline&&e.predict&&e.steps.length&&e.observe&&e.explain&&e.boundary&&e.transfer[0]&&e.transfer[1]);
  assert.ok(e.actions.length>0,`${module.id}/${e.id}: every Try it needs an actionable destination`);
  const dom=new JSDOM(learningPages()[`learn-${module.id}.html`]);const section=dom.window.document.querySelector(`[aria-labelledby="${e.id}"]`)!;
  assert.match(section.textContent!,/Baseline\./);assert.match(section.textContent!,/Predict\./);
  for(const detail of section.querySelectorAll<HTMLDetailsElement>('details[data-learning-explanation],.learning-transfer details'))assert.equal(detail.open,false,'answers must not be compulsory or pre-revealed without enhancement');
  dom.window.close();
 }
});

test('learning sequence distinguishes model boundaries instead of promising unsupported predictions',()=>{
 const pages=learningPages();
 assert.match(pages['learn-controls.html'],/Display settings and playback do not rerun/);
 assert.match(pages['learn-transport.html'],/changing diffusivity can change the speed history/);
 assert.match(pages['learn-thermal.html'],/not a fixed-current scan/);
 assert.match(pages['learn-collection.html'],/empty cut has no defined composition/);
 assert.match(pages['learn-evidence.html'],/experimentally unqualified/);
 assert.match(pages['learn-beam.html'],/choose Reactor in the header/);
 assert.match(pages['learn-beam.html'],/Initial source → Target depth &amp; full energy ledger/,'the named energy readouts require opening the nested ledger');
 assert.doesNotMatch(pages['learn-beam.html'],/href="\/guide.html#goal"/,'beam questions must not lead to the centrifuge goal as their equations');
 assert.match(pages['learn-beam.html'],/data-guide-action="beamSource"/);
 assert.match(pages['learn-beam.html'],/data-guide-action="beamTarget"/);
 assert.match(pages['learn-beam.html'],/not measured LiT stopping/);
 assert.match(pages['learn-beam.html'],/does not solve full neutron transport, shielding or dose/);
 assert.match(pages['learn-collection.html'],/id="fuel"/);
 assert.doesNotMatch(pages['learn-thermal.html'],/volume mean/);
});
