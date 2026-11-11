import * as THREE from 'three';
import {annulus,buildEngineeringGeometry,machinedMetal} from './engineering-geometry.js';
import {finishFuelHardware} from './fuel-finishes.js';
import {createFuelCircuit} from './fuel-circuit.js';
import {createFuelMotion} from './fuel-motion.js';
import {createFuelSceneTools} from './fuel-scene-tools.js';
import {attachFuelAssembly,loadFuelAssembly} from './fuel-assembly.js';
export {loadFuelAssembly};

const BASIS='Conceptual Marathon patent topology; dimensions and construction are illustrative, not an as-built machine.';
const STAGE_BASIS=BASIS+' Routing overlay only: length describes one reference vessel, not a solved per-stage length or the total cascade length.';
export const FUEL_COMPONENTS=[
 ['vessel','Vacuum vessel','Contains the partially ionized working gas.','Assumed stainless-steel vessel'],
 ['coils','Magnetic coils','Provide the prescribed axial magnetic field.','Assumed copper winding with ceramic former'],
 ['source','Auxiliary hollow cathode','Optional ignition source; its axial jacket is not the modeled radial-current endpoint. Openings admit working gas.','Illustrative tungsten jacket and LaB₆ emitter; disclosed material options'],
 ['electrodes','Annular current drive','Conventional current crosses the gas gap inward from the wall anode at R to the inner-ring cathode at fR; J × B supplies torque.','Assumed refractory-metal electrodes; effective current distribution is a model closure'],
 ['insulators','Electrical isolation','Electrically separates biased discharge hardware from adjacent vessel parts.','Assumed alumina or zirconia electrical break'],
 ['feed','Working-gas feed and restrictor','Connects upstream gas to the chamber axis through prescribed inlet conductance C; the depicted aperture does not determine C.','Illustrative metal gas-feed tube and inlet restrictor'],
 ['pump','Exhaust pump','Prescribed speed S exhausts the outer-radius gas; it is distinct from the upstream inlet conductance C.','Illustrative pump housing; pump mechanism unspecified'],
 ['cooling','Cooling circuit','Illustrative cooling route. Enabled thermal evolution uses a prescribed wall-to-coolant conductance; channel flow and spatial coolant temperatures are not solved.','Illustrative metal tubing; electrically insulating coolant unspecified'],
 ['liner','Hot lithium sub-vessel','Refractory gas boundary. Thermal evolution supports lumped gas or an experimental spatial monatomic mixture coupled to radial tungsten conduction.','Illustrative tungsten refractory liner'],
 ['light-outlet','Inner product outlet','Samples the light-enriched inner inventory in the ideal routing model.','Assumed metal duct; extraction hydrodynamics not solved'],
 ['heavy-outlet','Outer outlet','Exhausts the outer-radius gas; the pumping arrangement has only this product outlet.','Assumed metal duct; pump construction unspecified'],
 ['stages','Cascade routing overlay','Schematic heavy-stream returns connect preceding ideal stages; internal divisions do not subdivide the lumped mechanical vessel.','Illustrative routing overlay, not physical stage dimensions'],
 ['profile','Neutral composition reference','Color shows local light-species fraction at ideal radial equilibrium, not tracked particles.','Numerical overlay; no physical material'],
 ['motion','Gas motion','Solid dots are neutrals; rings are ions. Cyan is light; amber is heavy. Weighted bulk tracers show rigid rotation, not thermal orbits; ion markers are enlarged and oversampled. Coupled spin-up and separation evolve gas inertia and rotor angular momentum together with a reflecting wall. Thermal options include an experimental spatial common-temperature mixture with species enthalpy transport and rotor work. Equilibrium uses uniform-inertia references. Separation and Flow average fast rotation over azimuth. External outlet packets encode conditional Q/(kT), not chamber fluid velocities or solved product extraction. Local fluid momentum is not solved.','Numerical visualization; no physical material'],
].map(([id,name,purpose,material])=>({id,name,purpose,material,basis:id==='stages'?STAGE_BASIS:BASIS}));

