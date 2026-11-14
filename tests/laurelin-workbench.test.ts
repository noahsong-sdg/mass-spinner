import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountLaurelin} from '../src/laurelin-workbench.js';
import {buildLaurelinAssembly,LAURELIN_COMPONENTS} from '../src/laurelin-scene.js';
import {simulateLaurelin,LAURELIN_DEFAULTS} from '../src/laurelin-physics.js';
function fixture(t:any){
 const {window}=new JSDOM(readFileSync('laurelin.html','utf8'),{url:'https://example.com/laurelin.html'}),{document}=window;
 let inspect:(id:string)=>void,frame:(time:number)=>void,state:any,home=0;
 const app=mountLaurelin({document,modelSource:'/assets/model.md',requestFrame:(f:any)=>{frame=f;},
  createScene:(_canvas:any,onInspect:any)=>{inspect=onInspect;return {update:(s:any)=>{state=s;},home:()=>home++};}});
 const node=(id:string)=>document.getElementById(id) as any;
 const click=(id:string)=>node(id).click();
 const slide=(id:string,value:number)=>{node(id).value=String(value);node(id).dispatchEvent(new window.Event('input'));};
 t.after(()=>window.close());return {document,node,click,slide,app,inspect:(id:string)=>inspect(id),tick:(time:number)=>frame(time),state:()=>state,homes:()=>home};
}
test('every parameter is wired to the live model; reset restores state and finite plots',t=>{
 const f=fixture(t),baseline=f.app.result;
 const sliders=[...f.document.querySelectorAll<HTMLInputElement>('#sliders input')];assert.equal(sliders.length,10);
 for(const input of sliders){
  const key=input.id.replace('parameter-','');f.slide(input.id,Number(input.max));
  assert.notEqual(f.app.result.config[key],baseline.config[key],`${key} disconnected`);
  assert.doesNotMatch(f.node('charts').innerHTML,/NaN|Infinity/);
  f.click('reset');assert.deepEqual(f.app.result,baseline);
 }
 assert.equal(f.node('model-source').getAttribute('href'),'/assets/model.md');
 assert.match(f.node('charts').textContent,/8\.00e\+22 m⁻³/);
 assert.match(f.node('charts').textContent,/1\.90e\+18 s⁻¹/);
});
test('timeline, plot cursors and rendered state use the same physical sample',t=>{
 const f=fixture(t);f.slide('timeline',.56);
 const expected=f.app.result.samples[280];assert.equal(f.state(),expected);
 assert.equal(f.node('phase').textContent,'Hold');assert.equal(f.node('temperature').textContent,expected.temperatureKeV.toFixed(2));
 for(const line of f.document.querySelectorAll('.plot-cursor'))assert.equal(line.getAttribute('x1'),'170');
 f.click('play');f.tick(1000);f.tick(3000);assert.ok(Math.abs(f.app.fraction-.76)<1e-12);
 f.slide('timeline',.12);f.tick(5000);assert.equal(f.app.fraction,.12);
 f.click('restart');assert.equal(f.app.fraction,0);assert.equal(f.node('play').textContent,'Play');
 f.click('home');assert.equal(f.homes(),1);
});
test('panels and all component inspectors remain usable without overlay pileup',t=>{
 const f=fixture(t),buttons=[...f.document.querySelectorAll<HTMLButtonElement>('[data-panel]')];
 assert.equal(f.node('controls').hidden,true);assert.equal(buttons[0].getAttribute('aria-expanded'),'false');
 assert.equal([...f.document.querySelectorAll<HTMLElement>('.panel')].filter(p=>!p.hidden).length,0);
 for(const button of buttons){button.click();assert.equal(f.node(button.dataset.panel!).hidden,false);
  assert.equal([...f.document.querySelectorAll<HTMLElement>('.panel')].filter(p=>!p.hidden).length,1);
  assert.equal(button.getAttribute('aria-expanded'),'true');
  button.click();assert.equal(f.node(button.dataset.panel!).hidden,true);
  assert.equal(button.getAttribute('aria-expanded'),'false');}
 for(const [id,[name,,material]]of Object.entries(LAURELIN_COMPONENTS)){
  f.inspect(id);assert.equal(f.node('inspector').hidden,false);assert.equal(f.node('component-name').textContent,name);
  assert.equal(f.node('component-material').textContent,material);
 }
 const select=f.node('component-select');
 for(const [id,[name]]of Object.entries(LAURELIN_COMPONENTS)){
  buttons.find(b=>b.dataset.panel==='model')!.click();assert.equal(f.node('model').hidden,false);
  select.value=id;select.dispatchEvent(new f.document.defaultView!.Event('change'));
  assert.equal(f.node('inspector').hidden,false);assert.equal(f.node('component-name').textContent,name);
  assert.equal(f.document.activeElement,f.node('inspector').querySelector('button'));
 }
 assert.match(f.node('model').textContent,/not a computed trajectory/);
 assert.match(f.node('ledger').textContent,/Nonfusion net/);assert.match(f.node('validity').textContent,/Fusion electricity is unsolved/);
});
test('compression geometry, phase visibility, picking targets and finite field contours follow the pulse',()=>{
 const model=buildLaurelinAssembly(),r=simulateLaurelin();
 for(const id of Object.keys(LAURELIN_COMPONENTS))assert.ok(model.picks.some(p=>p.userData.component===id),`unselectable ${id}`);
 model.update(r.samples[0],LAURELIN_DEFAULTS);assert.equal(model.merged.group.visible,false);assert.equal(model.pair[0].group.visible,true);
 assert.ok(Math.abs(model.merged.body.scale.x/(2*model.merged.body.scale.z)-LAURELIN_DEFAULTS.radiusM/LAURELIN_DEFAULTS.lengthM)<1e-12);
 const peak=r.samples[280];model.update(peak,LAURELIN_DEFAULTS);
 assert.equal(model.merged.group.visible,true);assert.equal(model.pair[0].group.visible,false);
 assert.ok(Math.abs(model.merged.group.scale.x-1/Math.sqrt(8))<1e-12);assert.equal(model.merged.group.scale.z,1);
 model.update(r.samples.at(-1),LAURELIN_DEFAULTS);assert.equal(model.merged.group.scale.x,1);
 const resized=simulateLaurelin({radiusM:.44,lengthM:2.8});model.update(resized.samples[0],resized.config);
 assert.ok(Math.abs(model.merged.body.scale.x*model.merged.group.scale.x-model.unitsPerM*.44)<1e-12);
 assert.ok(Math.abs(2*model.merged.body.scale.z*model.merged.group.scale.z-model.unitsPerM*2.8)<1e-12);
 model.assembly.traverse((o:any)=>{if(o.geometry){const a=o.geometry.getAttribute('position');assert.ok(Array.from(a.array).every(Number.isFinite));o.geometry.dispose();}
  if(o.material)o.material.dispose();});
});
