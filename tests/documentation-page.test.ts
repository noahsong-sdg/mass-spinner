import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {documentationPage} from '../scripts/documentation-page.mjs';
import {numberedTutorials} from '../src/guide-topics.js';
import {readScenario} from '../src/scenario-state.js';

test('the documentation index contains six tutorials and technical references without optional investigations',t=>{
 const dom=new JSDOM(documentationPage());t.after(()=>dom.window.close());const doc=dom.window.document;
 assert.equal(doc.querySelector('h1')!.textContent,'Docs & tutorials');
 assert.deepEqual([...doc.querySelectorAll('.guide-contents a')].map(a=>a.getAttribute('href')),['#tutorials','#documentation']);
 assert.equal(doc.querySelectorAll('main section').length,2);
 for(const href of ['/start.html','/guide.html',...numberedTutorials.map(tutorial=>`/tutorial-${tutorial.number}.html`),'/systems.html','/guide.html#views','/how-it-works.html','/equilibrium.html','/qualification.html'])assert.ok(doc.querySelector(`main a[href="${href}"]`),href);
 for(const link of doc.querySelectorAll<HTMLAnchorElement>('.guide-contents a'))assert.ok(doc.getElementById(link.hash.slice(1)));
 assert.equal(doc.querySelector('iframe,[data-guide-action],a[href^="/learn-"]'),null);
 assert.doesNotMatch(doc.body.textContent!,/investigations|experiments/i);
});

test('the system overview separates model scope and provides valid simulator destinations',t=>{
 const dom=new JSDOM(readFileSync('web-assets/systems.html','utf8'),{url:'https://example.org/systems.html'});
 t.after(()=>dom.window.close());const doc=dom.window.document;
 for(const link of doc.querySelectorAll<HTMLAnchorElement>('nav a'))assert.ok(doc.querySelector(link.hash));
 const sections=[...doc.querySelectorAll('main section')];assert.equal(sections.length,3);
 assert.match(sections[0]!.textContent!,/Separation does not create atoms or cause fusion/);
 assert.match(sections[1]!.textContent!,/does not show net electrical power production/);
 assert.match(sections[2]!.textContent!,/does not calculate a complete power plant/);
 const links=sections.map(section=>section.querySelector<HTMLAnchorElement>('a[target="_top"]')!);
 assert.equal(new URL(links[0]!.href).search,'?level=2');
 assert.equal(new URL(links[1]!.href).searchParams.get('try'),'beamSource');
 assert.equal(new URL(links[1]!.href).searchParams.get('level'),'2');
 const power=readScenario(new URL(links[2]!.href).search);
 assert.equal(power.invalid,false);assert.equal(power.scenario?.controls['marathon-apparatus'],'blanket');
 for(const section of sections)assert.ok(section.querySelector('a[href^="https://www.marathonfusion.com/"]'));
 for(const p of doc.querySelectorAll('main p'))for(const sentence of p.textContent!.split(/[.!?]\s|[.!?]$/).filter(Boolean))assert.ok(sentence.trim().split(/\s+/).length<=25,sentence);
});

test('retired reader URLs redirect to relevant retained content, including extensionless shared URLs',()=>{
 const rules=readFileSync('web-assets/_redirects','utf8').split('\n').filter(line=>line&&!line.startsWith('#')).map(line=>line.split(/\s+/));
 const targets={controls:'/start.html#current',transport:'/guide.html#collection',thermal:'/tutorial-03.html#flow',beam:'/?level=2&try=beamSource',collection:'/tutorial-04.html#sample',evidence:'/tutorial-06.html#questions'};
 assert.equal(rules.length,12);assert.equal(new Set(rules.map(rule=>rule[0])).size,rules.length);
 for(const [name,target]of Object.entries(targets))for(const suffix of ['.html',''])assert.deepEqual(rules.find(rule=>rule[0]===`/learn-${name}${suffix}`),[`/learn-${name}${suffix}`,target,'301']);
});
