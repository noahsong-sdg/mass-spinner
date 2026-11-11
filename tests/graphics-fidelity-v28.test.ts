import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderPlots} from '../src/laboratory.js';
import {geometry,DEFAULT_GEOMETRY} from '../src/geometries.js';
import {simulate,DEFAULT_CONFIG} from '../src/physics.js';
import {arrivalCurves} from '../src/ensemble.js';

// Exercise the production SVG transform with physical producer data. These
// checks establish coordinate fidelity, not native browser/GPU appearance.
function fixture(t:any,curves:any[]){
 const {window}=new JSDOM('<div id="plots"></div>');
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 t.after(()=>{window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 const host=window.document.getElementById('plots')!;renderPlots(host,curves);
 return {window,host,svg:host.querySelector('svg')!,readout:host.querySelector('.plot-readout')!};
}
const points=(path:Element)=>[...path.getAttribute('d')!.matchAll(/[ML]([\d.e+-]+) ([\d.e+-]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<=1e-10*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);

test('exact gyro circles retain their physical radii and equal axis scale in the actual plot',t=>{
 const result=geometry('gyro',DEFAULT_GEOMETRY),{host,svg}=fixture(t,result.curves);
 assert.equal(svg.getAttribute('viewBox'),'0 0 800 800');
 assert.equal(svg.getAttribute('preserveAspectRatio'),'xMidYMid meet');
 assert.match(host.querySelector('figcaption')!.textContent!,/equal spatial scale/);
 const paths=[...svg.querySelectorAll('path[stroke-width="2"]')].filter(p=>p.getAttribute('d')!.startsWith('M')&&!p.getAttribute('d')!.includes('h20'));
 const radii:number[]=[];
 result.curves.forEach((curve,j)=>{
  assert.equal(curve.equalAspect,true);
  const p=points(paths[j]);assert.equal(p.length,curve.x.length);
  const maxX=curve.x.indexOf(Math.max(...curve.x)),minX=curve.x.indexOf(Math.min(...curve.x));
  const maxY=curve.y.indexOf(Math.max(...curve.y)),minY=curve.y.indexOf(Math.min(...curve.y));
  const sx=(p[maxX][0]-p[minX][0])/(curve.x[maxX]-curve.x[minX]);
  const sy=-(p[maxY][1]-p[minY][1])/(curve.y[maxY]-curve.y[minY]);close(sx,sy);
  const rho=result.metrics.find(m=>m.label===`${j?'B':'A'} reference gyroradius`)!.value;
  const cx=p[0][0],cy=p[0][1]+sy*rho;
  for(const [x,y]of p)close(Math.hypot(x-cx,y-cy),sx*rho);
  radii.push(sx*rho);
 });
 close(radii[1]/radii[0],Math.sqrt(DEFAULT_GEOMETRY.massB/DEFAULT_GEOMETRY.massA));
});

test('spatial metadata is explicit and ordinary response-chart scaling is preserved',t=>{
 for(const mode of ['gyro','azimuthal','poms'] as const)
  assert.ok(geometry(mode,{...DEFAULT_GEOMETRY,duration:1e-6}).curves.every(c=>c.equalAspect===true));
 const curved=geometry('curved',DEFAULT_GEOMETRY);assert.ok(curved.curves.every(c=>!c.equalAspect));
 const {svg}=fixture(t,[{label:'Response',x:[0,1],y:[0,1],xLabel:'Input',yLabel:'Output'}]);
 assert.equal(svg.getAttribute('viewBox'),'0 0 800 310');
 const path=svg.querySelector('path[stroke-width="2"]')!;
 assert.deepEqual(points(path),[[75,250],[750,45]]);
});

test('spatial pointer readout accounts for horizontal SVG letterboxing and axis inset',t=>{
 const {window,svg,readout}=fixture(t,[{label:'Spatial',x:[0,.5,1],y:[0,.5,1],xLabel:'x (m)',yLabel:'y (m)',equalAspect:true}]);
 // A square viewBox centered in a 1200x800 CSS box has 200 px side gutters.
 Object.defineProperty(svg,'getBoundingClientRect',{value:()=>({left:100,top:50,width:1200,height:800})});
 const end=points(svg.querySelector('path[stroke-width="2"]')!)[2];
 svg.dispatchEvent(new window.MouseEvent('pointermove',{clientX:100+200+end[0],clientY:50+end[1]}));
 assert.match(readout.textContent!,/Spatial: 1, 1/);
 const before=readout.textContent;
 svg.dispatchEvent(new window.MouseEvent('pointermove',{clientX:150,clientY:450}));
 assert.equal(readout.textContent,before,'Letterbox gutters must not inspect fictional positions.');
});

test('response pointer readout accounts for vertical SVG letterboxing',t=>{
 const {window,svg,readout}=fixture(t,[{label:'Response',x:[0,.5,1],y:[0,.5,1],xLabel:'Input',yLabel:'Output'}]);
 // The 800x310 viewBox centered in a 400x400 box has 122.5 px top/bottom gutters.
 Object.defineProperty(svg,'getBoundingClientRect',{value:()=>({left:20,top:30,width:400,height:400})});
 svg.dispatchEvent(new window.MouseEvent('pointermove',{clientX:20+750*.5,clientY:30+122.5+100*.5}));
 assert.match(readout.textContent!,/Response: 1, 1/);
 svg.dispatchEvent(new window.MouseEvent('pointermove',{clientX:20+75*.5,clientY:30+122.5+100*.5}));
 assert.match(readout.textContent!,/Response: 0, 0/);
});

test('spatial inspection selects the pointed orbit branch and keyboard follows path order',t=>{
 const {window,svg,readout}=fixture(t,[{label:'Orbit',x:[0,1,0,-1,0],y:[1,0,-1,0,1],xLabel:'x (m)',yLabel:'y (m)',equalAspect:true}]);
 Object.defineProperty(svg,'getBoundingClientRect',{value:()=>({left:0,top:0,width:800,height:800})});
 const path=points(svg.querySelector('path[stroke-width="2"]')!);
 for(const i of [2,0]){
  svg.dispatchEvent(new window.MouseEvent('pointermove',{clientX:path[i][0],clientY:path[i][1]}));
  assert.match(readout.textContent!,i===2?/Orbit: 0, -1/:/Orbit: 0, 1/);
 }
 const key=(key:string)=>svg.dispatchEvent(new window.KeyboardEvent('keydown',{key}));
 key('Home');assert.match(readout.textContent!,/Orbit: 0, 1/);
 key('ArrowRight');assert.match(readout.textContent!,/Orbit: 1, 0/);
 key('ArrowRight');assert.match(readout.textContent!,/Orbit: 0, -1/);
 key('End');assert.match(readout.textContent!,/Orbit: 0, 1/);
 key('ArrowLeft');assert.match(readout.textContent!,/Orbit: -1, 0/);
});

test('equal-scale degenerate orbits stay finite and missing samples keep their gaps and bands',t=>{
 const {host}=fixture(t,[
  ...geometry('gyro',{...DEFAULT_GEOMETRY,temperatureEV:0}).curves,
  {label:'Gapped',x:[0,1,2,3,4],y:[0,1,NaN,3,4],low:[-.1,.9,NaN,2.9,3.9],high:[.1,1.1,NaN,3.1,4.1],xLabel:'Input',yLabel:'Output'},
 ]);
 for(const path of host.querySelectorAll('path'))assert.doesNotMatch(path.getAttribute('d')!,/NaN|Infinity/);
 const figures=host.querySelectorAll('figure');assert.equal(figures.length,2);
 const svg=figures[1].querySelector('svg')!;
 assert.equal(svg.querySelectorAll('polygon').length,2);
 const path=svg.querySelector('path[stroke-width="2"]')!;
 assert.equal((path.getAttribute('d')!.match(/M/g)||[]).length,2);
});

test('cumulative-incidence readouts and selected markers use post-event values at a jump',t=>{
 const result=simulate({...DEFAULT_CONFIG,voltage:0,particlesPerSpecies:4,distribution:'thermal',
  axialTemperatureEV:100,parallelEV:.01,duration:1e-6});
 const curve=arrivalCurves(result).find(c=>c.label==='A source')!;
 const expected=curve.y[curve.x.lastIndexOf(0)];assert.ok(expected>0);
 const {window,svg,readout}=fixture(t,[{...curve,selectedX:0}]);
 svg.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home'}));
 assert.match(readout.textContent!,new RegExp(`A source: 0, ${expected}`));
 assert.equal(Number(svg.querySelector('circle')!.getAttribute('cy')),45,'selected jump marker is post-event');
});
