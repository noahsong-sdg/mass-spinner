import * as THREE from 'three';

/** Intersect the actual closed shell triangles with y=h in the apparatus SI frame. */
export function fuelCutGeometry(mesh,scene,heightM,radiusM){
 scene.updateMatrixWorld(true);
 const transform=new THREE.Matrix4().copy(scene.matrixWorld).invert().multiply(mesh.matrixWorld);
 const geometry=mesh.geometry,position=geometry.getAttribute('position'),index=geometry.index;
 const nodes=new Map(),eps=radiusM*1e-6;
 function vertex(p){const key=`${Math.round(p.x/eps)},${Math.round(p.z/eps)}`;if(!nodes.has(key))nodes.set(key,{point:new THREE.Vector2(p.x,p.z),edges:new Set()});return key;}
 for(let i=0;i<(index?.count??position.count);i+=3){
  const points=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(position,index?index.getX(i+j):i+j).applyMatrix4(transform)),cuts=new Set();
  for(let j=0;j<3;j++){
   const a=points[j],b=points[(j+1)%3],rawA=a.y-heightM,rawB=b.y-heightM,da=Math.abs(rawA)<eps*.001?0:rawA,db=Math.abs(rawB)<eps*.001?0:rawB;
   if(da===0)cuts.add(vertex(a));
   if(da*db<0)cuts.add(vertex(a.clone().lerp(b,da/(da-db))));
  }
  if(cuts.size!==2)continue;const [a,b]=[...cuts];nodes.get(a).edges.add(b);nodes.get(b).edges.add(a);
 }
 const visited=new Set(),vertices=[],indices=[];
 for(const [start,entry]of nodes){
  if(visited.has(start)||entry.edges.size!==2)continue;
  const loop=[];let at=start,previous=null;
  do{
   const node=nodes.get(at);if(!node||node.edges.size!==2||visited.has(at))break;
   visited.add(at);loop.push(node.point);const next=[...node.edges].find(key=>key!==previous);previous=at;at=next;
  }while(at!==start);
  // An open zero-thickness surface cannot acquire a fictitious solid cut face.
  if(at!==start||loop.length<3)continue;
  const base=vertices.length/3;for(const p of loop)vertices.push(p.x,heightM,p.y);
  for(const triangle of THREE.ShapeUtils.triangulateShape(loop,[]))indices.push(...triangle.map(i=>base+i));
 }
 const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));result.setIndex(indices);result.computeVertexNormals();return result;
}

/** The cap is a display surface only; it never becomes a numerical gas boundary. */
export function createFuelCutFaces(scene,shells,radiusM){
 const caps=shells.map(({mesh})=>{
  const original=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
  const material=new THREE.MeshStandardMaterial({color:original.color,metalness:original.metalness,roughness:.6,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
  const cap=new THREE.Mesh(new THREE.BufferGeometry(),material);cap.name=`${mesh.name} cut face`;cap.userData={...mesh.userData,displayCutFace:true,purpose:'Exposed construction cross-section; illustrative wall thickness.'};cap.visible=false;scene.add(cap);return {cap,mesh};
 });
 let previous=-1;
 return {update(opening,ghost){
  if(opening!==previous){for(const {cap,mesh}of caps){cap.geometry.dispose();cap.geometry=fuelCutGeometry(mesh,scene,radiusM*(1-2*opening),radiusM);}previous=opening;}
  for(const {cap}of caps){cap.visible=opening>0&&opening<1;cap.material.transparent=ghost;cap.material.opacity=ghost?.3:1;cap.material.depthWrite=!ghost;}
 },dispose(){for(const {cap}of caps){cap.removeFromParent();cap.geometry.dispose();cap.material.dispose();}}};
}
