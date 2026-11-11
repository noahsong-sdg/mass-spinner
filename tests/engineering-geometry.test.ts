import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildEngineeringGeometry,solverToScene,sceneToSolver} from '../src/engineering-geometry.js';

const close=(a:number,b:number,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const defaults={radiusM:.48,lengthM:2.8};
function bounds(mesh:THREE.Object3D){return new THREE.Box3().setFromObject(mesh);}
function named(group:THREE.Object3D,name:string){const object=group.getObjectByName(name);assert.ok(object,name);return object;}

test('SI coordinate transform is rigid and invertible with source and end exact',()=>{
 const point=[.2,-.3,1.4];assert.deepEqual(sceneToSolver(solverToScene(point,2.8),2.8),point);
 assert.deepEqual(solverToScene([0,0,0],2.8),[-1.4,0,-0]);
 assert.deepEqual(solverToScene([0,0,2.8],2.8),[1.4,0,-0]);
 close(new THREE.Vector3(...solverToScene(point,2.8)).distanceTo(new THREE.Vector3(...solverToScene([0,0,0],2.8))),Math.hypot(...point));
});

test('every core axial assembly preserves full absorbing domain independently of cutaway hardware',()=>{
 for(const mode of ['rotating','doublewell-dynamics','icr']){
  const built=buildEngineeringGeometry({mode,...defaults,boundary:'open'});
  assert.equal(built.domain.coordinateSystem,'SI solver xyz; axial z');
  const wall=built.surfaces.get('wall');assert.ok(wall);const b=bounds(wall);
  close(b.min.z,0);close(b.max.z,2.8);close(b.max.x,.48);close(b.min.x,-.48);
  close(bounds(built.surfaces.get('source')!).min.z,0);close(bounds(built.surfaces.get('end')!).min.z,2.8);
  close(built.surfaces.get('source')!.geometry.getAttribute('normal').getZ(0),-1);
  close(built.surfaces.get('end')!.geometry.getAttribute('normal').getZ(0),1);
  assert.equal(wall.visible,false);assert.equal(wall.userData.quantitativeOnly,true);
  assert.match(wall.userData.geometryBasis,/Accepted numerical domain/);
  const construction=bounds(named(built.group,'Vessel pressure wall'));close(construction.min.z,0);close(construction.max.z,2.8);
  // The cutaway opens the +y quadrant, but the physical wall remains at r=a there.
  const ray=new THREE.Raycaster(new THREE.Vector3(0,0,1.4),new THREE.Vector3(0,1,0));
  const hit=ray.intersectObject(wall)[0];assert.ok(hit);close(hit.point.y,.48);
  built.dispose();
 }
});

test('geometry details are pickable components with explicit assumed construction materials',()=>{
 const built=buildEngineeringGeometry({mode:'icr',...defaults});let meshes=0,fasteners=0;
 built.group.traverse((node:any)=>{
  if(!node.isMesh)return;meshes++;if(node.userData.fastener)fasteners++;
  assert.equal(typeof node.userData.componentId,'string',node.name);
  assert.equal(typeof node.userData.materialBasis,'string',node.name);
  for(const attr of Object.values(node.geometry.attributes) as THREE.BufferAttribute[])for(const value of attr.array)assert.ok(Number.isFinite(value),node.name);
 });
 assert.ok(meshes>75);assert.equal(fasteners,32);
 assert.match(named(built.group,'Copper solenoid turn').userData.materialBasis,/Assumed copper/);
 assert.match(named(built.group,'RF resonant drive electrode').userData.geometryBasis,/Illustrative/);
 const rf=named(built.group,'RF resonant drive electrode');
 const ray=new THREE.Raycaster(new THREE.Vector3(1,0,1.4),new THREE.Vector3(-1,0,0));assert.ok(ray.intersectObject(rf).length);
 built.dispose();
});

test('pressure-wall inner, outer, axial and cut faces have outward solid winding',()=>{
 const built=buildEngineeringGeometry({mode:'rotating',...defaults});
 const g=(named(built.group,'Vessel pressure wall') as THREE.Mesh).geometry,p=g.getAttribute('position'),index=g.getIndex()!;
 function triangle(offset:number){
  const vertices=[0,1,2].map(i=>new THREE.Vector3().fromBufferAttribute(p,index.getX(offset+i)));
  return {normal:vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize(),centre:vertices.reduce((a,b)=>a.add(b),new THREE.Vector3()).multiplyScalar(1/3)};
 }
 const n=g.getAttribute('normal'),kinds=new Set<string>();
 for(let i=0;i<index.count;i+=3){
  const {normal,centre}=triangle(i),shading=new THREE.Vector3().fromBufferAttribute(n,index.getX(i));
  assert.ok(normal.dot(shading)>.99,'face winding agrees with its outward shading normal');
  if(Math.abs(normal.z)>.99)kinds.add(normal.z>0?'end':'start');
  else if(Math.abs(normal.z)<.01){
   const radial=normal.dot(centre.clone().setZ(0).normalize());
   if(radial>.99)kinds.add('outer');else if(radial<-.99)kinds.add('bore');
   else if(normal.dot(new THREE.Vector3(-Math.sin(Math.PI*.75),Math.cos(Math.PI*.75),0))<-.99)kinds.add('cut-start');
   else if(normal.dot(new THREE.Vector3(-Math.sin(Math.PI*2.25),Math.cos(Math.PI*2.25),0))>.99)kinds.add('cut-end');
  }else kinds.add('chamfer');
 }
 assert.deepEqual([...kinds].sort(),['bore','chamfer','cut-end','cut-start','end','outer','start']);
 built.dispose();
});

test('target preserves accepted micron film and backing thickness and does not interpolate interface',()=>{
 const film=1e-6,backing=.001,area=1e-4;
 const built=buildEngineeringGeometry({mode:'beam-target',beamAreaM2:area,filmThicknessM:film,backingThicknessM:backing});
 assert.equal(built.domain.layerScale,1);assert.deepEqual(built.domain.beamDirection,[0,0,1]);
 const f=bounds(named(built.group,'LiT film')),b=bounds(named(built.group,'Target backing'));
 assert.equal(named(built.group,'LiT film').userData.cutaway,true);assert.equal(named(built.group,'Target backing').userData.cutaway,true);
 close(f.max.y,0,1e-12);close(b.max.y,0,1e-12);assert.ok(f.min.y<0&&b.min.y<0);
 for(const name of ['LiT film','Target backing']){
  const g=(named(built.group,name) as THREE.Mesh).geometry,p=g.getAttribute('position'),ix=g.getIndex()!;
  for(let i=0;i<ix.count;i+=3){const [a,b,c]=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,ix.getX(i+j)));assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>0,`${name} has a degenerate face`);}
 }
 close(f.min.z,0,1e-12);close(f.max.z,film,1e-12);close(b.min.z,film,1e-10);close(b.max.z,film+backing,1e-10);
 close(bounds(built.surfaces.get('target-interface')!).min.z,film,1e-12);
 close(built.surfaces.get('target-film')!.geometry.getAttribute('normal').getZ(0),-1);
 close(bounds(built.surfaces.get('target-backing')!).min.z,film+backing,1e-12);
 close(bounds(built.surfaces.get('beam-footprint')!).max.x,Math.sqrt(area/Math.PI));
 const filmSide=bounds(built.surfaces.get('target-film-depth')!),backSide=bounds(built.surfaces.get('target-backing-depth')!);
 close(filmSide.min.z,0,1e-12);close(filmSide.max.z,film,1e-12);close(backSide.min.z,film,1e-10);close(backSide.max.z,film+backing,1e-10);
 assert.equal(built.surfaces.has('wall'),false);assert.match(named(built.group,'Cooling manifold').userData.geometryBasis,/Illustrative/);
 built.dispose();
});

