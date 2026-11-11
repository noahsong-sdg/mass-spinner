import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,DEFAULT_CONFIG,validate} from '../src/physics.js';
import {centrifuge} from '../src/centrifuge.js';
import {geometry,DEFAULT_GEOMETRY} from '../src/geometries.js';
import {LITHIUM_PRESET_VALUES as p,LITHIUM_PRESET_NOTE,modelInsights,modelComponents,coverage} from '../src/tutorial-insights.js';
import {setupTutorialInsights} from '../src/tutorial-insights-ui.js';

test('Li-6/7 equilibrium preset follows the exact equal-charge enrichment law without changing the kernel domain',()=>{
 assert.equal(p.system,'centrifuge');assert.equal(p['centrifuge-closure'],'corotating');
 assert.equal(p['composition-boundary'],'central');assert.match(LITHIUM_PRESET_NOTE,/equal on-axis/);
 const species=['a','b'].map((key,i)=>({massU:Number(p['mass-'+key]),chargeState:Number(p['charge-'+key]),axisFraction:i===0?Number(p['axis-fraction'])/100:1-Number(p['axis-fraction'])/100}));
 const input={radius:DEFAULT_CONFIG.radius,rotationRadS:Number(p.rotation),ionTemperatureEV:Number(p['ion-temperature']),electronTemperatureEV:Number(p['electron-temperature']),species,bins:100};
 const result=centrifuge(input);
 for(const r of result.profiles){
  const exact=AMU*input.rotationRadS**2*r.radius**2/(2*E_CHARGE*input.ionTemperatureEV);
  assert.ok(Math.abs(r.logSeparationFactors[1]!-exact)<1e-12);
  assert.ok(Math.abs(Math.log(r.ionDensities[1]/r.ionDensities[0])-exact)<1e-12);
 }
 assert.ok(result.maxRelativeChargeResidual<1e-12);
 assert.ok(Math.exp(result.profiles.at(-1)!.logSeparationFactors[1]!)>2.9);
 assert.throws(()=>validate({...DEFAULT_CONFIG,magneticT:.25,dt:2e-8,species}),/Timestep must resolve/);
 assert.doesNotThrow(()=>validate({...DEFAULT_CONFIG,magneticT:.04,dt:8e-9,species}));
});

test('curved-guide interpretation agrees with the live reduced model at equal energies and fixed bend angle',()=>{
 const c={...DEFAULT_GEOMETRY,massA:6,massB:7,chargeA:1,chargeB:1};
 const a=geometry('curved',c),b=geometry('curved',{...c,length:2*c.length,curvatureRadius:2*c.curvatureRadius});
 const drift=a.metrics.filter(m=>m.label.includes('curvature + grad-B drift'));
 assert.ok(Math.abs(drift[0].value-drift[1].value)<1e-10);
 assert.ok(Math.abs(a.curves[1].y.at(-1)!/a.curves[0].y.at(-1)!-Math.sqrt(7/6))<1e-12);
 a.curves.forEach((curve,i)=>assert.ok(Math.abs(curve.y.at(-1)!-b.curves[i].y.at(-1)!)<1e-12));
});

test('all seven A–D models have distinct observables, boundaries and conceptual component roles',()=>{
 assert.deepEqual(Object.keys(modelInsights).sort(),['centrifuge','curved','doublewell','doublewell-dynamics','gyro','icr','rotating']);
 for(const mode of Object.keys(modelInsights)){
  const parts=modelComponents(mode);
  assert.deepEqual(parts.map(c=>c.id),['source','coils','vessel','electrodes','collectors','insulators','fittings','seals','supports']);
  assert.ok(parts.every(c=>/unspecified/.test(c.material)&&/conceptual/.test(c.basis)));
 }
 assert.match(modelComponents('icr').find(c=>c.id==='coils')!.purpose,/not the RF antenna/);
 assert.match(modelComponents('centrifuge').find(c=>c.id==='collectors')!.purpose,/does not extract/);
 assert.ok(coverage.some(c=>c.section==='II E–K'&&c.status==='reference'));
});

test('context panel replaces mode content and hides itself outside the seven-model scope',t=>{
 class El{
  hidden=false;textContent='';className='';href='';children:El[]=[];
  append(...items:El[]){this.children.push(...items);}replaceChildren(...items:El[]){this.children=items;}
 }
 const previous=(globalThis as unknown as {document?:unknown}).document;
 (globalThis as unknown as {document:unknown}).document={createElement:()=>new El(),createTextNode:(s:string)=>Object.assign(new El(),{textContent:s})};
 t.after(()=>{(globalThis as unknown as {document?:unknown}).document=previous;});
 const host=new El(),ui=setupTutorialInsights(host),text=(el:El):string=>el.textContent+' '+el.children.map(text).join(' ');
 ui.show('curved');assert.match(text(host),/drift speeds match/);assert.equal(host.children[0].hidden,false);
 ui.show('centrifuge');assert.match(text(host),/thermal spreading/);assert.match(text(host),/Not natural lithium feed/);assert.doesNotMatch(text(host),/drift speeds match/);
 ui.show('mirror');assert.equal(host.children[0].hidden,true);assert.doesNotMatch(text(host),/thermal spreading/);
});
