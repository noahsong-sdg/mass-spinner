import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {createApparatusViewer} from '../src/apparatus-viewer.js';
import {sourceMotionState} from '../src/reactor-motion.js';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.js';

test('live updates preserve the RAF clock; document hiding pauses without replaying hidden time',async t=>{
 const dom=new JSDOM('<div id="frame"></div>'),doc=dom.window.document,frame=doc.querySelector<HTMLDivElement>('#frame')!;
 t.after(()=>dom.window.close());Object.defineProperty(doc,'hidden',{value:false,writable:true});
 const listeners=new Set<()=>void>(),media={matches:false,addEventListener:(_:string,fn:()=>void)=>listeners.add(fn),removeEventListener:(_:string,fn:()=>void)=>listeners.delete(fn)};
 Object.defineProperty(dom.window,'matchMedia',{value:()=>media});
 frame.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:800,bottom:600,width:800,height:600,toJSON(){return {};}});
 const old=globalThis.ResizeObserver;globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};t.after(()=>{globalThis.ResizeObserver=old;});
 const frames=new Map<number,FrameRequestCallback>();let next=0;
 dom.window.requestAnimationFrame=fn=>{const id=++next;frames.set(id,fn);return id;};dom.window.cancelAnimationFrame=id=>{frames.delete(id);};
 const root=new THREE.Group();root.name='SI engineering assembly';
 for(const [componentId,x]of [['target',.001],['accelerator',-.3]] as const){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.002,.1,.1),new THREE.MeshBasicMaterial());mesh.userData.componentId=componentId;mesh.position.x=x;root.add(mesh);}
 let scene:THREE.Scene|undefined;
 const viewer=createApparatusViewer(frame,{loader:{loadAsync:async()=>({scene:root})},
  displayFactory:()=>({renderer:{render(value){scene=value;},clear(){},setSize(){}},dispose(){}}),
  controlsFactory:camera=>({target:new THREE.Vector3(),minDistance:0,maxDistance:100,addEventListener(){},removeEventListener(){},update(){camera.lookAt(this.target);},dispose(){}})});
 t.after(()=>viewer.dispose());const state=sourceMotionState(simulateFusionBeam(DEFAULT_FUSION_BEAM))!;
 viewer.updateReactorState(state);await viewer.load({model:'beam.glb',reactor:'beam'});
 const positions=()=>Array.from(((scene!.getObjectByName('Live reactor processes')!.children[0] as THREE.Points).geometry.getAttribute('position')).array);
 const advance=(now:number)=>{assert.equal(frames.size,1);const [id,callback]=frames.entries().next().value!;frames.delete(id);callback(now);};
 advance(0);const initial=positions();
 for(let i=1;i<=10;i++){viewer.updateReactorState({...state});advance(i*16);}
 assert.notDeepEqual(positions(),initial,'frequent input refreshes must not force every dt to zero');
 const beforeHidden=positions();Object.defineProperty(doc,'hidden',{value:true});doc.dispatchEvent(new dom.window.Event('visibilitychange'));assert.equal(frames.size,0);
 Object.defineProperty(doc,'hidden',{value:false});doc.dispatchEvent(new dom.window.Event('visibilitychange'));advance(10000);
 assert.deepEqual(positions(),beforeHidden,'resuming starts a fresh clock instead of adding hidden elapsed time');advance(10016);assert.notDeepEqual(positions(),beforeHidden);
 media.matches=true;for(const listener of listeners)listener();assert.equal(frames.size,0);
 media.matches=false;for(const listener of listeners)listener();assert.equal(frames.size,1);
 viewer.setActive(false);assert.equal(frames.size,0);viewer.setActive(true);assert.equal(frames.size,1);
 viewer.dispose();assert.equal(frames.size,0);assert.equal(listeners.size,0);
});
