import * as THREE from 'three';
import {ionSpeedMS,kineticSpeedMS,motionPopulation,neutronSample,type ReactorMotionState} from './reactor-motion.js';
import {E_CHARGE} from './physics.js';
import {createReactorHeatInset} from './reactor-heat-inset.js';

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
 const enabled={beam:true,neutrons:true,heat:true,reactions:true},labels=new Map<LayerKey,HTMLLabelElement>();
 for(const key of Object.keys(COLOURS) as LayerKey[]){
  const label=doc.createElement('label'),input=doc.createElement('input');input.type='checkbox';input.checked=true;
  input.setAttribute('aria-label',`Show ${key}`);label.style.color=`#${COLOURS[key].toString(16)}`;
  label.append(input,doc.createTextNode(key==='reactions'?'Fusion sites':key[0].toUpperCase()+key.slice(1)));body.append(label);labels.set(key,label);
  input.addEventListener('change',()=>{enabled[key]=input.checked;draw();changed();});
 }
 body.append(metrics);const heatInset=createReactorHeatInset(body);body.append(scope);
 let state:ReactorMotionState|null=null,root:THREE.Object3D|null=null,pending=false,paused=false,phase=0,beamTravel=0,neutronTravel=0;
 let target=new THREE.Vector3(),start=0,end=0,radius=.1,span=1,si=false;
 const reduced=doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
 pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume motion':'Pause motion';pause.setAttribute('aria-pressed',String(paused));changed();});
 const motionPreference=()=>changed();reduced?.addEventListener?.('change',motionPreference);
 panel.addEventListener('toggle',changed);
 function draw(updateText=true){
  const current=state;
  panel.hidden=!current||!root;group.visible=!panel.hidden&&!pending;
  for(const b of [beam,neutrons,tracks,heat,reactions])b.finish(0);
  if(!current||!root)return;
  panel.dataset.pending=String(pending);
  heatInset.element.hidden=pending||!enabled.heat;
  if(pending){summary.textContent='Inside · calculation in progress';metrics.textContent='The target calculation is in progress.';return;}
  const power=current.kind==='power-reference';
  const ions=power?0:motionPopulation(current.particleRateS,6.24e16,96),count=power?48:2*Math.ceil(motionPopulation(current.neutronRateS,1e11,64)/2);
  if(updateText){
   labels.get('beam')!.hidden=power;
   const transfer=heatInset.update(current);panel.dataset.heatDirection=transfer.direction;panel.dataset.coolantW=transfer.coolantW===null?'':String(transfer.coolantW);
   summary.textContent=power?'Inside · reference':'Inside · beam / neutrons / heat';pause.disabled=!!reduced?.matches;
   panel.dataset.basis=power?'power-reference':current.basis;panel.dataset.beamCount=String(ions);panel.dataset.neutronCount=String(count);
   panel.dataset.energyKeV=power?'':String(current.energyKeV);panel.dataset.heatW=power?'':String(current.depositedPowerW);
  }
  for(let i=0;i<ions;i++){
   const distance=((i+.5)/ions*span+beamTravel)%span,a=i*2.399963,rad=radius*Math.sqrt((i+.5)/ions);
   beam.position.setXYZ(i,start+distance,target.y+rad*Math.cos(a),target.z+rad*Math.sin(a));
  }beam.finish(enabled.beam?ions:0);
  for(let i=0;i<count;i++){
   const pair=Math.floor(i/2),sample=neutronSample(i,count),d=sample.direction,a=pair*2.399963;
   const bx=power?4.2*Math.cos(a):target.x,by=power?0:target.y+radius*sample.birth[0],bz=power?4.2*Math.sin(a):target.z+radius*sample.birth[1];
   const reach=power?2.4:span*.55,distance=((pair+.5)/(count/2)*reach+neutronTravel)%reach;
   neutrons.position.setXYZ(i,bx+d[0]*distance,by+d[1]*distance,bz+d[2]*distance);
   for(let j=0;j<2;j++){const q=Math.max(0,distance-(j===0?reach*.075:0));tracks.position.setXYZ(2*i+j,bx+d[0]*q,by+d[1]*q,bz+d[2]*q);}
  }
  neutrons.finish(enabled.neutrons?count:0);tracks.finish(enabled.neutrons?count*2:0);
  // Fixed source coverage: rate changes brightness, never the reaction footprint.
  for(let i=0;i<12;i++){
   const a=i*2.399963,r=radius*Math.sqrt((i+.5)/12);
   reactions.position.setXYZ(i,power?4.2*Math.cos(a):target.x,power?0:target.y+r*Math.cos(a),power?4.2*Math.sin(a):target.z+r*Math.sin(a));
  }
  const intensity=power?1:current.neutronRateS/(current.neutronRateS+1e11);
  reactions.material.opacity=intensity*(.3+.7*(.5+.5*Math.sin(phase*4)));reactions.finish(enabled.reactions&&count>0?12:0);
  // Only the explicitly conceptual power reference has a 3D heat-direction cue.
  // Beam-target heat uses the expanded, labeled physical-depth inset instead.
  if(power&&enabled.heat){const tip=4.2+(phase*.55%1)*1.6;
   for(const [i,sign]of [-1,1].entries()){heat.position.setXYZ(i*2,tip-.1,0,sign*.1);heat.position.setXYZ(i*2+1,tip,0,0);}heat.finish(4);
  }
  if(panel.open&&enabled.heat)heatInset.tick(phase*.55);
  if(!updateText)return;
  metrics.textContent=power?'The reference shows a normalized D–T source and heat flow to the blanket. It has no beam source.':
   `${current.basis}${current.timeS===null?'':` · ${fmt(current.timeS)} s`} · ${current.particleRateS>0?`D⁺ ${fmt(ionSpeedMS(current))} m/s`:'beam off'} · ${fmt(current.neutronRateS)} n/s · ${fmt(current.depositedPowerW)} W deposited`;
  scope.textContent=power?'This reference animation does not calculate plasma motion, neutron transport or heat flow. It does not change the published TBR or yields.':
   `Markers show weighted angular samples; bright fusion sites are display effects. Speeds use nonrelativistic mean energies; ions and neutrons have separate slow-motion factors. Straight paths use isotropic emission without scattering or attenuation. The separate enlarged depth view shows heat flux, not coolant flow. ${si?'SI hardware; visual speed factors 2×10⁻⁷ (ions), 10⁻⁸ (neutrons).':'The Blender units are illustrative; travel time is not physical. The footprint changes with beam area.'}`;
 }
 return {group,get running(){return !!state&&!!root&&!pending&&!paused&&!reduced?.matches&&([beam,neutrons,heat,reactions].some(b=>b.geometry.drawRange.count>0)||panel.open&&heatInset.running);},
  update(value:ReactorMotionState|null,current:THREE.Object3D|null,waiting=false){
   state=value;root=current;pending=waiting;
   if(state?.kind==='beam'&&root){
    root.updateWorldMatrix(true,true);const b=boundsFor(root,'target'),accelerator=boundsFor(root,'accelerator');
    if(b.isEmpty()||accelerator.isEmpty()){root=null;draw();return;}
    si=root.name==='SI engineering assembly';
    // The accepted target front is solver z=0, not the centre of its cutaway or depth microscope.
    target=si?root.localToWorld(target.set(0,0,0)):b.getCenter(target);
    end=si?target.x:b.min.x;target.x=end;start=accelerator.max.x;span=Math.max(end-start,.001);
    // Reference units are illustrative; the full UI area range fits the .24-unit downstream bore.
    radius=si?Math.sqrt(state.areaM2/Math.PI):.2*Math.sqrt(state.areaM2/.1);
   }
   draw();
  },tick(dt:number){if(!paused&&!reduced?.matches){phase+=dt;
   if(state?.kind==='beam'){beamTravel+=ionSpeedMS(state)*2e-7*dt;neutronTravel+=state.neutronEnergyMeV===null?0:kineticSpeedMS(state.neutronEnergyMeV*1e6*E_CHARGE,1)*1e-8*dt;}
   else neutronTravel+=.52*dt;
  }draw(false);},
  dispose(){reduced?.removeEventListener?.('change',motionPreference);for(const b of [beam,neutrons,tracks,heat,reactions]){b.geometry.dispose();b.material.dispose();}group.removeFromParent();panel.remove();}
 };
}
