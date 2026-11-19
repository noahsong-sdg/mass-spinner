import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {learningPages} from '../scripts/learning-pages.mjs';
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
   assert.ok(Object.hasOwn(learningPages(),href.slice(1).split('#')[0]),`missing investigation: ${href}`);
   continue;
  }
  const target=decodeURIComponent(href.split('#')[0]);
  assert.ok(existsSync(resolve(dirname(path),target)),`missing guide target: ${target}`);
 }
});


test('the guide connects equation symbols, plot units and experiment histories to the real controls',()=>{
 for(const phrase of ['not the speed','Γ = ℐᵢνᵢₙ','τ_wall = ν_wall L_n','curve slope is power in watts',
  'signed redistribution work','finite-step','even while','New run','does not move the 3D cut marker',
  'setup slider instead starts a new run','demonstrated sustainable operating point'])
  assert.ok(source.includes(phrase)||source.replace(/\s+/g,' ').includes(phrase),phrase);
});


test('the introductory experiment links directly to its live actions without a detour through menus',()=>{
 assert.match(source,/\[Tutorial 1\]\(https:\/\/fieldwork-plasma-lab\.fieldwork-plasma-lab\.workers\.dev\/start\.html\)/);
 const introduction=source.split('## 1.')[0];
 assert.deepEqual([...introduction.matchAll(/try=([A-Za-z]+)\)/g)].map(match=>match[1]),['currentExperiment','endSpin']);
 assert.doesNotMatch(introduction,/In \*\*Start here\*\*, choose/);
 assert.doesNotMatch(source,/Start here → Experiments|reopen \*\*Start here\*\* to return/);
});
