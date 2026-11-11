import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {setupFiniteFilmReference} from '../src/finite-film-ui.js';
import {setupExperience} from '../src/experience-ui.js';
import {readScenario,scenarioLink} from '../src/scenario-state.js';

test('actual public finite-film case survives02 link restore and Reset; stale native-case names leave it intact',t=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://example.org/?level=2'}),document=dom.window.document;
 for(const [key,value]of Object.entries({document,location:dom.window.location,history:dom.window.history})){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
 }
 t.after(()=>dom.window.close());
 const data=JSON.parse(readFileSync(new URL('../web-assets/marathon-reference/finite-film-v38.json',import.meta.url),'utf8'));
 const reference=setupFiniteFilmReference(document.body.appendChild(document.createElement('div')),data);
 const experience=setupExperience({selectMode(){},invalidate(){},showView(){},showResearch(){}});
 const first=data.cases[0],selected=data.cases.at(-1);assert.notEqual(selected.name,first.name);
 const assertCase=(sample:any)=>{
  assert.equal(reference.select.value,sample.name);
  const counts=[...reference.panel.querySelectorAll('tbody tr')].map(row=>row.querySelector('td')!.textContent);
  assert.deepEqual(counts,['filmRetained','backingRetained','reflected','transmitted'].map(key=>String(sample.partition[key])));
  assert.ok(reference.panel.textContent!.includes(`Input SHA256 ${sample.inputSha256}`));
 };
 reference.select.value=selected.name;reference.select.dispatchEvent(new dom.window.Event('change'));assertCase(selected);
 const shared=readScenario(new URL(scenarioLink('https://example.org/',experience.capture())).search);
 assert.equal(shared.invalid,false);assert.equal(shared.scenario.controls['finite-film-reference-case'],selected.name);
 experience.reset();assertCase(first);
 assert.equal(experience.restore(shared.scenario),true);assertCase(selected);
 const stale={...shared.scenario,controls:{...shared.scenario.controls,'finite-film-reference-case':'missing-native-case-v0'}};
 assert.equal(experience.restore(stale),false);assertCase(selected);
 assert.equal(reference.panel.open,false,'sharing/reset do not open recorded evidence or run a solver');
});
