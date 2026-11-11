import * as THREE from 'three';
import {targetSceneState,targetFieldDomain,TARGET_FIELDS} from './apparatus-state.ts';

const format=x=>x===null?'—':Number(x.toPrecision(4)).toString();
/** A detached depth cutaway represents solver cells, never a temperature painted on hardware. */
export function createTargetStateLayer(frame,scene,{render,onSelect=()=>{}}){
 const doc=frame.ownerDocument,panel=doc.createElement('details'),title=doc.createElement('summary'),body=doc.createElement('div');
 const field=doc.createElement('select'),cell=doc.createElement('select'),legend=doc.createElement('p'),readout=doc.createElement('p'),source=doc.createElement('p'),scope=doc.createElement('p');
 panel.className='apparatus-state';panel.hidden=true;title.textContent='Target state';panel.append(title,body);
 field.setAttribute('aria-label','Target field');cell.setAttribute('aria-label','Inspect a target depth cell');
 for(const [key,name]of TARGET_FIELDS){const option=doc.createElement('option');option.value=key;option.textContent=name;field.append(option);}field.value='temperatureK';
 body.append(field,cell,readout,source,scope);scope.textContent='1D cell averages · expanded depth · conceptual geometry';
 legend.className='apparatus-state-legend';body.append(legend);frame.append(panel);
 const group=new THREE.Group();group.name='Accepted target depth cutaway';scene.add(group);
 let snapshot=null,pending=false,root=null,selected=0;const boxes=[];
 function clear(){for(const box of boxes){box.geometry.dispose();box.material.dispose();}boxes.length=0;group.clear();}
 function draw(){
  clear();if(!snapshot||!root){panel.hidden=true;render();return;}
  const bounds=new THREE.Box3();root.traverse(node=>{for(let p=node;p;p=p.parent)if(p.userData?.componentId==='target'){if(node.isMesh)bounds.expandByObject(node);break;}});
  if(bounds.isEmpty()){panel.hidden=true;render();return;}
  panel.hidden=false;const whole=new THREE.Box3().setFromObject(root),size=whole.getSize(new THREE.Vector3()),anchor=bounds.getCenter(new THREE.Vector3());
  const width=size.length()*.22,height=width*.12,n=snapshot.cells.length,[lo,hi]=targetFieldDomain(snapshot,field.value);
  group.position.set(anchor.x-width*.5,bounds.max.y+height*2,bounds.max.z+height);
  snapshot.cells.forEach((value,i)=>{
   const amount=hi===lo?.5:(value[field.value]-lo)/(hi-lo),color=new THREE.Color('#5f8f8b').lerp(new THREE.Color('#e7a46e'),amount);
   const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:i===selected?1:.78});
   const box=new THREE.Mesh(new THREE.BoxGeometry(width/n*.96,height,height*.55),material);
   box.position.x=(i+.5)*width/n;box.userData={componentId:'target',targetCell:i};group.add(box);boxes.push(box);
  });
  const unit=TARGET_FIELDS.find(([key])=>key===field.value)[2];legend.textContent=`${format(lo)}–${format(hi)} ${unit} · film ${format(snapshot.filmThicknessM*1e6)} µm`;
  title.textContent=`Target · ${format(snapshot.timeS)} s${pending?' · previous run, updating…':''}`;
  const value=snapshot.cells[selected];readout.textContent=`${format(value.depthM*1e6)} µm · ${format(value[field.value])} ${unit}`;
  source.textContent=`${snapshot.beamOn?'Beam on':'Beam off'} · ${format(snapshot.beamEnergyKeV)} keV · ${snapshot.beamAreaM2===null?'—':format(snapshot.beamAreaM2*1e4)} cm² · ${format(snapshot.heatW)} W heat · ${format(snapshot.neutronRateS)} D–T n/s`;
  render();
 }
 function selectCell(index){if(!snapshot||!Number.isInteger(index)||index<0||index>=snapshot.cells.length)return;selected=index;cell.value=String(index);panel.open=true;draw();onSelect('target');}
 field.addEventListener('change',draw);cell.addEventListener('change',()=>selectCell(Number(cell.value)));
 return {group,selectCell,setRoot(value){root=value;draw();},update(value){snapshot=targetSceneState(value);selected=Math.min(selected,(snapshot?.cells.length??1)-1);cell.replaceChildren();
   snapshot?.cells.forEach((value,i)=>{const option=doc.createElement('option');option.value=String(i);option.textContent=`${format(value.depthM*1e6)} µm`;cell.append(option);});cell.value=String(selected);draw();},
  setPending(value){pending=!!value;draw();},dispose(){clear();group.removeFromParent();panel.parentNode?.removeChild(panel);}};
}
