import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupDoublewellControls,doublewellConfig} from '../src/doublewell-ui.js';
import {DEFAULT_DOUBLEWELL,simulateDoublewell} from '../src/doublewell-dynamics.js';
import {isInfo,isReduced,coreModes,showLaboratory,setupLaboratory} from '../src/laboratory.js';

// Source-unit execution of the actual control builder and config adapter. This
// does not exercise a browser, CSS layout, network or GPU.
class Element {
 private identifier='';value:string|number='';type='';min:string|number='';max:string|number='';step:string|number='';
 hidden=false;disabled=false;textContent='';className='';htmlFor='';open=false;dataset:Record<string,string>={};
 children:Element[]=[];options:Element[]=[];listeners=new Map<string,(()=>void)[]>();
 set id(id:string){this.identifier=id;registry.set(id,this);}get id(){return this.identifier;}
 append(...children:Element[]){this.children.push(...children);}
 add(element:Element){this.options.push(element);}
 replaceChildren(...children:Element[]){this.children=children;}
 addEventListener(type:string,handler:()=>void){this.listeners.set(type,[...(this.listeners.get(type)??[]),handler]);}
 fire(type:string){for(const handler of this.listeners.get(type)??[])handler();}
 querySelector(){return this.children[0]?.children[0];}
}
const registry=new Map<string,Element>();
const ions=[{massU:40,chargeState:1},{massU:84,chargeState:1}];
function harness(t:TestContext){
 const previous=(globalThis as unknown as {document?:unknown}).document;registry.clear();
 const html=readFileSync('index.html','utf8');
 for(const id of ['doublewell-controls','doublewell-initial-note','frequency-readout','reduced-controls','system','method-directory','method-guide','diffusion-closure']){
  assert.ok(html.includes(`id="${id}"`),`Missing real UI host ${id}`);const element=new Element();element.id=id;
 }
 (globalThis as unknown as {document:unknown}).document={getElementById:(id:string)=>registry.get(id),createElement:()=>new Element()};
 t.after(()=>{(globalThis as unknown as {document?:unknown}).document=previous;});
 let changes=0;setupDoublewellControls(()=>changes++);
 const get=(key:string)=>{const el=registry.get('dw-'+key);assert.ok(el,`Missing dynamic control ${key}`);return el;};
 return {get,changes:()=>changes,config:()=>doublewellConfig(ions)};
}

test('actual kinetic controls map SI values, log density and relative source size to independent config snapshots',t=>{
 const h=harness(t),initial=h.config();
 assert.equal(initial.densityM3,DEFAULT_DOUBLEWELL.densityM3);
 assert.equal(initial.dt,DEFAULT_DOUBLEWELL.dt);assert.equal(initial.duration,DEFAULT_DOUBLEWELL.duration);
 assert.equal(initial.sourceRadius,DEFAULT_DOUBLEWELL.sourceRadius);
 assert.equal(initial.collisions,true);assert.equal(initial.boundary,'open');
 assert.match(registry.get('doublewell-controls')!.children[0].textContent,/spatial and particle convergence is not established/);
 assert.match(registry.get('doublewell-controls')!.children[0].textContent,/not calibrated product-purity/);
 assert.ok(h.get('particlesPerSpecies').options.some(option=>option.value==='2048'));
 assert.ok(h.get('particlesPerSpecies').options.some(option=>option.value==='4096'));
 assert.equal(h.get('electronTemperatureEV').min,.5);
 assert.equal(h.get('densityM3').dataset.rangeScale,'log10');
 assert.ok(h.get('cellsAcross').options.some(option=>option.value==='12'));
 h.get('densityM3').value=19;h.get('densityM3').fire('input');
 h.get('radius').value=.3;h.get('radius').fire('input');
 h.get('sourceRadiusFraction').value=.5;h.get('sourceRadiusFraction').fire('input');
 h.get('dt').value='5e-8';h.get('dt').fire('change');
 h.get('seed').value='987';h.get('seed').fire('input');
 h.get('collisions').value='false';h.get('collisions').fire('change');
 const c=h.config();
 assert.equal(c.densityM3,1e19);assert.equal(c.sourceRadius,.15);assert.equal(c.dt,5e-8);
 assert.equal(c.seed,987);assert.equal(c.collisions,false);assert.equal(h.changes(),6);
 c.species[0].massU=99;assert.equal(ions[0].massU,40);assert.equal(h.config().species[0].massU,40);
 assert.equal(initial.densityM3,1e18,'Older snapshots must not follow control edits');
});

