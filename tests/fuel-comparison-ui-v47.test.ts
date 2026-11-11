import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createFuelComparisonTools} from '../src/fuel-comparison-ui.js';
import {computeFuelOperatingMap} from '../src/fuel-experiments.ts';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';

const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const snapshot=(currentA=.03)=>({result:simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA}),producingCode:null});
function fixture(t:any){
 const dom=new JSDOM('<main></main>'),doc=dom.window.document,requests:any[]=[],applied:any[]=[],pins:any[]=[];
 const tools=createFuelComparisonTools({document:doc,host:doc.querySelector('main'),
  request:(record:any,signal:any)=>new Promise(resolve=>requests.push({record,signal,resolve})),
  onApply:(c:any)=>applied.push(c),onPin:(p:any)=>pins.push(p)});
 const buttons=()=>[...doc.querySelectorAll('button')] as HTMLButtonElement[];
 const change=(index:number,value:string)=>{const select=doc.querySelectorAll('select')[index];select.value=value;select.dispatchEvent(new dom.window.Event('change'));};
 t.after(()=>{tools.dispose();dom.window.close();});
 return {tools,doc,requests,applied,pins,buttons,change};
}

test('comparison pin retains accepted data after later accepts and clear releases its ownership',t=>{
 const f=fixture(t);assert.equal(f.buttons()[0].disabled,true);
 f.tools.accept(snapshot(.02));f.buttons()[0].click();assert.equal(f.pins.length,1);
 assert.equal(f.tools.pinned!.config.currentA,.02);assert.ok(Object.isFrozen(f.tools.pinned!.config));
 f.tools.accept(snapshot(.05));assert.equal(f.tools.pinned!.config.currentA,.02);
 assert.match(f.doc.querySelector('output')!.textContent!,/0\.02 A/);
 f.buttons()[1].click();assert.equal(f.tools.pinned,null);assert.equal(f.doc.querySelector('output')!.textContent,'');
});

test('map requests use accepted config, cells expose units and require deliberate apply',async t=>{
 const f=fixture(t);f.tools.accept(snapshot());f.buttons()[2].click();
 const pending=f.requests[0];assert.equal(pending.record.kind,'fuel-operating-map');assert.equal(pending.record.options.size,7);
 assert.equal(pending.record.config.currentA,.03);
 const map=computeFuelOperatingMap(pending.record.config,pending.record.options);pending.resolve({result:map});await flush();
 const cells=[...f.doc.querySelectorAll('.fuel-map-cell')] as HTMLButtonElement[];assert.equal(cells.length,49);
 assert.equal(f.applied.length,0);cells[0].focus();assert.match(f.doc.querySelector('[role=status]')!.textContent!,/Magnetic field.*T.*Discharge current.*A/);
 cells[0].click();assert.equal(f.applied.length,1);assert.deepEqual(f.applied[0],map.points[0].config);
 f.applied[0].currentA=.1;assert.equal(map.points[0].config.currentA,0);
});

test('changed accepted config aborts pending maps and stale replies cannot repopulate controls',async t=>{
 const f=fixture(t);f.tools.accept(snapshot(.02));f.buttons()[2].click();const old=f.requests[0];
 f.tools.accept(snapshot(.04));assert.equal(old.signal.aborted,true);
 old.resolve({result:computeFuelOperatingMap(old.record.config,{size:2})});await flush();
 assert.equal(f.doc.querySelectorAll('.fuel-map-cell').length,0);
 f.buttons()[2].click();const next=f.requests[1];next.resolve({result:computeFuelOperatingMap(next.record.config,{size:2})});await flush();
 assert.equal(f.doc.querySelectorAll('.fuel-map-cell').length,4);
 f.change(0,'currentA');assert.equal(f.doc.querySelectorAll('.fuel-map-cell').length,0);assert.equal(f.buttons()[2].disabled,true);
});

test('invalid map cells stay keyboard inspectable without applying an invalid configuration',async t=>{
 const f=fixture(t);f.tools.accept(snapshot());f.buttons()[2].click();const pending=f.requests[0];
 const map=computeFuelOperatingMap(pending.record.config,{size:2,xDomain:[-.1,.1]});pending.resolve({result:map});await flush();
 const invalid=f.doc.querySelector('[data-status=invalid]') as HTMLButtonElement;
 assert.equal(invalid.disabled,false);assert.equal(invalid.getAttribute('aria-disabled'),'true');invalid.focus();
 assert.match(f.doc.querySelector('[role=status]')!.textContent!,/outside/);invalid.click();assert.equal(f.applied.length,0);
});

