import * as THREE from 'three';

/** Schematic external discharge wiring. B is prescribed separately, not inferred from coil current. */
export function createFuelCircuit(c){
 const R=c.radiusM,s=R/.12*(c.pair==='lithium'?1.12:1),group=new THREE.Group();group.name='Discharge circuit';
 const purpose='Conventional current: supply + → wall anode → gas → inner cathode → supply −. External wiring is schematic; B and radial current are prescribed independently.';
 group.userData={componentId:'electrodes',purpose,materialBasis:'Illustrative insulated copper leads and DC current source; ratings unspecified',geometryBasis:'Illustrative external circuit topology; not as-built wiring or a rated electrical design'};
 const caseMaterial=new THREE.MeshStandardMaterial({color:0x26332e,metalness:.45,roughness:.5}),wire=new THREE.MeshStandardMaterial({color:0x3b4842,roughness:.72}),contact=new THREE.MeshStandardMaterial({color:0xb97946,metalness:1,roughness:.38});
 const at=[-R*1.8,-R*.9,-R*.5],body=new THREE.Mesh(new THREE.BoxGeometry(R*.75,R*.45,R*.45),caseMaterial);body.position.set(...at);body.name='Prescribed discharge current source';group.add(body);
 for(const sign of [-1,1]){
  const x=at[0]+sign*R*.22,terminal=[x,at[1]+R*.24,at[2]],endpoint=[sign*.62*R*(c.pair==='lithium'?1.12:1),-R*.84*(c.pair==='lithium'?1.12:1),-.065*s];
  const path=new THREE.CatmullRomCurve3([terminal,[x,-R*.55,-R*.5],[endpoint[0],-R*.55,-R*.5],endpoint].map(p=>new THREE.Vector3(...p)));
  const lead=new THREE.Mesh(new THREE.TubeGeometry(path,40,R*.013,8,false),wire);lead.name=sign>0?'Positive lead to wall anode':'Cathode return lead';group.add(lead);
  const pin=new THREE.Mesh(new THREE.SphereGeometry(R*.025,12,8),contact);pin.position.set(...terminal);pin.name=sign>0?'Positive supply terminal':'Negative supply terminal';group.add(pin);
  for(const vertical of sign>0?[false,true]:[false]){const mark=new THREE.Mesh(new THREE.BoxGeometry(vertical?R*.009:R*.06,R*.009,vertical?R*.06:R*.009),contact);mark.position.set(x,at[1]+R*.235,at[2]+R*.08);group.add(mark);}
 }
 group.traverse(node=>{node.userData={...group.userData,...node.userData};});group.visible=false;return group;
}
