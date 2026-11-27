import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {understandingPage} from '../scripts/understanding-page.mjs';
import {numberedTutorials} from '../src/guide-topics.js';

test('the fuel-process comparison gives inputs and outputs without a decorative animation',t=>{
 const tutorial=numberedTutorials.find(part=>part.number==='05')!;
 const source=readFileSync('docs/UNDERSTANDING-MASS-SPINNER-05.md','utf8');
 const dom=new JSDOM(understandingPage(source,'a'.repeat(40),tutorial));t.after(()=>dom.window.close());
 const doc=dom.window.document,nodes:Element[]=[];
 for(let node=doc.getElementById('jobs')!.nextElementSibling;node&&node.tagName!=='H2';node=node.nextElementSibling)nodes.push(node);
 const table=nodes.find(node=>node.tagName==='TABLE');assert.ok(table,'compare the three processes together');
 assert.deepEqual([...table.querySelectorAll('th')].map(cell=>cell.textContent),['Process','What enters','What leaves']);
 const rows=[...table.querySelectorAll('tbody tr')].map(row=>[...row.querySelectorAll('td')].map(cell=>cell.textContent));
 assert.equal(rows.length,3);
 assert.match(rows[0]![1]!,/⁶Li.*⁷Li/);assert.match(rows[0]![2]!,/⁶Li-rich.*⁶Li-poor/);
 assert.match(rows[1]![0]!,/one reaction/);assert.match(rows[1]![1]!,/⁶Li.*neutron/);assert.match(rows[1]![2]!,/⁴He.*tritium/);
 assert.match(rows[2]![1]!,/Unburned deuterium and tritium/);assert.match(rows[2]![2]!,/return to the plasma/);
 const text=nodes.map(node=>node.textContent).join(' ');
 assert.match(text,/Only the breeding row makes new tritium/);
 assert.match(text,/does not directly change the exhaust-processing delay or the single-pass tritium burn fraction/);
 assert.equal(nodes.some(node=>node.matches('figure')||node.querySelector('svg,button')),false);
 assert.equal(doc.querySelector('[data-concept-example="fuel-cycle"]'),null);
 assert.ok(doc.querySelector('[data-concept-example="inventory"]'),'the quantitative inventory example stays available');
});
