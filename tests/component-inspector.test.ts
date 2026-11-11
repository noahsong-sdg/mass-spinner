import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {setupComponentInspectors} from '../src/component-inspector.js';
import {separatorComponentId,separatorComponents,fusionComponents} from '../src/component-catalog.js';
import {setupApparatus} from '../src/apparatus-ui.js';

class Node{
 children:Node[]=[];attributes:Record<string,string>={};events:Record<string,(event?:any)=>void>={};style:Record<string,string>={};dataset:Record<string,string>={};ownerDocument:any;textContent='';value='';open=false;className='';href='';
 constructor(public tag='div'){}
 append(...children:Node[]){this.children.push(...children);}replaceChildren(...children:Node[]){this.children=children;}
 setAttribute(k:string,v:string){this.attributes[k]=v;}addEventListener(k:string,handler:(event?:any)=>void){this.events[k]=handler;}
 getBoundingClientRect(){return {left:0,top:0,width:200,height:200};}
}
const text=(node:Node):string=>node.textContent+node.children.map(text).join(' ');
globalThis.IntersectionObserver=class {observe(){}disconnect(){}} as any;
function setup(){
 const separator=new Node(),fusion=new Node(),svg=new Node('svg'),canvas=new Node('canvas');
 const doc={getElementById:(id:string)=>id==='separator-inspector'?separator:fusion,querySelector:()=>svg,createElement:(tag:string)=>new Node(tag),createElementNS:(_ns:string,tag:string)=>new Node(tag)};
 const material=new THREE.MeshStandardMaterial({color:0x889999}),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);mesh.name='Exposed_copper_winding_section_001';
 const hardware=new THREE.Group();hardware.add(mesh);const camera=new THREE.PerspectiveCamera(50,1,.1,100);camera.position.z=4;camera.lookAt(0,0,0);let allowed=true;
 const renderHost=Object.assign(new Node(),{ownerDocument:doc});let apparatus:any;
 const ui=setupComponentInspectors({THREE:{Raycaster:THREE.Raycaster,Vector2:THREE.Vector2},canvas,getHardware:()=>hardware,getCamera:()=>camera,canPick:()=>allowed,onFusionSelect:(id:string)=>apparatus?.syncSelection(id),document:doc});
 apparatus=setupApparatus(renderHost,{components:fusionComponents,onSelect:(id:string)=>ui.fusion.select(id)});apparatus.show('beam-target');
 return {separator,fusion,svg,canvas,mesh,material,ui,renderHost,setAllowed:(value:boolean)=>allowed=value};
}
test('every exported separator mesh maps to an honest, explicit component description',()=>{
 const bytes=readFileSync('assets/separator.glb'),size=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+size).toString());
 const nodes=gltf.nodes.filter((node:any)=>node.mesh!==undefined);assert.ok(nodes.length>100);
 for(const node of nodes)assert.ok(separatorComponentId(node.name),'Unmapped exported mesh: '+node.name);
 for(const c of separatorComponents){assert.match(c.basis,/illustration choices/);assert.ok(c.material.length>15);}
 assert.equal(separatorComponentId('unidentified object'),null);
 assert.equal(separatorComponentId('Vessel__rear_section'),'vessel');assert.equal(separatorComponentId('Source_electrical_break_004'),'insulators');
 assert.match(fusionComponents.find(c=>c.id==='substrate')!.material,/publicly unspecified/);
 assert.match(fusionComponents.find(c=>c.id==='target')!.basis,/Recycling does not create replacement tritium/);
});
test('native selector exposes function and material; highlights are restored without material leakage',()=>{
 const s=setup(),details=s.separator.children[0],button=details.children[1].children[1];assert.equal(details.open,false);
 button.events.click();assert.equal(details.open,true);assert.equal(button.attributes['aria-pressed'],'true');
 assert.match(text(details.children[2]),/Solenoid windings/);assert.match(text(details.children[2]),/Copper/);
 const highlight=s.mesh.material;assert.notEqual(highlight,s.material);assert.equal(s.material.emissive.getHex(),0);
 highlight.opacity=.12;highlight.transparent=true;highlight.depthWrite=false;
 let disposed=false;highlight.addEventListener('dispose',()=>{disposed=true;});s.ui.clear();
 assert.equal(s.mesh.material,s.material);assert.equal(s.material.opacity,.12);assert.equal(s.material.transparent,true);assert.equal(s.material.depthWrite,false);assert.equal(disposed,true);
});
test('SVG hotspot keyboard and native selector use the same component state',()=>{
 const s=setup(),target=s.svg.children.find(node=>node.attributes['aria-label']==='Lithium-tritide target')!;
 let prevented=0;target.events.keydown({key:'Enter',preventDefault(){prevented++;}});
 assert.equal(prevented,1);assert.equal(target.attributes['aria-pressed'],'true');assert.match(text(s.fusion),/Lithium tritide \(LiT\)/);
 assert.match(text(s.fusion),/target regeneration/);assert.match(text(s.fusion),/not solved/);
 assert.doesNotMatch(text(s.fusion),/fuel recovery/);assert.equal(s.fusion.children[0].children[2].children.at(-1)!.href,'https://www.marathonfusion.com/');
 const substrate=s.fusion.children[0].children[1].children[4];substrate.events.click();
 assert.equal(target.attributes['aria-pressed'],'false');assert.match(text(s.fusion.children[0].children[2]),/alloy and coolant are publicly unspecified/);
 target.events.keydown({key:'Tab',preventDefault(){prevented++;}});assert.equal(prevented,1);
});
test('production pointer handler raycasts geometry and rejects drag, cancelled and blocked picking',()=>{
 const s=setup();const event=(x=100,y=100)=>({clientX:x,clientY:y,pointerId:1,button:0,isPrimary:true});
 s.canvas.events.pointerdown(event());s.canvas.events.pointermove(event(125));s.canvas.events.pointerup(event());assert.equal(s.separator.children[0].open,false);
 s.canvas.events.pointerdown(event());s.canvas.events.pointercancel();s.canvas.events.pointerup(event());assert.equal(s.separator.children[0].open,false);
 s.setAllowed(false);s.canvas.events.pointerdown(event());s.canvas.events.pointerup(event());assert.equal(s.separator.children[0].open,false);
 s.setAllowed(true);s.canvas.events.pointerdown(event());s.canvas.events.pointerup(event());assert.equal(s.separator.children[0].open,true);assert.match(text(s.separator),/Solenoid windings/);
 s.ui.clear();s.separator.children[0].open=false;s.mesh.visible=false;s.canvas.events.pointerdown(event());s.canvas.events.pointerup(event());assert.equal(s.separator.children[0].open,false);
});
test('3D dropdown, native inspector and live SVG preserve one component selection',()=>{
 const s=setup(),choices=s.renderHost.children[0].children[1].children[0];
 choices.value='target';choices.events.change();assert.equal(choices.value,'target');assert.match(text(s.fusion),/Lithium tritide/);
 s.fusion.children[0].children[1].children[4].events.click();assert.equal(choices.value,'substrate');
 const source=s.svg.children.find(node=>node.attributes['aria-label']==='RF ion source')!;source.events.keydown({key:'Enter',preventDefault(){}});
 assert.equal(choices.value,'rf-source');assert.match(text(s.fusion.children[0].children[2]),/Radio-frequency power/);
});
