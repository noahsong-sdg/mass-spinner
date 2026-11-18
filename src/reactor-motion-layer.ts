import * as THREE from 'three';
import {ionSpeedMS,kineticSpeedMS,motionPopulation,neutronDirection,type ReactorMotionState} from './reactor-motion.js';
import {E_CHARGE} from './physics.js';

const COLOURS={beam:0x94c9e7,neutrons:0xd9dea6,heat:0xe69a59,reactions:0xf9dfb1};
type LayerKey=keyof typeof COLOURS;
const fmt=(n:number)=>n===0?'0':n>=1e5||Math.abs(n)<.001?n.toExponential(2):Number(n.toPrecision(3)).toString();
function boundsFor(root:THREE.Object3D,id:string){
 const bounds=new THREE.Box3();
 root.traverse(node=>{if(!(node instanceof THREE.Mesh)||node.userData.quantitativeOnly)return;
  for(let p:THREE.Object3D|null=node;p;p=p.parent){if(p.userData.componentId===id){bounds.expandByObject(node);break;}}
 });return bounds;
}
function batch(colour:number,size:number,segments=false){
 const geometry=new THREE.BufferGeometry(),position=new THREE.BufferAttribute(new Float32Array(384*3),3);geometry.setAttribute('position',position);
 const material=segments?new THREE.LineBasicMaterial({color:colour,transparent:true,opacity:.65,depthWrite:false}):
  new THREE.PointsMaterial({color:colour,size,sizeAttenuation:false,transparent:true,opacity:.95,depthWrite:false});
 const object=segments?new THREE.LineSegments(geometry,material as THREE.LineBasicMaterial):new THREE.Points(geometry,material as THREE.PointsMaterial);
 object.frustumCulled=false;object.userData={nonPickable:true,quantitativeOnly:true};
 return {object,geometry,material,position,finish(count:number){geometry.setDrawRange(0,count);position.needsUpdate=true;}};
}

