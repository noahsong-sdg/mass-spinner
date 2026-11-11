import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupMarathonModels} from '../src/marathon-ui.js';

test('Marathon component inspection follows the apparatus before controls in keyboard order',()=>{
 const html=readFileSync('index.html','utf8');
 const order=['fusion-apparatus','fusion-inspector','fusion-controls','fusion-readouts','fusion-response','target-exposure','blanket-explorer'];
 let previous=-1;
 for(const id of order){
  assert.equal([...html.matchAll(new RegExp(`id="${id}"`,'g'))].length,1,id);
  const position=html.indexOf(`id="${id}"`);assert.ok(position>previous,id);previous=position;
 }
 for(const id of ['fusion-console','fusion-response','blanket-explorer'])
  assert.ok(html.includes(`href="#${id}"`)&&html.includes(`id="${id}"`),id);
 const css=readFileSync('src/marathon-layout.css','utf8');
 assert.ok(css.includes('#fusion-lab #fusion-inspector .component-choices{display:none}'));
 assert.ok(!css.includes('#fusion-apparatus .component-choices{display:none}'));
 assert.ok(!html.includes('Target temperature, lifetime, sample flux, isotope yield and net electricity are not calculated.'));
});

test('one source duration belongs to the evolving target and legacy thermal references remain publishable',t=>{
 const {window}=new JSDOM(readFileSync('index.html','utf8'));
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 const models=setupMarathonModels(),doc=window.document;
 t.after(()=>{
  models.target.update(null);window.close();
  if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');
 });
 assert.equal(doc.querySelectorAll('#fusion-exposureS').length,1);
 assert.ok(models.target.durationHost.contains(doc.getElementById('fusion-exposureS')));
 assert.ok(models.target.referenceHost.contains(doc.getElementById('target-exposure')));
 const link=doc.querySelector('.fusion-navigation a[href="#coupled-target"]')!;
 assert.ok(link);assert.ok(doc.querySelector(link.getAttribute('href')!));
 const notes=readFileSync('web-assets/MARATHON-TARGET-EXPOSURE.md','utf8');
 assert.ok(notes.includes('temperature-to-yield feedback'));
 assert.ok(notes.includes('fusion-only consumption'));
 assert.ok(notes.includes('small-Biot'));
});
