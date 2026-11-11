import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderPlots} from '../src/laboratory.js';

function fixture(t:any,initialWidth=0){
 const {window}=new JSDOM('<div id="plots"></div>');
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 const observers:any[]=[];
 class Observer{
  target:any;disconnected=false;
  constructor(public callback:any){observers.push(this);}
  observe(target:any){this.target=target;}
  disconnect(){this.disconnected=true;}
  resize(width:number){this.callback([{target:this.target,contentRect:{width}}]);}
 }
 Object.defineProperty(window,'ResizeObserver',{value:Observer});
 window.HTMLElement.prototype.getBoundingClientRect=function(){return {width:initialWidth,height:0,left:0,top:0} as DOMRect;};
 const host=window.document.getElementById('plots')!;
 t.after(()=>{renderPlots(host,[]);window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 return {window,host,observers};
}
const curve={label:'Response',x:[0,.5,1],y:[0,.5,1],xLabel:'Input',yLabel:'Output'};
const points=(path:Element)=>[...path.getAttribute('d')!.matchAll(/[ML]([\d.e+-]+) ([\d.e+-]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
test('hover reads samples without committing time; deliberate pointer and keyboard scrub share a persistent cursor',t=>{
 const {host,window}=fixture(t,300),times:number[]=[],control=renderPlots(host,[curve],{onSelect:(x:number)=>times.push(x)}),svg=host.querySelector('svg')!;
 svg.getBoundingClientRect=()=>({width:300,height:310,left:0,top:0} as DOMRect);
 const readout=host.querySelector('.plot-readout'),path=svg.querySelector('path[stroke-width="2"]');
 svg.dispatchEvent(new window.MouseEvent('pointermove',{clientX:280,clientY:100}));assert.deepEqual(times,[]);assert.match(readout!.textContent!,/Response: 1, 1/);
 svg.dispatchEvent(new window.MouseEvent('pointerdown',{clientX:280,clientY:100}));assert.deepEqual(times,[1]);
 svg.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home'}));assert.deepEqual(times,[1,0]);
 control.setCursor(.5);assert.equal(host.querySelector('svg'),svg);assert.equal(svg.querySelector('path[stroke-width="2"]'),path);assert.equal(host.querySelector('.plot-readout'),readout);assert.match(svg.lastElementChild!.getAttribute('d')!,/177.5/);assert.match(readout!.textContent!,/Response: 0.5, 0.5/);assert.equal(readout!.getAttribute('aria-live'),'off');
 svg.dispatchEvent(new window.KeyboardEvent('keydown',{key:'End'}));assert.equal(readout!.getAttribute('aria-live'),'polite');assert.match(readout!.textContent!,/Response: 1, 1/);
});

test('visible content width sets pixel-sized typography and fewer horizontal ticks',t=>{
 const {host}=fixture(t,300);renderPlots(host,[curve]);
 const svg=host.querySelector('svg')!;
 assert.equal(svg.getAttribute('viewBox'),'0 0 300 310');
 assert.match(svg.getAttribute('style')!,/height:310px/);
 assert.ok([...svg.querySelectorAll('text')].every(text=>text.getAttribute('font-size')==='12'));
 assert.equal(svg.querySelectorAll('text[y="272"]').length,3,'Two intervals fit a 205px horizontal plot');
 assert.deepEqual(points(svg.querySelector('path[stroke-width="2"]')!),[[75,250],[177.5,147.5],[280,45]]);
});

test('hidden-to-visible and subsequent resize preserve selected values, exact inspection and observer lifecycle',t=>{
 const {host,window,observers}=fixture(t);renderPlots(host,[{...curve,selectedX:.5}]);
 const svg=host.querySelector('svg')!,readout=host.querySelector('.plot-readout')!;
 assert.equal(svg.getAttribute('viewBox'),'0 0 800 310');
 observers[0].resize(300);assert.equal(svg.getAttribute('viewBox'),'0 0 300 310');
 assert.equal(Number(svg.querySelector('circle')!.getAttribute('cx')),177.5);
 assert.match(readout.textContent!,/Response: 0.5, 0.5/);
 Object.defineProperty(svg,'getBoundingClientRect',{value:()=>({width:500,height:310,left:20,top:30})});
 observers[0].resize(500);assert.equal(svg.getAttribute('viewBox'),'0 0 500 310');
 svg.dispatchEvent(new window.MouseEvent('pointermove',{clientX:470,clientY:75}));
 assert.match(readout.textContent!,/Response: 1, 1/);
 svg.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home'}));
 assert.match(readout.textContent!,/Response: 0, 0/);
 observers[0].resize(0);assert.equal(svg.getAttribute('viewBox'),'0 0 500 310','Hiding a panel must retain finite coordinates');
 renderPlots(host,[curve]);assert.equal(observers[0].disconnected,true);
 assert.equal(observers.length,2);renderPlots(host,[]);assert.equal(observers[1].disconnected,true);
});

test('narrow legends wrap without reducing type, spatial scale remains equal and uncertainty gaps survive resize',t=>{
 const {host,observers}=fixture(t,300);
 renderPlots(host,[{...curve,label:'A very long descriptive scientific quantity with units and uncertainty',equalAspect:true},
  {...curve,label:'Other species',equalAspect:true,x:[0,.5,1],y:[1,.5,0]}]);
 const svg=host.querySelector('svg')!,view=svg.getAttribute('viewBox')!.split(' ').map(Number);
 assert.ok(view[3]>300,'Wrapping legends adds height instead of compressing plotting space');
 assert.ok(svg.querySelectorAll('tspan').length>2);
 const path=points(svg.querySelector('path[stroke-width="2"]')!);
 assert.ok(Math.abs((path[2][0]-path[0][0])+(path[2][1]-path[0][1]))<1e-10);
 observers[0].resize(450);
 const resized=points(svg.querySelector('path[stroke-width="2"]')!);
 assert.ok(Math.abs((resized[2][0]-resized[0][0])+(resized[2][1]-resized[0][1]))<1e-10);
 renderPlots(host,[{...curve,x:[0,1,2,3],y:[0,1,NaN,3],low:[-.1,.9,NaN,2.9],high:[.1,1.1,NaN,3.1]}]);
 observers.at(-1).resize(240);
 assert.equal(host.querySelectorAll('polygon').length,2);
 assert.equal((host.querySelector('path[stroke-width="2"]')!.getAttribute('d')!.match(/M/g)||[]).length,2);
});
