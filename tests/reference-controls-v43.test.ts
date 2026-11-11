import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupPreciseControls} from '../src/precise-controls.js';
import {setupTargetExposure} from '../src/target-exposure-ui.js';
import {setupTargetLoading} from '../src/target-loading-ui.js';
import {setupMarathonModels} from '../src/marathon-ui.js';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.js';
import {simulateTargetExposure} from '../src/target-exposure.js';
import {simulateTargetLoading} from '../src/target-loading.js';

function fixture(t:any,html='<div id="host"></div>'){
 const dom=new JSDOM(html),doc=dom.window.document;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 t.after(()=>{dom.window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 const exports:Blob[]=[];t.mock.method(URL,'createObjectURL',(blob:Blob)=>{exports.push(blob);return 'blob:reference-test';});
 t.mock.method(URL,'revokeObjectURL',()=>{});t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',()=>{});
 const change=(id:string,value:string|number)=>{const input=doc.getElementById(id) as HTMLInputElement;input.value=String(value);input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
 const toggle=(details:HTMLDetailsElement,open:boolean)=>{details.open=open;details.dispatchEvent(new dom.window.Event('toggle'));};
 const exported=async()=>JSON.parse(await exports.at(-1)!.text());
 return {doc,dom,change,toggle,exports,exported,host:doc.getElementById('host')!};
}
const source=(beamEnergyKeV=100)=>simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamEnergyKeV});
const closeTo=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<=1e-11*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);
const exportButton=(host:Element)=>[...host.querySelectorAll('button')].find(button=>button.textContent!.startsWith('Export '))!;

test('nested Exposure precise editor uses physical capacity, bounds/reset, linear units and Celsius',async t=>{
 const f=fixture(t,readFileSync('index.html','utf8')),models=setupMarathonModels();t.after(()=>models.target.update(null));
 const reference=models.target.referenceHost as HTMLDetailsElement;f.toggle(reference,true);setupPreciseControls(f.doc);
 const host=f.doc.getElementById('target-exposure')!,button=exportButton(host);
 const editor=(id:string)=>{
  const range=f.doc.getElementById(id) as HTMLInputElement,box=range.closest('.control')!;
  const output=box.querySelector('output')!,input=box.querySelector<HTMLInputElement>('.precise-editor input')!;
  const [apply,reset]=box.querySelectorAll<HTMLButtonElement>('.precise-editor button');
  return {range,output,input,apply,reset,open(){output.click();},commit(value:string){input.value=value;apply.click();}};
 };
 const capacity=editor('target-arealHeatCapacityJm2K');capacity.open();assert.equal(capacity.input.valueAsNumber,10000);
 assert.equal(capacity.output.textContent,'10000 J m⁻² K⁻¹');button.click();const initial=await f.exported();
 assert.equal(initial.config.heatTransferWM2K,5000);assert.equal(initial.thermalTimeConstantS,2);
 assert.equal(capacity.input.min,'100');assert.equal(capacity.input.max,'1000000');assert.match(capacity.input.getAttribute('aria-label')!,/J m⁻² K⁻¹/);
 capacity.commit('5000');closeTo(Number(capacity.range.value),Math.log10(5000));assert.equal(capacity.range.step,'any');
 assert.equal(capacity.output.textContent,'5000 J m⁻² K⁻¹');button.click();let result=await f.exported();
 closeTo(result.config.arealHeatCapacityJm2K,5000);closeTo(result.thermalTimeConstantS,1);
 capacity.open();closeTo(capacity.input.valueAsNumber,5000);
 for(const value of ['99','1000001']){capacity.commit(value);assert.equal(capacity.input.getAttribute('aria-invalid'),'true');closeTo(Number(capacity.range.value),Math.log10(5000));}
 capacity.reset.click();assert.equal(capacity.range.value,'4');assert.equal(capacity.range.step,'0.01');assert.equal(capacity.input.valueAsNumber,10000);
 const cooling=editor('target-heatTransferWM2K');cooling.open();assert.equal(cooling.input.valueAsNumber,5000);assert.match(cooling.input.getAttribute('aria-label')!,/W m⁻² K⁻¹/);cooling.commit('4321.25');
 const coolant=editor('target-coolantK');coolant.open();assert.equal(coolant.input.valueAsNumber,20);assert.equal(coolant.input.min,'-20');assert.match(coolant.input.getAttribute('aria-label')!,/°C/);coolant.commit('37.25');
 button.click();result=await f.exported();assert.equal(result.config.arealHeatCapacityJm2K,10000);assert.equal(result.config.heatTransferWM2K,4321.25);closeTo(result.config.coolantK,310.4);
 closeTo(Number(coolant.range.value),37.25);assert.equal(coolant.output.textContent,'37.25 °C');
});

