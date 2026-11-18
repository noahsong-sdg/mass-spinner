import * as THREE from 'three';

export const HUMAN_HEIGHT_M=69*.0254;

/** Neutral scale mannequin, in metres; not part of the apparatus or solver. */
export function createHumanScale(){
 const person=new THREE.Group();person.name='5 foot 9 scale person';
 person.userData={nonPickable:true,heightM:HUMAN_HEIGHT_M,scaleReference:true};
 const sphere=new THREE.SphereGeometry(1,16,12),cylinder=new THREE.CylinderGeometry(1,1,1,12);
 const material=new THREE.MeshStandardMaterial({color:0xa9b2aa,roughness:.85});
 function body(name:string,at:number[],size:number[]){
  const mesh=new THREE.Mesh(sphere,material);mesh.name=name;mesh.position.fromArray(at);mesh.scale.fromArray(size);person.add(mesh);
 }
 function limb(a:THREE.Vector3,b:THREE.Vector3,radius:number){
  const mesh=new THREE.Mesh(cylinder,material),delta=b.clone().sub(a);
  mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(radius,delta.length(),radius);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());person.add(mesh);
 }
 body('Head',[0,HUMAN_HEIGHT_M-.108,0],[.088,.108,.095]);
 body('Neck',[0,1.52,0],[.052,.065,.052]);
 body('Torso',[0,1.23,0],[.21,.275,.12]);
 body('Pelvis',[0,.96,0],[.155,.135,.105]);
 for(const side of [-1,1]){
  const shoulder=new THREE.Vector3(side*.195,1.43,0),elbow=new THREE.Vector3(side*.285,1.15,0),wrist=new THREE.Vector3(side*.30,.92,.025);
  limb(shoulder,elbow,.055);limb(elbow,wrist,.043);
  body('Shoulder',shoulder.toArray(),[.065,.065,.065]);body('Elbow',elbow.toArray(),[.047,.047,.047]);
  body('Hand',[side*.30,.86,.025],[.043,.075,.032]);
  const hip=new THREE.Vector3(side*.095,.94,0),knee=new THREE.Vector3(side*.12,.53,0),ankle=new THREE.Vector3(side*.12,.115,0);
  limb(hip,knee,.078);limb(knee,ankle,.055);body('Knee',knee.toArray(),[.062,.062,.062]);
  body('Foot',[side*.12,.045,.045],[.073,.045,.145]);
 }
 return person;
}

/** Stand beside the apparatus on the same projected floor, without rescaling. */
export function placeHumanScale(person:THREE.Group,bounds:THREE.Box3,up:THREE.Vector3,direction:THREE.Vector3){
 up=up.clone().normalize();
 const forward=direction.clone().addScaledVector(up,-direction.dot(up)).normalize();
 const right=new THREE.Vector3().crossVectors(up,forward).normalize();
 let floor=Infinity,left=Infinity;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const corner=new THREE.Vector3(x,y,z);floor=Math.min(floor,corner.dot(up));left=Math.min(left,corner.dot(right));
 }
 person.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,forward));
 person.position.copy(up).multiplyScalar(floor).addScaledVector(right,left-.50)
  .addScaledVector(forward,bounds.getCenter(new THREE.Vector3()).dot(forward));
 person.updateWorldMatrix(true,true);
}
