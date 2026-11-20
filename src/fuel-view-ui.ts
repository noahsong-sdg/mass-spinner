import type {FuelSceneTools, FuelFieldLayer, FuelSpecies} from './fuel-scene-tools.js';
import type {FuelFieldSample} from './fuel-field.js';
export type FuelViewState = {slice: number; radius: number; layer: FuelFieldLayer; cutaway: number; ghost: boolean; explode: number; visible: boolean; species: FuelSpecies; drive: 'all' | 'B' | 'J' | 'force' | 'off'; representation: 'field' | 'tracers' | 'both'; circuit: boolean};
type RangeKey = 'slice' | 'radius' | 'cutaway' | 'explode';
type SelectKey = 'representation' | 'drive' | 'layer' | 'species';
export type FuelViewOptions = {document: Document; host: HTMLElement; onChange?: (state: FuelViewState) => void; onCamera?: (direction: readonly [number, number, number]) => void};

/** Display controls stay separate from accepted physical inputs. */
export function createFuelViewTools({document:doc,host,onChange=()=>{},onCamera=()=>{}}: FuelViewOptions){
 const el=<K extends keyof HTMLElementTagNameMap>(tag: K,text?: string)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const state: FuelViewState={slice:.5,radius:.5,layer:'density',cutaway:.62,ghost:true,explode:0,visible:true,species:'all',drive:'all',representation:'both',circuit:false};
 const inputs=new Map<RangeKey, {input: HTMLInputElement; number: HTMLInputElement}>(),legend=el('p'),probe=el('p');probe.className='fuel-probe';probe.setAttribute('aria-live','off');
 function range(key: RangeKey,title: string,min: number,max: number,step: number){
  const box=el('div'),label=el('label',title),input=el('input'),number=el('input');box.className='fuel-view-control';
  input.type='range';number.type='number';input.id=`fuel-view-${key}`;label.htmlFor=input.id;
  for(const n of [input,number]){n.min=String(min);n.max=String(max);n.step=String(step);n.value=String(state[key]);}
  number.setAttribute('aria-label',`${title} numeric value`);
  function change(source: HTMLInputElement){const value=Number(source.value);if(!Number.isFinite(value)||value<min||value>max){source.setCustomValidity(`Use ${min} to ${max}`);return;}source.setCustomValidity('');if(source===number)input.step='any';state[key]=value;input.value=String(value);if(source!==number)number.value=String(value);onChange({...state});}
  input.addEventListener('input',()=>change(input));number.addEventListener('input',()=>{if(number.value!=='')change(number);});number.addEventListener('change',()=>change(number));box.append(label,input,number);host.append(box);inputs.set(key,{input,number});
 }
 function select<K extends SelectKey>(key: K,title: string,options: readonly (readonly [FuelViewState[K], string])[]){
  const label=el('label',title),input=el('select');input.id=`fuel-view-${key}`;label.htmlFor=input.id;
  for(const [value,text]of options){const option=el('option',text);option.value=value;input.append(option);}input.value=state[key];
  input.addEventListener('change',()=>{state[key]=input.value as FuelViewState[K];if(key==='representation'){state.visible=input.value!=='tracers';visible.checked=state.visible;}onChange({...state});});host.append(label,input);return input;
 }
 const representation=select('representation','Gas display',[['field','Gas cutaway'],['tracers','3D samples'],['both','Gas + 3D samples']]);
 select('drive','Electromagnetic drive',[['all','B · J · J × B'],['B','Axial field B'],['J','Inward current J'],['force','Azimuthal force J × B'],['off','Hidden']]);
 const driveLegend=el('p');driveLegend.className='fuel-drive-legend';host.append(driveLegend);
 const visible=el('input'),visibleLabel=el('label','Gas cutaway');visible.type='checkbox';visible.id='fuel-view-visible';visible.checked=state.visible;visibleLabel.htmlFor=visible.id;
 visible.addEventListener('change',()=>{state.visible=visible.checked;state.representation=visible.checked?'both':'tracers';representation.value=state.representation;onChange({...state});});host.append(visible,visibleLabel);
 range('slice','Axial position / length',0,1,.01);
 range('radius','Probe radius / vessel radius',0,1,.01);
 select('layer','Field',[['enrichment','Change in light fraction'],['composition','Composition'],['density','Number density'],['speed','Bulk speed'],['temperature','Temperature']]);
 select('species','Highlight',[['all','Both species'],['light','Light species'],['heavy','Heavy species']]);
 host.append(legend,probe,el('p','The radial model is uniform along the axis. Colors show calculated values, not visible light.'));
 const staging=el('details');staging.append(el('summary','Assembly'));host.append(staging);
 const stagingHost=host; // Move only presentation controls into the disclosure.
 range('cutaway','Shell opening',0,1,.01);staging.append(stagingHost.lastChild!);
 range('explode','Exploded view',0,1,.01);staging.append(stagingHost.lastChild!);
 const ghost=el('input'),ghostLabel=el('label','Transparent housing');ghost.type='checkbox';ghost.id='fuel-view-ghost';ghostLabel.htmlFor=ghost.id;
 ghost.checked=state.ghost;
 ghost.addEventListener('change',()=>{state.ghost=ghost.checked;onChange({...state});});staging.append(ghost,ghostLabel);
 const circuit=el('input'),circuitLabel=el('label','Discharge circuit');circuit.type='checkbox';circuit.id='fuel-view-circuit';circuitLabel.htmlFor=circuit.id;
 circuit.addEventListener('change',()=>{state.circuit=circuit.checked;onChange({...state});});staging.append(circuit,circuitLabel);
 for(const [label,direction]of [['Cutaway',[.55,1.25,.8]],['Axial',[1,0,0]],['Side',[0,1,0]]] as const){const button=el('button',label);button.id=`fuel-camera-${label.toLowerCase()}`;button.addEventListener('click',()=>onCamera(direction));staging.append(button);}
 function updateLegend(tools: FuelSceneTools | null | undefined){if(!tools)return;const l=tools.legend,text=`${l.label}: ${l.domain.map(n=>Number(n.toPrecision(4))).join(' → ')} ${l.unit}`;if(legend.textContent!==text)legend.textContent=text;legend.className='fuel-field-legend';legend.style.borderImage=`linear-gradient(to right,${l.colors.join(',')}) 1`;if(tools.drive){const d=tools.drive.state,text=`B ${d.fieldT.toPrecision(3)} T · I ${d.currentA.toPrecision(3)} A · τ ${d.torqueNm.toExponential(2)} N·m. Arrows show directions. B and radial current are specified inputs.`;if(driveLegend.textContent!==text)driveLegend.textContent=text;}}
 function apply(tools: FuelSceneTools | null | undefined){
  if(!tools)return;tools.group.visible=state.visible;
  if(tools.motion)tools.motion.group.visible=state.representation!=='field';
  tools.setVolumeVisible(state.representation!=='tracers',state.representation==='both');
  if(tools.circuit&&tools.circuit.visible!==state.circuit){tools.circuit.visible=state.circuit;const scene=tools.circuit.parent!;scene.userData.shadowRevision=((scene.userData.shadowRevision as number|undefined)??0)+1;}
  tools.setSlice(state.slice);tools.setProbe?.(state.radius);tools.setLayer(state.layer);tools.setSpecies?.(state.species);tools.setStaging(state);tools.drive?.setLayer(state.drive);
  updateLegend(tools);
 }
 function selectRadius(fraction: number){if(!Number.isFinite(fraction)||fraction<0||fraction>1)throw new RangeError('The probe radius must be inside the vessel or at its wall.');state.radius=fraction;const {input,number}=inputs.get('radius')!;input.step='any';input.value=number.value=String(fraction);}
 function showSample(s: FuelFieldSample | null){probe.textContent=s?`r ${(100*s.radiusM).toPrecision(3)} cm · light ${s.lightFraction===null?'undefined':`${(100*s.lightFraction).toPrecision(4)}%`} · n ${s.densityM3.toExponential(3)} m⁻³ · ${s.temperatureK.toPrecision(4)} K · ${s.speedMS.toPrecision(4)} m/s · ${s.timeS.toPrecision(4)} s`:'';}
 function presentMode(mode:'equilibrium'|'transport'|'spin'|'flow'){
  state.representation=mode==='spin'||mode==='flow'?'tracers':'both';state.visible=state.representation==='both';state.layer='density';
  representation.value=state.representation;visible.checked=state.visible;host.querySelector<HTMLSelectElement>('#fuel-view-layer')!.value=state.layer;
  onChange({...state});
 }
 return {state,apply,updateLegend,showSample,selectRadius,presentMode,refreshSample:(tools: FuelSceneTools | null | undefined)=>{if(tools)showSample(tools.sampleAt(tools.radiusM*state.radius));},clearSample:()=>showSample(null)};
}