/** Weighted process glyphs over real hardware; no particle flight or heat solver runs here. */
export function createReactorMotionLayer(frame:HTMLElement,changed:()=>void){
 const doc=frame.ownerDocument,group=new THREE.Group();group.name='Live reactor processes';group.userData.nonPickable=true;
 const beam=batch(COLOURS.beam,4),neutrons=batch(COLOURS.neutrons,4),tracks=batch(COLOURS.neutrons,1,true),heat=batch(COLOURS.heat,1,true),reactions=batch(COLOURS.reactions,8);
 group.add(beam.object,neutrons.object,tracks.object,heat.object,reactions.object);
 const panel=doc.createElement('details'),summary=doc.createElement('summary'),body=doc.createElement('div'),pause=doc.createElement('button'),metrics=doc.createElement('p'),scope=doc.createElement('p');
 panel.className='reactor-processes';panel.hidden=true;summary.textContent='Inside reactor';pause.type='button';pause.textContent='Pause motion';pause.setAttribute('aria-pressed','false');
 panel.append(summary,body);body.append(pause);frame.append(panel);
 const enabled={beam:true,neutrons:true,heat:true,reactions:true};
 for(const key of Object.keys(COLOURS) as LayerKey[]){
  const label=doc.createElement('label'),input=doc.createElement('input');input.type='checkbox';input.checked=true;
  input.setAttribute('aria-label',`Show ${key}`);label.style.color=`#${COLOURS[key].toString(16)}`;
  label.append(input,doc.createTextNode(key==='reactions'?'Fusion':key[0].toUpperCase()+key.slice(1)));body.append(label);
  input.addEventListener('change',()=>{enabled[key]=input.checked;draw();changed();});
 }
 body.append(metrics,scope);
 let state:ReactorMotionState|null=null,root:THREE.Object3D|null=null,pending=false,paused=false,phase=0;
 let target=new THREE.Vector3(),start=0,end=0,radius=.1,span=1,si=false;
 const reduced=doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
 pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume motion':'Pause motion';pause.setAttribute('aria-pressed',String(paused));changed();});
 const motionPreference=()=>changed();reduced?.addEventListener?.('change',motionPreference);
 function draw(updateText=true){
  const current=state;
  panel.hidden=!current||!root;group.visible=!panel.hidden&&!pending;
  for(const b of [beam,neutrons,tracks,heat,reactions])b.finish(0);
  if(!current||!root)return;
  panel.dataset.pending=String(pending);
  if(pending){summary.textContent='Inside · updating…';metrics.textContent='Waiting for current target inputs.';return;}
  const power=current.kind==='power-reference';
  const ions=power?0:motionPopulation(current.particleRateS,6.24e16,96),count=power?48:motionPopulation(current.neutronRateS,1e11,64);
  const speed=power?1:ionSpeedMS(current)/ionSpeedMS({...current,energyKeV:100});
  const neutronSpeed=power?1:current.neutronEnergyMeV===null?0:kineticSpeedMS(current.neutronEnergyMeV*1e6*E_CHARGE,1)/5.2e7;
  if(updateText){
   summary.textContent=power?'Inside · reference':'Inside · beam / neutrons / heat';pause.disabled=!!reduced?.matches;
   panel.dataset.basis=power?'power-reference':current.basis;panel.dataset.beamCount=String(ions);panel.dataset.neutronCount=String(count);
   panel.dataset.energyKeV=power?'':String(current.energyKeV);panel.dataset.heatW=power?'':String(current.depositedPowerW);
  }
  for(let i=0;i<ions;i++){
   const t=(i/ions+phase*speed*.65)%1,a=i*2.399963,rad=radius*Math.sqrt((i+.5)/ions);
   beam.position.setXYZ(i,start+(end-start)*t,target.y+rad*Math.cos(a),target.z+rad*Math.sin(a));
  }beam.finish(enabled.beam?ions:0);
  for(let i=0;i<count;i++){
   const t=(i/count+phase*neutronSpeed*.8)%1,d=neutronDirection(i,count);
   const a=i*2.399963,rr=power?0:radius*Math.sqrt((i+.5)/count);
   const bx=power?4.2*Math.cos(a):target.x,by=power?0:target.y+rr*Math.cos(a),bz=power?4.2*Math.sin(a):target.z+rr*Math.sin(a);
   const reach=power?2.4:span*.55;
   neutrons.position.setXYZ(i,bx+d[0]*reach*t,by+d[1]*reach*t,bz+d[2]*reach*t);
   for(let j=0;j<2;j++){const q=Math.max(0,t-(j===0?.075:0));tracks.position.setXYZ(2*i+j,bx+d[0]*reach*q,by+d[1]*reach*q,bz+d[2]*reach*q);}
   if(i<12)reactions.position.setXYZ(i,bx,by,bz);
  }
  neutrons.finish(enabled.neutrons?count:0);tracks.finish(enabled.neutrons?count*2:0);
  // Explicitly amplified reaction flashes; their number is not a reaction probability.
  reactions.material.opacity=.2+.65*(.5+.5*Math.sin(phase*4));reactions.finish(enabled.reactions?Math.min(12,count):0);
  let heatCount=0;
  const faces=power?[1]:current.heatFacesWM2.length?current.heatFacesWM2.slice(1):[current.depositedPowerW/current.areaM2];
  // Bound GPU storage independently of the target's refinement resolution.
  const fluxes=faces.length<=48?faces:Array.from({length:48},(_,i)=>faces[Math.round(i*(faces.length-1)/47)]);
  const maximum=Math.max(...fluxes.map(Math.abs),0);
  for(let i=0;i<fluxes.length;i++){
   const flux=fluxes[i];if(flux===0)continue;
   const t=(i+(phase*.55*Math.sign(flux)+1e6)%1)/fluxes.length;
   const x=power?4.2:target.x,y=power?0:target.y,z=power?0:target.z;
   const length=power?1.6:radius*2,offset=power?0:radius*.6,tip=x+length*t,wing=length*Math.min(.07,.4/fluxes.length);
   // Chevrons are heat-transfer direction indicators, never coolant particle paths.
   for(const sign of [-1,1]){
    heat.position.setXYZ(heatCount++,tip-Math.sign(flux)*wing,y+offset,z+sign*wing);
    heat.position.setXYZ(heatCount++,tip,y+offset,z);
   }
  }
  heat.finish(enabled.heat?heatCount:0);panel.dataset.heatDirection=maximum===0?'none':fluxes.at(-1)!<0?'toward target':'toward coolant';
  heat.material.opacity=power?.8:maximum===0?0:.3+.6*maximum/(maximum+1e4);
  if(!updateText)return;
  metrics.textContent=power?'Normalized D–T source → blanket · heat direction only. No beam source is attached.':
   `${current.basis}${current.timeS===null?'':` · ${fmt(current.timeS)} s`} · D⁺ ${fmt(ionSpeedMS(current))} m/s · ${fmt(current.neutronRateS)} n/s · ${fmt(current.depositedPowerW)} W deposited`;
  scope.textContent=power?'Reference animation, not calculated plasma motion, neutron transport or heat flow. Does not change published TBR/yields.':
   `Weighted markers; fusion flashes amplified. Ions and neutrons slowed separately. Straight neutron rays assume isotropic emission, no scattering or attenuation. ${current.heatFacesWM2.length?'Heat arrows use selected 1D face fluxes; reverse when the gradient reverses.':'Heat arrows show deposition → stopping substrate; no temperature or coolant flow is predicted.'} ${si?'SI hardware.':'Illustrative Blender envelope; footprint responds to area.'}`;
 }
 return {group,get running(){return !!state&&!!root&&!pending&&!paused&&!reduced?.matches;},
  update(value:ReactorMotionState|null,current:THREE.Object3D|null,waiting=false){
   state=value;root=current;pending=waiting;
   if(state?.kind==='beam'&&root){
    root.updateWorldMatrix(true,true);const b=boundsFor(root,'target'),accelerator=boundsFor(root,'accelerator');
    if(b.isEmpty()||accelerator.isEmpty()){root=null;draw();return;}
    target=b.getCenter(target);end=b.min.x;target.x=end;start=accelerator.max.x;span=Math.max(end-start,.001);
    si=root.name==='SI engineering assembly';radius=si?Math.sqrt(state.areaM2/Math.PI):.1*Math.sqrt(state.areaM2/.01);
   }
   draw();
  },tick(dt:number){if(!paused&&!reduced?.matches)phase+=Math.min(dt,.05);draw(false);},
  dispose(){reduced?.removeEventListener?.('change',motionPreference);for(const b of [beam,neutrons,tracks,heat,reactions]){b.geometry.dispose();b.material.dispose();}group.removeFromParent();panel.remove();}
 };
}
