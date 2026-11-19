import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {JSDOM} from 'jsdom';
import {qualificationPage} from '../scripts/qualification-page.mjs';
const revision='8cab091a3458a050142049f9227238d18e51b53d';

test('published report is readable HTML with working evidence links and a local plot',()=>{
 const doc=new JSDOM(qualificationPage(readFileSync('docs/PUBLIC-DATA-QUALIFICATION.md','utf8'),revision)).window.document;
 const text=doc.body.textContent!.replace(/\s+/g,' ');
 assert.equal(doc.querySelector('h1')?.textContent,'Public-data qualification campaign');
 assert.equal(doc.querySelector('meta[name=viewport]')?.getAttribute('content'),'width=device-width, initial-scale=1');
 assert.equal(doc.querySelector('nav a')?.getAttribute('href'),'/?level=2');
 assert.equal(doc.querySelector('img')?.getAttribute('src'),'/qualification-comparison.png');
 assert.equal(doc.querySelectorAll('table tbody tr').length,5);
 for(const a of doc.querySelectorAll('main a'))assert.ok(a.getAttribute('href')!.startsWith(`https://github.com/noahsong-sdg/mass-spinner/blob/${revision}/`));
 assert.equal(doc.querySelectorAll('script').length,0);
 assert.match(text,/experimental qualification remains false/i);
 assert.match(text,/Finite-current footprint continuation/);
 assert.match(text,/not independent experimental voltage/);
 assert.match(text,/historically inferred using electrical observations/);
 assert.ok([...doc.querySelectorAll('main a')].some(a=>a.getAttribute('href')?.endsWith('/scientific/finite-contact-reference/results/RUN.md')));
 assert.match(text,/current-spreading and voltage study/);
 assert.match(text,/21.10\/17.47\/13.46 V/);
 assert.match(text,/floating-wall current redistribution/);
});
