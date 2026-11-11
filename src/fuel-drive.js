import * as THREE from 'three';

/** Inward conventional current and +z field give positive azimuthal torque.
 * This is the solver's prescribed axisymmetric annulus, not a Maxwell solution.
 */
export function fuelDriveAt(config,radiusM,angle=0){
 const {radiusM:R,lengthM:L,currentA:I,magneticT:B,driveInnerFraction:f}=config;
 if(![R,L,I,B,f,radiusM,angle].every(Number.isFinite)||R<=0||L<=0||I<0||B<0||f<=0||f>=1||radiusM<f*R||radiusM>R)throw new RangeError('Sample must lie in the prescribed drive annulus.');
 const jr=-I/(2*Math.PI*radiusM*L),force=-jr*B;
 return {currentA:I,currentDensityAM2:jr,fieldT:B,forceDensityNM3:force,
  current:[jr*Math.cos(angle),jr*Math.sin(angle),0],field:[0,0,B],force:[-force*Math.sin(angle),force*Math.cos(angle),0],
  torqueNm:I*B*(R**2-(f*R)**2)/2};
}

export function createFuelDrive(config){
 const {radiusM:R,lengthM:L,driveInnerFraction:f}=config,group=new THREE.Group(),layers={};
 group.name='Prescribed electromagnetic drive';group.userData={nonPickable:true,quantitativeOnly:true,scope:'Uniform axial B; Jr = −I/(2πrL), prescribed annulus. Fixed-length direction glyphs; no solved field lines.'};
 for(const name of ['B','J','force']){layers[name]=new THREE.Group();layers[name].name=name;group.add(layers[name]);}
 const colors={B:0x9bb8cf,J:0xe0a36c,force:0xe0e6be};
 function arrow(layer,position,vector,length,value,unit){
  const direction=new THREE.Vector3(...vector);if(direction.lengthSq()===0)return;
  const head=Math.min(R*.1,length*.35),glyph=new THREE.ArrowHelper(direction.normalize(),new THREE.Vector3(...position),length,colors[layer],head,Math.min(R*.055,length*.2));
  // ArrowHelper shares global geometries; each accepted/pinned scene owns disposal.
  glyph.line.geometry=glyph.line.geometry.clone();glyph.cone.geometry=glyph.cone.geometry.clone();
  const width=Math.min(R*.009,length*.06),shaft=new THREE.Mesh(new THREE.CylinderGeometry(width,width,length-head,8),new THREE.MeshBasicMaterial({color:colors[layer],toneMapped:false}));
  shaft.position.y=Math.max(length-head,0)/2;glyph.add(shaft);glyph.line.visible=false;glyph.cone.material.toneMapped=false;
  glyph.traverse(node=>{node.userData.quantitativeOnly=true;});
  glyph.userData={physicalMagnitude:value,unit,directionOnly:true};layers[layer].add(glyph);
 }
 const r=R*(f+1)/2;
 for(const angle of [Math.PI*.15,Math.PI*.7,Math.PI*1.3]){
  const s=fuelDriveAt({...config,currentA:config.currentA||1},r,angle),position=[r*Math.cos(angle),r*Math.sin(angle),L*.53];
  arrow('J',position,s.current,R*(1-f)*.4,Math.abs(s.currentDensityAM2),'A/m²');
  arrow('force',position,s.force,R*Math.min(.25,Math.sqrt(1-(r/R)**2)*.8),s.forceDensityNM3,'N/m³');
  arrow('B',[...position.slice(0,2),L*.24],s.field,L*.43,s.fieldT,'T');
 }
 let state=fuelDriveAt(config,r),selectedLayer='all';
 group.userData.torqueNm=state.torqueNm;
 function refresh(){for(const [key,layer]of Object.entries(layers))layer.visible=(selectedLayer==='all'||selectedLayer===key)&&(key==='B'||state.currentA>0);group.visible=selectedLayer!=='off';}
 refresh();
 return {group,get state(){return state;},setCurrent(currentA){state=fuelDriveAt({...config,currentA},r);group.userData.torqueNm=state.torqueNm;for(const key of ['J','force'])for(const glyph of layers[key].children)glyph.userData.physicalMagnitude=key==='J'?Math.abs(state.currentDensityAM2):state.forceDensityNM3;refresh();},setLayer(value){if(!['all','B','J','force','off'].includes(value))throw new RangeError('Unknown drive layer.');selectedLayer=value;refresh();}};
}
