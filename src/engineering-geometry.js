import * as THREE from 'three';

/** SI local coordinates: x/y transverse, z axial. No implicit display rescaling. */
export const solverToScene=([x,y,z],lengthM)=>[z-lengthM/2,y,-x];
export const sceneToSolver=([x,y,z],lengthM)=>[-z,y,x+lengthM/2];
const ASSUMED='Illustrative construction; not an as-built drawing or a solved material property.';
const SOLVED='Accepted numerical domain, metres; construction does not change solver boundaries.';
const MODES=['centrifuge','rotating','doublewell','doublewell-dynamics','gyro','icr','curved','beam-target','blanket'];
const TAU=2*Math.PI;
const positive=(value,name)=>{if(!Number.isFinite(value)||value<=0)throw new RangeError(`${name} must be finite and positive.`);return value;};

/** Closed annular sector, including radial cut faces. Axial direction is local z. */
export function annulus(inner,outer,depth,start=0,sweep=TAU,segments=72){
 // Separate axial, cylindrical and chamfer vertices: averaging across those
 // boundaries rounds the face normals and erases the machined edge highlight.
 const b=inner>0?Math.min((outer-inner)*.18,depth*.12):0,h=depth/2;
 const profile=b?[[inner,-h+b],[inner+b,-h],[outer-b,-h],[outer,-h+b],[outer,h-b],[outer-b,h],[inner+b,h],[inner,h-b]]:[[inner,-h],[outer,-h],[outer,h],[inner,h]];
 const positions=[],normals=[],uvs=[],indices=[];
 for(let j=0;j<profile.length;j++){
  const [r0,z0]=profile[j],[r1,z1]=profile[(j+1)%profile.length],dr=r1-r0,dz=z1-z0,n=Math.hypot(dr,dz),base=positions.length/3;
  if(r0===0&&r1===0)continue;
  for(let i=0;i<=segments;i++){
   const a=start+sweep*i/segments,c=Math.cos(a),s=Math.sin(a);
   for(const [r,z,v]of [[r0,z0,0],[r1,z1,1]]){positions.push(r*c,r*s,z);normals.push(dz*c/n,dz*s/n,-dr/n);uvs.push(i/segments,v);}
  }
  for(let i=0;i<segments;i++){const a=base+2*i;if(r0>0)indices.push(a,a+2,a+3);if(r1>0)indices.push(a,a+3,a+1);}
 }
 if(sweep<TAU){
  const triangles=THREE.ShapeUtils.triangulateShape(profile.map(([r,z])=>new THREE.Vector2(r,z)),[]);
  for(const [a,sign]of [[start,-1],[start+sweep,1]]){
   const base=positions.length/3,c=Math.cos(a),s=Math.sin(a);
   for(const [r,z]of profile){positions.push(r*c,r*s,z);normals.push(-sign*s,sign*c,0);uvs.push((r-inner)/(outer-inner),(z+h)/depth);}
   for(const t of triangles)indices.push(...(sign<0?t:[...t].reverse()).map(i=>base+i));
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
 return geometry;
}

/** Optical finish only; no inferred alloy, wear or temperature field. */
export function machinedMetal(color,roughness=.36,anisotropy=.35){
 const data=new Uint8Array(128*32*4);
 for(let y=0;y<32;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4,v=215+((y*73+Math.imul(x+1,1103515245)>>>8)%41);
  data.set([v,v,v,255],i);
 }
 const texture=new THREE.DataTexture(data,128,32);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(6,2);texture.needsUpdate=true;
 return new THREE.MeshPhysicalMaterial({color,metalness:1,roughness,roughnessMap:texture,anisotropy});
}

export function buildEngineeringGeometry(options){
 const mode=options.mode??options.kind;
 if(!MODES.includes(mode))throw new RangeError('Unsupported engineering geometry mode.');
 const beam=mode==='beam-target',blanket=mode==='blanket';
 const radius=positive(beam?Math.sqrt(positive(options.beamAreaM2,'beamAreaM2')/Math.PI):options.radiusM,'radiusM');
 const length=positive(options.lengthM??(beam ? .45 : blanket ? 2 : undefined),'lengthM');
 if(beam){positive(options.filmThicknessM,'filmThicknessM');positive(options.backingThicknessM,'backingThicknessM');}
 if(mode==='doublewell-dynamics'&&!['open','closed'].includes(options.boundary))throw new RangeError('Double-well dynamics requires its accepted open/closed boundary.');
 if(options.sourceRadiusM!==undefined&&(positive(options.sourceRadiusM,'sourceRadiusM')>=radius))throw new RangeError('Source support must lie inside the numerical radius.');
 const group=new THREE.Group();group.name=`engineering-${mode}`;
 group.userData={coordinateSystem:'SI solver xyz; axial z',mode,geometryBasis:ASSUMED};
 const surfaces=new Map(),hardware=new THREE.Group();hardware.name='construction';group.add(hardware);
 const materials={
  steel:machinedMetal(0x8b969b,.34,.45),
  copper:machinedMetal(0xb66c3e,.33,.3),
  ceramic:new THREE.MeshStandardMaterial({color:0xd5d1bf,metalness:.02,roughness:.32}),
  dark:new THREE.MeshStandardMaterial({color:0x182427,metalness:.25,roughness:.65}),
  film:new THREE.MeshStandardMaterial({color:0x8dada6,metalness:.23,roughness:.42}),
  fluid:new THREE.MeshStandardMaterial({color:0x548b9d,metalness:.16,roughness:.22}),
  hidden:new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),
 };
 const materialLabels={steel:'Assumed stainless-steel finish; alloy unspecified',copper:'Assumed copper winding / electrode',ceramic:'Assumed alumina insulator',dark:'Illustrative structural metal',film:'LiT target composition from source architecture; optical finish illustrative',fluid:'Illustrative coolant; fluid unspecified',hidden:'Numerical surface, no construction material'};
 function mesh(name,geometry,material,componentId,position=[0,0,0],parent=hardware){
  const item=new THREE.Mesh(geometry,materials[material]);item.name=name;item.position.set(...position);
  item.userData={componentId:componentId==='support'&&!beam?'supports':componentId,geometryBasis:ASSUMED,materialBasis:materialLabels[material]};parent.add(item);return item;
 }
 function ring(name,z,inner,outer,depth,material,id,cut=false){return mesh(name,annulus(inner,outer,depth,cut?Math.PI*.75:0,cut?Math.PI*1.5:TAU),material,id,[0,0,z]);}
 function cylinder(name,r,depth,material,id,position){const geometry=new THREE.CylinderGeometry(r,r,depth,48);geometry.rotateX(Math.PI/2);return mesh(name,geometry,material,id,position);}
 function box(name,size,material,id,position){return mesh(name,new THREE.BoxGeometry(...size),material,id,position);}
 function pipe(name,points,tube,material,id){
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(name,new THREE.TubeGeometry(path,32,tube,10,false),material,id);
 }
 function surface(id,geometry,componentId,position=[0,0,0],basis=SOLVED){
  const item=mesh(id,geometry,'hidden',componentId,position,group);item.visible=false;
  item.userData={...item.userData,surfaceId:id,surfaceRole:id,geometryBasis:basis,quantitativeOnly:true};surfaces.set(id,item);return item;
 }
 function diskGeometry(r,normalZ=1){const g=new THREE.CircleGeometry(r,72);if(normalZ<0)g.rotateY(Math.PI);return g;}
 function flange(z,r,wall){
  ring('Vacuum flange',z,r,r+wall*3,wall*1.6,'steel',beam?'beamline':'fittings');
  ring('Flange seal land',z+wall*.86,r+wall*.16,r+wall*.7,wall*.16,'dark',beam?'beamline':'seals');
  for(let i=0;i<16;i++){
   const a=TAU*i/16,rr=r+wall*1.9;
   const bolt=cylinder('Captive flange bolt',wall*.22,wall*2.4,'steel',beam?'beamline':'fittings',[rr*Math.cos(a),rr*Math.sin(a),z]);
   bolt.userData.fastener=true;
  }
 }
 function coil(z,r,wall){
  ring('Solenoid former',z,r+wall*2,r+wall*3.2,wall*5,'ceramic','coils');
  for(let i=0;i<7;i++)ring('Copper solenoid turn',z+(i-3)*wall*.65,r+wall*3.2,r+wall*4.6,wall*.48,'copper','coils');
  pipe('Coil terminal',[[r+wall*4.1,0,z],[r+wall*5.1,0,z],[r+wall*5.1,-wall*3,z]],wall*.22,'copper','coils');
 }
 function feet(r,L,wall){
  box('Support bed',[r*3.3,wall*2,L+wall*12],'dark','support',[0,-r-wall*8,L/2]);
  for(const z of [L*.18,L*.82])for(const x of [-r*.65,r*.65]){
   box('Support leg',[wall*3,wall*6,wall*5],'steel','support',[x,-r-wall*5,z]);
   box('Isolation pad',[wall*5,wall,wall*7],'ceramic','support',[x,-r-wall*7.5,z]);
  }
 }
 function port(z,r,wall){
  const p=ring('Diagnostic port',0,wall*1.2,wall*2.2,wall*6,'steel','fittings');p.rotation.x=Math.PI/2;p.position.set(0,-r-wall*2,z);
  const cap=cylinder('Diagnostic viewport',wall*1.1,wall*.7,'ceramic','fittings',[0,-r-wall*5.1,z]);cap.rotation.x=Math.PI/2;
 }
 const domain={coordinateSystem:'SI solver xyz; axial z',mode,radiusM:radius,lengthM:length,constructionBasis:ASSUMED};
 if(beam){
  const film=options.filmThicknessM,backing=options.backingThicknessM,r=radius,w=Math.max(r*.12,.001);
  Object.assign(domain,{kind:'planar-target',beamAreaM2:options.beamAreaM2,filmThicknessM:film,backingThicknessM:backing,targetFrontZ:0,beamDirection:[0,0,1],layerScale:1});
  const vesselR=Math.max(r*2.5,.025),constructionLength=Math.max(length,6*vesselR),tubeStart=-constructionLength*.85,tubeEnd=film+backing;
  Object.assign(domain,{constructionLengthM:constructionLength,constructionLengthBasis:'Illustrative beamline length expands with the prescribed beam area; no flight or optics solution.'});
  ring('Evacuated beam tube',(tubeStart+tubeEnd)/2,vesselR,vesselR+w,tubeEnd-tubeStart,'steel','beamline',true);
  flange(tubeStart,vesselR,w);flange(tubeEnd,vesselR,w);
  const sourceZ=tubeStart-vesselR*.9;
  ring('RF discharge envelope',sourceZ,vesselR*.73,vesselR*.84,vesselR*1.8,'ceramic','rf-source',true);
  for(let i=0;i<6;i++)ring('RF induction winding',sourceZ+(i-2.5)*vesselR*.22,vesselR*.87,vesselR*1.02,vesselR*.13,'copper','rf-source');
  ring('Source vacuum adaptor',tubeStart-w*.5,vesselR*.73,vesselR+w,w,'steel','beamline');
  for(let i=0;i<3;i++){
   const z=tubeStart+vesselR*(.4+i*.65);
   ring('Extraction electrode',z,vesselR*.21,vesselR*.68,w*.8,'copper','accelerator');
   ring('High-voltage ceramic spacer',z+w,vesselR*.7,vesselR*.88,w*1.2,'ceramic','accelerator');
  }
  // Remove only the display's +y half to expose the true-depth section at y=0.
  // The numerical illuminated area remains the complete circular disk.
  const target=mesh('LiT film',annulus(0,r,film,Math.PI,Math.PI),'film','target',[0,0,film/2]);target.userData.geometryBasis='Accepted film thickness and full circular uniform-area convention; SI true scale, half removed for inspection.';
  const backingMesh=mesh('Target backing',annulus(0,r*1.2,backing,Math.PI,Math.PI),'steel','substrate',[0,0,film+backing/2]);backingMesh.userData.geometryBasis='Accepted backing thickness; lateral support extent illustrative, half removed for inspection.';
  target.userData.cutaway=true;backingMesh.userData.cutaway=true;
  const jacketDepth=Math.max(w*3,backing),jacketZ=film+backing+jacketDepth/2;
  ring('Cooling manifold',jacketZ,r*.2,r*1.3,jacketDepth,'dark','substrate',true);
  for(const sign of [-1,1])pipe('Coolant connection',[[sign*r*.8,0,film+backing+jacketDepth],[sign*r*1.8,0,film+backing+jacketDepth],[sign*r*1.8,-r*2,film+backing+jacketDepth]],w*.4,'steel','substrate');
  ring('Target retaining ring',film+backing/2,r*1.21,r*1.45,backing+w,'steel','support',true);
  ring('Target vacuum end plate',film+backing+w/2,r*1.2,vesselR+w,w,'steel','beamline');
  box('Beamline support bed',[vesselR*2.8,w*3,constructionLength*1.2],'dark','support',[0,-vesselR*1.6,-constructionLength*.45]);
  for(const z of [-constructionLength*.75,-constructionLength*.2])box('Beamline saddle',[vesselR*1.4,vesselR*.5,w*4],'steel','support',[0,-vesselR*1.25,z]);
  surface('target-film',diskGeometry(r,-1),'target');surface('beam-footprint',diskGeometry(r,-1),'beam');
  surface('target-backing',diskGeometry(r),'substrate',[0,0,film+backing]);
  surface('target-interface',diskGeometry(r),'substrate',[0,0,film]);
  // Side faces retain exact physical depth and allow finite-volume temperature painting.
  for(const [id,start,depth,componentId]of [['target-film-depth',0,film,'target'],['target-backing-depth',film,backing,'substrate']]){
   const g=new THREE.PlaneGeometry(r*2,depth,1,Math.max(1,options.depthSegments??16));g.rotateX(Math.PI/2);
   surface(id,g,componentId,[0,0,start+depth/2]);
  }
 }else if(mode==='curved'){
  const R=positive(options.curvatureRadiusM,'curvatureRadiusM'),angle=length/R;
  if(radius>=R||angle>TAU)throw new RangeError('Curved guide requires radius < curvatureRadius and arc length ≤ one circumference.');
  Object.assign(domain,{kind:'curved-reference',curvatureRadiusM:R,bendAngleRad:angle,absorbingBoundaries:false,constructionBasis:'Channel aperture is illustrative; reduced solver predicts arc-length deflection only.'});
  class Arc extends THREE.Curve{getPoint(t,target=new THREE.Vector3()){const a=t*angle;return target.set(R*(1-Math.cos(a)),0,R*Math.sin(a));}}
  const arc=new Arc(),tube=new THREE.TubeGeometry(arc,96,radius,24,false);
  // Guide cage is deliberately open; no fictitious wall/acceptance surface is registered.
  const cage=mesh('Curved guide cage',tube,'steel','vessel');cage.material=materials.steel.clone();cage.material.wireframe=true;
  for(let i=0;i<=8;i++){
   const t=i/8,a=t*angle,p=arc.getPoint(t),c=ring('Curved-guide winding',0,radius*1.08,radius*1.21,radius*.12,'copper','coils');c.rotation.y=a;c.position.copy(p);
  }
  const start=ring('Inlet slit frame',0,radius*.6,radius*1.08,radius*.1,'steel','source');start.position.copy(arc.getPoint(0));
  const end=ring('Diagnostic exit plane',0,radius*.6,radius*1.08,radius*.1,'steel','collectors');end.rotation.y=angle;end.position.copy(arc.getPoint(1));
 }else if(blanket){
  Object.assign(domain,{kind:'blanket-reference',absorbingBoundaries:false,constructionBasis:'Published layer ordering and thickness where specified; major radius and unlisted thickness illustrative.'});
  const layers=[['Tungsten armor',.005,'steel','armor'],['Inner V–4Cr–4Ti',.010,'dark','structure'],['Hg/Li channel',.210,'fluid','multiplier'],['Outer V–4Cr–4Ti',.030,'dark','structure'],['FLiBe blanket',.35,'film','breeder'],['Eurofer97 tank',.030,'steel','tank']];
  let inner=radius;
  for(const [name,thickness,mat,id]of layers){const item=ring(name,length/2,inner,inner+thickness,length,mat,id,true);item.userData.materialBasis=`${name}; alchemy paper representative materials, not compact beam-target hardware.`;item.userData.geometryBasis=name==='FLiBe blanket'?'Illustrative thickness, not a sourced dimension.':'Alchemy paper §4.1 representative layer thickness; cylindrical cutaway is illustrative.';inner+=thickness;}
 }else{
  const w=Math.min(radius*.055,length*.015),hasBoundary=['rotating','icr','doublewell-dynamics'].includes(mode);
  const absorbing=hasBoundary&&(mode!=='doublewell-dynamics'||options.boundary==='open');
  Object.assign(domain,{kind:mode==='gyro'?'gyro-reference':'cylinder',absorbingBoundaries:absorbing,boundary:hasBoundary?(absorbing?'absorbing':'specular radial; periodic axial'):'not solved'});
  ring('Vessel pressure wall',length/2,radius,radius+w,length,'steel','vessel',true);
  flange(0,radius,w);flange(length,radius,w);
  for(const z of [.18,.4,.6,.82].map(t=>t*length))coil(z,radius,w);
  feet(radius,length,w);port(length*.68,radius,w);
  const opening=options.sourceRadiusM??radius*.12,sourceOuter=Math.max(radius*.32,opening+w*2);
  Object.assign(domain,{sourceRadiusM:options.sourceRadiusM??null,sourceGeometryBasis:options.sourceRadiusM===undefined?ASSUMED:'Accepted initial source support; body construction illustrative.'});
  const body=ring('Source body',-radius*.38,opening,sourceOuter,radius*.62,'steel','source',true);
  body.userData.sourceOpeningRadiusM=opening;
  ring('Source ceramic break',-w*2,opening,sourceOuter,w*2,'ceramic','insulators');
  if(mode==='icr'){
   for(const sign of [-1,1]){
    box('RF resonant drive electrode',[w*1.2,radius*.8,length*.48],'copper','electrodes',[sign*radius*.82,0,length*.5]);
    pipe('RF electrode feed',[[sign*radius*.82,0,length*.5],[sign*radius*1.25,0,length*.5],[sign*radius*1.25,-radius*.5,length*.5]],w*.45,'copper','electrodes');
   }
   ring('Illustrative downstream collector',length+w*3,radius*.12,radius*.84,w,'dark','collectors');
  }else if(['rotating','doublewell','doublewell-dynamics'].includes(mode)){
   for(const end of [0,length])for(let i=0;i<5;i++){
    const spacing=(radius-opening)/5,ri=opening+i*spacing;
    ring('Concentric bias electrode',end+(end===0?-1:1)*w,ri,ri+spacing*.68,w*.7,'copper','electrodes');
    ring('Bias electrode insulator',end+(end===0?-1:1)*w*1.6,ri,ri+spacing*.62,w*.4,'ceramic','insulators');
   }
  }else if(mode==='centrifuge'){
   cylinder('Arc cathode',radius*.045,radius*.28,'dark','source',[0,0,-radius*.14]);
   ring('Source discharge anode',0,radius*.09,radius*.18,w,'copper','source');
  }
  if(hasBoundary){
   const wall=new THREE.CylinderGeometry(radius,radius,length,96,24,true);wall.rotateX(Math.PI/2);
   surface('wall',wall,'collectors',[0,0,length/2]);surface('source',diskGeometry(radius,-1),'source');surface('end',diskGeometry(radius),'collectors',[0,0,length]);
  }
 }
 group.updateMatrixWorld(true);
 return {group,surfaces,domain,dispose(){const gs=new Set(),ms=new Set();group.traverse(node=>{if(node.geometry)gs.add(node.geometry);if(node.material)for(const m of Array.isArray(node.material)?node.material:[node.material])ms.add(m);});for(const g of gs)g.dispose();const textures=new Set();for(const m of new Set([...ms,...Object.values(materials)])){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}for(const texture of textures)texture.dispose();group.removeFromParent();}};
}
