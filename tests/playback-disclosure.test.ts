import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {floatingPlayback} from '../src/floating-playback.js';

const rect=(width:number,top:number,height:number)=>({left:0,top,width,height,right:width,bottom:top+height,x:0,y:top,toJSON(){}});
function fixture(t:{after:(callback:()=>void)=>void},width=390,saved?:string){
 const dom=new JSDOM('<main class="sim-workspace"><section><div class="fuel-motion"><div><select><option>Coupled separation</option></select></div><button id="play">Play</button><button id="power">Cut power</button><button id="rewind">Rewind</button><button id="new">New run</button><input type="range" value="37"><span id="legend">Light · heavy</span><output>0.37 s · gas 900 m/s</output></div></section></main>',{url:'https://example.org'});
 const win=dom.window,doc=win.document,parent=doc.querySelector('section')!,panel=doc.querySelector('.fuel-motion') as HTMLElement;let sceneHeight=676,viewport=width;
 Object.defineProperty(win,'innerWidth',{get:()=>viewport});
 parent.getBoundingClientRect=()=>rect(width,64,sceneHeight);
 panel.getBoundingClientRect=()=>{const height=Math.min(panel.querySelector('details')?.open?276:132,panel.style.maxHeight?parseFloat(panel.style.maxHeight):Infinity);return rect(width-16,64+sceneHeight-72-height,height);};
 const rewind=doc.getElementById('rewind')!,newRun=doc.getElementById('new')!,legend=doc.getElementById('legend')!,clock=doc.querySelector('output')!;
 if(saved)win.localStorage.setItem('mass-spinner-playback-v1',saved);
 const ui=floatingPlayback(panel,{details:[rewind,newRun,legend,clock]}),disclosure=panel.querySelector('details')!,summary=disclosure.querySelector('summary')!;
 t.after(()=>{ui.dispose();win.close();});
 const toggle=()=>new Promise<void>(resolve=>{disclosure.addEventListener('toggle',()=>resolve(),{once:true});summary.click();});
 return {panel,parent,doc,win,ui,rewind,newRun,legend,clock,disclosure,summary,toggle,inset:()=>parseFloat(parent.style.getPropertyValue('--fuel-playback-inset')),resize(next:number){width=next;viewport=next;win.dispatchEvent(new win.Event('resize'));},viewport(next:number){viewport=next;win.dispatchEvent(new win.Event('resize'));},sceneHeight(next:number){sceneHeight=next;ui.refresh();}};
}

test('compact playback keeps primary controls visible and reveals the same secondary controls',async t=>{
 const f=fixture(t),range=f.panel.querySelector('input')!;let inputs=0,rewinds=0;
 range.addEventListener('input',()=>inputs++);f.rewind.addEventListener('click',()=>rewinds++);
 assert.equal(f.disclosure.open,false);assert.ok(f.panel.classList.contains('fuel-motion-compact'));
 assert.equal(f.doc.getElementById('play')!.parentElement,f.panel);assert.equal(f.doc.getElementById('power')!.parentElement,f.panel);
 assert.equal(range.parentElement,f.panel);assert.equal(range.value,'37');
 const closedInset=f.inset();await f.toggle();
 assert.equal(f.disclosure.open,true);assert.ok(f.inset()>closedInset,'opening details reallocates the camera to the measured panel height');
 assert.equal(f.disclosure.querySelector('#rewind'),f.rewind);f.rewind.click();assert.equal(rewinds,1);
 await f.toggle();
 assert.equal(f.disclosure.open,false);assert.equal(f.inset(),closedInset);assert.equal(inputs,0);assert.equal(range.value,'37');
});

test('responsive disclosure preserves a user choice until the layout changes',t=>{
 const f=fixture(t,1000);assert.equal(f.disclosure.open,true);assert.equal(f.panel.classList.contains('fuel-motion-compact'),false);
 f.resize(390);assert.equal(f.disclosure.open,false);f.disclosure.open=true;f.ui.refresh();assert.equal(f.disclosure.open,true);
 f.resize(400);assert.equal(f.disclosure.open,true,'resizing within the compact layout retains the explicit choice');
 f.resize(1000);assert.equal(f.disclosure.open,true);f.resize(390);assert.equal(f.disclosure.open,false);
});

test('automatic compact collapse moves focus out of secondary controls',t=>{
 const f=fixture(t,1000);f.rewind.focus();assert.equal(f.doc.activeElement,f.rewind);
 f.resize(390);assert.equal(f.disclosure.open,false);assert.equal(f.doc.activeElement,f.summary);
 f.resize(1000);assert.equal(f.doc.activeElement,f.rewind,'desktop restores focus to an exposed control before hiding its summary');
 f.doc.getElementById('play')!.focus();f.resize(390);assert.equal(f.doc.activeElement,f.doc.getElementById('play'));
});

test('short scenes keep collapsed and expanded default playback within the scene',async t=>{
 const f=fixture(t);f.sceneHeight(160);
 assert.equal(f.panel.style.maxHeight,'80px');assert.equal(f.panel.getBoundingClientRect().top,f.parent.getBoundingClientRect().top+8);
 await f.toggle();assert.equal(f.disclosure.open,true);assert.equal(f.panel.getBoundingClientRect().top,f.parent.getBoundingClientRect().top+8);
 assert.equal(f.panel.getBoundingClientRect().bottom,152);
});

test('a narrow desktop scene reserves its compact playback footprint',t=>{
 const f=fixture(t);f.viewport(1000);assert.ok(f.panel.classList.contains('fuel-motion-compact'));assert.ok(f.inset()>0);
 f.resize(1000);assert.equal(f.inset(),0);
});

test('version-one placement survives compact disclosure and disposal restores owned nodes',t=>{
 const saved='{"version":1,"x":0.5,"y":0.5}',f=fixture(t,390,saved);
 assert.ok(f.panel.classList.contains('fuel-motion-moved'));assert.equal(f.inset(),0);assert.equal(f.win.localStorage.getItem('mass-spinner-playback-v1'),saved);
 f.ui.dispose();assert.equal(f.panel.querySelector('details'),null);assert.equal(f.clock.parentElement,f.panel);
 assert.equal(f.panel.classList.contains('fuel-motion-compact'),false);assert.equal(f.panel.querySelector('.fuel-motion-grip'),null);
});
