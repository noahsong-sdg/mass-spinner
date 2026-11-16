import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

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
  const target=decodeURIComponent(href.split('#')[0]);
  assert.ok(existsSync(resolve(dirname(path),target)),`missing guide target: ${target}`);
 }
});
