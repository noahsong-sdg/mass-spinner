import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {equilibriumConfig} from '../src/equilibrium-controls.js';
import {solveEquilibrium} from '../src/equilibrium-model.js';
import {centrifugeDiagnostics} from '../src/centrifuge-diagnostics.js';
import {equilibriumPresentation} from '../src/focused-diagnostics.js';
import {DEFAULT_CONFIG} from '../src/physics.js';

const html=readFileSync('index.html','utf8');
const attributes=(tag:string)=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
function controls(){
 const values=new Map<string,string>();
 for(const match of html.matchAll(/<input\b[^>]*>/g)){
  const a=attributes(match[0]);if(a.id&&a.value!==undefined)values.set(a.id,a.value);
 }
 for(const match of html.matchAll(/<select\b[^>]*>[\s\S]*?<\/select>/g)){
  const a=attributes(match[0]),options=[...match[0].matchAll(/<option\b[^>]*>/g)].map(m=>m[0]);
  const selected=options.find(o=>/\bselected(?:\s|>|=)/.test(o))??options[0];
  values.set(a.id,attributes(selected).value);
 }
 const value=(id:string)=>{assert.ok(values.has(id),`Missing actual DOM control ${id}`);return values.get(id)!;};
 const config=()=>equilibriumConfig(value,['a','b'].map(k=>({massU:Number(value('mass-'+k)),chargeState:Number(value('charge-'+k))})),DEFAULT_CONFIG.radius);
 return {values,config};
}
const gaussian=(result:ReturnType<typeof solveEquilibrium>)=>{
 assert.ok('gaussianProfiles' in result,'Gaussian control must route to the Gaussian equilibrium');return result;
};

test('actual HTML defaults reach the equilibrium worker configuration without unit changes',()=>{
 const {config}=controls(),c=config(),r=solveEquilibrium(c);
 assert.equal(c.closure,'corotating');assert.equal(c.compositionBoundary,'central');
 assert.equal(c.axisDensityM3,1e17);assert.equal(c.densityWidthM,.25);assert.equal(c.magneticT,.1);
 assert.equal(c.bulkFractionA,.5);assert.deepEqual(c.species.map(s=>s.axisFraction),[.5,.5]);
 assert.equal(r.profiles.length,c.bins!+1);assert.equal(r.species[0].axisFraction,.5);
});

test('closure, bulk and composition controls change the modeled boundary and displayed physical output',()=>{
 const {values,config}=controls(),central=solveEquilibrium(config());
 values.set('composition-boundary','bulk');values.set('axis-fraction','35');
 const bulk=solveEquilibrium(config());
 assert.equal(bulk.composition.boundary,'bulk');
 assert.ok(Math.abs(centrifugeDiagnostics(bulk).bulkNumberFractions[0]!-.35)<1e-9);
 assert.notEqual(bulk.species[0].axisFraction,.35);
 values.set('centrifuge-closure','gaussian');
 const shaped=gaussian(solveEquilibrium(config())),p=equilibriumPresentation(shaped,.7);
 assert.notDeepEqual(shaped.profiles,central.profiles);
 assert.ok(Math.abs(p.diagnostics.bulkNumberFractions[0]!-.35)<1e-9);
 assert.ok(p.curves.some(curve=>curve.yLabel.includes('current density')));
 assert.ok(p.metrics.includes('Requested bulk A 35.00%'));
});

test('Gaussian width, log-density and magnetic controls reach distinct absolute physical observables',()=>{
 const {values,config}=controls();values.set('centrifuge-closure','gaussian');
 const baseline=gaussian(solveEquilibrium(config()));
 values.set('gaussian-width','0.4');const width=gaussian(solveEquilibrium(config()));
 assert.notEqual(width.gaussianProfiles.at(-1)!.totalIonDensityM3,baseline.gaussianProfiles.at(-1)!.totalIonDensityM3);
 values.set('gaussian-width','0.25');values.set('gaussian-density','18');
 const dense=gaussian(solveEquilibrium(config()));
 assert.deepEqual(dense.profiles,baseline.profiles,'Absolute density does not change normalized imposed-field profiles');
 const outer=dense.gaussianProfiles.at(-1)!,reference=baseline.gaussianProfiles.at(-1)!;
 assert.ok(Math.abs(outer.currentDensityAM2/reference.currentDensityAM2-10)<1e-12);
 assert.ok(Math.abs(outer.totalIonDensityM3/reference.totalIonDensityM3-10)<1e-12);
 values.set('gaussian-density','17');values.set('gaussian-field','0.2');
 const field=gaussian(solveEquilibrium(config()));
 assert.notEqual(field.gaussianProfiles.at(-1)!.laboratoryPotentialV,reference.laboratoryPotentialV);
 assert.notEqual(field.gaussianProfiles.at(-1)!.electronVelocityMS,reference.electronVelocityMS);
 assert.notDeepEqual(equilibriumPresentation(field,.7).curves,equilibriumPresentation(baseline,.7).curves);
});

test('temperature, rotation, species and radial-cut controls change their advertised diagnostics',()=>{
 const {values,config}=controls();values.set('centrifuge-closure','gaussian');
 const baseline=gaussian(solveEquilibrium(config()));
 for(const [id,next]of [['rotation','20000'],['ion-temperature','10'],['electron-temperature','10'],['mass-b','120']]){
  const previous=values.get(id)!;values.set(id,next);const result=gaussian(solveEquilibrium(config()));values.set(id,previous);
  assert.notDeepEqual(equilibriumPresentation(result,.7).curves,equilibriumPresentation(baseline,.7).curves,id+' must affect physical curves');
 }
 const before=equilibriumPresentation(baseline,Number(values.get('radial-cut')));
 values.set('radial-cut','0.5');const after=equilibriumPresentation(baseline,Number(values.get('radial-cut')));
 assert.notEqual(before.diagnostics.outer.speciesInventoryFractions[1],after.diagnostics.outer.speciesInventoryFractions[1]);
 values.set('charge-b','2');assert.throws(()=>solveEquilibrium(config()),/equal ion charge/);
});

test('the actual radial-resolution control reruns each bulk inverse at the finer grid',()=>{
 const {values,config}=controls();values.set('composition-boundary','bulk');values.set('axis-fraction','35');
 for(const closure of ['corotating','gaussian']){
  values.set('centrifuge-closure',closure);values.set('radial-resolution','400');
  const coarse=solveEquilibrium(config());values.set('radial-resolution','1000');const fine=solveEquilibrium(config());
  assert.equal(coarse.profiles.length,401);assert.equal(fine.profiles.length,1001);
  for(const result of [coarse,fine])assert.ok(Math.abs(centrifugeDiagnostics(result).bulkNumberFractions[0]!-.35)<1e-9);
  assert.notEqual(coarse.species[0].axisFraction,fine.species[0].axisFraction);
 }
});
