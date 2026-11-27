import {FUEL_PAIRS} from './fuel-centrifuge.js';
import {calculateEquilibrium,equilibriumScenarios,type EquilibriumInput} from './fuel-equilibrium.js';
import {equilibriumProducingCode} from './equilibrium-identity.js';
import {renderPlots, type PlotCurve} from './laboratory.js';
import type {FuelFieldResult, FuelFieldState} from './fuel-field.js';
export type FuelSampleState = (result: FuelFieldResult, state: FuelFieldState) => FuelFieldState;
export type EquilibriumCalculatorOptions = {document: Document; host: HTMLElement; sampleState?: FuelSampleState};
type FieldKey = Exclude<keyof EquilibriumInput, 'massesU'> | 'speedPercent' | 'temperaturePercent';
type CalculatorValues = EquilibriumInput & {speedPercent: number; temperaturePercent: number};
type EquilibriumExport = {schemaVersion: number; producingCode: typeof equilibriumProducingCode; units: string; pair: string; result: ReturnType<typeof calculateEquilibrium>; inputScenarios: {speedPercent: number; temperaturePercent: number; cases: ReturnType<typeof equilibriumScenarios>}; scenarioScope: string};

/** Timeline redraws only update the optional import source, never prescribed inputs. */
export function createEquilibriumCalculator({document:doc,host,sampleState=(_result,state)=>state}: EquilibriumCalculatorOptions){
 const el=<K extends keyof HTMLElementTagNameMap>(tag: K,text?: string)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const panel=el('details'),basic=el('div'),more=el('details'),extra=el('div');panel.id='fuel-equilibrium-calculator';basic.className=extra.className='equilibrium-inputs';
 more.append(el('summary','Mixture & geometry'),extra);panel.append(el('summary','Equilibrium'),el('p','Ideal neutral-gas reference. The 3D timeline does not change these inputs.'),basic,more);
 const fields=new Map<FieldKey, HTMLInputElement>();let accepted: {r: FuelFieldResult; state: FuelFieldState} | null=null,pending=true,exportData: EquilibriumExport | null=null,downloadURL: string | null=null;
 function input(parent: HTMLElement,key: FieldKey,label: string,value: number,min: number,max: number){
  const wrap=el('label',label),n=el('input');n.type='number';n.id=`equilibrium-${key}`;n.value=String(value);n.min=String(min);n.max=String(max);n.step='any';wrap.htmlFor=n.id;wrap.append(n);parent.append(wrap);fields.set(key,n);n.addEventListener('input',draw);return n;
 }
 const pairLabel=el('label','Mixture'),pair=el('select');pair.id='equilibrium-pair';pair.setAttribute('aria-label','Mixture');pairLabel.htmlFor=pair.id;
 for(const [key,value]of Object.entries(FUEL_PAIRS)){const o=el('option',value.label);o.value=key;pair.append(o);}
 pairLabel.append(pair);extra.append(pairLabel);
 input(basic,'edgeSpeedMS','Gas edge speed (m/s)',1000,0,200000);input(basic,'temperatureK','Temperature (K)',500,100,10000);
 const cutLabel=el('label','Inner cut radius / vessel radius'),cut=el('input');cut.type='range';cut.id='equilibrium-cutFraction';cut.min='0';cut.max='1';cut.step='any';cut.value='.65';cutLabel.htmlFor=cut.id;cutLabel.append(cut);basic.append(cutLabel);fields.set('cutFraction',cut);cut.addEventListener('input',draw);
 input(extra,'lightFraction','Light inventory number fraction',.0759,0,1);input(extra,'radiusM','Radius (m)',.12,.001,10);
 input(extra,'lengthM','Length (m)',.8,.001,100);input(extra,'totalParticles','Neutral inventory (particles)',5.2426e19,1,1e30);
 more.append(el('p','Temperature changes keep inventory fixed. At fixed gas edge speed, radius changes positions and densities. It does not change normalized composition.'));
 const scenarios=el('details'),scenarioInputs=el('div');scenarioInputs.className='equilibrium-inputs';scenarios.append(el('summary','Input scenarios'),scenarioInputs,
  el('p','Dashed curves use combinations of minimum and maximum speed and temperature inputs. They do not give guaranteed bounds, confidence intervals or experimental error bars.'));
 input(scenarioInputs,'speedPercent','Speed ± (%)',0,0,50);input(scenarioInputs,'temperaturePercent','Temperature ± (%)',0,0,50);panel.append(scenarios);
 const actions=el('div'),sample=el('button','Use sampled state'),save=el('button','Export JSON');actions.className='equilibrium-actions';sample.type=save.type='button';sample.disabled=save.disabled=true;
 const status=el('p'),metrics=el('dl'),composition=el('div'),collection=el('div'),notes=el('details');
 status.id='equilibrium-status';status.setAttribute('role','status');metrics.id='equilibrium-metrics';metrics.className='equilibrium-metrics';composition.className=collection.className='live-plots';
 notes.append(el('summary','Model & numerical limits'),el('p','nₛ(r) ∝ exp[mₛ Ω²r²/(2kT)], normalized to each species’ own inventory. Purity is the desired species’ fraction of a cut. Recovery is the fraction of that species’ original inventory in the cut. Fractions count particles, not mass.'),
  el('p','The model uses ideal neutral gas, uniform temperature and rigid rotation. Cuts divide an equilibrium inventory. They do not predict extraction, flow, power or separation time. The model does not include plasma fields, chemical reactions, condensation or experimental calibration. βheavy ≤ 100 is a numerical limit, not a physical operating limit.'));
 const evidence=el('a','Equations & qualification');evidence.href='/equilibrium.html';evidence.target='_blank';evidence.rel='noopener';notes.append(evidence);
 actions.append(sample,save);panel.append(actions,status,metrics,composition,collection,notes);host.append(panel);
 pair.addEventListener('change',()=>{fields.get('lightFraction')!.value=String(FUEL_PAIRS[pair.value as keyof typeof FUEL_PAIRS].fraction);draw();});
 const fmt=(v: number | null)=>v===null?'—':Number(v.toPrecision(5)).toString(),percent=(v: number | null)=>v===null?'—':`${fmt(100*v)}%`;
 function read(){
  for(const n of fields.values())if(n.value===''||!n.checkValidity())throw new RangeError('Enter permitted values in each field.');
  const number=(key: FieldKey)=>Number(fields.get(key)!.value);
  return {edgeSpeedMS:number('edgeSpeedMS'),temperatureK:number('temperatureK'),cutFraction:number('cutFraction'),
   lightFraction:number('lightFraction'),radiusM:number('radiusM'),lengthM:number('lengthM'),totalParticles:number('totalParticles'),
   speedPercent:number('speedPercent'),temperaturePercent:number('temperaturePercent'),massesU:[...FUEL_PAIRS[pair.value as keyof typeof FUEL_PAIRS].masses]} satisfies CalculatorValues;
 }
 function draw(){
  if(!panel.open)return;
  try{
   const values=read(),{speedPercent,temperaturePercent,...inputs}=values;revoke();
   const result=calculateEquilibrium(inputs),variants=speedPercent||temperaturePercent?equilibriumScenarios(inputs,speedPercent,temperaturePercent):[];
   const p=FUEL_PAIRS[pair.value as keyof typeof FUEL_PAIRS],selected=result.selected;
   exportData={schemaVersion:1,producingCode:equilibriumProducingCode,units:'SI; masses in u; composition, purity and recovery are number fractions',pair:pair.value,
    result,inputScenarios:{speedPercent,temperaturePercent,cases:variants},scenarioScope:'Combinations of input endpoints, not guaranteed bounds or a confidence interval.'};
   metrics.replaceChildren();
   for(const [label,value]of [
    ['Cut radius',`${fmt(selected.radiusM*100)} cm`],[`${p.light} inner purity`,percent(selected.inner.lightPurity)],
    [`${p.light} recovery`,percent(selected.inner.lightRecovery)],['Inner purity − feed',selected.inner.lightGain===null?'—':`${fmt(100*selected.inner.lightGain)} pp`],
    [`${p.heavy} outer purity`,percent(selected.outer.heavyPurity)],[`${p.heavy} recovery`,percent(selected.outer.heavyRecovery)],
    ['Inner particles',fmt(selected.inner.totalParticles)],['Outer particles',fmt(selected.outer.totalParticles)]])metrics.append(el('dt',label),el('dd',value));
   const curves: (PlotCurve & {y: number[]})[]=[result,...variants].map((r,i)=>({label:i?`${fmt(r.inputs.edgeSpeedMS)} m/s · ${fmt(r.inputs.temperatureK)} K`:`${p.light} · prescribed`,
    x:r.profiles.map(v=>100*v.radiusM),y:r.profiles.map(v=>100*v.lightFraction),xLabel:'Radius (cm)',yLabel:`${p.light} local number fraction (%) · zoomed`,...(i?{dash:'4 4'}:{color:'#a4c4b1'})}));
   const all=[100*inputs.lightFraction,...curves.flatMap(c=>c.y)],lo=Math.min(...all),hi=Math.max(...all),pad=Math.max(.01,(hi-lo)*.08);
   for(const c of curves){c.yDomain=[Math.max(0,lo-pad),Math.min(100,hi+pad)];c.selectedX=100*selected.radiusM;}
   curves.push({label:`${p.light} feed`,x:[0,100*inputs.radiusM],y:[100*inputs.lightFraction,100*inputs.lightFraction],xLabel:curves[0].xLabel,yLabel:curves[0].yLabel,yDomain:curves[0].yDomain,dash:'2 4'});
   renderPlots(composition,curves,{announce:false});
   const innerCuts=[['Light inner purity','lightPurity'],['Light inner recovery','lightRecovery']] as const;
   const outerCuts=[['Heavy outer purity','heavyPurity'],['Heavy outer recovery','heavyRecovery']] as const;
   const cuts=([...innerCuts.map(([label,key])=>({label,x:result.profiles.map(v=>100*v.radiusM),y:result.profiles.map(v=>v.inner[key]===null?null:100*v.inner[key])})),
    ...outerCuts.map(([label,key])=>({label,x:result.profiles.map(v=>100*v.radiusM),y:result.profiles.map(v=>v.outer[key]===null?null:100*v.outer[key])}))]);
   renderPlots(collection,cuts.map(curve=>({...curve,xLabel:'Cut radius (cm)',yLabel:'Collected number fraction (%)',yDomain:[0,100],selectedX:100*selected.radiusM})),{announce:false});
   status.textContent=`${fmt(result.omegaRadS)} rad/s · βheavy ${fmt(result.beta[1])} · log αaxis/wall ${fmt(result.logAxisWallSeparation)} · zoomed composition axis`;save.disabled=false;
  }catch(error){exportData=null;revoke();save.disabled=true;metrics.replaceChildren();renderPlots(composition,[]);renderPlots(collection,[]);status.textContent=error instanceof Error?error.message:String(error);}
 }
 function revoke(){if(downloadURL){doc.defaultView!.URL.revokeObjectURL(downloadURL);downloadURL=null;}}
 sample.addEventListener('click',()=>{
  if(pending||!accepted)return;
  const {r}=accepted,state=sampleState(r,accepted.state),c=r.config;pair.value=c.pair;
  const inputs={radiusM:c.radiusM,lengthM:c.lengthM,lightFraction:c.lightFraction,cutFraction:c.cutFraction,
   edgeSpeedMS:Math.abs(state.neutralRadS??r.samples.at(-1)!.neutralRadS)*c.radiusM,temperatureK:state.thermal?.gasK??c.gasK,
   totalParticles:c.pressurePa*Math.PI*c.radiusM**2*c.lengthM/(1.380649e-23*c.gasK)};
  for(const [key,value]of Object.entries(inputs))fields.get(key as FieldKey)!.value=String(value);draw();
  if(state.thermal?.gas)status.textContent+=' · this reference uses the mean gas temperature';
 });
 save.addEventListener('click',()=>{
  if(!exportData||save.disabled)return;revoke();downloadURL=doc.defaultView!.URL.createObjectURL(new doc.defaultView!.Blob([JSON.stringify(exportData,null,2)],{type:'application/json'}));
  const a=el('a');a.href=downloadURL;a.download='mass-spinner-equilibrium.json';a.click();
 });
 panel.addEventListener('toggle',()=>{if(panel.open)draw();});
 return {update(r: FuelFieldResult,state: FuelFieldState={}){accepted={r,state};pending=false;sample.disabled=false;},setPending(){pending=true;sample.disabled=true;},
  dispose(){revoke();renderPlots(composition,[]);renderPlots(collection,[]);panel.remove();}};
}