/** Retain the detailed SI engineering shell and add disclosed application topology. */
export function buildFuelCentrifugeGeometry({config:c,result:r,diagnostics=false,assembly}){
 const R=c.radiusM,L=c.lengthM,f=c.driveInnerFraction;
 if(!Number.isFinite(R)||R<=0||!Number.isFinite(L)||L<=0)throw new RangeError('Positive finite centrifuge dimensions required.');
 if(!Number.isFinite(f)||f<=0||f>=1)throw new RangeError('Drive annulus must lie inside the vessel.');
 if(!Number.isFinite(c.cutFraction)||c.cutFraction<0||c.cutFraction>1)throw new RangeError('Collection cut must lie in [0, 1].');
 if(!['enrichment','pump'].includes(c.application))throw new RangeError('Unknown centrifuge application.');
 const stages=c.application==='pump'?1:c.stages;
 if(!Number.isSafeInteger(stages)||stages<1||stages>12)throw new RangeError('One to twelve enrichment stages required.');
 if(c.pair==='lithium'&&(!Number.isFinite(c.linerK)||c.linerK<=0))throw new RangeError('Positive finite liner temperature required.');
 const profiles=r.profiles;
 if(!Array.isArray(profiles)||profiles.length<2||profiles.some((p,i)=>!Number.isFinite(p.radiusM)||p.radiusM<0||p.radiusM>R||i>0&&p.radiusM<=profiles[i-1].radiusM||p.lightFraction!==null&&(!Number.isFinite(p.lightFraction)||p.lightFraction<0||p.lightFraction>1)))throw new RangeError('Ordered radial composition reference required.');
 const scene=buildEngineeringGeometry({mode:'centrifuge',radiusM:R,lengthM:L}).group;
 const envelopeScale=c.pair==='lithium'?1.12:1;
 scene.name='fuel-centrifuge';scene.userData={...scene.userData,application:c.application,stages,gasRadiusM:R,vacuumEnvelopeRadiusM:R*envelopeScale,geometryBasis:BASIS,stageGeometryBasis:STAGE_BASIS};
 scene.getObjectByName('construction').scale.set(envelopeScale,envelopeScale,1);
 // Replace the generic source electrodes: they imply a different current endpoint.
 for(const name of ['Arc cathode','Source discharge anode']){const old=scene.getObjectByName(name);old.geometry.dispose();old.removeFromParent();}
 if(assembly){attachFuelAssembly(scene,assembly,c);finishFuelHardware(scene);}
 const records=new Map(FUEL_COMPONENTS.map(x=>[x.id,x]));
 scene.traverse(mesh=>{if(mesh.isMesh){
  const id=records.has(mesh.userData.componentId)?mesh.userData.componentId:'vessel';
  mesh.userData={...mesh.userData,componentId:id,purpose:records.get(id).purpose,geometryBasis:BASIS};
 }});
 const metal=machinedMetal(0x75878d,.32,.4);
 const refractory=machinedMetal(0x77746d,.48,.2);refractory.side=THREE.DoubleSide;
 const emitter=new THREE.MeshStandardMaterial({color:0xb09a70,metalness:.4,roughness:.4});
 function add(name,geometry,material,id,position=[0,0,0]){
  const mesh=new THREE.Mesh(geometry,material),record=records.get(id);mesh.name=name;mesh.position.set(...position);
  mesh.userData={componentId:id,materialBasis:record.material,geometryBasis:record.basis,purpose:record.purpose};scene.add(mesh);return mesh;
 }
 function ring(name,inner,outer,z,id,material=metal){
  return add(name,new THREE.RingGeometry(inner,outer,64),material,id,[0,0,z]);
 }
 function tube(name,points,id,diameter=R*.05){
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return add(name,new THREE.TubeGeometry(path,32,diameter/2,12,false),metal,id);
 }
 const cathodeR=R*Math.min(.055,f*.7),cathodeL=L*.84;
 const jacket=new THREE.CylinderGeometry(cathodeR,cathodeR,cathodeL,48,16,true),index=jacket.getIndex(),position=jacket.getAttribute('position'),triangles=[];
 // Remove actual side faces for gas slots rather than painting dark spots on a solid tube.
 for(let i=0;i<index.count;i+=3){
  const center=new THREE.Vector3();for(let j=0;j<3;j++)center.add(new THREE.Vector3().fromBufferAttribute(position,index.getX(i+j)));center.multiplyScalar(1/3);
  const angle=Math.atan2(center.z,center.x),band=Math.abs(center.y/cathodeL);
  const slot=band>.1&&band<.34&&[0,Math.PI*2/3,-Math.PI*2/3].some(a=>Math.abs(Math.atan2(Math.sin(angle-a),Math.cos(angle-a)))<.18);
  if(!slot)triangles.push(index.getX(i),index.getX(i+1),index.getX(i+2));
 }
 jacket.setIndex(triangles);jacket.rotateX(Math.PI/2);
 add('Perforated tungsten cathode jacket',jacket,refractory,'source',[0,0,L/2]);
 const core=new THREE.CylinderGeometry(cathodeR*.64,cathodeR*.64,cathodeL,32,1,true);core.rotateX(Math.PI/2);
 add('LaB₆ thermionic emitter',core,emitter,'source',[0,0,L/2]);
 for(const z of [L*.08,L*.92])ring('Cathode jacket rim',cathodeR*.78,cathodeR,z,'source',refractory);
 for(const z of [L*.06,L*.94]){
  const width=R*Math.min(.025,f*.2,(1-f)*.2);
  const cathode=ring('Inner annular drive cathode',f*R-width,f*R,z,'electrodes',refractory);
  const anode=ring('Outer wall drive anode',R,R+width,z,'electrodes',refractory);
  cathode.userData.currentEndpointM=f*R;anode.userData.currentEndpointM=R;
 }
 if(assembly)for(const end of [0,1]){
  const z=L*end,ringZ=L*(end===0?.06:.94),s=R/.12*envelopeScale;
  for(const [x,radius]of [[-.62,f],[.62,1]]){
   tube('Insulated drive connection',[[x*R*envelopeScale,-R*.84*envelopeScale,z-.059*s],[x*R*envelopeScale,-R*.84*envelopeScale,z-.065*s],[radius*R,0,z-.065*s],[radius*R,0,ringZ]],'electrodes',R*.018);
  }
 }
 tube('Working-gas feed inlet',[[0,0,-R*.95],[0,0,-R*.5],[0,0,L*.08]],'feed',cathodeR*.9);
 const restrictor=ring('Inlet conductance restrictor',cathodeR*.45,cathodeR*.9,-R*.75,'feed',refractory);
 restrictor.userData.prescribedConductanceM3S=c.conductanceM3S;
 for(const sign of [-1,1])tube('Vessel coolant connection',[[sign*R*.75*envelopeScale,-R*Math.sqrt(1-.75**2)*envelopeScale,L*.12],[sign*R*1.35*envelopeScale,-R*.9*envelopeScale,L*.12],[sign*R*1.35*envelopeScale,-R*.9*envelopeScale,L*.88],[sign*R*.75*envelopeScale,-R*Math.sqrt(1-.75**2)*envelopeScale,L*.88]],'cooling');
 tube('Outer-radius exhaust',[[0,R,L*.88],[0,R*1.5,L*.88],[0,R*1.5,L*1.14]],'heavy-outlet',R*.16);
 const pumpBody=new THREE.CylinderGeometry(R*.23,R*.23,R*.55,40);pumpBody.rotateX(Math.PI/2);
 const pump=add('Downstream exhaust pump',pumpBody,metal,'pump',[0,R*1.5,L*1.14+R*.3]);pump.userData.prescribedSpeedM3S=c.pumpSpeedM3S;
 if(c.application==='enrichment'){
  const routing=new THREE.MeshBasicMaterial({color:0x91aaa1,transparent:true,opacity:.5,depthWrite:false});
  const cutR=c.cutFraction*R;
  if(cutR>0){
   const duct=tube('Inner light-product duct',[[cutR*.5,0,L*.9],[cutR*.5,0,L*1.14],[R*.75,0,L*1.14]],'light-outlet',Math.min(R*.12,cutR*.4));
   duct.userData.cutRadiusM=cutR;
   const marker=add('Prescribed collection cut',new THREE.TorusGeometry(cutR,R*.006,8,64),refractory,'light-outlet',[0,0,L*.96]);
   marker.userData={...marker.userData,cutRadiusM:cutR,geometryBasis:BASIS+' Nominal circle follows the prescribed cut radius; marker thickness is illustrative.'};
  }
  for(let i=1;i<stages;i++){
   const z=L*i/stages;
   add('Stage partition',new THREE.TorusGeometry(R*.97,R*.004,6,96),routing,'stages',[0,0,z]);
   tube('Heavy-stream return',[[0,R*.94,z+L/stages*.14],[0,R*1.3,z+L/stages*.14],[0,R*1.3,z-L/stages*.55],[0,R*.94,z-L/stages*.55]],'stages');
  }
 }
 if(c.pair==='lithium'){
  const liner=annulus(R,R*1.012,L*.86,Math.PI*.75,Math.PI*1.5,96);
  const mesh=add('Lithium refractory sub-vessel',liner,refractory,'liner',[0,0,L/2]);mesh.userData.temperatureK=c.linerK;mesh.userData.gasBoundaryRadiusM=R;
  const thermal=r.transport?.operation?.thermal?.enabled===true;
  const spatial=thermal&&!!r.transport.operation.thermal.spatial;
  mesh.userData.temperatureBasis=spatial?'Initial radial liner temperature':thermal?'Initial lumped liner temperature':'Prescribed reference liner temperature';
  mesh.userData.purpose+=spatial?` Initial liner ${c.linerK} K; radial temperatures evolve in the thermal grid. Shell thickness and shading remain illustrative; use the temperature profile plot for quantitative values.`:thermal?` Initial liner ${c.linerK} K; the evolving liner temperature is a lumped reservoir, not a spatial thermal field.`:` Prescribed reference liner ${c.linerK} K; no temperature evolution or spatial thermal field is solved.`;
  const ceramic=new THREE.MeshStandardMaterial({color:0xc2bba7,roughness:.65});
  for(const z of [L*.2,L*.5,L*.8]){
   const support=ring('Thermal-isolation standoff',R,R*envelopeScale,z,'liner',ceramic);
   support.userData.materialBasis='Assumed zirconia thermal break; thermal properties and insulation performance are not solved.';
   support.userData.purpose='Illustrative support across the hot-liner / vacuum-vessel gap; insulation performance is not predicted.';
  }
 }
 for(let i=1;i<profiles.length;i++){
  const p=profiles[i],color=p.lightFraction===null?new THREE.Color(0x69777a):new THREE.Color(0xd29456).lerp(new THREE.Color(0x8db3a6),p.lightFraction);
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.76,side:THREE.DoubleSide,depthWrite:false});
  const mesh=ring('Equilibrium composition sample',profiles[i-1].radiusM,p.radiusM,L*.79,'profile',material);
  const composition=p.lightFraction===null?'local composition numerically unresolved':`light fraction ${p.lightFraction.toPrecision(4)}`;
  mesh.userData={...mesh.userData,radiusM:p.radiusM,lightFraction:p.lightFraction,purpose:`Ideal equilibrium at r=${p.radiusM.toPrecision(4)} m: ${composition}. No finite-residence extraction prediction.`};
 }
 const circuit=createFuelCircuit(c);scene.add(circuit);
 scene.rotation.y=Math.PI/2;scene.position.x=-L/2;scene.updateMatrixWorld(true);
 const motion=createFuelMotion(r);scene.add(motion.group);
 // The cloud replaces the opaque equilibrium slice; keep the slice inspectable in the model source.
 scene.traverse(node=>{if(node.name==='Equilibrium composition sample')node.visible=false;});
 const tools=diagnostics?createFuelSceneTools({scene,result:r}):null;if(tools){tools.group.visible=false;tools.circuit=circuit;tools.motion=motion;}
 return {scene,motion,tools};
}
