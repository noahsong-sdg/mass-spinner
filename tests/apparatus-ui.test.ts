import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {setupApparatus} from '../src/apparatus-ui.js';
import {modelComponents} from '../src/tutorial-insights.js';
import {fusionComponents} from '../src/component-catalog.js';
import {blanketComponents} from '../src/blanket-reference.js';

class El{
 children:El[]=[];style:Record<string,string>={};dataset:Record<string,string>={};attributes:Record<string,string>={};events:Record<string,()=>void>={};
 textContent='';hidden=false;value='';src='';alt='';className='';ownerDocument:any;
 constructor(public tag='div'){}
 append(...items:El[]){this.children.push(...items);}replaceChildren(...items:El[]){this.children=items;}
 setAttribute(k:string,v:string){this.attributes[k]=v;}addEventListener(k:string,fn:()=>void){this.events[k]=fn;}
}
const doc={createElement:(tag:string)=>new El(tag)};
const host=()=>Object.assign(new El(),{ownerDocument:doc});
const text=(el:El):string=>el.textContent+' '+el.children.map(text).join(' ');
const manifest=JSON.parse(readFileSync('web-assets/renders/manifest.json','utf8'));
globalThis.IntersectionObserver=class {observe(){}disconnect(){}} as any;

test('every model has a real rendered resource and camera-projected, catalogued inspection points',()=>{
 for(const mode of ['beam-target','gyro','icr','curved','centrifuge','rotating','doublewell','doublewell-dynamics','blanket']){
  const asset=manifest.assets[mode];assert.ok(asset,mode);
  assert.ok(existsSync('web-assets'+asset.image));assert.ok(existsSync('web-assets'+asset.png));
  const bytes=readFileSync('web-assets'+asset.png);assert.equal(bytes.readUInt32BE(16),1600);assert.equal(bytes.readUInt32BE(20),900);
  const records=mode==='blanket'?blanketComponents:mode==='beam-target'?fusionComponents:modelComponents(mode);
  assert.ok(asset.hotspots.length>=4);
  for(const pin of asset.hotspots){
   assert.ok(records.some(c=>c.id===pin.id),mode+': '+pin.id);
   assert.ok(pin.xPct>0&&pin.xPct<100&&pin.yPct>0&&pin.yPct<100);
  }
 }
});
test('3D component selection exposes model-specific material facts, replacing stale model content',()=>{
 const root=host(),ui=setupApparatus(root);ui.show('centrifuge');ui.select('collectors');
 assert.match(text(root),/does not extract ions/);assert.match(text(root),/materials are unknown/);
 const figure=root.children[0],choice=figure.children[1].children[0];choice.value='source';choice.events.change();
 assert.equal(choice.children[1].textContent,'Conceptual arc source');
 assert.equal(choice.value,'source');assert.equal(figure.children[0].children.length,0,'no static image is installed');
 ui.show('icr');assert.doesNotMatch(text(root),/does not extract ions/);ui.select('coils');
 assert.match(text(root),/not the RF antenna/);assert.equal(ui.hasMode('mirror'),false);ui.show('mirror');assert.equal(root.hidden,true);
});
test('beam 3D dropdown invokes existing inspector, while blanket has its separate material catalog',()=>{
 const root=host();let selected='';const ui=setupApparatus(root,{components:fusionComponents,onSelect:(id:string)=>{selected=id;}});
 ui.show('beam-target');const choice=root.children[0].children[1].children[0];choice.value='target';choice.events.change();assert.equal(selected,'target');
 const blanket=host();const reference=setupApparatus(blanket,{components:blanketComponents});reference.show('blanket');reference.select('breeder');
 assert.match(text(blanket),/FLiBe/);assert.doesNotMatch(text(blanket),/LiT supplies/);
});
test('level one bounds stay pinned while advanced isotope input and Li preset are reachable',()=>{
 const html=readFileSync('index.html','utf8');
 assert.match(html,/<input id="play-mass-b"[^>]*min="20"/);
 assert.match(html,/<input id="mass-a"[^>]*min="1"/);assert.match(html,/<input id="mass-b"[^>]*min="1"/);
 assert.match(html,/id="lithium-preset"/);
});
test('apparatus fidelity disclosure follows the displayed asset instead of implying engineering CAD',()=>{
 const root=host(),ui=setupApparatus(root);ui.show('beam-target');
 const disclosure=root.children[0].children[3];
 assert.equal(disclosure.children[0].textContent,'Assumed dimensions');assert.match(text(disclosure),/target layer has exaggerated thickness/i);
 (disclosure as any).open=true;ui.show('blanket');
 assert.equal((disclosure as any).open,false);assert.equal(disclosure.children[0].textContent,'Paper core · assumed hardware');assert.match(text(disclosure),/not built Marathon hardware/i);
 assert.match(text(disclosure),/unknown plasma-to-wall clearance|plasma-to-wall clearance is unknown/i);
 assert.equal(disclosure.children[2].hidden,false);assert.equal((disclosure.children[2] as any).href,'https://www.marathonfusion.com/alchemy.pdf#page=13');
 assert.doesNotMatch(text(disclosure),/cooled substrate/i);
 ui.show('beam-target');assert.equal(disclosure.children[0].textContent,'Assumed dimensions');assert.equal((disclosure.children[2] as any).href,'https://www.marathonfusion.com/beam-driven-fusion/');
 assert.doesNotMatch(text(disclosure),/210 mm/i);
 ui.show('gyro');assert.equal(disclosure.children[2].hidden,true);assert.equal((disclosure.children[2] as any).href,'');
});