test('source/collector designs differ by physical mechanism and reduced diagnostics invent no collection surface',()=>{
 const gyro=buildEngineeringGeometry({mode:'gyro',...defaults});assert.equal(gyro.surfaces.size,0);assert.equal(gyro.domain.absorbingBoundaries,false);gyro.dispose();
 for(const mode of ['centrifuge','doublewell']){const reduced=buildEngineeringGeometry({mode,...defaults});assert.equal(reduced.surfaces.size,0);assert.equal(reduced.domain.absorbingBoundaries,false);reduced.dispose();}
 const closed=buildEngineeringGeometry({mode:'doublewell-dynamics',...defaults,boundary:'closed'});assert.equal(closed.domain.absorbingBoundaries,false);assert.equal(closed.domain.boundary,'specular radial; periodic axial');closed.dispose();
 const curved=buildEngineeringGeometry({mode:'curved',...defaults,curvatureRadiusM:2});
 close(curved.domain.bendAngleRad,1.4);assert.equal(curved.surfaces.size,0);assert.equal(curved.domain.absorbingBoundaries,false);
 const end=named(curved.group,'Diagnostic exit plane');close(end.position.x,2*(1-Math.cos(1.4)));close(end.position.z,2*Math.sin(1.4));curved.dispose();
 const rotating=buildEngineeringGeometry({mode:'rotating',...defaults});assert.ok(rotating.group.getObjectByName('Concentric bias electrode'));assert.equal(rotating.group.getObjectByName('RF resonant drive electrode'),undefined);rotating.dispose();
 const centrifuge=buildEngineeringGeometry({mode:'centrifuge',...defaults});assert.ok(centrifuge.group.getObjectByName('Arc cathode'));centrifuge.dispose();
});

