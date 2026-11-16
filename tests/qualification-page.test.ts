import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {JSDOM} from 'jsdom';
import {qualificationPage} from '../scripts/qualification-page.mjs';

test('published report is readable HTML with working evidence links and a local plot',()=>{
 const doc=new JSDOM(qualificationPage(readFileSync('docs/PUBLIC-DATA-QUALIFICATION.md','utf8'))).window.document;
 assert.equal(doc.querySelector('h1')?.textContent,'Public-data qualification campaign');
 assert.equal(doc.querySelector('meta[name=viewport]')?.getAttribute('content'),'width=device-width, initial-scale=1');
 assert.equal(doc.querySelector('nav a')?.getAttribute('href'),'/?level=2');
 assert.equal(doc.querySelector('img')?.getAttribute('src'),'/qualification-comparison.png');
 assert.equal(doc.querySelectorAll('table tbody tr').length,5);
 for(const a of doc.querySelectorAll('main a'))assert.match(a.getAttribute('href')!,/^https:\/\/github.com\/noahsong-sdg\/mass-spinner\/blob\/codex\/public-data-qualification\//);
 assert.equal(doc.querySelectorAll('script').length,0);
 assert.match(doc.body.textContent!,/experimental qualification remains false/);
 assert.match(doc.body.textContent!,/Finite-current footprint continuation/);
 assert.match(doc.body.textContent!,/not independent experimental voltage/);
 assert.match(doc.body.textContent!,/historically inferred using electrical observations/);
 assert.ok([...doc.querySelectorAll('main a')].some(a=>a.getAttribute('href')?.endsWith('/scientific/finite-contact-reference/results/RUN.md')));
 assert.match(doc.body.textContent!,/current-spreading and voltage study/);
 assert.match(doc.body.textContent!,/21.10\/17.47\/13.46 V/);
 assert.match(doc.body.textContent!,/floating-wall current redistribution/);
});
