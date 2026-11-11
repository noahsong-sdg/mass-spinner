import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupNeutronTransport} from '../src/neutron-transport-ui.js';

function mount(t:{after:(fn:()=>void)=>void}){
 const dom=new JSDOM('<main id="host"></main>'),previous=globalThis.document;
 Object.assign(globalThis,{document:dom.window.document});
 t.after(()=>{Object.assign(globalThis,{document:previous});dom.window.close();});
 const host=dom.window.document.getElementById('host')!,ui=setupNeutronTransport(host);
 const input=(key:string,value:number)=>{
  const control=host.querySelector<HTMLInputElement>(`#neutron-transport-${key}`)!;
  control.value=String(value);control.dispatchEvent(new dom.window.Event('input',{bubbles:true}));return control;
 };
 return {host,ui,input,dom};
}
const source={sourceRateS:2e10,sourceEnergyMeV:14.1};

test('first-flight UI uses a vacuum default and exact current selected-time source',t=>{
 const {host,ui,input}=mount(t);
 assert.equal(ui.read(),null);assert.match(host.querySelector('[role=status]')!.textContent!,/No valid source/);
 ui.update(source);const initial=ui.read()!;
 assert.equal(initial.config.layers[0].totalMInv,0);assert.equal(initial.config.layers[0].absorptionMInv,0);
 assert.equal(initial.rates.firstAbsorbed,0);assert.equal(initial.detectionRateS,0);
 assert.ok(initial.rates.uncollidedEscaped>0);assert.equal(initial.config.sourceRateS,source.sourceRateS);
 const rate=initial.rates.uncollidedEscaped;
 ui.update({...source,sourceRateS:source.sourceRateS/2});assert.equal(ui.read()!.rates.uncollidedEscaped,rate/2);
 const area=input('area',100);
 assert.equal(area.getAttribute('aria-valuetext'),'100 cm²');assert.equal(ui.read()!.config.sampleAreaM2,.01);
 const thickness=input('thickness',2);
 assert.equal(thickness.getAttribute('aria-valuetext'),'2 cm');assert.equal(ui.read()!.config.layers[0].thicknessM,.02);
 assert.ok(host.querySelectorAll('.live-plots svg').length>0);
 assert.doesNotMatch(host.innerHTML,/NaN|Infinity/);
});

test('actual material controls produce interactions with explicitly assumed response',t=>{
 const {host,ui,input}=mount(t);ui.update(source);
 input('total',100);input('absorption',25);input('efficiency',.5);
 const result=ui.read()!;
 assert.ok(result.rates.firstAbsorbed>0);assert.ok(result.rates.firstScatteredUnresolved>result.rates.firstAbsorbed);
 assert.ok(result.detectionRateS>0);assert.ok(result.detectionRateS<source.sourceRateS);
 assert.ok(Math.abs(Object.values(result.fractions).reduce((a,b)=>a+(b as number),0)-1)<1e-12);
 assert.match(host.textContent!,/scenario inputs/);assert.match(host.textContent!,/unresolved/);
 assert.equal(host.querySelector<HTMLButtonElement>('button')!.disabled,false);
});

test('invalid material/source clears stale output and export, then recovers without changing source',t=>{
 const {host,ui,input}=mount(t);ui.update(source);input('total',10);input('absorption',5);
 assert.ok(ui.read());input('absorption',20);
 assert.equal(ui.read(),null);assert.ok(host.querySelector<HTMLButtonElement>('button')!.disabled);
 assert.equal(host.querySelector('.fusion-readouts')!.children.length,0);
 assert.equal(host.querySelector('.live-plots')!.children.length,0);
 assert.ok(host.querySelector('[role=status]')!.textContent!.length>0);
 input('total',30);assert.ok(ui.read());assert.equal(ui.read()!.config.sourceRateS,source.sourceRateS);
 ui.update(null);assert.equal(ui.read(),null);assert.equal(host.querySelector('.live-plots')!.children.length,0);
 ui.update(source);assert.ok(ui.read());assert.equal(host.querySelector('[role=status]')!.textContent,'');
 ui.update({...source,sourceEnergyMeV:NaN});assert.equal(ui.read(),null);
 ui.update(source);assert.ok(ui.read());
});

