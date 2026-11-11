import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {evaluateNeutronResponse} from '../src/neutron-response.ts';
import {setupNeutronResponse} from '../src/neutron-response-ui.js';
import {evolveDecayNetwork} from '../src/decay-network.ts';
const packet=JSON.parse(readFileSync(new URL('../web-assets/neutron-response/h1-v38.json',import.meta.url),'utf8'));
test('actual evaluated OpenMC packet passes all frozen independent holdout gates',()=>{
 assert.equal(packet.qualified,true);assert.equal(packet.nodes.length,6);assert.equal(packet.holdouts.length,5);
 for(const thickness of [.02,.04,.08,.1,.12,.16,.18]){
  const r=evaluateNeutronResponse(packet,thickness,14.1,1e10);
  for(const s of Object.values(r.scores) as any[])assert.ok(Number.isFinite(s.rateS)&&s.rateS>=0&&s.stdError>=0);
 }
 assert.throws(()=>evaluateNeutronResponse(packet,.19,14.1,1),/extrapolation/);
 assert.throws(()=>evaluateNeutronResponse(packet,.1,2.45,1),/14.1/);
});
test('evaluated response UI updates thickness/rate, plots separate MC bands and clears invalid results',t=>{
 const dom=new JSDOM('<main></main>'),previous=globalThis.document;Object.assign(globalThis,{document:dom.window.document});
 t.after(()=>{Object.assign(globalThis,{document:previous});dom.window.close();});
 const host=dom.window.document.querySelector('main')!,ui=setupNeutronResponse(host,packet),original=ui.read()!;
 assert.equal(host.querySelectorAll('svg').length,2);assert.equal(host.querySelectorAll('polygon').length,2);
 const thickness=host.querySelector<HTMLInputElement>('#neutron-response-thickness')!;thickness.value='18';thickness.dispatchEvent(new dom.window.Event('input'));
 assert.equal(ui.read()!.thicknessM,.18);assert.notEqual(ui.read()!.scores.total.mean,original.scores.total.mean);
 const rate=host.querySelector<HTMLInputElement>('#neutron-response-rate')!;rate.value='0';rate.dispatchEvent(new dom.window.Event('input'));
 assert.equal(ui.read()!.scores.total.rateS,0);assert.ok(ui.read()!.scores.total.mean>0);assert.equal(rate.dataset.unit,'s⁻¹');
 thickness.type='number';thickness.value='30';thickness.dispatchEvent(new dom.window.Event('input'));
 assert.equal(ui.read(),null);assert.equal(host.querySelectorAll('svg').length,0);assert.ok(host.querySelector<HTMLButtonElement>('button')!.disabled);
});
test('generic browser Bateman solver agrees with actual OpenMC CRAM48 and SciPy controls',()=>{
 const oracle=JSON.parse(readFileSync(new URL('../scientific/neutron-v38/results/decay-oracle.json',import.meta.url),'utf8'));
 const networks=[
  {nodes:[{id:'P',decayRateS:.4,products:[{to:'D',fraction:1}]},{id:'D',decayRateS:.2,products:[{to:'S',fraction:1}]},{id:'S',decayRateS:0}],productionAtomsS:[3,0,0]},
  {nodes:[{id:'A',decayRateS:0},{id:'B',decayRateS:0}],reactions:[{from:'A',to:'B',rateS:1},{from:'B',to:'A',rateS:2}],productionAtomsS:[0,2]},
  {nodes:[{id:'P',decayRateS:1000,products:[{to:'D',fraction:1}]},{id:'D',decayRateS:.001,products:[{to:'S',fraction:1}]},{id:'S',decayRateS:0}],productionAtomsS:[1e4,0,0]},
 ];
 for(const [i,c]of oracle.cases.entries()){
  const r=evolveDecayNetwork(networks[i],c.initial,c.timeS,true),scale=Math.max(1,...c.scipyExpm);
  for(const ref of [c.cram48,c.scipyExpm])for(let j=0;j<ref.length;j++)assert.ok(Math.abs(r.populations[j]-ref[j])<1e-8*scale,`${c.name} node${j}`);
 }
});
