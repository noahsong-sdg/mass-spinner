import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {createApparatusViewer} from '../../src/apparatus-viewer.js';
import {buildEngineeringGeometry} from '../../src/engineering-geometry.js';
import {buildSurfaceOverlay,releaseSurfaceGroup} from '../../src/surface-layer.js';

// Audit reproduction only. Production source is not modified.
test('audit: an off-pixel trajectory consumes a hardware click through the production pointer handler',async t=>{
 const dom=new JSDOM('<main></main>'),frame=dom.window.document.querySelector('main')!;
 const original=(globalThis as any).ResizeObserver;
 (globalThis as any).ResizeObserver=class{observe(){}disconnect(){}};
 t.after(()=>{(globalThis as any).ResizeObserver=original;dom.window.close();});
 const bounds={width:800,height:600,left:0,top:0,right:800,bottom:600,x:0,y:0,toJSON(){}};
 frame.getBoundingClientRect=()=>bounds;
 let camera:THREE.PerspectiveCamera,controls:any;
 const selected:string[]=[];
 const reference=new THREE.Group();reference.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));
 const viewer=createApparatusViewer(frame,{
  loader:{loadAsync:async()=>({scene:reference})},onSelect:(id:string)=>selected.push(id),
  displayFactory:()=>({renderer:{render(){},clear(){},setSize(){}},dispose(){}}),
  controlsFactory:(value:THREE.PerspectiveCamera)=>{camera=value;return controls={target:new THREE.Vector3(),addEventListener(){},removeEventListener(){},update(){camera.lookAt(this.target);},dispose(){}};},
 });
 t.after(()=>viewer.dispose());await viewer.load({model:'audit-reference.glb'});
 const canvas=viewer.canvas;canvas.getBoundingClientRect=()=>bounds;
 viewer.updateSurfaceState({status:'ready',snapshot:{model:'rotating',domain:{kind:'cylinder',radiusM:.2,lengthM:1},timeS:0,
  fields:[],counts:[],scalars:[],unsupported:[],impacts:[],
  tracks:[{speciesIndex:0,positionsM:[[.1,.15,0],[.1,.15,1]],scope:'Audit trajectory inside radius .2 m'}],
 }},{radius:.2,length:1});
 // Look through the removed +y wall quadrant at the intact rear pressure wall.
 // Both trajectory endpoints lie at sqrt(.1^2+.15^2) < .2 m.
 camera!.up.set(0,0,1);camera!.position.set(.5,2,0);controls.target.set(.5,0,0);controls.update();camera!.updateMatrixWorld();
 const projected=new THREE.Vector3(.5,.15,-.1).project(camera!);
 assert.ok(Math.hypot(projected.x*bounds.width/2,projected.y*bounds.height/2)>40,'line is over 40 pixels away from the clicked center');
 function click(){for(const name of ['pointerdown','pointerup'])canvas.dispatchEvent(new dom.window.MouseEvent(name,{clientX:400,clientY:300,button:0}));}
 const view=frame.querySelector('select[aria-label="3D result layer"]') as HTMLSelectElement;
 assert.equal(view.value,'tracks');click();
 assert.deepEqual(selected,[],'off-pixel line consumes click without an inspectable result');
 view.value='hardware';view.dispatchEvent(new dom.window.Event('change'));click();
 assert.deepEqual(selected,['vessel'],'same pixel selects actual vessel when trajectory is removed');
});

test('audit: default SI camera direction places opaque vessel wall ahead of central radial field samples',()=>{
 const hardware=buildEngineeringGeometry({mode:'rotating',radiusM:.2,lengthM:1});
 const snapshot={domain:{radiusM:.2,lengthM:1},fields:[{id:'electric-radial',coordinate:'radius',positionsM:[0,.1,.2],values:[0,1,2],domain:[0,2]}]};
 const overlay=buildSurfaceOverlay(snapshot,'electric-radial');
 const assembly=new THREE.Group();assembly.rotation.y=Math.PI/2;assembly.add(hardware.group,overlay);assembly.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3().setFromObject(assembly),center=bounds.getCenter(new THREE.Vector3()),radius=bounds.getBoundingSphere(new THREE.Sphere()).radius;
 const vertical=THREE.MathUtils.degToRad(35),horizontal=2*Math.atan(Math.tan(vertical/2)*4/3);
 const distance=1.12*radius/Math.sin(Math.min(vertical,horizontal)/2);
 const origin=center.clone().addScaledVector(new THREE.Vector3(-1.2,.65,1).normalize(),distance);
 // Mirror createApparatusViewer.reset: same fitted bounds, camera origin and SI root transform.
 for(const local of [[-.01,0,.5],[.01,0,.5],[0,.01,.5]]){
  const point=new THREE.Vector3(...local).applyMatrix4(assembly.matrixWorld);
  const ray=new THREE.Raycaster(origin,point.clone().sub(origin).normalize());
  const hits=ray.intersectObject(assembly,true).filter(hit=>{for(let n:THREE.Object3D|null=hit.object;n;n=n.parent)if(!n.visible)return false;return true;});
  const fieldHit=hits.find(hit=>hit.object.userData.fieldId==='electric-radial');assert.ok(fieldHit,'intended radial sample intersects the result field');
  assert.equal(hits[0].object.name,'Vessel pressure wall','default view reaches opaque wall before this interior field sample');
  assert.ok(hits[0].distance<fieldHit.distance);
 }
 hardware.dispose();releaseSurfaceGroup(overlay);
});