test('zero source clears all rates while retaining valid geometry and exact export assumptions',async t=>{
 const {host,ui,input,dom}=mount(t);ui.update({...source,sourceRateS:0});input('total',100);input('absorption',50);
 const result=ui.read()!;assert.ok(result);
 for(const rate of Object.values(result.rates))assert.equal(rate,0);
 assert.equal(result.detectionRateS,0);assert.doesNotMatch(host.innerHTML,/NaN|Infinity/);
 let blob:Blob|undefined,clicked=false;
 const create=URL.createObjectURL,revoke=URL.revokeObjectURL,click=dom.window.HTMLAnchorElement.prototype.click;
 URL.createObjectURL=value=>{blob=value as Blob;return 'blob:source-test';};URL.revokeObjectURL=()=>{};
 dom.window.HTMLAnchorElement.prototype.click=function(){clicked=this.download==='mass-spinner-neutron-first-flight.json';};
 t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;dom.window.HTMLAnchorElement.prototype.click=click;});
 host.querySelector<HTMLButtonElement>('button')!.click();assert.ok(clicked);assert.ok(blob);
 const saved=JSON.parse(await blob.text());
 assert.equal(saved.schemaVersion,1);assert.equal(saved.config.sourceRateS,0);assert.equal(saved.source.sourceEnergyMeV,14.1);
 assert.equal(saved.config.layers[0].totalMInv,100);assert.ok(saved.assumptions.length>0);
 assert.equal(saved.rates.firstAbsorbed,0);
});

test('angular-refinement disclosure runs actual model at multiple quadrature counts',t=>{
 const {host,ui,input,dom}=mount(t);ui.update(source);input('total',100);input('absorption',50);
 const disclosure=[...host.querySelectorAll('details')].find(d=>d.querySelector('summary')!.textContent==='Angular refinement')!;
 disclosure.open=true;disclosure.dispatchEvent(new dom.window.Event('toggle'));
 assert.ok(disclosure.querySelector('svg'));assert.match(disclosure.textContent!,/Quadrature sensitivity only/);
 // Each requested coarse count returns the doubled fine result; the axis must
 // describe the actual returned quadrature, whose final count is 512.
 assert.match(disclosure.querySelector('svg')!.textContent!,/512/);
 ui.update(null);assert.equal(disclosure.querySelectorAll('svg').length,0);
});

test('beam-off source preserves undefined neutron energy without inventing a fallback',t=>{
 const {host,ui,input}=mount(t);input('total',100);input('absorption',25);input('efficiency',.5);
 ui.update({sourceRateS:0,sourceEnergyMeV:null});const result=ui.read()!;
 assert.ok(result);assert.equal(result.config.sourceEnergyMeV,null);assert.equal(result.source.sourceEnergyMeV,null);
 assert.equal(result.sourceEnergyMeV,null);assert.equal(result.detectionRateS,0);
 for(const rate of Object.values(result.rates))assert.equal(rate,0);
 assert.equal(host.querySelector('[role=status]')!.textContent,'');assert.doesNotMatch(host.innerHTML,/NaN|Infinity/);
 assert.equal(host.querySelector<HTMLButtonElement>('button')!.disabled,false);
 ui.update({sourceRateS:1,sourceEnergyMeV:null});
 assert.equal(ui.read(),null);assert.equal(host.querySelector<HTMLButtonElement>('button')!.disabled,true);
 assert.equal(host.querySelector('.live-plots')!.children.length,0);
 ui.update({sourceRateS:0,sourceEnergyMeV:null});assert.ok(ui.read());
 assert.equal(host.querySelector('[role=status]')!.textContent,'');
});

