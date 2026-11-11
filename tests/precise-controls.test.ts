import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupPreciseControls} from '../src/precise-controls.js';

function fixture(t:any,attributes='min="0" max="1" step="0.1" value="0.4"'){
 const dom=new JSDOM(`<div id="scope"><div class="control"><label for="parameter"><span>Parameter</span><output>0.4 m</output></label><input id="parameter" type="range" data-unit="m" ${attributes}></div></div><div id="other"></div>`);
 t.after(()=>dom.window.close());const doc=dom.window.document,range=doc.querySelector('input')!,output=doc.querySelector('output')!;
 const changes:number[]=[];range.addEventListener('input',()=>changes.push(range.valueAsNumber));
 const api=setupPreciseControls(doc);const editor=doc.querySelector('.precise-editor')! as HTMLElement,input=editor.querySelector('input')!;
 const key=(node:Element,key:string)=>node.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
 const enter=(value:string)=>{output.click();input.value=value;key(input,'Enter');};
 return {dom,doc,range,output,editor,input,key,enter,changes,api};
}

test('exact entry preserves off-step values through the existing input API',t=>{
 const f=fixture(t);f.enter('0.456789');assert.equal(f.range.valueAsNumber,.456789);assert.equal(f.range.step,'any');
 assert.deepEqual(f.changes,[.456789]);assert.equal(f.editor.hidden,true);assert.equal(f.doc.activeElement,f.output);
 f.output.click();assert.equal(f.doc.activeElement,f.input);f.key(f.input,'Escape');
 f.key(f.range,'ArrowRight');assert.equal(f.range.step,'0.1');assert.ok(Math.abs(f.range.valueAsNumber-.6)<1e-14);
 f.output.click();f.input.value='.2';f.key(f.input,'Escape');assert.ok(Math.abs(f.range.valueAsNumber-.6)<1e-14);assert.equal(f.editor.hidden,true);
});

test('physical logarithmic entry maps explicitly declared units without guessing',t=>{
 const f=fixture(t,'min="-8" max="-4" step="0.05" value="-6" data-range-scale="log10"');
 f.output.click();assert.equal(f.input.valueAsNumber,1e-6);assert.equal(f.input.getAttribute('aria-label'),'Parameter (m)');
 f.input.value='2.345678e-6';f.key(f.input,'Enter');assert.ok(Math.abs(10**f.range.valueAsNumber/2.345678e-6-1)<1e-14);
 assert.equal(f.range.step,'any');assert.equal(f.changes.length,1);
 f.enter('0');assert.equal(f.editor.hidden,false);assert.equal(f.input.getAttribute('aria-invalid'),'true');assert.equal(f.changes.length,1);
 f.enter('0.001');assert.equal(f.changes.length,1);assert.match(f.editor.textContent!,/Enter a number from/);
});

test('invalid numbers are rejected without clipping or emitting model changes',t=>{
 const f=fixture(t);for(const value of ['-1','2','','NaN','Infinity']){f.enter(value);assert.equal(f.range.valueAsNumber,.4);assert.equal(f.changes.length,0);assert.equal(f.editor.hidden,false);}
 f.input.value='.5';f.key(f.input,'Enter');assert.equal(f.range.valueAsNumber,.5);assert.equal(f.editor.querySelector('[role=alert]')!.textContent,'');
});

test('integer domain, touch reset, keyboard opening and bounded group reset',t=>{
 const f=fixture(t,'min="1" max="10" step="1" value="4" data-integer="true"');
 f.key(f.output,'Enter');assert.equal(f.editor.hidden,false);f.input.value='4.1';f.key(f.input,'Enter');assert.equal(f.range.valueAsNumber,4);
 f.input.value='7';f.key(f.input,'Enter');assert.equal(f.range.valueAsNumber,7);f.api.reset(f.doc.querySelector('#other')!);assert.equal(f.range.valueAsNumber,7);
 f.api.reset(f.doc.querySelector('#scope')!);assert.equal(f.range.valueAsNumber,4);
 f.enter('6');f.output.click();(f.editor.querySelector('[aria-label="Reset Parameter"]')! as HTMLButtonElement).click();assert.equal(f.input.valueAsNumber,4);assert.equal(f.range.valueAsNumber,4);
 f.key(f.input,'Escape');f.range.disabled=true;f.output.click();assert.equal(f.editor.hidden,true);
 setupPreciseControls(f.doc);assert.equal(f.doc.querySelectorAll('.precise-editor').length,1);
});

test('a pointer gesture restores the declared slider step after precise entry',t=>{
 const f=fixture(t);f.enter('.456789');f.range.dispatchEvent(new f.dom.window.Event('pointerdown',{bubbles:true}));assert.equal(f.range.step,'0.1');
});

test('Escape first cancels a numeric draft without closing its containing window',t=>{
 const f=fixture(t);let windowCloses=0;f.doc.querySelector('#scope')!.addEventListener('keydown',event=>{if((event as KeyboardEvent).key==='Escape')windowCloses++;});
 f.output.click();f.input.value='.75';f.key(f.input,'Escape');assert.equal(f.editor.hidden,true);assert.equal(f.range.valueAsNumber,.4);assert.equal(windowCloses,0);
 f.key(f.output,'Escape');assert.equal(windowCloses,1);
});
