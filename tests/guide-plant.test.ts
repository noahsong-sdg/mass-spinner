import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {plantCycleDiagram,tritiumExtractionDiagram,setupPlantGuide} from '../src/guide-plant.js';
import {equationPlots} from '../src/equation-plots.js';
import {understandingPage} from '../scripts/understanding-page.mjs';
import {numberedTutorials} from '../src/guide-topics.js';

test('the plant sequence follows startup dependencies and keeps physical locations separate',t=>{
 const dom=new JSDOM(plantCycleDiagram());t.after(()=>dom.window.close());const doc=dom.window.document;
 setupPlantGuide(doc);
 const next=doc.querySelector<HTMLButtonElement>('[data-plant-next]')!,previous=doc.querySelector<HTMLButtonElement>('[data-plant-previous]')!;
 assert.equal(previous.disabled,true);assert.equal(next.disabled,false);
 assert.equal(doc.querySelectorAll('[data-plant-motion]').length,0);
 const readings:string[]=[];
 for(let i=0;i<7;i++){
  assert.match(doc.querySelector('[data-plant-position]')!.textContent!,new RegExp(`^${i+1} of 7`));
  const scenes=[...doc.querySelectorAll('[data-plant-scene]')].filter(n=>!n.hasAttribute('hidden'));assert.equal(scenes.length,1);
  assert.ok(doc.querySelector('[data-plant-region].is-active'));
  readings.push(doc.querySelector('[data-plant-reading]')!.textContent!);
  if(i<6)next.click();
 }
 assert.equal(next.disabled,true);assert.match(readings[0],/separate initial tritium supply/);
 assert.match(readings[1],/D \+ T → ⁴He \+ n/);assert.match(readings[2],/¹⁹⁸Hg \+ n → ¹⁹⁷Hg \+ 2n/);
 assert.match(readings[3],/⁶Li \+ n → T \+ ⁴He/);assert.match(readings[4],/leave the breeding material.*extraction unit.*Fuel processing/);
 assert.match(readings[6],/operate together.*did not burn.*new tritium/);
 for(let i=0;i<6;i++)previous.click();assert.equal(previous.disabled,true);assert.equal(next.disabled,false);
 assert.equal(doc.querySelectorAll('figcaption,[data-plant-result],[data-plant-reaction]').length,0);
 assert.match(doc.querySelector('#plant-loops-description')!.textContent!,/not specify a shared room.*not rates.*No plant performance/);
 const vessel=doc.querySelector('[data-plant-location="vessel"]')!,external=doc.querySelector('[data-plant-location="external"]')!;
 assert.ok(vessel.classList.contains('plant-boundary'));assert.ok(external.querySelector('.plant-boundary'));
 assert.equal(external.querySelectorAll('rect:not(.plant-boundary)').length,5);
 assert.equal(external.querySelectorAll('circle').length,0);
 for(const name of ['Lithium blanket','Mercury (optional)','Fusion chamber']){
  const label=[...doc.querySelectorAll('text')].find(node=>node.textContent===name)!;
  assert.ok(label);assert.equal(label.closest('[data-plant-region]'),null,'Stage opacity must not dim location labels.');
 }
});

test('static extraction cases show retained material and fuel processing without playback controls',t=>{
 const dom=new JSDOM(plantCycleDiagram()+tritiumExtractionDiagram());t.after(()=>dom.window.close());
 const win=dom.window as unknown as Window & typeof globalThis,doc=win.document;
 win.requestAnimationFrame=()=>{assert.fail('Static extraction must not schedule animation frames.');};setupPlantGuide(doc);
 const figure=doc.querySelector<HTMLElement>('[data-tritium-extraction]')!;
 assert.equal(figure.querySelectorAll('input,[data-extraction-play],figcaption').length,0);
 assert.equal(figure.hasAttribute('data-motion'),false);
 assert.match(figure.querySelector('[data-extraction-reading]')!.textContent!,/ceramic surface.*purge gas.*ceramic stays/);
 assert.equal(figure.querySelector('[data-extraction-retained]')!.textContent,'Stays in blanket');
 const methods=[...figure.querySelectorAll<HTMLButtonElement>('[data-extraction-method]')];methods[1].click();
 assert.equal(figure.querySelector('[data-extraction-interface]')!.hasAttribute('hidden'),false);
 assert.equal(figure.querySelector('[data-extraction-membrane]')!.hasAttribute('hidden'),false);
 assert.match(figure.querySelector('[data-extraction-reading]')!.textContent!,/hydrogen isotopes pass through a metal membrane.*vacuum.*bulk liquid returns/);
 assert.equal(figure.querySelector('[data-extraction-transport]')!.textContent,'Gas removed');
 methods[0].click();assert.equal(figure.querySelector('[data-extraction-interface]')!.hasAttribute('hidden'),true);
 assert.equal(figure.querySelector('[data-extraction-membrane]')!.hasAttribute('hidden'),true);
 assert.equal(figure.querySelector('[data-extraction-carrier]')!.textContent,'Helium purge gas');
 assert.match(doc.querySelector('[data-plant-position]')!.textContent!,/^1 of 7/);
 assert.equal(figure.querySelectorAll('[aria-pressed=true]').length,1);
 assert.match(figure.querySelector('desc')!.textContent!,/not an atom trajectory.*not verified Marathon.*not helium produced by breeding/);
 assert.match(figure.textContent!,/Fuel processing/);
});

test('the plant account gives export, break-even, import and converter heat rejection',()=>{
 const values=(internal:number,efficiency=40,thermal=1000)=>equationPlots['plant-electricity'].values(internal,{efficiency,thermal});
 assert.deepEqual(values(150),[400,250,600]);assert.deepEqual(values(400),[400,0,600]);assert.deepEqual(values(450),[400,-50,600]);
 for(const thermal of [0,1000,2000])for(const efficiency of [0,40,100]){
  const [gross,net,reject]=values(150,efficiency,thermal) as number[];assert.equal(gross+reject,thermal);assert.equal(net+150,gross);
 }
});

test('the tutorial includes chronology, extraction, device alternatives and a clickable plant balance',t=>{
 const source=readFileSync('docs/UNDERSTANDING-MASS-SPINNER-05.md','utf8'),part=numberedTutorials.find(p=>p.number==='05')!;
 const dom=new JSDOM(understandingPage(source,'a'.repeat(40),part));t.after(()=>dom.window.close());const doc=dom.window.document;
 for(const id of ['chronology','jobs','architecture','extraction','electricity','inventory','design'])assert.ok(doc.getElementById(id));
 assert.ok(doc.querySelector('[data-plant-cycle]'));assert.ok(doc.querySelector('[data-tritium-extraction]'));
 assert.ok(doc.querySelector('[data-equation-plot="plant-electricity"]'));
 assert.match(doc.body.textContent!,/Stellarator.*Inertial confinement/s);
 assert.match(doc.body.textContent!,/hydrogen as a test gas.*not establish a complete tritium plant/s);
 assert.match(doc.body.textContent!,/Commercial viability also needs.*Isotope sales.*do not change this energy balance/s);
 assert.match(doc.body.textContent!,/complete operating cycle/);
 const ids=[...doc.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
});