test('equilibrium initializer enforces its closed/common-rotation domain and explains inactive pulse controls',t=>{
 const h=harness(t);h.get('initialState').value='equilibrium';h.get('initialState').fire('change');
 assert.equal(h.config().boundary,'closed');assert.equal(h.config().rotationMode,'common');
 assert.equal(h.config().beamEV,0);
 assert.match(registry.get('doublewell-initial-note')!.textContent,/closed column/);
 for(const key of ['beamEV','sourceRadiusFraction','pulseLengthFraction'])assert.equal(h.get(key).disabled,true);
 assert.equal(h.get('rotationRadS').disabled,false);
 h.get('boundary').value='open';h.get('boundary').fire('change');
 assert.equal(h.config().initialState,'pulse');assert.equal(h.get('beamEV').disabled,false);
 h.get('initialState').value='equilibrium';h.get('initialState').fire('change');
 h.get('rotationMode').value='zero-canonical';h.get('rotationMode').fire('change');
 assert.equal(h.config().initialState,'pulse');assert.equal(h.get('rotationRadS').disabled,true);
 assert.match(registry.get('doublewell-initial-note')!.textContent,/no continuous reservoir/);
});

test('actual control snapshots execute through the kinetic engine and retain equal-weight accounting',t=>{
 const h=harness(t),c={...h.config(),particlesPerSpecies:16,duration:1e-6};
 const result=simulateDoublewell(c);
 assert.ok(result.curves.length>0);assert.ok(result.metrics.length>0);
 assert.equal(result.config.magneticT,c.magneticT);assert.equal(result.config.densityM3,c.densityM3);
 for(const s of result.species)assert.equal(s.active+s.wall+s.end+s.source,c.particlesPerSpecies);
 h.get('initialState').value='equilibrium';h.get('initialState').fire('change');
 const equilibrium=simulateDoublewell({...h.config(),particlesPerSpecies:16,duration:1e-6});
 assert.equal(equilibrium.config.boundary,'closed');assert.equal(equilibrium.config.beamEV,0);
 assert.ok(equilibrium.species.every(s=>s.active===16));
});

test('annular collision controls execute source fitting explicitly and disable it outside its domain',t=>{
 const h=harness(t);
 assert.equal(h.get('collisionSourceAligned').disabled,true);
 h.get('collisionMethod').value='axisymmetric';h.get('collisionMethod').fire('change');
 assert.equal(h.get('collisionSourceAligned').disabled,false);
 h.get('collisionSourceAligned').value='true';h.get('collisionSourceAligned').fire('change');
 assert.equal(h.config().collisionSourceAligned,true);
 const r=simulateDoublewell({...h.config(),particlesPerSpecies:16,duration:1e-6});
 assert.equal(r.spatialCollision.sourceInterfacesFitted,true);
 assert.ok(r.spatialCollision.radialEdgesM?.includes(h.config().sourceRadius));
 h.get('initialState').value='equilibrium';h.get('initialState').fire('change');
 assert.equal(h.get('collisionSourceAligned').disabled,true);
 h.get('collisionMethod').value='fixed';h.get('collisionMethod').fire('change');
 assert.equal(h.get('collisionSourceAligned').disabled,true);
});

test('kinetic method is selectable but cannot leak reduced landscape controls or hidden orbit frequencies',t=>{
 harness(t);setupLaboratory(()=>{});
 assert.ok(coreModes.includes('doublewell-dynamics'));assert.equal(isInfo('doublewell-dynamics'),false);
 assert.equal(isReduced('doublewell-dynamics'),false,'The kinetic solver must not be dispatched as a landscape');
 const options=registry.get('system')!.options;
 assert.ok(options.some(option=>option.value==='doublewell-dynamics'));
 showLaboratory('doublewell-dynamics');assert.equal(registry.get('frequency-readout')!.hidden,true);
 assert.ok(registry.get('reduced-controls')!.children.every(child=>child.hidden));
});
