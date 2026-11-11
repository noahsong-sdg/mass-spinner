import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const REPLACED=new Set(['Vessel pressure wall','Vacuum flange','Flange seal land','Captive flange bolt','Solenoid former','Copper solenoid turn','Coil terminal','Support leg','Isolation pad']);
let template;
/** A failed asset load is reported by the playground, never substituted with simpler hardware. */
export function loadFuelAssembly(){return template??=new GLTFLoader().loadAsync('/models/centrifuge-assembly.glb').then(gltf=>gltf.scene);}

/** Clone owned GPU resources, then place authored modules in the accepted SI frame. */
export function attachFuelAssembly(scene,source,config){
 const modules=source.children.filter(node=>node.userData.assemblyModule);
 if(modules.length!==9||modules.filter(node=>node.userData.scaleMode==='length').length!==1)throw new Error('Incomplete authored centrifuge assembly.');
 for(const node of modules){const d=node.userData;if(!Number.isFinite(d.anchorFraction)||d.anchorFraction<0||d.anchorFraction>1||!(d.referenceRadiusM>0)||!(d.referenceLengthM>0)||!['radius','length'].includes(d.scaleMode))throw new Error('Invalid SI assembly module.');}
 const detached=[];scene.traverse(node=>{if(REPLACED.has(node.name))detached.push(node);});
 for(const node of detached)node.removeFromParent();
 // Procedural construction shares finishes. Dispose only resources no longer used.
 const retained=new Set();scene.traverse(node=>{if(node.geometry)retained.add(node.geometry);for(const m of node.material?Array.isArray(node.material)?node.material:[node.material]:[]){retained.add(m);for(const t of Object.values(m))if(t?.isTexture)retained.add(t);}});
 const unused=new Set();for(const node of detached){unused.add(node.geometry);for(const m of Array.isArray(node.material)?node.material:[node.material]){unused.add(m);for(const t of Object.values(m))if(t?.isTexture)unused.add(t);}}
 for(const resource of unused)if(!retained.has(resource))resource.dispose();
 const parent=scene.getObjectByName('construction'),scale=config.radiusM/modules[0].userData.referenceRadiusM;
 for(const authored of modules){
  const node=authored.clone(true),data=node.userData;
  node.position.set(0,0,data.anchorFraction*config.lengthM);
  // Keep four illustrative packs separate even for a short, wide slider geometry.
  const axial=data.scaleMode==='length'?config.lengthM/data.referenceLengthM:data.coilPack?Math.min(scale,4*config.lengthM):scale;
  node.scale.set(scale,scale,axial);
  node.traverse(mesh=>{if(mesh.isMesh){mesh.name=mesh.userData.renderName;mesh.geometry=mesh.geometry.clone();mesh.material=mesh.material.clone();mesh.material.side=THREE.DoubleSide;}});
  parent.add(node);
 }
 scene.userData.authoredAssembly={tool:'Blender',modules:modules.length,source:'/models/centrifuge-assembly.glb',basis:'Parametric mesh assembly; illustrative construction, not fabrication CAD.'};
}
