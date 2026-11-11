/** Display controls stay separate from accepted physical inputs. */
export function createFuelViewTools({document:doc,host,onChange=()=>{},onCamera=()=>{}}){
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const state={slice:.5,layer:'enrichment',cutaway:.62,ghost:true,explode:0,visible:true,species:'all',drive:'all',representation:'field',circuit:false};
 const inputs=new Map(),legend=el('p'),probe=el('p');probe.className='fuel-probe';probe.setAttribute('aria-live','off');
 function range(key,title,min,max,step){
  const box=el('div'),label=el('label',title),input=el('input'),number=el('input');box.className='fuel-view-control';
  input.type='range';number.type='number';input.id=`fuel-view-${key}`;label.htmlFor=input.id;
  for(const n of [input,number]){n.min=min;n.max=max;n.step=step;n.value=state[key];}
  number.setAttribute('aria-label',`${title} precisely`);
  function change(source){const value=Number(source.value);if(!Number.isFinite(value)||value<min||value>max){source.setCustomValidity(`Use ${min} to ${max}`);return;}source.setCustomValidity('');if(source===number)input.step='any';state[key]=value;input.value=value;if(source!==number)number.value=value;onChange({...state});}
  input.addEventListener('input',()=>change(input));number.addEventListener('input',()=>{if(number.value!=='')change(number);});number.addEventListener('change',()=>change(number));box.append(label,input,number);host.append(box);inputs.set(key,input);
 }
 function select(key,title,options){
  const label=el('label',title),input=el('select');input.id=`fuel-view-${key}`;label.htmlFor=input.id;
  for(const [value,text]of options){const option=el('option',text);option.value=value;input.append(option);}input.value=state[key];
  input.addEventListener('change',()=>{state[key]=input.value;if(key==='representation'){state.visible=input.value!=='tracers';visible.checked=state.visible;}onChange({...state});});host.append(label,input);return input;
 }
 const representation=select('representation','Gas display',[['field','Gas cutaway'],['tracers','Weighted tracers'],['both','Cutaway + tracers']]);
 select('drive','Electromagnetic drive',[['all','B · J · J × B'],['B','Axial field B'],['J','Inward current J'],['force','Azimuthal force J × B'],['off','Hidden']]);
 const driveLegend=el('p');driveLegend.className='fuel-drive-legend';host.append(driveLegend);
 const visible=el('input'),visibleLabel=el('label','Gas cutaway');visible.type='checkbox';visible.id='fuel-view-visible';visible.checked=state.visible;visibleLabel.htmlFor=visible.id;
 visible.addEventListener('change',()=>{state.visible=visible.checked;state.representation=visible.checked?'both':'tracers';representation.value=state.representation;onChange({...state});});host.append(visible,visibleLabel);
 range('slice','Axial position / length',0,1,.01);
 select('layer','Field',[['enrichment','Change in light fraction'],['composition','Composition'],['density','Number density'],['speed','Bulk speed'],['temperature','Temperature']]);
 select('species','Highlight',[['all','Both species'],['light','Light species'],['heavy','Heavy species']]);
 host.append(legend,probe,el('p','Radial model · uniform along the axis. Diagnostic colors, not visible emission.'));
 const staging=el('details');staging.append(el('summary','Assembly'));host.append(staging);
 const stagingHost=host; // Move only presentation controls into the disclosure.
 range('cutaway','Shell opening',0,1,.01);staging.append(stagingHost.lastChild);
 range('explode','Exploded view',0,1,.01);staging.append(stagingHost.lastChild);
 const ghost=el('input'),ghostLabel=el('label','Ghost housing');ghost.type='checkbox';ghost.id='fuel-view-ghost';ghostLabel.htmlFor=ghost.id;
 ghost.checked=state.ghost;
 ghost.addEventListener('change',()=>{state.ghost=ghost.checked;onChange({...state});});staging.append(ghost,ghostLabel);
 const circuit=el('input'),circuitLabel=el('label','Discharge circuit');circuit.type='checkbox';circuit.id='fuel-view-circuit';circuitLabel.htmlFor=circuit.id;
 circuit.addEventListener('change',()=>{state.circuit=circuit.checked;onChange({...state});});staging.append(circuit,circuitLabel);
 for(const [label,direction]of [['Cutaway',[.55,1.25,.8]],['Axial',[1,0,0]],['Side',[0,1,0]]]){const button=el('button',label);button.addEventListener('click',()=>onCamera(direction));staging.append(button);}
 function updateLegend(tools){if(!tools)return;const l=tools.legend,text=`${l.label}: ${l.domain.map(n=>Number(n.toPrecision(4))).join(' → ')} ${l.unit}`;if(legend.textContent!==text)legend.textContent=text;legend.className='fuel-field-legend';legend.style.borderImage=`linear-gradient(to right,${l.colors.join(',')}) 1`;if(tools.drive){const d=tools.drive.state,text=`B ${d.fieldT.toPrecision(3)} T · I ${d.currentA.toPrecision(3)} A · τ ${d.torqueNm.toExponential(2)} N·m. Direction glyphs; prescribed B and radial current.`;if(driveLegend.textContent!==text)driveLegend.textContent=text;}}
 function apply(tools){
  if(!tools)return;tools.group.visible=state.visible;
  if(tools.motion)tools.motion.group.visible=state.representation!=='field';
  if(tools.circuit&&tools.circuit.visible!==state.circuit){tools.circuit.visible=state.circuit;const scene=tools.circuit.parent;scene.userData.shadowRevision=(scene.userData.shadowRevision??0)+1;}
  tools.setSlice(state.slice);tools.setLayer(state.layer);tools.setSpecies?.(state.species);tools.setStaging(state);tools.drive?.setLayer(state.drive);
  updateLegend(tools);
 }
 let probePosition=null;
 function showSample(s){probePosition=s?{radiusM:s.radiusM,axialM:s.axialM}:null;probe.textContent=s?`r ${s.radiusM.toPrecision(3)} m · z ${s.axialM.toPrecision(3)} m · light ${s.lightFraction===null?'—':s.lightFraction.toPrecision(4)} · n ${s.densityM3.toExponential(3)} m⁻³ · ${s.temperatureK.toPrecision(4)} K · ${s.pressurePa.toPrecision(4)} Pa · ${s.speedMS.toPrecision(4)} m/s · ${s.timeS.toPrecision(4)} s`:'';}
 return {state,apply,updateLegend,showSample,refreshSample:tools=>{if(tools&&probePosition)showSample({...tools.sampleAt(probePosition.radiusM),axialM:probePosition.axialM});},clearSample:()=>showSample(null)};
}
