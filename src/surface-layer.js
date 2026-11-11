import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildEngineeringGeometry} from './engineering-geometry.js';
import {sampleSurfaceField} from './surface-state.ts';

const colours=[0xa4c4b1,0xd2956b];
const number=value=>Number(value.toPrecision(5)).toString();
const surfaceEdges=field=>field.boundsM??[field.positionsM[0],...field.positionsM.slice(1).map((v,i)=>(v+field.positionsM[i])/2),field.positionsM.at(-1)];
export function surfaceColour(value,domain){
 const fraction=domain[1]===domain[0]?.5:(value-domain[0])/(domain[1]-domain[0]);
 return new THREE.Color('#264e68').lerp(new THREE.Color('#f1b16e'),Math.max(0,Math.min(1,fraction)));
}
export function releaseSurfaceGroup(group){
 const geometry=new Set(),materials=new Set();
 group.traverse(node=>{if(node.geometry)geometry.add(node.geometry);if(node.material)for(const m of Array.isArray(node.material)?node.material:[node.material])materials.add(m);});
 geometry.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());group.clear();group.removeFromParent();
}
/** Exact raw values: rings are nearest-sample Voronoi supports, not interpolated solutions. */
export function buildSurfaceOverlay(snapshot,fieldId,view='state',{sectionZM=(snapshot.domain.lengthM??0)/2}={}){
 const group=new THREE.Group();group.name='Accepted numerical surfaces';
 const field=snapshot.fields.find(value=>value.id===fieldId);
 if(view==='state'&&field){
  const radius=snapshot.domain.radiusM??Math.sqrt(snapshot.domain.beamAreaM2/Math.PI);
  const depth=field.coordinate==='depth';
  const edges=surfaceEdges(field);
  const pieces=field.values.map((value,index)=>{
   let geometry,position;
   if(depth){
    // True-depth physical section through the illuminated target; no hidden magnification.
    const width=edges[index+1]-edges[index];geometry=new THREE.PlaneGeometry(2*radius,width);geometry.rotateX(Math.PI/2);
    position=[0,0,(edges[index+1]+edges[index])/2];
   }else{
    geometry=new THREE.RingGeometry(Math.max(0,edges[index]),edges[index+1],96);
    position=[0,0,sectionZM];
   }
   geometry.translate(...position);const vertices=geometry.getAttribute('position').count,colour=surfaceColour(value,field.domain);
   geometry.setAttribute('color',new THREE.Float32BufferAttribute(Array.from({length:vertices},()=>colour.toArray()).flat(),3));
   geometry.setAttribute('sampleIndex',new THREE.Float32BufferAttribute(new Array(vertices).fill(index),1));return geometry;
  });
  const combined=mergeGeometries(pieces);pieces.forEach(piece=>piece.dispose());
  const mesh=new THREE.Mesh(combined,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
  mesh.userData={fieldId:field.id,componentId:depth?field.region==='film'?'target':'substrate':undefined};group.add(mesh);
 }
 if(view==='tracks')for(const track of snapshot.tracks){
  const geometry=new THREE.BufferGeometry().setFromPoints(track.positionsM.map(p=>new THREE.Vector3(...p)));
  const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:colours[track.speciesIndex%colours.length],transparent:true,opacity:.82}));
  line.userData={trackScope:track.scope,speciesIndex:track.speciesIndex};group.add(line);
 }
 if(view==='impacts'){
  const events=snapshot.impacts.map((event,index)=>({event,index})).filter(({event})=>event.positionM);
  if(events.length){
   const geometry=new THREE.BufferGeometry().setFromPoints(events.map(({event})=>new THREE.Vector3(...event.positionM)));
   geometry.setAttribute('color',new THREE.Float32BufferAttribute(events.flatMap(({event})=>new THREE.Color(colours[event.speciesIndex%colours.length]).toArray()),3));
   const point=new THREE.Points(geometry,new THREE.PointsMaterial({vertexColors:true,size:5,sizeAttenuation:false,depthTest:false}));
   point.renderOrder=1;point.userData={impactIndices:events.map(({index})=>index)};group.add(point);
  }
 }
 return group;
}

