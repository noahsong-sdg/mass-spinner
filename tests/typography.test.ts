import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {documentationPage} from '../scripts/documentation-page.mjs';
import {startPage} from '../scripts/start-page.mjs';

const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

test('interface fonts are local WOFF2 resources with pinned provenance and original licenses',()=>{
 const css=readFileSync('web-assets/fonts.css','utf8');
 const sources=JSON.parse(readFileSync('web-assets/fonts/provenance.json','utf8')) as {package:string;version:string;integrity:string;assetsSha256:Record<string,string>;licenseSha256:string}[];
 assert.equal(sources.length,2);
 for(const source of sources){
  const family=source.package.split('/')[1];
  assert.equal(source.version,'5.3.0');assert.match(source.integrity,/^sha512-/);
  assert.equal(digest(readFileSync(`web-assets/fonts/${family}-OFL.txt`)),source.licenseSha256);
  for(const [name,hash]of Object.entries(source.assetsSha256)){
   const font=readFileSync(`web-assets/fonts/${name}`);
   assert.equal(font.subarray(0,4).toString(),'wOF2');assert.equal(digest(font),hash);
   assert.ok(css.includes(`url(/fonts/${name})`));
  }
 }
 assert.doesNotMatch(css,/https?:/);
 assert.match(css,/font-display: swap/);
});

test('application and standalone readers load shared typography without remote font imports',()=>{
 for(const html of [readFileSync('index.html','utf8'),readFileSync('laurelin.html','utf8'),readFileSync('web-assets/how-it-works.html','utf8'),documentationPage(),startPage()])assert.match(html,/<link rel="stylesheet" href="\/fonts.css">/);
 for(const path of ['src/style.css','web-assets/guide.css','web-assets/how-it-works.html'])assert.doesNotMatch(readFileSync(path,'utf8'),/fonts\.googleapis\.com|DM Sans|Manrope/);
});