test('unsupported and invalid physical domains fail explicitly rather than silently rescaling',()=>{
 for(const options of [{mode:'unknown',...defaults},{mode:'rotating',...defaults,radiusM:0},{mode:'rotating',...defaults,lengthM:NaN},{mode:'beam-target',beamAreaM2:1e-4,filmThicknessM:0,backingThicknessM:.001},{mode:'curved',...defaults,curvatureRadiusM:.2},{mode:'curved',radiusM:.1,lengthM:10,curvatureRadiusM:.2}])assert.throws(()=>buildEngineeringGeometry(options));
});

test('accepted source support fits the source aperture and every concentric bias ring',()=>{
 const built=buildEngineeringGeometry({mode:'doublewell-dynamics',radiusM:.2,lengthM:1,sourceRadiusM:.08,boundary:'open'});
 assert.equal(built.domain.sourceRadiusM,.08);assert.equal(named(built.group,'Source body').userData.sourceOpeningRadiusM,.08);
 built.group.traverse((node:any)=>{
  if(!['Source body','Source ceramic break','Concentric bias electrode','Bias electrode insulator'].includes(node.name))return;
  const p=node.geometry.getAttribute('position');
  for(let i=0;i<p.count;i++)assert.ok(Math.hypot(p.getX(i),p.getY(i))>=.08-1e-8,node.name);
 });
 assert.throws(()=>buildEngineeringGeometry({mode:'rotating',...defaults,sourceRadiusM:.48}));built.dispose();
});

test('beamline source and target mate across supported area extremes with acceleration upstream',()=>{
 for(const area of [1e-6,1e-4,.1]){
  const built=buildEngineeringGeometry({mode:'beam-target',beamAreaM2:area,filmThicknessM:1e-6,backingThicknessM:.001});
  const tube=bounds(named(built.group,'Evacuated beam tube')),source=bounds(named(built.group,'RF discharge envelope')),plate=bounds(named(built.group,'Target vacuum end plate'));
  assert.ok(tube.max.z>tube.min.z);close(tube.min.z,source.max.z,1e-7);close(tube.max.z,plate.min.z,1e-7);
  built.group.traverse((node:any)=>{if(node.name==='Extraction electrode')assert.ok(bounds(node).max.z<0);});
  assert.equal(built.domain.beamAreaM2,area);assert.equal(built.domain.layerScale,1);built.dispose();
 }
});

test('blanket stays a separate reference with sourced and illustrative thickness distinguished',()=>{
 const built=buildEngineeringGeometry({mode:'blanket',radiusM:1,lengthM:2});
 assert.equal(built.surfaces.size,0);assert.equal(built.domain.kind,'blanket-reference');
 assert.match(named(built.group,'FLiBe blanket').userData.geometryBasis,/Illustrative thickness/);
 assert.match(named(built.group,'Hg/Li channel').userData.geometryBasis,/paper §4.1/);built.dispose();
});
