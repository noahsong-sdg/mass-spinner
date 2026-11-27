import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {startPage} from '../scripts/start-page.mjs';
import {understandingPage} from '../scripts/understanding-page.mjs';
import {numberedTutorials} from '../src/guide-topics.js';
import {playgroundSteps} from '../src/playground-guide-steps.js';

const read=(part:string)=>readFileSync(`docs/UNDERSTANDING-MASS-SPINNER-${part}.md`,'utf8');
const revision='94586d71a74c8fc84f0bb505771887f0421413de';

test('the introductory explanations distinguish local fractions, sample counts and speed histories',t=>{
 const dom=new JSDOM(startPage());t.after(()=>dom.window.close());const doc=dom.window.document;
 const section=(id:string)=>doc.getElementById(id)!.parentElement!.querySelector('[data-learning-explanation]')!.textContent!;
 assert.match(section('current'),/horizontal axis is physical time.*tangential speed.*not more atoms/s);
 assert.match(section('composition'),/80 light atoms in 1,000 local atoms.*not mean 8% of all light atoms.*do not collect gas/s);
 assert.match(section('collection'),/all gas inside a radius.*outer rings have more volume/s);
 assert.match(section('heat'),/hot liner can heat the gas.*same physical time.*combined effect/s);
});

test('the detailed collection calculation appears only in Tutorial 4 and retains both denominators',()=>{
 const text=read('04');
 const total=Number(/vessel contains (\d+) light atoms/.exec(text)![1]);
 const samples=[...text.matchAll(/sample with (\d+) light and (\d+) heavy atoms has (\d+)% purity (?:and|but only) (\d+)% recovery/g)];
 assert.equal(samples.length,2);
 for(const [,lightText,heavyText,purityText,recoveryText] of samples){
  const [light,heavy,purity,recovery]=[lightText,heavyText,purityText,recoveryText].map(Number);
  assert.equal(light/(light+heavy)*100,purity);
  assert.equal(light/total*100,recovery);
 }
 for(const other of [read('02'),playgroundSteps.find(step=>step.id==='collection')!.notice])assert.doesNotMatch(other,/vessel contains 100 light atoms/);
});

test('advanced readers explain the experimental conditions and what each plot axis means',t=>{
 const source03=read('03');const source05=read('05');const source06=read('06');
 assert.match(source03,/liner into the gas.*does not measure only the effect of resistive heating/s);
 assert.match(source03,/Gas hotter and Wall hotter.*Same temperature/s);
 assert.match(source03,/horizontal axis compares field choices at the same reference torque/);
 assert.match(source05,/horizontal axis is burn fraction, not elapsed time/);
 assert.match(source06,/instrument measures a spectrum across the whole vessel.*apply the diagnostic model/s);
 const ratio=/inventory ratio is therefore (\d+)\/(\d+), about (\d+\.\d+)/.exec(source05)!;
 assert.ok(Math.abs(Number(ratio[1])/Number(ratio[2])-Number(ratio[3]))<.005);
 const tutorial=numberedTutorials.find(part=>part.number==='03')!;
 const dom=new JSDOM(understandingPage(source03,revision,tutorial));t.after(()=>dom.window.close());
 const labels=[...dom.window.document.querySelectorAll('[data-heat-select]')].map(node=>node.textContent);
 for(const label of labels)assert.ok(source03.includes(label!),'reading instructions use the actual diagram button labels');
});
