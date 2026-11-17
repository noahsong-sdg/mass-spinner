import {FUEL_PAIRS} from './fuel-centrifuge.ts';
import {calculateEquilibrium,equilibriumScenarios} from './fuel-equilibrium.ts';
import {equilibriumProducingCode} from './equilibrium-identity.ts';
import {renderPlots} from './laboratory.js';

/** Timeline redraws only update the optional import source, never prescribed inputs. */
export function createEquilibriumCalculator({document:doc,host,sampleState=(_result,state)=>state}){
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const panel=el('details'),basic=el('div'),more=el('details'),extra=el('div');panel.id='fuel-equilibrium-calculator';basic.className=extra.className='equilibrium-inputs';
 more.append(el('summary','Mixture & geometry'),extra);panel.append(el('summary','Equilibrium'),el('p','Ideal neutral-gas reference. Independent of the 3D timeline.'),basic,more);
 const fields=new Map();let accepted=null,pending=true,exportData=null,downloadURL=null;
 function input(parent,key,label,value,min,max){
  const wrap=el('label',label),n=el('input');n.type='number';n.id=`equilibrium-${key}`;n.value=value;n.min=min;n.max=max;n.step='any';wrap.htmlFor=n.id;wrap.append(n);parent.append(wrap);fields.set(key,n);n.addEventListener('input',draw);return n;
 }
 const pairLabel=el('label','Mixture'),pair=el('select');pair.id='equilibrium-pair';pair.setAttribute('aria-label','Mixture');pairLabel.htmlFor=pair.id;
 for(const [key,value]of Object.entries(FUEL_PAIRS)){const o=el('option',value.label);o.value=key;pair.append(o);}
 pairLabel.append(pair);extra.append(pairLabel);
 input(basic,'edgeSpeedMS','Gas edge speed (m/s)',1000,0,200000);input(basic,'temperatureK','Temperature (K)',500,100,10000);
 const cutLabel=el('label','Inner cut radius / vessel radius'),cut=el('input');cut.type='range';cut.id='equilibrium-cutFraction';cut.min=0;cut.max=1;cut.step='any';cut.value=.65;cutLabel.htmlFor=cut.id;cutLabel.append(cut);basic.append(cutLabel);fields.set('cutFraction',cut);cut.addEventListener('input',draw);
 input(extra,'lightFraction','Light inventory number fraction',.0759,0,1);input(extra,'radiusM','Radius (m)',.12,.001,10);
 input(extra,'lengthM','Length (m)',.8,.001,100);input(extra,'totalParticles','Neutral inventory (particles)',5.2426e19,1,1e30);
 more.append(el('p','Temperature changes hold inventory fixed. At fixed gas edge speed, radius changes dimensional positions and densities, not normalized composition.'));
 const scenarios=el('details'),scenarioInputs=el('div');scenarioInputs.className='equilibrium-inputs';scenarios.append(el('summary','Input scenarios'),scenarioInputs,
  el('p','Dashed curves sample speed/temperature endpoint combinations, not guaranteed extrema, confidence intervals or experimental error bars.'));
 input(scenarioInputs,'speedPercent','Speed ± (%)',0,0,50);input(scenarioInputs,'temperaturePercent','Temperature ± (%)',0,0,50);panel.append(scenarios);
 const actions=el('div'),sample=el('button','Use sampled state'),save=el('button','Export JSON');actions.className='equilibrium-actions';sample.type=save.type='button';sample.disabled=save.disabled=true;
 const status=el('p'),metrics=el('dl'),composition=el('div'),collection=el('div'),notes=el('details');
 status.id='equilibrium-status';status.setAttribute('role','status');metrics.id='equilibrium-metrics';metrics.className='equilibrium-metrics';composition.className=collection.className='live-plots';
 notes.append(el('summary','Model & numerical limits'),el('p','nₛ(r) ∝ exp[mₛ Ω²r²/(2kT)], normalized to each species’ own inventory. Purity is the desired species’ share of a cut; recovery is the share of that species’ original inventory in the cut. Fractions count particles, not mass.'),
  el('p','Ideal neutral gas, uniform temperature and rigid rotation. Cuts partition an equilibrium inventory; they do not predict extraction, flow, power or separation time. Plasma fields, chemical reactions, condensation and experimental calibration are excluded. βheavy ≤ 100 is a numerical screen, not a physical operating limit.'));
 const evidence=el('a','Equations & qualification');evidence.href='/equilibrium.html';evidence.target='_blank';evidence.rel='noopener';notes.append(evidence);
 actions.append(sample,save);panel.append(actions,status,metrics,composition,collection,notes);host.append(panel);
 pair.addEventListener('change',()=>{fields.get('lightFraction').value=FUEL_PAIRS[pair.value].fraction;draw();});
 const fmt=v=>v===null?'—':Number(v.toPrecision(5)).toString(),percent=v=>v===null?'—':`${fmt(100*v)}%`;
 function read(){
  for(const n of fields.values())if(n.value===''||!n.checkValidity())throw new RangeError('Enter valid values in every field.');
  return {...Object.fromEntries([...fields].map(([key,n])=>[key,Number(n.value)])),massesU:[...FUEL_PAIRS[pair.value].masses]};
 }
 function draw(){
  if(!panel.open)return;
  try{
   const values=read(),{speedPercent,temperaturePercent,...inputs}=values;revoke();
   const result=calculateEquilibrium(inputs),variants=speedPercent||temperaturePercent?equilibriumScenarios(inputs,speedPercent,temperaturePercent):[];
   const p=FUEL_PAIRS[pair.value],selected=result.selected;
   exportData={schemaVersion:1,producingCode:equilibriumProducingCode,units:'SI; masses in u; composition, purity and recovery are number fractions',pair:pair.value,
    result,inputScenarios:{speedPercent,temperaturePercent,cases:variants},scenarioScope:'Sampled endpoint combinations, not a guaranteed envelope or confidence interval.'};
   metrics.replaceChildren();
   for(const [label,value]of [
    ['Cut radius',`${fmt(selected.radiusM*100)} cm`],[`${p.light} inner purity`,percent(selected.inner.lightPurity)],
    [`${p.light} recovery`,percent(selected.inner.lightRecovery)],['Inner purity − feed',selected.inner.lightGain===null?'—':`${fmt(100*selected.inner.lightGain)} pp`],
    [`${p.heavy} outer purity`,percent(selected.outer.heavyPurity)],[`${p.heavy} recovery`,percent(selected.outer.heavyRecovery)],
    ['Inner particles',fmt(selected.inner.totalParticles)],['Outer particles',fmt(selected.outer.totalParticles)]])metrics.append(el('dt',label),el('dd',value));
   const curves=[result,...variants].map((r,i)=>({label:i?`${fmt(r.inputs.edgeSpeedMS)} m/s · ${fmt(r.inputs.temperatureK)} K`:`${p.light} · prescribed`,
    x:r.profiles.map(v=>100*v.radiusM),y:r.profiles.map(v=>100*v.lightFraction),xLabel:'Radius (cm)',yLabel:`${p.light} local number fraction (%) · zoomed`,...(i?{dash:'4 4'}:{color:'#a4c4b1'})}));
   const all=[100*inputs.lightFraction,...curves.flatMap(c=>c.y)],lo=Math.min(...all),hi=Math.max(...all),pad=Math.max(.01,(hi-lo)*.08);
   for(const c of curves){c.yDomain=[Math.max(0,lo-pad),Math.min(100,hi+pad)];c.selectedX=100*selected.radiusM;}
   curves.push({label:`${p.light} feed`,x:[0,100*inputs.radiusM],y:[100*inputs.lightFraction,100*inputs.lightFraction],xLabel:curves[0].xLabel,yLabel:curves[0].yLabel,yDomain:curves[0].yDomain,dash:'2 4'});
   renderPlots(composition,curves,{announce:false});
   const cuts=[['Light inner purity','inner','lightPurity'],['Light inner recovery','inner','lightRecovery'],['Heavy outer purity','outer','heavyPurity'],['Heavy outer recovery','outer','heavyRecovery']];
   renderPlots(collection,cuts.map(([label,side,key])=>({label,x:result.profiles.map(v=>100*v.radiusM),y:result.profiles.map(v=>v[side][key]===null?null:100*v[side][key]),xLabel:'Cut radius (cm)',yLabel:'Collected number fraction (%)',yDomain:[0,100],selectedX:100*selected.radiusM})),{announce:false});
   status.textContent=`${fmt(result.omegaRadS)} rad/s · βheavy ${fmt(result.beta[1])} · log αaxis/wall ${fmt(result.logAxisWallSeparation)} · zoomed composition axis`;save.disabled=false;
  }catch(error){exportData=null;revoke();save.disabled=true;metrics.replaceChildren();renderPlots(composition,[]);renderPlots(collection,[]);status.textContent=error.message;}
 }
 function revoke(){if(downloadURL){doc.defaultView.URL.revokeObjectURL(downloadURL);downloadURL=null;}}
 sample.addEventListener('click',()=>{
  if(pending||!accepted)return;
  const {r}=accepted,state=sampleState(r,accepted.state),c=r.config;pair.value=c.pair;
  const inputs={radiusM:c.radiusM,lengthM:c.lengthM,lightFraction:c.lightFraction,cutFraction:c.cutFraction,
   edgeSpeedMS:Math.abs(state.neutralRadS??r.samples.at(-1).neutralRadS)*c.radiusM,temperatureK:state.thermal?.gasK??c.gasK,
   totalParticles:c.pressurePa*Math.PI*c.radiusM**2*c.lengthM/(1.380649e-23*c.gasK)};
  for(const [key,value]of Object.entries(inputs))fields.get(key).value=value;draw();
  if(state.thermal?.gas)status.textContent+=' · spatial gas temperature replaced by its accepted mean';
 });
 save.addEventListener('click',()=>{
  if(!exportData||save.disabled)return;revoke();downloadURL=doc.defaultView.URL.createObjectURL(new doc.defaultView.Blob([JSON.stringify(exportData,null,2)],{type:'application/json'}));
  const a=el('a');a.href=downloadURL;a.download='mass-spinner-equilibrium.json';a.click();
 });
 panel.addEventListener('toggle',()=>{if(panel.open)draw();});
 return {update(r,state={}){accepted={r,state};pending=false;sample.disabled=false;},setPending(){pending=true;sample.disabled=true;},
  dispose(){revoke();renderPlots(composition,[]);renderPlots(collection,[]);panel.remove();}};
}
