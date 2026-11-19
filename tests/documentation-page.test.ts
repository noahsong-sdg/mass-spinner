import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {documentationPage} from '../scripts/documentation-page.mjs';
import {numberedTutorials} from '../src/guide-topics.js';

test('the documentation index contains six tutorials and technical references without optional investigations',t=>{
 const dom=new JSDOM(documentationPage());t.after(()=>dom.window.close());const doc=dom.window.document;
 assert.equal(doc.querySelector('h1')!.textContent,'Docs & tutorials');
 assert.deepEqual([...doc.querySelectorAll('.guide-contents a')].map(a=>a.getAttribute('href')),['#tutorials','#documentation']);
 assert.equal(doc.querySelectorAll('main section').length,2);
 for(const href of ['/start.html','/guide.html',...numberedTutorials.map(tutorial=>`/tutorial-${tutorial.number}.html`),'/guide.html#views','/how-it-works.html','/equilibrium.html','/qualification.html'])assert.ok(doc.querySelector(`main a[href="${href}"]`),href);
 for(const link of doc.querySelectorAll<HTMLAnchorElement>('.guide-contents a'))assert.ok(doc.getElementById(link.hash.slice(1)));
 assert.equal(doc.querySelector('iframe,[data-guide-action],a[href^="/learn-"]'),null);
 assert.doesNotMatch(doc.body.textContent!,/investigations|experiments/i);
});

test('retired reader URLs redirect to relevant retained content, including extensionless shared URLs',()=>{
 const rules=readFileSync('web-assets/_redirects','utf8').split('\n').filter(line=>line&&!line.startsWith('#')).map(line=>line.split(/\s+/));
 const targets={controls:'/start.html#current',transport:'/guide.html#collection',thermal:'/tutorial-03.html#flow',beam:'/?level=2&try=beamSource',collection:'/tutorial-04.html#sample',evidence:'/tutorial-06.html#questions'};
 assert.equal(rules.length,12);assert.equal(new Set(rules.map(rule=>rule[0])).size,rules.length);
 for(const [name,target]of Object.entries(targets))for(const suffix of ['.html',''])assert.deepEqual(rules.find(rule=>rule[0]===`/learn-${name}${suffix}`),[`/learn-${name}${suffix}`,target,'301']);
});
