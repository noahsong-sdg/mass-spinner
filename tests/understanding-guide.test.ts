import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {documentationPage} from '../scripts/documentation-page.mjs';
import {guideActions} from '../src/guide-topics.js';

const path='docs/UNDERSTANDING-MASS-SPINNER-02.md';
const source=readFileSync(path,'utf8');

test('the understanding guide marks display equations as GitHub math, not literal code',()=>{
 let equations=0;
 const prose=source.replace(/^```([^\n]*)\n([\s\S]*?)^```\s*$/gm,(_,language,body)=>{
  if(language==='math'){equations++;assert.ok(body.trim());}
  else assert.doesNotMatch(body,/[=∂]|\\(?:frac|Omega|alpha|tau)\b/);
  return '';
 });
 for(const [,literal]of prose.matchAll(/`([^`\n]+)`/g))
  assert.doesNotMatch(literal,/[=∂]|\\(?:frac|Omega|alpha|tau)\b/,
   'equations inside ordinary code are displayed literally on GitHub');
 assert.ok(equations>0,'the guide must contain rendered equations');
});

test('the rewritten guide links to existing local explanations, evidence and implementation',()=>{
 for(const [,href]of source.matchAll(/\[[^\]]+\]\(([^\s)]+)\)/g)){
  if(/^[a-z][a-z\d+.-]*:/i.test(href)||href.startsWith('#'))continue;
  if(href.startsWith('/?')){
   const url=new URL(href,'https://example.org');
   assert.equal(url.searchParams.get('level'),'2');
   assert.ok(guideActions.has(url.searchParams.get('try')!),`unknown simulator action: ${href}`);
   continue;
  }
  if(href.startsWith('/learn')){
   assert.equal(href,'/learn.html');assert.ok(documentationPage().includes('<h1>Docs &amp; tutorials</h1>'));
   continue;
  }
  const target=decodeURIComponent(href.split('#')[0]);
  assert.ok(existsSync(resolve(dirname(path),target)),`missing guide target: ${target}`);
 }
});


test('the guide connects equation symbols, plot units and experiment histories to the real controls',()=>{
 for(const phrase of ['not speed immediately','Γ = ℐᵢνᵢₙ','τ_wall = ν_wall L_n','Curve slope is power in watts',
  'The thermal model assigns this energy difference to gas thermal energy','numerical loss and physical heat as separate terms',
  'also during a pause','New run','does not move the 3D collection marker',
  'control changes that marker and starts a new run','do not show if the device can continue to operate'])
  assert.ok(source.includes(phrase)||source.replace(/\s+/g,' ').includes(phrase),phrase);
});

test('the first experiment uses current status and window names before introducing momentum',()=>{
 const introduction=source.split('## 1.')[0];
 assert.match(introduction,/Wait until the calculation finishes/);
 assert.match(introduction,/Ion speeds increase\. Collisions then increase neutral gas speed/);
 assert.doesNotMatch(introduction,/Updating|angular momentum/);
 assert.match(source,/Examine identifies parts and links to those controls/);
 assert.doesNotMatch(source,/Inspect identifies/);
 assert.match(source,/At the same radius and angular speed, heavier atoms need more inward force/);
});


test('the introductory experiment links directly to its live actions without a detour through menus',()=>{
 assert.match(source,/\[Tutorial 1\]\(https:\/\/fieldwork-plasma-lab\.fieldwork-plasma-lab\.workers\.dev\/start\.html\)/);
 const introduction=source.split('## 1.')[0];
 assert.deepEqual([...introduction.matchAll(/try=([A-Za-z]+)\)/g)].map(match=>match[1]),['currentExperiment','endSpin']);
 assert.doesNotMatch(introduction,/In \*\*Start here\*\*, choose/);
 assert.doesNotMatch(source,/Start here → Experiments|reopen \*\*Start here\*\* to return/);
});


test('tutorial prose omits bold label prefixes',()=>{
 for(const suffix of ['', '-02', '-03', '-04', '-05', '-06']){
  const text=readFileSync(`docs/UNDERSTANDING-MASS-SPINNER${suffix}.md`,'utf8');
  assert.doesNotMatch(text,/\*\*[^*\n]+[.:]\*\*/);
 }
});
