import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.js';
import {fusionPlaygroundData} from '../src/fusion-playground.js';
import {simulateTargetLoading,type LoadingSource} from '../src/target-loading.js';
import {setupFusionLaboratory} from '../src/fusion-ui.js';
import {setupTargetLoading} from '../src/target-loading-ui.js';
import {E_CHARGE} from '../src/physics.js';

// Production HTML + producers in a synthetic DOM. No page/network requests,
// browser rendering, worker or GPU are exercised by these source-level tests.
function dom(t:{after:(fn:()=>void)=>void}){
 const page=new JSDOM(readFileSync('index.html','utf8'));
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:page.window.document});
 t.after(()=>{page.window.close();if(prior)Object.defineProperty(globalThis,'document',prior);else delete (globalThis as {document?:unknown}).document;});
 const document=page.window.document;
 return {document,event:(id:string,type:string)=>document.getElementById(id)!.dispatchEvent(new page.window.Event(type))};
}
const depleted:LoadingSource={config:{targetColumnM2:0,beamAreaM2:1e-4,exposureS:1},
 siteColumnM2:1e21,unitLoadingOpticalDepth:1e-5,particleRateS:1e17};

test('neutron readouts and scan axes identify the computed D–T channel',()=>{
 const r=simulateFusionBeam(DEFAULT_FUSION_BEAM),display=fusionPlaygroundData(r);
 const [label,rate,unit]=display.metrics.find(([label])=>/neutron/i.test(String(label)))!;
 assert.match(String(label),/D–T/);assert.equal(rate,r.neutronRateS);assert.equal(unit,'s⁻¹');
 const yieldCurve=display.curves.find(curve=>/neutron/i.test(curve.yLabel))!;
 assert.match(yieldCurve.yLabel,/D–T/);
 assert.ok(Math.abs(r.neutronRateS/(r.config.beamCurrentA/E_CHARGE*r.fusionProbability)-1)<1e-14);
});

test('fully deuterated fixed sites have zero modeled D–T yield, with explicit channel labels',()=>{
 const r=simulateTargetLoading(depleted,{replacementProbability:1,intervals:10});
 assert.equal(r.final.deuteriumFraction,1);assert.equal(r.final.tritiumFraction,0);
 assert.equal(r.final.neutronRateS,0);assert.equal(r.final.cumulativeNeutrons,0);
 for(const curve of r.curves.slice(3)){assert.match(curve.label,/D–T/);assert.match(curve.yLabel,/D–T/);}
 assert.match(r.curves[3].yLabel,/s⁻¹/);assert.doesNotMatch(r.curves[4].yLabel,/s⁻¹/);
 assert.match(r.assumptions.join(' '),/D–D reactions/);
});

test('actual loading DOM qualifies its integrated yield and clears an invalid or removed source',t=>{
 const {document}=dom(t),host=document.getElementById('target-loading')!,ui=setupTargetLoading(host);
 ui.update(depleted);
 assert.match(host.textContent!,/Integrated D–T neutrons 0/);
 assert.match(host.textContent!,/D–T neutron-total change zero yield/);
 assert.equal(host.querySelector('button')!.disabled,false);
 assert.ok(host.querySelectorAll('svg').length>0);
 ui.update({...depleted,config:{...depleted.config,targetColumnM2:2e21}});
 assert.equal(host.querySelectorAll('svg').length,0);assert.equal(host.querySelector('button')!.disabled,true);
 assert.doesNotMatch(host.textContent!,/Integrated D–T neutrons/);
 ui.update(depleted);assert.equal(host.querySelector('button')!.disabled,false);
 ui.update(null);assert.equal(host.querySelectorAll('svg').length,0);
 assert.equal(host.querySelector('button')!.disabled,true);
});

test('source controls publish current power/rate identities and invalidate downstream loading',t=>{
 const {document,event}=dom(t),host=document.getElementById('target-loading')!,loading=setupTargetLoading(host);
 let latest:ReturnType<typeof simulateFusionBeam>|null=null;
 const lab=setupFusionLaboratory({onUpdate:r=>{latest=r;loading.update(r);}});
 const input=(id:string,value:string)=>{(document.getElementById(id) as HTMLInputElement).value=value;event(id,'input');};
 const checkbox=(id:string,value:boolean)=>{(document.getElementById(id) as HTMLInputElement).checked=value;event(id,'change');};
 input('fusion-beamCurrentA','-1');input('fusion-beamEnergyKeV','200');
 assert.ok(latest);const r=latest as ReturnType<typeof simulateFusionBeam>;
 assert.equal(r.config.beamCurrentA,.1);assert.equal(r.config.beamEnergyKeV,200);
 assert.ok(Math.abs(r.beamPowerW-20000)<1e-10);
 assert.ok(Math.abs(r.neutronRateS/(.1/E_CHARGE*r.fusionProbability)-1)<1e-14);
 assert.match(document.getElementById('fusion-readouts')!.textContent!,/D–T neutron/);
 assert.match(document.getElementById('fusion-metrics')!.textContent!,/D–T neutrons over exposure/);
 checkbox('fusion-beam-enabled',false);assert.equal(lab.read().beamCurrentA,0);
 assert.equal((latest as ReturnType<typeof simulateFusionBeam>).neutronRateS,0);
 checkbox('fusion-beam-enabled',true);checkbox('fusion-target-enabled',false);
 assert.equal(lab.read().targetColumnM2,0);assert.equal((latest as ReturnType<typeof simulateFusionBeam>).neutronRateS,0);
 checkbox('fusion-target-enabled',true);
 const stopping=document.getElementById('fusion-stopping-model') as HTMLSelectElement;
 stopping.value='invalid';event(stopping.id,'change');
 assert.equal(latest,null);assert.equal(document.getElementById('fusion-readouts')!.children.length,0);
 assert.equal(document.getElementById('fusion-plots')!.children.length,0);
 assert.equal((document.getElementById('export-fusion') as HTMLButtonElement).disabled,true);
 assert.equal(host.querySelectorAll('svg').length,0);assert.equal(host.querySelector('button')!.disabled,true);
 stopping.value='linear';event(stopping.id,'change');assert.ok(latest);
 assert.equal((latest as ReturnType<typeof simulateFusionBeam>).config.beamEnergyKeV,200);
 assert.equal(host.querySelector('button')!.disabled,false);
});