test('observer reveal resumes an already loaded apparatus without resetting motion or camera preferences',async t=>{
 const previous=globalThis.IntersectionObserver;let visibility!:(entries:{isIntersecting:boolean}[])=>void;
 globalThis.IntersectionObserver=class{constructor(callback:typeof visibility){visibility=callback;}observe(){}disconnect(){}} as any;
 t.after(()=>{globalThis.IntersectionObserver=previous;});
 let loads=0,paused=false,beamVisible=true;const active:boolean[]=[];
 const ui=setupApparatus(host(),{viewerModuleLoader:async()=>({createApparatusViewer:()=>({
  async load(){loads++;paused=false;beamVisible=true;return true;},select(){},reset(){},dispose(){},setActive(value){active.push(value);},
 })})});t.after(()=>ui.dispose());
 ui.show('beam-target');visibility([{isIntersecting:true}]);
 for(let i=0;i<6;i++)await Promise.resolve();assert.equal(loads,1);
 paused=true;beamVisible=false;visibility([{isIntersecting:false}]);visibility([{isIntersecting:true}]);
 for(let i=0;i<6;i++)await Promise.resolve();
 assert.equal(loads,1);assert.equal(paused,true);assert.equal(beamVisible,false);assert.equal(active.at(-1),true);
 ui.show('blanket');for(let i=0;i<6;i++)await Promise.resolve();assert.equal(loads,2,'changing the actual asset still loads it');
});

test('failed loads remain retryable and a repeated reveal does not duplicate an in-flight load',async t=>{
 const previous=globalThis.IntersectionObserver;let visibility!:(entries:{isIntersecting:boolean}[])=>void;
 globalThis.IntersectionObserver=class{constructor(callback:typeof visibility){visibility=callback;}observe(){}disconnect(){}} as any;
 t.after(()=>{globalThis.IntersectionObserver=previous;});
 const root=host();let finish!:(success:boolean)=>void,loads=0;
 const ui=setupApparatus(root,{viewerModuleLoader:async()=>({createApparatusViewer:(_,options)=>({
  load(){loads++;return new Promise<boolean>(resolve=>{finish=success=>{if(!success)options.onError?.(new Error('Load rejected'));resolve(success);};});},
  select(){},reset(){},dispose(){},
 })})});t.after(()=>ui.dispose());
 ui.show('beam-target');visibility([{isIntersecting:true}]);for(let i=0;i<3;i++)await Promise.resolve();
 visibility([{isIntersecting:false}]);visibility([{isIntersecting:true}]);assert.equal(loads,1);
 finish(false);for(let i=0;i<6;i++)await Promise.resolve();
 const retry=root.children[0].children[1].children[1];assert.equal(retry.hidden,false);retry.events.click();assert.equal(loads,2);
 finish(true);for(let i=0;i<6;i++)await Promise.resolve();
 visibility([{isIntersecting:false}]);visibility([{isIntersecting:true}]);for(let i=0;i<3;i++)await Promise.resolve();assert.equal(loads,2);
});
