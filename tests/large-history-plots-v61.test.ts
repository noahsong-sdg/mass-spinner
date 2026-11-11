import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderPlots} from '../src/laboratory.js';

test('six refined-history ledger curves retain every sample and their actual plot extrema',t=>{
 const {window}=new JSDOM('<div id="plots"></div>');
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 const host=window.document.getElementById('plots')!;
 t.after(()=>{
  renderPlots(host,[]);window.close();
  if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');
 });
 const count=32000,x=Array.from({length:count},(_,i)=>-2+5*i/(count-1));
 const curves=Array.from({length:6},(_,j)=>({label:`Ledger ${j}`,x,
  y:Array.from({length:count},(_,i)=>j-3+i/(count-1)),xLabel:'Time (s)',yLabel:'Energy (J)'}));
 const selected:number[]=[];
 assert.doesNotThrow(()=>renderPlots(host,curves,{onSelect:(value:number)=>selected.push(value)}));
 const svg=host.querySelector('svg')!;assert.ok(svg);
 assert.equal(svg.getAttribute('viewBox'),'0 0 800 325');
 const paths=[...svg.querySelectorAll('path[stroke-width="2"]')].filter(path=>!path.getAttribute('d')!.includes('h20'));
 assert.equal(paths.length,6);
 for(const path of paths){
  const data=path.getAttribute('d')!;
  assert.equal((data.match(/[ML]/g)??[]).length,count,'Plotting must retain the accepted samples.');
  assert.doesNotMatch(data,/NaN|Infinity/);
 }
 // The full group spans x=-2..3 and y=-3..3. Two legend rows leave the
 // established 205px plot height at y=60..265 in the fallback 800px layout.
 assert.match(paths[0].getAttribute('d')!,/^M75 265 /);
 assert.match(paths[5].getAttribute('d')!.trim(),/L750 60$/);
 const labels=[...svg.querySelectorAll('text')].map(label=>label.textContent);
 assert.ok(labels.includes('-3')&&labels.includes('3')&&labels.includes('-2'));
 svg.dispatchEvent(new window.KeyboardEvent('keydown',{key:'End'}));
 assert.deepEqual(selected,[3]);
 assert.match(host.querySelector('.plot-readout')!.textContent!,/Ledger 5: 3, 3/);
});
