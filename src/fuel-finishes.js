import * as THREE from 'three';

/** Deterministic optical microfinish, never a temperature, erosion or alloy prediction. */
export function finishFuelHardware(scene){
 const finishes=new Map(),replaced=new Set();
 scene.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.quantitativeOnly||mesh.userData.componentId==='profile'||mesh.userData.componentId==='motion')return;
  const original=mesh.material;if(!original.isMeshStandardMaterial)return;
  const name=original.name.toLowerCase(),kind=name.includes('copper')?'copper':name.includes('alumina')?'ceramic':name.includes('stainless')?'steel':null;
  if(!kind)return;
  if(!mesh.geometry.getAttribute('uv')){
   mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox,size=box.getSize(new THREE.Vector3()),p=mesh.geometry.getAttribute('position'),n=mesh.geometry.getAttribute('normal'),uv=[];
   for(let i=0;i<p.count;i++){
    const flat=Math.abs(n.getZ(i))>.8;
    uv.push(flat?(p.getX(i)-box.min.x)/(size.x||1):Math.atan2(p.getY(i),p.getX(i))/(2*Math.PI)+.5,flat?(p.getY(i)-box.min.y)/(size.y||1):(p.getZ(i)-box.min.z)/(size.z||1));
   }
   mesh.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  }
  if(!finishes.has(name)){
   const material=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(material,original);
   const data=new Uint8Array(128*64*4),normal=new Uint8Array(data.length);
   for(let y=0;y<64;y++)for(let x=0;x<128;x++){
    const i=(128*y+x)*4,grain=((Math.imul(x+1,73)^Math.imul(y+1,193))&15)/15;
    const line=Math.sin(2*Math.PI*(y/8)),v=Math.round(206+22*grain+12*line);
    data.set([v,v,v,255],i);normal.set([128,Math.round(128+(kind==='ceramic'?1:3)*line),255,255],i);
   }
   for(const [property,bytes]of [['roughnessMap',data],['normalMap',normal]]){
    const texture=new THREE.DataTexture(bytes,128,64);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(kind==='ceramic'?3:8,2);texture.needsUpdate=true;material[property]=texture;
   }
   material.roughness=kind==='copper'?.32:kind==='ceramic'?.58:.38;
   material.metalness=kind==='ceramic'?0:1;material.anisotropy=kind==='ceramic'?0:.38;material.normalScale.set(.15,.15);
   material.userData={...material.userData,opticalFinish:kind,basis:'Illustrative microfinish; not measured surface properties'};finishes.set(name,material);
  }
  mesh.material=finishes.get(name);replaced.add(original);
 });
 for(const original of replaced)original.dispose();
}
