import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {FuelConfig} from './fuel-centrifuge.js';

const REPLACED=new Set(['Vessel pressure wall','Vacuum flange','Flange seal land','Captive flange bolt','Solenoid former','Copper solenoid turn','Coil terminal','Support leg','Isolation pad']);
let template: Promise<THREE.Group> | undefined;
export type FuelAssemblyConfig = Pick<FuelConfig,'radiusM'|'lengthM'>;
type AssemblyModuleData = {anchorFraction: number; referenceRadiusM: number; referenceLengthM: number; scaleMode: 'radius' | 'length'; coilPack: unknown};
function moduleData(node: THREE.Object3D): AssemblyModuleData {
 const d: Record<string, unknown> = node.userData;
 // Keep the original positive-dimension coercion used by authored JSON metadata.
 const referenceRadiusM=Number(d.referenceRadiusM),referenceLengthM=Number(d.referenceLengthM);
 if(typeof d.anchorFraction!=='number'||!Number.isFinite(d.anchorFraction)||d.anchorFraction<0||d.anchorFraction>1||!(referenceRadiusM>0)||!(referenceLengthM>0)||(d.scaleMode!=='radius'&&d.scaleMode!=='length'))throw new Error('Invalid SI assembly module.');
 return {anchorFraction:d.anchorFraction,referenceRadiusM,referenceLengthM,scaleMode:d.scaleMode,coilPack:d.coilPack};
}
function resources(node: THREE.Object3D): (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] {
 const values: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[]=[];
 if('geometry' in node&&node.geometry instanceof THREE.BufferGeometry)values.push(node.geometry);
 const material: unknown='material' in node?node.material:undefined;
 const materials: unknown[]=Array.isArray(material)?material:[material];
 for(const m of materials)if(m instanceof THREE.Material){values.push(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)values.push(value);}
 return values;
}
/** A failed asset load is reported by the playground, never substituted with simpler hardware. */
export function loadFuelAssembly(): Promise<THREE.Group>{
 return template??=new GLTFLoader().loadAsync('/models/centrifuge-assembly.glb').then(gltf=>gltf.scene).catch(error=>{
  template=undefined;
  throw error;
 });
}

/** Clone owned GPU resources, then place authored modules in the accepted SI frame. */
export function attachFuelAssembly(scene: THREE.Object3D,source: THREE.Object3D,config: FuelAssemblyConfig){
 const modules=source.children.filter(node=>{const data: Record<string,unknown>=node.userData;return data.assemblyModule;});
 if(modules.length!==9||modules.filter(node=>{const data: Record<string,unknown>=node.userData;return data.scaleMode==='length';}).length!==1)throw new Error('Incomplete authored centrifuge assembly.');
 const metadata=modules.map(moduleData);
 const detached: THREE.Object3D[]=[];scene.traverse(node=>{if(REPLACED.has(node.name))detached.push(node);});
 for(const node of detached)node.removeFromParent();
 // Procedural construction shares finishes. Dispose only resources no longer used.
 const retained=new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();scene.traverse(node=>{for(const resource of resources(node))retained.add(resource);});
 const unused=new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();for(const node of detached)for(const resource of resources(node))unused.add(resource);
 for(const resource of unused)if(!retained.has(resource))resource.dispose();
 const parent=scene.getObjectByName('construction')!,scale=config.radiusM/metadata[0].referenceRadiusM;
 for(const [index,authored] of modules.entries()){
  const node=authored.clone(true),data=metadata[index];
  node.position.set(0,0,data.anchorFraction*config.lengthM);
  // Keep four illustrative packs separate even for a short, wide slider geometry.
  const axial=data.scaleMode==='length'?config.lengthM/data.referenceLengthM:data.coilPack?Math.min(scale,4*config.lengthM):scale;
  node.scale.set(scale,scale,axial);
  node.traverse(child=>{if(child instanceof THREE.Mesh){
   // The bundled authored GLB uses named, single-material meshes (qualified by its asset tests).
   const mesh=child as THREE.Mesh<THREE.BufferGeometry,THREE.Material>;
   const data=mesh.userData as {renderName: string};
   mesh.name=data.renderName;mesh.geometry=mesh.geometry.clone();mesh.material=mesh.material.clone();mesh.material.side=THREE.DoubleSide;
  }});
  parent.add(node);
 }
 scene.userData.authoredAssembly={tool:'Blender',modules:modules.length,source:'/models/centrifuge-assembly.glb',basis:'Parametric mesh assembly with illustrative construction. It is not fabrication CAD.'};
}