/** Owns SI hardware and result layers. The common rigid transform rotates both together. */
export function createSurfaceLayer(frame,{render=()=>{},onSelect=()=>{}}={}){
 const doc=frame.ownerDocument,group=new THREE.Group();group.name='SI engineering assembly';
 group.rotation.y=Math.PI/2;
 const panel=doc.createElement('details'),summary=doc.createElement('summary'),body=doc.createElement('div');
 const view=doc.createElement('select'),fields=doc.createElement('select'),samples=doc.createElement('select');
 const legend=doc.createElement('p'),readout=doc.createElement('p'),scope=doc.createElement('p'),ledger=doc.createElement('p');
 const limits=doc.createElement('details'),limitsTitle=doc.createElement('summary'),limitsText=doc.createElement('p');
 panel.className='apparatus-state';panel.hidden=true;summary.textContent='Surfaces';panel.append(summary,body);
 view.setAttribute('aria-label','3D result layer');fields.setAttribute('aria-label','Surface quantity');samples.setAttribute('aria-label','Inspect an exact surface sample');
 for(const [id,label]of [['state','Fields'],['tracks','Trajectories'],['impacts','Impacts'],['hardware','Hardware']]){
  const option=doc.createElement('option');option.value=id;option.textContent=label;view.append(option);
 }
 view.value='state';limitsTitle.textContent='Model info';limits.append(limitsTitle,limitsText);
 body.append(view,fields,samples,legend,readout,scope,ledger,limits);frame.append(panel);
 let snapshot=null,engineering=null,overlay=null,geometryKey='',selected=0,expanded=null,selection=null;
 function clearSelection(){if(selection)releaseSurfaceGroup(selection);selection=null;}
 function clearOverlay(){clearSelection();if(overlay)releaseSurfaceGroup(overlay);overlay=null;if(expanded)releaseSurfaceGroup(expanded);expanded=null;}
 function clear(){clearOverlay();engineering?.dispose();engineering=null;snapshot=null;geometryKey='';group.clear();panel.hidden=true;
  view.hidden=fields.hidden=samples.hidden=true;fields.replaceChildren();samples.replaceChildren();
  for(const node of [legend,readout,scope,ledger,limitsText])node.textContent='';
 }
 function inspect(index,open=true){
  const field=snapshot?.fields.find(f=>f.id===fields.value);if(!field||index<0||index>=field.values.length)return;
  selected=index;samples.value=String(index);const sample=sampleSurfaceField(field,field.positionsM[index]);
  readout.textContent=`${number(sample.positionM)} m · ${number(sample.value)} ${sample.unit}`;
  if(sample.boundsM)readout.textContent+=` · [${sample.boundsM.map(number).join(', ')}] m`;
  clearSelection();const edges=surfaceEdges(field),points=[];
  const segment=(a,b)=>points.push(...a,...b);
  const loop=vertices=>vertices.forEach((a,i)=>segment(a,vertices[(i+1)%vertices.length]));
  if(field.coordinate==='depth'){
   const r=Math.sqrt(snapshot.domain.beamAreaM2/Math.PI);
   loop([[-r,0,edges[index]],[r,0,edges[index]],[r,0,edges[index+1]],[-r,0,edges[index+1]]]);
   const strip=expanded?.children[index];
   if(strip){
    strip.geometry.computeBoundingBox();const box=strip.geometry.boundingBox.clone().translate(strip.position),corners=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push([x,y,z]);
    for(let i=0;i<8;i++)for(const bit of [1,2,4])if(!(i&bit))segment(corners[i],corners[i|bit]);
   }
  }else for(const radius of [edges[index],edges[index+1]])if(radius>0){
   loop(Array.from({length:96},(_,i)=>[radius*Math.cos(i*Math.PI/48),radius*Math.sin(i*Math.PI/48),engineering.domain.lengthM/2]));
  }
  selection=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3)),
   new THREE.LineBasicMaterial({color:0xf4e7d0,transparent:true,opacity:.95,depthTest:false,depthWrite:false}));
  selection.name='Selected surface sample';selection.renderOrder=2;group.add(selection);
  if(open)panel.open=true;render();
 }
 function draw(){
  clearOverlay();if(!snapshot||!engineering)return;
  const field=snapshot.fields.find(f=>f.id===fields.value),show=view.value;
  fields.hidden=samples.hidden=show!=='state'||!field;
  overlay=buildSurfaceOverlay(snapshot,fields.value,show,{sectionZM:engineering.domain.lengthM/2});group.add(overlay);
  legend.textContent='';scope.textContent='';readout.textContent='';
  if(show==='state'&&field){
   legend.textContent=`${number(field.domain[0])} – ${number(field.domain[1])} ${field.unit}`;scope.textContent=field.scope;
   if(field.coordinate==='radius'&&['centrifuge','doublewell'].includes(snapshot.model))scope.textContent+=' Radial section; axial placement is illustrative, no axial variation is solved.';
   samples.replaceChildren();field.positionsM.forEach((position,index)=>{const option=doc.createElement('option');option.value=String(index);option.textContent=`${number(position)} m`;samples.append(option);});
   selected=Math.min(selected,field.values.length-1);
   // Separate film/backing microscope strips: each region expands depth independently.
   // The actual hardware and physical section above stay at true SI scale.
   if(field.coordinate==='depth'){
    const r=Math.sqrt(snapshot.domain.beamAreaM2/Math.PI),lo=field.boundsM[0],hi=field.boundsM.at(-1),width=r*2;
    const inspectionY=new THREE.Box3().setFromObject(engineering.group).max.y+r*.5;
    expanded=new THREE.Group();expanded.name=`Depth microscope: ${field.region}`;
    field.values.forEach((value,index)=>{
     const a=(field.boundsM[index]-lo)/(hi-lo),b=(field.boundsM[index+1]-lo)/(hi-lo);
     const mesh=new THREE.Mesh(new THREE.BoxGeometry(width*(b-a)*.98,r*.25,r*.05),new THREE.MeshBasicMaterial({color:surfaceColour(value,field.domain)}));
     mesh.position.set(width*((a+b)/2-.5),inspectionY,0);mesh.userData={fieldId:field.id,sampleIndex:index,componentId:field.region==='film'?'target':'substrate',expandedDepth:true};expanded.add(mesh);
    });group.add(expanded);
    scope.textContent+=` Depth microscope ×${number(width/(hi-lo))}; ${field.region} only. Hardware is true scale.`;
   }
   inspect(selected,false);
  }else if(show==='tracks')scope.textContent=snapshot.tracks.length?snapshot.tracks.map(t=>t.scope).filter((v,i,a)=>a.indexOf(v)===i).join(' '):'This solver does not export physical 3D trajectories.';
  else if(show==='impacts'){
   scope.textContent=snapshot.impacts.some(e=>e.positionM)?'Exact exported boundary hits; one dot per representative. Colour identifies species. No area/time flux is inferred.':'No positioned impacts are exported by this model. Radius-only events remain aggregates in the ledger.';
  }
  render();
 }
 fields.addEventListener('change',()=>{selected=0;draw();});view.addEventListener('change',draw);samples.addEventListener('change',()=>inspect(Number(samples.value)));
 return {group,panel,clear,get representation(){return {layer:view.value,numerical:Boolean(overlay?.children.length&&view.value!=='hardware')};},update(packet,settings){
  if(packet?.status!=='ready'){clear();if(packet){panel.hidden=false;summary.textContent=packet.status==='pending'?'Updating…':'No surface state';scope.textContent=packet.reason;}render();return false;}
  snapshot=packet.snapshot;const d=snapshot.domain;
  const options={mode:snapshot.model==='marathon'||snapshot.model==='coupled-target'?'beam-target':snapshot.model,...d,
   radiusM:d.radiusM??settings.radius,lengthM:d.lengthM??(d.kind==='target'?.45:2.8),curvatureRadiusM:settings.curvatureRadius,boundary:settings.boundary,sourceRadiusM:settings.initialState==='equilibrium'?undefined:settings.sourceRadius};
  const nextKey=JSON.stringify(options),changed=!engineering||nextKey!==geometryKey;
  if(changed){clearOverlay();engineering?.dispose();engineering=null;
   try{engineering=buildEngineeringGeometry(options);group.add(engineering.group);geometryKey=nextKey;}
   catch(error){clear();panel.hidden=false;summary.textContent='Geometry outside display domain';scope.textContent=error.message;return false;}
  }
  panel.hidden=false;view.hidden=false;summary.textContent=`Surfaces${snapshot.timeS===null?'':` · ${number(snapshot.timeS)} s`}`;
  const previous=fields.value;fields.replaceChildren();
  for(const field of snapshot.fields){const option=doc.createElement('option');option.value=field.id;option.textContent=field.label;fields.append(option);}
  fields.value=snapshot.fields.some(f=>f.id===previous)?previous:snapshot.fields[0]?.id??'';
  if(!snapshot.fields.length&&view.value==='state')view.value=snapshot.tracks.length?'tracks':'hardware';
  ledger.textContent=[...snapshot.counts.map(c=>`Species ${c.speciesIndex+1}: wall ${c.wall}/${c.injected}, end ${c.end}/${c.injected}, source ${c.source}/${c.injected}, remaining ${c.remaining}/${c.injected}`),
   ...snapshot.scalars.map(s=>`${s.label??s.id.replaceAll('-',' ')} ${number(s.value)} ${s.unit} (whole assembly)`)].join(' · ');
  limitsText.textContent=[...snapshot.unsupported,d.lengthM===undefined&&d.kind==='cylinder'?'Axial construction length 2.8 m is illustrative; this solver resolves radius only.':'','Windings, electrodes, ports and cooling fittings are illustrative construction; field realization, stress and coil current are not solved.'].filter(Boolean).join(' ');
  draw();return changed;
 },pick(hit){
  const sample=hit?.object.userData.sampleIndex??(hit?.face&&hit.object.geometry.getAttribute('sampleIndex')?.getX(hit.face.a));
  if(Number.isInteger(sample)){inspect(sample);const id=hit.object.userData.componentId;if(id)onSelect(id);return true;}
  const eventIndex=hit?.object.userData.impactIndices?.[hit.index];
  if(Number.isInteger(eventIndex)){
   const e=snapshot.impacts[eventIndex];panel.open=true;
   readout.textContent=`Species ${e.speciesIndex+1} · ${e.destination} · ${number(e.timeS)} s · ${number(e.kineticEV)} eV · ${e.positionM.map(number).join(', ')} m`;render();return true;
  }return false;
 },dispose(){clear();group.removeFromParent();panel.parentNode?.removeChild(panel);}};
}
