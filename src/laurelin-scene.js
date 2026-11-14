import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {LAURELIN_DEFAULTS} from './laurelin-physics.js';
import {fitLaurelinCamera} from './laurelin-camera.js';

export const LAURELIN_COMPONENTS={
 formation:['Formation coils','Pulsed fields form and translate a pair of FRCs.','Assumed copper winding and ceramic insulation.'],
 compression:['Compression / recovery coils','External magnetic pressure compresses the merged plasma. Expansion can return work through the same circuit.','Assumed copper winding on insulating supports.'],
 vessel:['Vacuum chamber','Contains the fuel; the cutaway exposes the plasma and field topology.','Assumed stainless steel with ceramic electrical breaks.'],
 plasma:['Field-reversed plasma','Closed poloidal field contours surround a magnetic null ring. No central conductor. Lines show an analytic topology, not computed ion trajectories.','Deuterium ions and electrons; D–D reactions also produce T, ³He and neutrons.'],
 power:['Pulsed-power bank','Stores driver energy; switches connect the coils to a protected electrical link. Circuit losses and recovery are parameterized.','Assumed film capacitors, copper bus and semiconductor switches.'],
 dc:['Protected DC link','The relevant measurement is electrical energy returned across this boundary. Inferred plasma energy alone is insufficient.','Illustrative copper bus and insulated converter enclosure.'],
};
export function buildLaurelinAssembly(){
 const assembly=new THREE.Group();assembly.rotation.y=Math.PI/2;
 // Normalized drawing units preserve the actual plasma aspect ratio; hardware
 // clearances remain illustrative, rather than an asserted Laurelin dimension.
 const unitsPerM=1.3/(LAURELIN_DEFAULTS.lengthM/2),plasmaRadius=unitsPerM*LAURELIN_DEFAULTS.radiusM;
 const metal=new THREE.MeshStandardMaterial({color:0x88918b,metalness:.8,roughness:.3});
 const copper=new THREE.MeshStandardMaterial({color:0xb18553,metalness:.85,roughness:.31});
 const ceramic=new THREE.MeshStandardMaterial({color:0xbdbdb0,roughness:.6});
 const dark=new THREE.MeshStandardMaterial({color:0x27352e,metalness:.55,roughness:.4});
 const picks=[];
 function mesh(geometry,material,position,id){
  const obj=new THREE.Mesh(geometry,material);obj.position.set(...position);obj.userData.component=id;
  assembly.add(obj);picks.push(obj);return obj;
 }
 function ring(radius,width,z,id,material){
  const g=new THREE.TorusGeometry(radius,width,12,80);return mesh(g,material,[0,0,z],id);
 }
 for(let i=0;i<19;i++){
  const z=(i-9)*.39,center=Math.abs(z)<1.45;
  ring(center?1.03:.93,center?.085:.065,z,center?'compression':'formation',copper);
  if(i%2===0)ring(center?1.15:1.05,.035,z,'vessel',ceramic);
 }
 // A physical open sector, rather than an opaque tube with a painted window.
 const shell=new THREE.CylinderGeometry(.85,.85,7.7,72,1,true,-Math.PI*.3,Math.PI*1.3);
 shell.rotateX(Math.PI/2);mesh(shell,metal,[0,0,0],'vessel');
 for(const z of [-3.95,-1.6,1.6,3.95])ring(.88,.045,z,'vessel',metal);
 for(const x of [-1.25,1.25])for(const z of [-2.8,2.8])
  mesh(new THREE.BoxGeometry(.12,.9,.2),dark,[x,-1.15,z],'vessel');
 mesh(new THREE.BoxGeometry(3.2,.15,8.3),dark,[0,-1.65,0],'vessel');
 for(let i=0;i<8;i++)mesh(new THREE.BoxGeometry(.48,.75,.5),metal,[1.8,-.9,(i-3.5)*.7],'power');
 for(const x of [1.5,2.1])mesh(new THREE.BoxGeometry(.035,.055,6.3),copper,[x,-.42,0],'power');
 mesh(new THREE.BoxGeometry(.85,.9,.8),dark,[1.8,-.6,4],'dc');
 for(const z of [-3,-1,1,3]){
  const curve=new THREE.CatmullRomCurve3([[.7,-.6,z],[1.15,-.3,z],[1.5,-.42,z]].map(v=>new THREE.Vector3(...v)));
  mesh(new THREE.TubeGeometry(curve,12,.025,8,false),copper,[0,0,0],Math.abs(z)<2?'compression':'formation');
 }
 const plasmaMaterial=new THREE.MeshStandardMaterial({color:0xd4c58b,emissive:0x9c7735,
  emissiveIntensity:.5,transparent:true,opacity:.3,roughness:.6,depthWrite:false});
 function frc(length){
  const group=new THREE.Group();assembly.add(group);
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,48,24),plasmaMaterial.clone());
  body.scale.set(plasmaRadius,plasmaRadius,length);body.userData.component='plasma';group.add(body);picks.push(body);
  for(const s of [.035,.1,.19])for(let phi=0;phi<Math.PI*2;phi+=Math.PI/3){
   const points=[];
   for(let i=0;i<=128;i++){
    const theta=2*Math.PI*i/128,x=.5+.5*Math.sqrt(1-4*s)*Math.cos(theta);
    const r=plasmaRadius*Math.sqrt(x),z=length*Math.sign(Math.sin(theta))*Math.sqrt(Math.max(0,1-x-s/x));
    points.push(new THREE.Vector3(r*Math.cos(phi),r*Math.sin(phi),z));
   }
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({color:0xe4d5a8,transparent:true,opacity:.62}));group.add(line);
  }
  return {group,body};
 }
 const pair=[frc(.65),frc(.65)],merged=frc(1.3);merged.group.visible=false;
 function update(state,config){
  const fraction=state.fraction,isPair=fraction<.32;
  const progress=THREE.MathUtils.clamp((fraction-.12)/.2,0,1);
  const lengthScale=config.lengthM/LAURELIN_DEFAULTS.lengthM;
  pair.forEach((p,i)=>{p.group.visible=isPair;p.group.position.z=(i?1:-1)*(2.6-(2.6-.65*lengthScale)*progress);});
  merged.group.visible=!isPair;
  const radial=state.radiusM/LAURELIN_DEFAULTS.radiusM;
  for(const p of [...pair,merged]){
   p.group.scale.set(radial,radial,lengthScale);
   p.body.material.emissiveIntensity=.25+Math.min(state.temperatureKeV/15,1);
  }
 }
 return {assembly,picks,pair,merged,update,unitsPerM};
}
export function createLaurelinScene(canvas,onInspect){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x101714);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.05,100);
 const initialViewport=canvas.getBoundingClientRect();
 // OrbitControls caches the up basis at construction; keep it fixed thereafter.
 if(initialViewport.width/initialViewport.height<.8)camera.up.set(1,0,0);
 camera.position.set(7,4.2,8);const controls=new OrbitControls(camera,canvas);
 controls.target.set(0,0,0);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=60;
 scene.add(new THREE.HemisphereLight(0xe1ede2,0x1d2821,2));
 for(const [color,power,p]of [[0xffedcf,65,[3,5,3]],[0x9bafa6,45,[-4,2,-4]]]){
  const light=new THREE.PointLight(color,power,25,2);light.position.set(...p);scene.add(light);
 }
 const hardware=buildLaurelinAssembly(),{assembly,picks}=hardware;scene.add(assembly);
 hardware.update({fraction:0,radiusM:LAURELIN_DEFAULTS.radiusM,temperatureKeV:LAURELIN_DEFAULTS.temperatureKeV},LAURELIN_DEFAULTS);
 const bounds=new THREE.Box3().setFromObject(assembly);let manuallyMoved=false;
 controls.addEventListener('start',()=>{manuallyMoved=true;});
 function fit(resetPosition=true){
  const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;
  const view=fitLaurelinCamera(bounds,width,height,camera.fov,camera.up);
  if(resetPosition){camera.position.copy(view.position);controls.target.copy(view.target);}
  camera.setViewOffset(width,height,0,view.offsetY,width,height);camera.updateProjectionMatrix();controls.update();
 }
 const grid=new THREE.GridHelper(20,40,0x314338,0x1c2b23);grid.position.y=-1.75;scene.add(grid);
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
 canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
 canvas.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=canvas.getBoundingClientRect();pointer.set(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);
  ray.setFromCamera(pointer,camera);
  const visible=picks.filter(o=>{let p=o;while(p){if(!p.visible)return false;p=p.parent;}return true;});
  const hit=ray.intersectObjects(visible,false)[0];if(hit)onInspect(hit.object.userData.component);
 });
 const resize=new ResizeObserver(()=>{
  const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  fit(!manuallyMoved);
 });resize.observe(canvas);fit();
 return {
  update(state,config){
   hardware.update(state,config);
   controls.update();renderer.render(scene,camera);
  },
  home(){manuallyMoved=false;fit();},
 };
}
