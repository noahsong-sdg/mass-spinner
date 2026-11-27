import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderPlots} from '../src/laboratory.js';

test('six refined-history ledger curves bound display paths and retain exact inspection and plot extrema',t=>{
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
  assert.ok((data.match(/[ML]/g)??[]).length<4*675,'Display paths must scale with pixel width, not solver samples.');
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
 svg.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home'}));svg.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight'}));
 assert.equal(selected.at(-1),x[1],'Keyboard inspection retains every accepted sample.');
 assert.equal(curves[0].x.length,count);assert.equal(curves[0].y.length,count);
});


test('dense history display preserves spikes, event neighbors, gaps, bands and the exact moving endpoint',t=>{
 const {window}=new JSDOM('<div id="plots"></div>'),previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 const host=window.document.getElementById('plots')!;
 t.after(()=>{renderPlots(host,[]);window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 const x=Array.from({length:20001},(_,i)=>i/20000),y:(number|null)[]=x.map(value=>value),low:(number|null)[]=y.map(value=>value!-.01),high:(number|null)[]=y.map(value=>value!+.01);
 y[10001]=3;y[10002]=-2;y[12000]=null;low[12000]=null;high[12000]=null;
 const event=x[5555],curve={label:'Dense',x:Object.freeze(x),y:Object.freeze(y),low:Object.freeze(low),high:Object.freeze(high),xLabel:'Time (s)',yLabel:'Value',eventX:[event],sampleAt:(time:number)=>time*time};
 const control=renderPlots(host,[curve],{revealUntil:1}),svg=host.querySelector('svg')!;
 const path=()=>svg.querySelector('g[data-series] path')!;
 const coordinates=()=>[...path().getAttribute('d')!.matchAll(/[ML]([\d.e+-]+) ([\d.e+-]+)/g)].map(match=>[Number(match[1]),Number(match[2])]);
 const full=coordinates();assert.ok(full.length<8*675+10);assert.equal((path().getAttribute('d')!.match(/M/g)??[]).length,2);assert.equal(svg.querySelectorAll('polygon').length,2);
 for(const index of [5554,5555,5556,10001,10002])assert.ok(full.some(point=>Math.abs(point[0]-(75+675*x[index]))<1e-10),`Accepted event or extreme at ${index} must remain.`);
 assert.ok(full.some(point=>point[1]===45),'The spike sets the full-history upper domain.');assert.ok(full.some(point=>point[1]===250),'The minimum sets the full-history lower domain.');
 const time=.333337;control.setCursor(time);assert.equal(svg.dataset.visibleUntil,String(time));
 const last=coordinates().at(-1)!;assert.ok(Math.abs(last[0]-(75+675*time))<1e-10);assert.ok(Math.abs(last[1]-(250-205*(time*time+2)/5))<1e-10);
 assert.match(host.querySelector('.plot-readout')!.textContent!,/Dense: 0.3333, 0.1111/);
 const accepted=x[3001];control.setCursor(accepted);assert.ok(Math.abs(coordinates().at(-1)![0]-(75+675*accepted))<1e-10,'An omitted display knot remains the exact moving endpoint.');
 control.setCursor(0);assert.equal(coordinates().length,1);assert.equal(curve.x.length,20001);assert.equal(curve.y[12000],null);
});