test('evaluated H-1 uses current energy and assumed physical atom density without replacing custom settings',t=>{
 const {host,ui,input,dom}=mount(t);ui.update(source);input('total',100);input('absorption',25);
 const select=host.querySelector<HTMLSelectElement>('#neutron-transport-material')!;
 assert.equal(select.value,'custom');select.value='endfb-h1';select.dispatchEvent(new dom.window.Event('change'));
 const first=ui.read()!;assert.ok(first);assert.equal(first.material.type,'endfb-h1');
 assert.equal(first.config.sourceEnergyMeV,14.1);
 assert.ok(Math.abs(first.config.layers[0].totalMInv-.68302644)<1e-14);
 assert.ok(Math.abs(first.config.layers[0].absorptionMInv-2.9524228e-5)<1e-18);
 assert.equal(first.material.source.library,'ENDF/B-VIII.1');
 assert.equal(first.material.source.rawSHA256,'3024d8f0db604b074e33ed8b05027eb9f5a738614041ba44c83f048e0d0bc1af');
 assert.equal(host.querySelector<HTMLInputElement>('#neutron-transport-total')!.parentElement!.hidden,true);
 const density=input('density',29);assert.equal(density.getAttribute('aria-valuetext'),'1.000e+29 m⁻³');
 assert.ok(Math.abs(ui.read()!.config.layers[0].totalMInv/first.config.layers[0].totalMInv-10)<1e-13);
 ui.update({...source,sourceEnergyMeV:14.5});assert.ok(Math.abs(ui.read()!.config.layers[0].totalMInv-6.647646)<1e-13);
 select.value='custom';select.dispatchEvent(new dom.window.Event('change'));
 assert.equal(ui.read()!.config.layers[0].totalMInv,100);assert.equal(ui.read()!.config.layers[0].absorptionMInv,25);
 assert.equal(host.querySelector<HTMLInputElement>('#neutron-transport-density')!.parentElement!.hidden,true);
});

test('evaluated H-1 withholds energyless and unsupported states then recovers without stale coefficients',t=>{
 const {host,ui,dom}=mount(t);ui.update(source);
 const select=host.querySelector<HTMLSelectElement>('#neutron-transport-material')!;
 select.value='endfb-h1';select.dispatchEvent(new dom.window.Event('change'));assert.ok(ui.read());
 ui.update({sourceRateS:0,sourceEnergyMeV:null});assert.equal(ui.read(),null);
 assert.match(host.querySelector('[role=status]')!.textContent!,/Beam off/);
 assert.equal(host.querySelector<HTMLButtonElement>('button')!.disabled,true);assert.equal(host.querySelector('.live-plots')!.children.length,0);
 ui.update({...source,sourceEnergyMeV:.05});assert.equal(ui.read(),null);
 assert.equal(host.querySelector<HTMLButtonElement>('button')!.disabled,true);
 ui.update(source);assert.ok(ui.read());assert.equal(host.querySelector('[role=status]')!.textContent,'');
 ui.update({sourceRateS:0,sourceEnergyMeV:null});select.value='custom';select.dispatchEvent(new dom.window.Event('change'));
 assert.ok(ui.read());assert.equal(ui.read()!.config.sourceEnergyMeV,null);assert.equal(ui.read()!.rates.firstAbsorbed,0);
});

test('recorded OpenMC reference distinguishes multiple scattering from the live current scenario',t=>{
 const {host,ui}=mount(t);ui.update(source);const table=host.querySelector('table')!;
 assert.equal(table.querySelectorAll('tbody tr').length,3);
 assert.match(table.querySelector('caption')!.textContent!,/Recorded OpenMC/);
 assert.match(table.querySelector('[data-case="pure-absorption"]')!.textContent!,/0.06635/);
 assert.match(table.querySelector('[data-case="mixed"]')!.textContent!,/0.03561/);
 assert.match(host.textContent!,/Recorded multiple-scattering runs/);
 assert.match(host.textContent!,/separate from the current sliders/);
 const reference=ui.read()!.referenceEvidence;
 assert.equal(reference.historiesPerCase,500000);assert.equal(reference.fullBrowserMonteCarlo,false);
 assert.equal(reference.experimentalValidation,false);assert.equal(reference.appliesToCurrentControls,false);
 assert.equal(reference.openmcResultsSHA256,'48274869380fbf9ec0bd1b3bbdaf6e088e63a41739286d95a1bd4cde8ac9db8a');
 assert.ok(reference.cases[1].openmcAbsorption.mean>reference.cases[1].firstFlight.firstAbsorbed);
});
