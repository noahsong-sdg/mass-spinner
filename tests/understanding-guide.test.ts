import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {documentationPage} from '../scripts/documentation-page.mjs';
import {guideActions} from '../src/guide-topics.js';
import {understandingPage} from '../scripts/understanding-page.mjs';
import {JSDOM} from 'jsdom';

const path='docs/UNDERSTANDING-MASS-SPINNER-02.md';
const source=readFileSync(path,'utf8');

test('the equilibrium reader explains lithium use and checks each assumption against live model scope',t=>{
 const dom=new JSDOM(understandingPage(source,'a'.repeat(40)));t.after(()=>dom.window.close());
 const doc=dom.window.document;
 assert.match(source,/Lithium-7 can also make tritium.*high-energy neutrons/);
 assert.match(source,/centrifuge increases the lithium-6 percentage; it does not make tritium/);
 assert.match(source,/At fixed radius and isotope masses, higher angular speed or lower temperature gives stronger ideal equilibrium separation/);
 assert.match(source,/collection radius changes purity and recovery\. The available atom count limits how much product we can collect/);
 assert.ok(doc.querySelector('a[href="#equilibrium-assumptions"]'));
 const heading=doc.getElementById('equilibrium-assumptions')!,content=[];
 assert.equal(heading.tagName,'H3');
 for(let node=heading.nextElementSibling;node&&node.tagName!=='H2';node=node.nextElementSibling)content.push(node);
 assert.deepEqual(content.filter(node=>node.tagName==='H4').map(node=>node.textContent),['Ideal neutral gas','Rigid rotation','Uniform temperature','Diffusive equilibrium']);
 const text=content.map(node=>node.textContent).join(' ');
 for(const phrase of ['not verified Marathon operating conditions','does not describe the ion or electron equilibrium',
  'not sufficient evidence for accurate diffusion or heat transport','not only the vessel radius',
  'one angular speed for ions and one for neutral gas','spatial gas energy transport calculates radial temperatures, but still uses rigid rotation',
  'zero net radial diffusion','last point of a run can still have radial transport'])assert.ok(text.includes(phrase),phrase);
 for(const action of ['surfaceExperiment','spatialHeatExperiment','diffusionExperiment'])assert.ok(content.some(node=>node.querySelector(`a[data-guide-action="${action}"]`)));
 for(const link of doc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))assert.ok(doc.getElementById(link.hash.slice(1)),link.hash);
});

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
 for(const phrase of ['not speed immediately','Γ = ℐᵢνᵢₙ','τ_wall = ν_wall L_n',
  'also during a pause','New run','do not show if the device can continue to operate'])
  assert.ok(source.includes(phrase)||source.replace(/\s+/g,' ').includes(phrase),phrase);
});

test('the physics introduction links to the practical tutorial without another current procedure',()=>{
 const introduction=source.split('## 1.')[0];
 assert.match(introduction,/\[Tutorial 1\]\(https:\/\/fieldwork-plasma-lab\.fieldwork-plasma-lab\.workers\.dev\/start\.html\)/);
 assert.doesNotMatch(introduction,/try=currentExperiment|First, change one real control/);
 assert.match(source,/Examine identifies parts and links to those controls/);
 assert.doesNotMatch(source,/Inspect identifies/);
 assert.match(source,/At the same radius and angular speed, heavier atoms need more inward force/);
});

test('tutorial prose omits bold label prefixes',()=>{
 for(const suffix of ['', '-02', '-03', '-04', '-05', '-06']){
  const text=readFileSync(`docs/UNDERSTANDING-MASS-SPINNER${suffix}.md`,'utf8');
  assert.doesNotMatch(text,/\*\*[^*\n]+[.:]\*\*/);
 }
});

test('the drive explanation connects one-charge force to current, torque and supply energy',t=>{
 const dom=new JSDOM(understandingPage(source,'a'.repeat(40)));t.after(()=>dom.window.close());
 const doc=dom.window.document,drive=doc.getElementById('drive')!;
 assert.equal(drive.textContent,'3. How does electricity turn the gas?','the contents and diagram retain the drive anchor');
 const content=[];let node=drive.nextElementSibling;
 while(node&&node.tagName!=='H2'){content.push(node);node=node.nextElementSibling;}
 const text=content.map(node=>node.textContent).join(' ');
 assert.match(text,/a drum: a cylinder whose wall turns/);
 assert.match(text,/force on one charge.*signed electric charge/);
 assert.match(text,/Motion along the field gives zero magnetic force/);
 assert.match(text,/Negative charge reverses the force direction for the same velocity/);
 assert.match(text,/electrical supply supplies energy for rotation and heat/);
 assert.match(text,/current density J: electric current per area/);
 assert.match(text,/adds the magnetic forces from ions and electrons/);
 assert.match(text,/right of the end view.*current points left.*field points toward you.*force points up/);
 assert.match(text,/Neutral atoms have zero net charge/);
 assert.equal(content.filter(node=>node.matches('.equation')).length,2);
 assert.equal(doc.querySelector('.katex-error'),null);
});
