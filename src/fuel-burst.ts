import * as THREE from 'three';
import type {FuelConfig} from './fuel-centrifuge.js';

/** Display existing authored parts and vent markers. Their motion is illustrative, not a fracture solution. */
export function createFuelBurst(scene:THREE.Object3D,c:Pick<FuelConfig,'radiusM'|'lengthM'>){
 const group=new THREE.Group();group.name='Failure illustration';group.visible=false;group.userData.nonPickable=true;
 const source=scene.getObjectByName('construction')!,parts:{node:THREE.Object3D;position:THREE.Vector3;rotation:THREE.Quaternion;direction:THREE.Vector3}[]=[];
 const materials=new Map<THREE.Material,THREE.Material>();
 const turn=new THREE.Quaternion(),angles=new THREE.Euler();let housing:THREE.Object3D|null=null;
 function prepare(){
  if(housing)return;housing=source.clone(true);group.add(housing);
  housing.traverse(node=>{if(node instanceof THREE.Mesh){
   const copy=(material:THREE.Material)=>{
    if(!materials.has(material)){const clone=material.clone();clone.clippingPlanes=null;materials.set(material,clone);}
    return materials.get(material)!;
   };
   const material=node.material as THREE.Material|THREE.Material[];
   node.material=Array.isArray(material)?material.map(copy):copy(material);
  }});
  for(const [i,node]of housing.children.entries()){
   const angle=i*2.399963229728653,position=node.position.clone(),z=(position.z-c.lengthM/2)/c.lengthM;
   parts.push({node,position,rotation:node.quaternion.clone(),direction:new THREE.Vector3(Math.cos(angle),Math.sin(angle)*.7,z*1.8||((i%2)*2-1)*.4)});
  }
 }
 const count=240,positions=new Float32Array(count*3),rays=Array.from({length:count},(_,i)=>{
  const angle=i*2.399963229728653;return new THREE.Vector3(Math.cos(angle),Math.sin(angle),(i%23)/22-.5);
 });
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const material=new THREE.PointsMaterial({color:0xb7d6cc,size:2.5,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false});
 const cloud=new THREE.Points(geometry,material);cloud.frustumCulled=false;group.add(cloud);scene.add(group);
 const hidden=new Map<THREE.Object3D,boolean>();let active=false;
 function setVisible(value:boolean){
  if(value===active)return;active=value;group.visible=value;
  if(value)for(const node of scene.children){if(node===group)continue;hidden.set(node,node.visible);node.visible=false;}
  else{
   for(const [node,visible]of hidden)node.visible=visible;hidden.clear();
   for(const {node,position,rotation}of parts){node.position.copy(position);node.quaternion.copy(rotation);}
  }
  scene.userData.shadowRevision=((scene.userData.shadowRevision as number|undefined)??0)+1;
 }
 return {
  group,
  update(seconds:number|null){
   if(seconds!==null)prepare();
   setVisible(seconds!==null);if(seconds===null)return;
   const t=Math.min(1.6,Math.max(0,seconds)),distance=c.radiusM*.9*(1-Math.exp(-2*t));
   for(const node of hidden.keys())node.visible=false;
   for(const {node,position,rotation,direction}of parts){node.position.copy(position).addScaledVector(direction,distance);node.quaternion.copy(rotation).multiply(turn.setFromEuler(angles.set(Math.sin(position.z*11)*t*.08,t*.08,0)));}
   for(let i=0;i<count;i++){const ray=rays[i],r=c.radiusM*(.8+2.2*t)*(1+(i%7)/14);positions[i*3]=ray.x*r;positions[i*3+1]=ray.y*r;positions[i*3+2]=c.lengthM*(i/count)+ray.z*c.radiusM*t;}
   geometry.attributes.position.needsUpdate=true;material.opacity=.6*Math.max(0,1-t/1.6);
   group.userData.elapsedS=t;
   scene.userData.shadowRevision=((scene.userData.shadowRevision as number|undefined)??0)+1;
  },
  dispose(){setVisible(false);group.removeFromParent();geometry.dispose();material.dispose();for(const clone of materials.values())clone.dispose();},
 };
}
