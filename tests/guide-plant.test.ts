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
 const next=doc.querySelector<HTMLButtonElement>('[data-plant-next]')!,previous=doc.querySelector<HTMLButtonElement>('[data-plant-previous]')!,motion=doc.querySelector<HTMLButtonElement>('[data-plant-motion]')!;
 assert.equal(previous.disabled,true);assert.equal(next.disabled,false);
 const readings:string[]=[],reactions:string[]=[];
 for(let i=0;i<7;i++){
  assert.match(doc.querySelector('[data-plant-position]')!.textContent!,new RegExp(`^${i+1} of 7`));
  const scenes=[...doc.querySelectorAll('[data-plant-scene]')].filter(n=>!n.hasAttribute('hidden'));assert.equal(scenes.length,1);
  assert.ok(doc.querySelector('[data-plant-region].is-active'));
  readings.push(doc.querySelector('[data-plant-reading]')!.textContent!);reactions.push(doc.querySelector('[data-plant-reaction]')!.textContent!);
  if(!motion.disabled){motion.click();assert.equal(doc.querySelector('figure')!.dataset.motion,'running');}
  if(i<6){next.click();assert.equal(doc.querySelector('figure')!.dataset.motion,'paused');}
 }
 assert.equal(next.disabled,true);assert.match(readings[0],/separate initial tritium supply/);
 assert.match(reactions[1],/D \+ T → ⁴He \+ n/);assert.match(reactions[2],/¹⁹⁸Hg \+ n → ¹⁹⁷Hg \+ 2n/);
 assert.match(reactions[3],/⁶Li \+ n → T \+ ⁴He/);assert.match(readings[4],/leave the breeding material.*extraction unit.*Fuel processing/);
 assert.match(readings[6],/operate together.*did not burn.*new tritium/);
 for(let i=0;i<6;i++)previous.click();assert.equal(previous.disabled,true);assert.equal(next.disabled,false);
 assert.match(doc.querySelector('figcaption')!.textContent!,/direction, not rate.*No plant performance/);
});

test('extraction methods show material boundaries and pause, scrub and replay without changing the plant',t=>{
 const dom=new JSDOM(plantCycleDiagram()+tritiumExtractionDiagram());t.after(()=>dom.window.close());
 const win=dom.window as unknown as Window & typeof globalThis,doc=win.document;
 let callback:FrameRequestCallback|undefined;
 win.requestAnimationFrame=fn=>{callback=fn;return 1;};win.cancelAnimationFrame=()=>{callback=undefined;};setupPlantGuide(doc);
 const figure=doc.querySelector<HTMLElement>('[data-tritium-extraction]')!,range=figure.querySelector('input')!,play=figure.querySelector<HTMLButtonElement>('[data-extraction-play]')!;
 assert.equal(figure.dataset.motion,'paused');assert.equal(range.disabled,false);
 play.click();callback!(0);callback!(50);assert.ok(Number(range.value)>0);play.click();assert.equal(callback,undefined);
 range.value='70';range.dispatchEvent(new win.Event('input'));assert.equal(figure.querySelector('[data-extraction-dot]')!.getAttribute('cx'),'280');
 range.value='100';range.dispatchEvent(new win.Event('input'));assert.equal(play.textContent,'Replay path');assert.equal(figure.querySelector('[data-extraction-dot]')!.getAttribute('cy'),'210');
 play.click();callback!(0);assert.equal(range.value,'0');
 for(let now=50;now<=8000;now+=50)callback!(now);
 assert.equal(figure.dataset.motion,'paused');assert.equal(range.value,'100');
 const methods=[...figure.querySelectorAll<HTMLButtonElement>('[data-extraction-method]')];methods[1].click();
 assert.equal(range.value,'0');assert.equal(play.textContent,'Show path');assert.equal(figure.querySelector('[data-extraction-interface]')!.hasAttribute('hidden'),false);
 assert.match(figure.querySelector('[data-extraction-reading]')!.textContent!,/hydrogen isotopes pass through a metal membrane.*vacuum/);
 assert.match(figure.querySelector('[data-extraction-note]')!.textContent!,/not bulk liquid/);
 methods[0].click();assert.equal(figure.querySelector('[data-extraction-interface]')!.hasAttribute('hidden'),true);
 assert.match(figure.querySelector('[data-extraction-note]')!.textContent!,/not the helium-4/);
 play.click();Object.defineProperty(doc,'hidden',{value:true});doc.dispatchEvent(new win.Event('visibilitychange'));assert.equal(callback,undefined);
 assert.match(doc.querySelector('[data-plant-position]')!.textContent!,/^1 of 7/);
 assert.equal(figure.querySelectorAll('[aria-pressed=true]').length,1);
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
