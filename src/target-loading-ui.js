import {simulateTargetLoading} from './target-loading.ts';
import {renderPlots} from './laboratory.js';

const make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const fmt=n=>n===0?'0':Math.abs(n)<.001||Math.abs(n)>=1e5?n.toExponential(3):Number(n.toPrecision(4)).toString();

export function setupTargetLoading(host,{active=true,deferWhenClosed=false,simulate=simulateTargetLoading}={}){
 const panel=make('details'),body=make('div');panel.className='target-loading-panel';
 panel.append(make('summary','Isotope loading'),body);
 const controls=make('div'),label=make('label'),output=make('output'),input=make('input');controls.className='loading-controls';
 input.id='loading-replacement';input.type='range';input.min=0;input.max=1;input.step=.05;input.value=0;
 label.htmlFor=input.id;label.append(make('span','Non-fusing D replacement probability (assumed)'),output);
 const box=make('div');box.className='control';box.append(label,input);controls.append(box);
 const resolution=make('select'),resolutionLabel=make('label','Relative tolerance');resolution.id='loading-tolerance';resolutionLabel.htmlFor=resolution.id;
 for(const n of [1e-7,1e-9,1e-11]){const option=make('option',n.toExponential());option.value=n;resolution.append(option);}resolution.value=1e-11;resolutionLabel.append(resolution);controls.append(resolutionLabel);
 const plots=make('div'),status=make('p'),ledger=make('details'),budget=make('p'),numerics=make('p'),extraPlots=make('div');plots.className='live-plots';extraPlots.className='live-plots';status.setAttribute('role','status');
 ledger.append(make('summary','Populations & budgets'),budget,numerics,extraPlots);
 const notes=make('details'),list=make('ul'),link=make('a','Equations & sources ↗');link.href='/DEUTERON-STOPPING-LOADING.md';notes.append(make('summary','Model info'),list,link);
 const exportButton=make('button','Export loading calculation ↓');exportButton.type='button';exportButton.className='text-button';exportButton.disabled=true;
 body.append(controls,plots,status,ledger,notes,exportButton);host.append(panel);
 let source=null,latest=null,dirty=true;
 const config=()=>({replacementProbability:Number(input.value),intervals:200,relativeTolerance:Number(resolution.value),absoluteTolerance:Number(resolution.value)*.01});
 function calculate(){
  dirty=false;
  latest=null;plots.replaceChildren();extraPlots.replaceChildren();budget.textContent='';numerics.textContent='';list.replaceChildren();exportButton.disabled=true;
  output.textContent=fmt(Number(input.value));input.setAttribute('aria-valuetext',output.textContent+' replacement probability');
  if(!source){status.textContent='Choose valid source settings to calculate loading.';return;}
  try{
   latest=simulate(source,config());
   const fine=simulate(source,{...config(),relativeTolerance:config().relativeTolerance*.1,absoluteTolerance:config().absoluteTolerance*.1});
   latest.numericalComparison={relativeTolerance:fine.config.relativeTolerance,absoluteTolerance:fine.config.absoluteTolerance,
    neutronTotalRelativeChange:fine.final.cumulativeNeutrons===0?null:Math.abs(latest.final.cumulativeNeutrons/fine.final.cumulativeNeutrons-1),
    maximumPopulationChange:Math.max(...['tritiumFraction','deuteriumFraction','vacancyFraction'].map(key=>Math.abs(latest.final[key]-fine.final[key])))};
   renderPlots(plots,[{...latest.curves[0],yDomain:[0,1]},latest.curves[3]]);
   if(ledger.open)renderPlots(extraPlots,[...latest.curves.slice(1,3),latest.curves[4]]);
   const f=latest.final;
   budget.textContent=`Final sites: T ${fmt(100*f.tritiumFraction)}%, D ${fmt(100*f.deuteriumFraction)}%, vacant ${fmt(100*f.vacancyFraction)}%. Integrated D–T neutrons ${fmt(f.cumulativeNeutrons)}. Incident D ${fmt(f.incidentD)}; replacement arrivals ${fmt(f.retainedIncomingD)}; unretained D ${fmt(f.unretainedD)}; released T ${fmt(f.releasedT)}; released D ${fmt(f.releasedD)}; fused target T ${fmt(f.fusedT)}. Atom residuals: sites ${fmt(f.siteResidualNuclei)}, T ${fmt(f.tritiumResidualNuclei)}, D ${fmt(f.deuteriumResidualNuclei)}, incoming D ${fmt(f.incidentResidualNuclei)} nuclei. Replacement arrivals include D-on-D exchange, not just net retention.`;
   numerics.textContent=`Relative tolerance ${fmt(latest.config.relativeTolerance)} → ${fmt(fine.config.relativeTolerance)}; D–T neutron-total change ${latest.numericalComparison.neutronTotalRelativeChange===null?'zero yield':fmt(100*latest.numericalComparison.neutronTotalRelativeChange)+'%'}; maximum final population change ${fmt(latest.numericalComparison.maximumPopulationChange)}. ${latest.solver.acceptedSteps} accepted / ${latest.solver.rejectedSteps} rejected steps. Maximum scaled conservation residual ${fmt(latest.solver.maxScaledConservationResidual)}. Local tolerance is not a global accuracy guarantee.`;
   status.textContent='';
   list.replaceChildren(...latest.assumptions.map(text=>make('li',text)));exportButton.disabled=false;
  }catch(error){latest=null;status.textContent=error.message;}
 }
 function refresh(){if(active&&(!deferWhenClosed||panel.open)&&dirty)calculate();}
 function invalidate(){dirty=true;latest=null;exportButton.disabled=!source;refresh();}
 input.addEventListener('input',invalidate);resolution.addEventListener('change',invalidate);
 panel.addEventListener('toggle',refresh);
 ledger.addEventListener('toggle',()=>{extraPlots.replaceChildren();if(ledger.open&&latest)renderPlots(extraPlots,[...latest.curves.slice(1,3),latest.curves[4]]);});
 exportButton.addEventListener('click',()=>{if(dirty)calculate();if(!latest)return;const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,source:source.config,...latest},null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download='mass-spinner-target-loading.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 refresh();return {update(value){source=value;invalidate();},setActive(value){active=value;refresh();}};
}
