import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('index.html','utf8');
const attributes=(tag:string)=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match=>[match[1],match[2]]));

test('document controls have unique identifiers and associated labels',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,'Duplicate IDs make control/output binding ambiguous.');
  for(const tag of html.matchAll(/<(input|select)\b[^>]*>/g)){
    const attr=attributes(tag[0]);
    assert.ok(attr.id,`Unidentified ${tag[1]} control`);
    const explicit=new RegExp(`<label\\b[^>]*for="${attr.id}"`).test(html);
    const nested=[...html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)].some(label=>label[0].includes(`id="${attr.id}"`));
    assert.ok(explicit||nested,`No associated label for ${attr.id}`);
  }
});

test('numeric control defaults lie inside their declared physical input ranges',()=>{
  for(const match of html.matchAll(/<input\b[^>]*>/g)){
    const a=attributes(match[0]);
    if(!['number','range'].includes(a.type)||a.value===undefined)continue;
    const value=Number(a.value);
    assert.ok(Number.isFinite(value),`${a.id} default is nonfinite`);
    if(a.min!==undefined)assert.ok(value>=Number(a.min),`${a.id} below minimum`);
    if(a.max!==undefined)assert.ok(value<=Number(a.max),`${a.id} above maximum`);
    if(a.step&&a.step!=='any'){
      const steps=(value-Number(a.min??0))/Number(a.step);
      assert.ok(Math.abs(steps-Math.round(steps))<1e-8,`${a.id} default violates its step`);
    }
  }
});

// Source-unit harness: no browser, network, GPU context, or deployed-page access.
// It executes the real dynamic controls → configuration → model boundary.
import {setupLaboratory,showLaboratory,reducedConfig} from '../src/laboratory.js';
import {geometry} from '../src/geometries.js';
import {transport} from '../src/transport.js';
class ElementStub {
  private identifier='';value:string|number='';type='';min:string|number='';max:string|number='';step:string|number='';
  hidden=false;textContent='';className='';htmlFor='';dataset:Record<string,string>={};
  children:ElementStub[]=[];options:ElementStub[]=[];
  set id(value:string){this.identifier=value;registry.set(value,this);}
  get id(){return this.identifier;}
  append(...children:ElementStub[]){this.children.push(...children);}
  add(element:ElementStub){this.options.push(element);}
  replaceChildren(...children:ElementStub[]){this.children=children;}
  addEventListener(){}
  querySelector(){return this.children[0]?.children[0];}
}
const registry=new Map<string,ElementStub>();
function controls(){
  registry.clear();
  for(const id of ['reduced-controls','system','method-directory','method-guide','diffusion-closure','frequency-readout']){
    const element=new ElementStub();element.id=id;
  }
  registry.get('diffusion-closure')!.value='coulomb-heavy-light';
  (globalThis as unknown as {document:unknown}).document={getElementById:(id:string)=>registry.get(id),createElement:()=>new ElementStub()};
  setupLaboratory(()=>{});
}

test('dynamic sliders reach their advertised numerical models through the actual configuration adapter',()=>{
  controls();
  const ions=[{massU:40,chargeState:1},{massU:84,chargeState:1}];
  const cases=[
    ['gyro','temperatureEV',10],['curved','curvatureRadius',4],['doublewell','voltage',800],
    ['doublewell','quadraticShape',1.5],['doublewell','canonicalMomentum',.15],
    ['mirror','rotationRadS',20000],['centrifugal','rotationRadS',20000],
    ['poms','magneticT',.2],['azimuthal','voltage',800],
    ['advection','electricVM',200],['diffusion','densityM3',19],['mobility','collisionHz',5],
    ['ionization','electronTemperatureEV',10],['transit','energySpreadFraction',.3],
  ] as const;
  for(const [mode,key,value] of cases){
    showLaboratory(mode);
    const input=registry.get('parameter-'+key)!;
    assert.ok(input,`${mode} has no ${key} control`);
    const before=reducedConfig(mode,ions);
    const previous=input.value;input.value=value;
    const after=reducedConfig(mode,ions);input.value=previous;
    assert.notEqual(before[key],after[key],`${mode} ignores ${key} in its configuration`);
    const model=(c:ReturnType<typeof reducedConfig>)=>['advection','diffusion','mobility','ionization','transit'].includes(mode)
      ?transport(mode as 'advection',c):geometry(mode==='centrifugal'?'mirror':mode as 'gyro',c);
    assert.notDeepEqual(model(before).curves,model(after).curves,`${mode} ${key} does not alter a plotted physical output`);
  }
});

test('the workbench selector exposes only the seven Section II A–D models',()=>{
 controls();
 const dynamic=registry.get('system')!.options.map(option=>option.value);
 assert.deepEqual(new Set(dynamic),new Set(['centrifuge','rotating','doublewell','doublewell-dynamics','gyro','icr','curved']));
 assert.ok(!dynamic.includes('mirror'));
});

test('reduced models never expose the unrelated orbit-field frequency readout',()=>{
 controls();
 for(const mode of ['doublewell','doublewell-dynamics','curved','gyro']){
  showLaboratory(mode);assert.equal(registry.get('frequency-readout')!.hidden,true);
 }
 showLaboratory('icr');assert.equal(registry.get('frequency-readout')!.hidden,false);
});