test('known map source mismatch is rejected while legacy unknown provenance remains explicit',async t=>{
 const f=fixture(t),known={...snapshot(),producingCode:{schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{source:'b'.repeat(64)}}};
 f.tools.accept(known);f.buttons()[2].click();const old=f.requests[0];
 old.resolve({result:computeFuelOperatingMap(old.record.config,{size:2}),producingCode:{...known.producingCode,sourceHash:'c'.repeat(64)}});await flush();
 assert.equal(f.doc.querySelectorAll('.fuel-map-cell').length,0);assert.match(f.doc.querySelector('[role=status]')!.textContent!,/Simulation code changed/);
 f.buttons()[2].click();const matching=f.requests[1];matching.resolve({result:computeFuelOperatingMap(matching.record.config,{size:2}),producingCode:known.producingCode});await flush();
 assert.equal(f.doc.querySelectorAll('.fuel-map-cell').length,4);
 f.tools.accept(snapshot());f.buttons()[2].click();const legacy=f.requests[2];
 legacy.resolve({result:computeFuelOperatingMap(legacy.record.config,{size:2}),producingCode:known.producingCode});await flush();
 assert.equal(f.doc.querySelectorAll('.fuel-map-cell').length,4);
});

test('map shows axis endpoints and uses one roving tab stop with directional row navigation',async t=>{
 const f=fixture(t);f.tools.accept(snapshot());f.buttons()[2].click();const pending=f.requests[0];
 pending.resolve({result:computeFuelOperatingMap(pending.record.config,pending.record.options)});await flush();
 const cells=[...f.doc.querySelectorAll('.fuel-map-cell')] as HTMLButtonElement[];
 assert.match(f.doc.querySelector('.fuel-map-axes')!.textContent!,/Magnetic field: 0\.05 T → 2 T/);
 assert.match(f.doc.querySelector('.fuel-map-axes')!.textContent!,/Discharge current: 0 A ↓ 0\.2 A/);
 assert.equal(cells.filter(c=>c.tabIndex===0).length,1);cells[0].focus();
 const key=(value:string,ctrlKey=false)=>f.doc.activeElement!.dispatchEvent(new f.doc.defaultView!.KeyboardEvent('keydown',{key:value,ctrlKey,bubbles:true,cancelable:true}));
 key('ArrowRight');assert.equal(f.doc.activeElement,cells[1]);assert.equal(cells[0].tabIndex,-1);
 key('ArrowDown');assert.equal(f.doc.activeElement,cells[8]);key('Home');assert.equal(f.doc.activeElement,cells[7]);
 key('ArrowLeft');assert.equal(f.doc.activeElement,cells[7]);key('End');assert.equal(f.doc.activeElement,cells[13]);
 key('End',true);assert.equal(f.doc.activeElement,cells[48]);key('ArrowDown');assert.equal(f.doc.activeElement,cells[48]);
 key('Home',true);assert.equal(f.doc.activeElement,cells[0]);assert.equal(f.applied.length,0);
 cells[8].click();assert.equal(cells[8].getAttribute('aria-pressed'),'true');assert.equal(cells.filter(c=>c.getAttribute('aria-pressed')==='true').length,1);
 cells[9].click();assert.equal(cells[8].getAttribute('aria-pressed'),'false');assert.equal(cells[9].getAttribute('aria-pressed'),'true');
});

test('map preserves 44px targets in a bounded scrolling container for narrow screens',async t=>{
 const f=fixture(t),style=f.doc.createElement('style');style.textContent=readFileSync(new URL('../src/fuel-comparison.css',import.meta.url),'utf8');f.doc.head.append(style);
 f.tools.accept(snapshot());f.buttons()[2].click();const pending=f.requests[0];pending.resolve({result:computeFuelOperatingMap(pending.record.config,pending.record.options)});await flush();
 const cell=f.doc.querySelector('.fuel-map-cell')!,grid=f.doc.querySelector('.fuel-map-grid')!,scroll=f.doc.querySelector('.fuel-map-scroll')!;
 const css=f.doc.defaultView!.getComputedStyle(cell);assert.equal(css.minWidth,'44px');assert.equal(css.minHeight,'44px');
 assert.equal((grid as HTMLElement).style.minWidth,'326px');assert.equal(f.doc.defaultView!.getComputedStyle(scroll).overflowX,'auto');
 assert.equal(f.doc.defaultView!.getComputedStyle(scroll).maxWidth,'100%');
});
