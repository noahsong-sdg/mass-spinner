import * as THREE from 'three';

const AXES=['x','y','z'] as const;
type Part={mesh:THREE.Mesh;id:string;position:THREE.Vector3;offset:THREE.Vector3;bounds:THREE.Box3};
function isMesh(node:THREE.Object3D):node is THREE.Mesh{return 'isMesh' in node&&node.isMesh===true;}
/** Presentation offsets only. Keep numerical geometry and source vertices unchanged. */
export function createAssemblyLayout(root:THREE.Object3D){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),parts:Part[]=[],bounds=new THREE.Box3();
 const hidden:{node:THREE.Object3D;mask:number}[]=[];
 root.traverse(node=>{
  if(!('geometry' in node))return;
  let id:string|undefined;
  for(let parent:THREE.Object3D|null=node;parent;parent=parent.parent){
   if(parent.userData.quantitativeOnly||parent.userData.nonPickable){hidden.push({node,mask:node.layers.mask});return;}
   if(!parent.visible)return;
   id??=typeof parent.userData.componentId==='string'?parent.userData.componentId:undefined;
   if(parent===root)break;
  }
  if(!isMesh(node)||!id||['profile','slice','beam','neutrons','current'].includes(id)){hidden.push({node,mask:node.layers.mask});return;}
  node.geometry.computeBoundingBox();
  const box=node.geometry.boundingBox!.clone().applyMatrix4(node.matrixWorld).applyMatrix4(inverse);
  if(box.isEmpty())return;
  bounds.union(box);parts.push({mesh:node,id,position:node.position.clone(),offset:new THREE.Vector3(),bounds:box});
 });
 const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const axis=AXES.reduce((a,b)=>size[a]>=size[b]?a:b),cross=AXES.filter(a=>a!==axis);
 const span=size[axis],width=Math.max(size[cross[0]],size[cross[1]],span*.15);
 const groups=[...new Set(parts.map(p=>p.id))].sort();
 const expanded=new THREE.Box3();
 for(const part of parts){
  const local=part.bounds.getCenter(new THREE.Vector3()),offset=new THREE.Vector3();
  offset[axis]=(local[axis]-center[axis])*.65;
  const angle=groups.indexOf(part.id)*Math.PI*2/groups.length;
  offset[cross[0]]=Math.cos(angle)*width*.8;offset[cross[1]]=Math.sin(angle)*width*.8;
  // Convert a root-local displacement into each authored parent's coordinates.
  const parent=part.mesh.parent!,origin=parent.worldToLocal(root.localToWorld(new THREE.Vector3()));
  part.offset.copy(parent.worldToLocal(root.localToWorld(offset)).sub(origin));
  expanded.union(part.bounds.clone().translate(offset));
 }
 return {
  has:(id:string)=>groups.length>1&&parts.some(part=>part.id===id),
  bounds:expanded.applyMatrix4(root.matrixWorld),
  apply(amount:number){
   for(const part of parts)part.mesh.position.copy(part.position).addScaledVector(part.offset,amount);
   for(const {node,mask}of hidden)node.layers.mask=amount>0?0:mask;
   root.updateWorldMatrix(true,true);
  },
 };
}
