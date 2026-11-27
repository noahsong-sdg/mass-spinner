import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {densityScan,densityScanDiagram,setupDensityScan} from '../src/guide-density.js';
import {turningDensity} from '../src/guide-force.js';

const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('radius and temperature slices obey the stated equilibrium and its limiting cases',()=>{
 for(const temperature of [250,500,1500])for(const radius of [0,3,6,12]){
  const data=densityScan(radius,temperature);
  for(const [i,mass]of [6.0151228874,7.0160034366].entries()){
   const omega=12500,r=radius/100;
   near(data.selected[i],Math.exp(mass*1.66053906892e-27*omega**2*r*r/(2*1.380649e-23*temperature)));
   near(data.radius[i][0],1);
   near(data.radius[i][100],turningDensity(1,mass,temperature));
   near(data.temperature[i][0],turningDensity(radius/12,mass,250));
   near(data.temperature[i][100],turningDensity(radius/12,mass,1500));
   assert.ok(data.radius[i].every((v,j,a)=>j===0||v>=a[j-1]));
   assert.ok(data.temperature[i].every((v,j,a)=>j===0||v<=a[j-1]));
  }
  assert.ok(data.selected[1]>=data.selected[0]);
 }
 near(densityScan(12,500).selected[0],turningDensity(1,6.0151228874));
 for(const mass of [6.0151228874,7.0160034366]){
  near(Math.log(turningDensity(1,mass,1000)),Math.log(turningDensity(1,mass,500))/2);
  near(Math.log(turningDensity(.5,mass)),Math.log(turningDensity(1,mass))/4);
 }
 assert.deepEqual(densityScan(0,500).temperature.map(curve=>new Set(curve)),[new Set([1]),new Set([1])]);
});

test('temperature changes the radial curves; radius changes the temperature curves and both marked states',t=>{
 const dom=new JSDOM(densityScanDiagram());t.after(()=>dom.window.close());
 const doc=dom.window.document,figure=doc.querySelector<HTMLElement>('figure')!;setupDensityScan(figure);
 const node=(selector:string)=>figure.querySelector(selector)!;
 const temperature=figure.querySelector<HTMLInputElement>('[aria-label="Equilibrium temperature (K)"]')!;
 const radius=figure.querySelector<HTMLInputElement>('[aria-label="Equilibrium radius (cm)"]')!;
 const change=(input:HTMLInputElement,value:number)=>{input.value=String(value);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
 const path=(kind:string)=>node(`[data-density-line="${kind}-1"]`).getAttribute('d');
 assert.equal(temperature.disabled,false);assert.equal(radius.disabled,false);
 assert.match(node('[data-density-selected]').textContent!,/⁶Li 5.09× · ⁷Li 6.68×/);
 const radial=path('radius'),thermal=path('temperature');change(temperature,1000);
 assert.notEqual(path('radius'),radial);assert.equal(path('temperature'),thermal,'only the selected point changes on a fixed-radius temperature scan');
 assert.match(node('[data-density-held="radius"]').textContent!,/1000 K/);
 assert.match(node('[data-density-selected]').textContent!,/⁶Li 2.26× · ⁷Li 2.58×/);
 const hotRadial=path('radius');change(radius,0);
 assert.equal(path('radius'),hotRadial,'radius selects a point without changing the fixed-temperature radial scan');
 assert.notEqual(path('temperature'),thermal);
 assert.match(node('[data-density-selected]').textContent!,/⁶Li 1.00× · ⁷Li 1.00×/);
 assert.match(node('[data-density-radius]').textContent!,/axis/);
 for(const point of figure.querySelectorAll('[data-density-point]')){
  assert.ok(Number.isFinite(Number(point.getAttribute('cx'))));assert.ok(Number.isFinite(Number(point.getAttribute('cy'))));
 }
 change(temperature,250);change(radius,12);
 assert.match(node('[data-density-radius]').textContent!,/wall/);
 for(const curve of figure.querySelectorAll('[data-density-line]'))assert.doesNotMatch(curve.getAttribute('d')!,/NaN|Infinity/);
});
