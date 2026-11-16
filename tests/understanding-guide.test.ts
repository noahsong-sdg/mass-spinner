import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {marked} from 'marked';

const path='docs/UNDERSTANDING-MASS-SPINNER-02.md';
const source=readFileSync(path,'utf8');

test('the understanding guide marks display equations as GitHub math, not literal code',()=>{
 const tokens=marked.lexer(source);let equations=0;
 marked.walkTokens(tokens,token=>{
  if(token.type==='code'&&token.lang==='math'){
   equations++;assert.ok(token.text.trim());
  }
  if(token.type==='codespan'||(token.type==='code'&&token.lang!=='math')){
   assert.doesNotMatch(token.text,/[=∂]|\\(?:frac|Omega|alpha|tau)\b/,
    'equations inside ordinary code are displayed literally on GitHub');
  }
 });
 assert.ok(equations>0,'the guide must contain rendered equations');
});

test('the rewritten guide links to existing local explanations, evidence and implementation',()=>{
 marked.walkTokens(marked.lexer(source),token=>{
  if(token.type!=='link'||/^[a-z][a-z\d+.-]*:/i.test(token.href)||token.href.startsWith('#'))return;
  const target=decodeURIComponent(token.href.split('#')[0]);
  assert.ok(existsSync(resolve(dirname(path),target)),`missing guide target: ${target}`);
 });
});