test('closed Exposure retains only the newest source, reuses clean opens and exports current settings',async t=>{
 const f=fixture(t);let solves=0;
 const ui=setupTargetExposure(f.host,{active:false,simulate:(beam:any,config:any)=>{solves++;return simulateTargetExposure(beam,config);}});
 const first=source(),newest=source(200);ui.update(first);ui.update(newest);f.change('target-coolantK',25);
 assert.equal(solves,0);assert.equal(f.host.querySelectorAll('svg').length,0);
 ui.setActive(true);assert.equal(solves,1);ui.setActive(false);ui.setActive(true);assert.equal(solves,1);
 const plot=f.host.querySelector('svg');ui.setActive(false);ui.update(first);ui.update(newest);f.change('target-arealHeatCapacityJm2K',3);
 assert.equal(solves,1);assert.equal(f.host.querySelector('svg'),plot);
 exportButton(f.host).click();assert.equal(solves,2);const result=await f.exported();
 assert.equal(result.source.beamEnergyKeV,200);assert.equal(result.config.arealHeatCapacityJm2K,1000);assert.equal(result.config.coolantK,298.15);
 ui.setActive(true);assert.equal(solves,2);
 ui.setActive(false);ui.update(null);assert.equal(exportButton(f.host).disabled,true);ui.setActive(true);assert.equal(f.host.querySelector('svg'),null);
 ui.update(first);assert.equal(solves,3);assert.equal(exportButton(f.host).disabled,false);
});

test('closed Loading defers both tolerance solves and redraws until open or current export demand',async t=>{
 const f=fixture(t);let solves=0;
 const ui=setupTargetLoading(f.host,{active:false,deferWhenClosed:true,simulate:(beam:any,config:any)=>{solves++;return simulateTargetLoading(beam,config);}});
 const panel=f.host.querySelector('details')!,button=exportButton(f.host);ui.update(source());ui.update(source(200));
 f.toggle(panel,true);assert.equal(solves,0);ui.setActive(true);assert.equal(solves,2);
 f.toggle(panel,false);f.toggle(panel,true);assert.equal(solves,2);
 const plot=f.host.querySelector('svg');f.toggle(panel,false);ui.update(source());ui.update(source(300));f.change('loading-replacement',.25);
 assert.equal(solves,2);assert.equal(f.host.querySelector('svg'),plot);
 button.click();assert.equal(solves,4);let result=await f.exported();assert.equal(result.source.beamEnergyKeV,300);assert.equal(result.config.replacementProbability,.25);assert.ok(result.numericalComparison);
 f.toggle(panel,true);assert.equal(solves,4);
 ui.setActive(false);ui.update(source(200));ui.update(source(400));assert.equal(solves,4);ui.setActive(true);assert.equal(solves,6);
 button.click();result=await f.exported();assert.equal(result.source.beamEnergyKeV,400);assert.equal(solves,6);
 ui.setActive(false);ui.update(null);assert.equal(button.disabled,true);ui.setActive(true);assert.equal(f.host.querySelector('svg'),null);
});

test('Marathon wires both reference visibility boundaries without stale restore results',t=>{
 const f=fixture(t,readFileSync('index.html','utf8')),models=setupMarathonModels();t.after(()=>models.target.update(null));
 const references=models.target.referenceHost as HTMLDetailsElement,exposure=f.doc.getElementById('target-exposure')!,loading=f.doc.getElementById('target-loading')!;
 f.change('fusion-beamEnergyKeV',200);f.change('fusion-beamEnergyKeV',300);
 assert.equal(exposure.querySelector('svg'),null);assert.equal(loading.querySelector('svg'),null);
 f.toggle(references,true);assert.ok(exposure.querySelector('svg'));assert.equal(loading.querySelector('svg'),null);
 f.toggle(loading.querySelector('details')!,true);assert.ok(loading.querySelector('svg'));
 const prior=exposure.querySelector('svg');f.toggle(references,false);f.change('fusion-beamEnergyKeV',400);
 assert.equal(exposure.querySelector('svg'),prior);f.toggle(references,true);assert.notEqual(exposure.querySelector('svg'),prior);
 assert.match(f.doc.getElementById('fusion-energy-label')!.textContent!,/400 keV/);
});
