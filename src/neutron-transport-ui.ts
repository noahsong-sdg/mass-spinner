import {simulateFirstFlightNeutrons,type FirstFlightConfig} from './neutron-transport.js';
import {neutronHydrogenReference,type HydrogenReferenceData} from './neutron-data.js';
import {renderPlots} from './laboratory.js';
import hydrogenData from '../web-assets/marathon-reference/h1-endfb81-v35.json' with {type:'json'};
import recordedOpenMC from '../web-assets/marathon-reference/neutrons-v35.json' with {type:'json'};
import {setupDecayNetwork} from './decay-network-ui.js';
import type {NeutronResponsePacket} from './neutron-response.js';
import {setupNeutronResponse} from './neutron-response-ui.js';
import responseData from '../web-assets/neutron-response/h1-v38.json' with {type:'json'};

const make=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string):HTMLElementTagNameMap[K]=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const fmt=(n:number)=>n===0?'0':Math.abs(n)<.001||Math.abs(n)>=1e5?n.toExponential(3):Number(n.toPrecision(4)).toString();

export type SourceNeutronState={sourceRateS:number;sourceEnergyMeV:number|null};
export type NeutronTransportSnapshot=Omit<ReturnType<typeof simulateFirstFlightNeutrons>,'config'>&{
 config:FirstFlightConfig;source:SourceNeutronState;
 material:({type:'endfb-h1'}&ReturnType<typeof neutronHydrogenReference>)|{type:'custom';assumed:boolean};
 referenceEvidence:typeof recordedOpenMC&{appliesToCurrentControls:boolean};
};

/** First-flight scenario with optional evaluated H-1 data; density/response remain assumed. */
export function setupNeutronTransport(host:HTMLElement){
 const panel=make('details'),body=make('div'),metrics=make('div'),plot=make('div'),status=make('p');
 panel.className='fusion-model-notes neutron-transport-panel';panel.append(make('summary','Neutron interactions'),body);
 metrics.className='fusion-readouts';plot.className='live-plots';status.setAttribute('role','status');
 const settings=make('details'),controls=make('div'),notes=make('details'),list=make('ul');
 controls.className='instrument-controls';settings.append(make('summary','Geometry & material assumptions'),controls);
 const material=make('select'),materialLabel=make('label','Material');material.id='neutron-transport-material';materialLabel.htmlFor=material.id;
 for(const [value,label]of [['custom','Custom coefficients'],['endfb-h1','H-1 · ENDF/B-VIII.1']]){const option=make('option',label);option.value=value;material.append(option);}material.value='custom';controls.append(materialLabel,material);
 notes.append(make('summary','Model info'),list);
 const checks=make('details'),checkPlot=make('div'),checkText=make('p');checkPlot.className='live-plots';
 checks.append(make('summary','Angular refinement'),checkText,checkPlot);
 const exportButton=make('button','Export neutron calculation ↓');exportButton.type='button';exportButton.className='text-button';exportButton.disabled=true;
 const reference=make('details'),table=make('table'),caption=make('caption','Recorded OpenMC absorption per source neutron'),head=make('thead'),headRow=make('tr'),rows=make('tbody');
 for(const title of ['Case','First absorbed','OpenMC mean ± SE'])headRow.append(make('th',title));head.append(headRow);
 for(const record of recordedOpenMC.cases){const row=make('tr');row.dataset.case=record.name;for(const text of [record.name,fmt(record.firstFlight.firstAbsorbed),`${fmt(record.openmcAbsorption.mean)} ± ${fmt(record.openmcAbsorption.stdError)}`])row.append(make('td',text));rows.append(row);}
 table.append(caption,head,rows);reference.append(make('summary','OpenMC reference'),table,
  make('p',`OpenMC ${recordedOpenMC.openmcVersion} · ${recordedOpenMC.historiesPerCase.toLocaleString()} histories/case. These recorded multiple-scattering runs use synthetic one-group coefficients. The current sliders do not change them. SE means Monte Carlo standard error.`),
  make('p','The live calculation includes first collisions only. Mixed-case OpenMC absorption also includes later collisions after scattering. These references and the evaluated H-1 data do not give experimental calibration for LiT, detector response, dose or displacement damage.'));
 const pendingNote=make('p');pendingNote.hidden=true;
 body.append(metrics,plot,status,pendingNote,settings,checks,reference,notes,exportButton);host.append(panel);
 setupDecayNetwork(body);
 setupNeutronResponse(body,responseData as NeutronResponsePacket);
 const reads=new Map<string,()=>number>(),boxes=new Map<string,HTMLDivElement>();
 let source:SourceNeutronState|null=null,latest:NeutronTransportSnapshot|null=null,pending=false;
 const fields:[string,string,string,number,number,number,number,boolean?][]=[
  ['distance','Source to front face','m',.05,3,.05,.5],
  ['area','Sample face area','cm²',1,1000,1,10],
  ['thickness','Layer thickness','cm',0,20,.1,1],
  ['total','Total coefficient Σₜ (assumption)','m⁻¹',0,1000,1,0],
  ['absorption','Absorption coefficient Σₐ (assumption)','m⁻¹',0,1000,1,0],
  ['efficiency','Detection probability per first absorption (assumption)','',0,1,.01,0],
  ['density','H-1 atom density (assumption)','m⁻³',24,30,.1,28,true],
 ];
 function config():{evaluated:ReturnType<typeof neutronHydrogenReference>|null;config:FirstFlightConfig}{
  if(material.value==='endfb-h1'&&source!.sourceEnergyMeV===null)throw new Error('The beam is off. H-1 coefficients use the energy of emitted neutrons. For a zero-source reference, select Custom coefficients.');
  const evaluated=material.value==='endfb-h1'?neutronHydrogenReference(hydrogenData as HydrogenReferenceData,source!.sourceEnergyMeV!,reads.get('density')!()):null;
  return {evaluated,config:{sourceRateS:source!.sourceRateS,sourceEnergyMeV:source!.sourceEnergyMeV,
   distanceM:reads.get('distance')!(),sampleAreaM2:reads.get('area')!()/1e4,
   layers:[{name:evaluated?'H-1 · ENDF/B-VIII.1':'Custom assumed layer',thicknessM:reads.get('thickness')!()/100,
    totalMInv:evaluated?.totalMInv??reads.get('total')!(),absorptionMInv:evaluated?.absorptionMInv??reads.get('absorption')!(),detectorEfficiency:reads.get('efficiency')!()}],angularSamples:128}};
 }
 function renderRefinement(){
  renderPlots(checkPlot,[]);checkText.textContent='';if(!latest||!checks.open)return;
  const accepted=latest,samples=[16,32,64,128,256],runs=samples.map(angularSamples=>simulateFirstFlightNeutrons({...accepted.config,angularSamples}));
  renderPlots(checkPlot,([['firstAbsorbed','First absorbed'],['firstScatteredUnresolved','First scattered · unresolved']] as const).map(([key,label])=>({
   label,x:runs.map(r=>r.convergence.angularSamples),y:runs.map(r=>r.fractions[key]),xLabel:'Angular quadrature samples',yLabel:'Fraction of source neutrons'})));
  checkText.textContent='This comparison shows sensitivity to angular quadrature only. Material data and paths after the first scattering event remain unqualified.';
 }
 function calculate(){
  latest=null;metrics.replaceChildren();renderPlots(plot,[]);renderPlots(checkPlot,[]);checkText.textContent='';list.replaceChildren();exportButton.disabled=true;
  if(!source){status.textContent='No source result is available.';return;}
  try{
   const selected=config(),c=selected.config,result=simulateFirstFlightNeutrons(c);latest={...result,config:c,source:{...source},
    material:selected.evaluated?{type:'endfb-h1',...selected.evaluated}:{type:'custom',assumed:true},
    referenceEvidence:{...recordedOpenMC,appliesToCurrentControls:false}};
   for(const [label,value]of [['First absorbed',result.rates.firstAbsorbed],['First scattered · unresolved',result.rates.firstScatteredUnresolved],['Detected · response assumption',result.detectionRateS]] as const){
    const row=make('div');row.append(make('span',label),make('output',`${fmt(value)} s⁻¹`));metrics.append(row);
   }
   const thickness=reads.get('thickness')!(),x=[...new Set([0,...Array.from({length:21},(_,i)=>i),thickness])].sort((a,b)=>a-b);
   const scan=x.map(cm=>simulateFirstFlightNeutrons({...c,layers:[{...c.layers[0],thicknessM:cm/100}]}));
   renderPlots(plot,([['firstAbsorbed','First absorbed'],['firstScatteredUnresolved','First scattered · unresolved'],['uncollidedEscaped','Uncollided escape']] as const).map(([key,label])=>({
    label,x,y:scan.map(r=>r.rates[key]),xLabel:'Layer thickness (cm)',yLabel:'Neutrons (s⁻¹)',selectedX:thickness})));
   list.replaceChildren(make('li',selected.evaluated?`H-1 microscopic cross sections use ENDF/B-VIII.1 interpolation at ${fmt(source.sourceEnergyMeV!)} MeV. You specify atom density and detection probability per first absorption. These inputs do not form a LiT material model.`:'You specify custom coefficients at the selected neutron energy. These inputs do not describe a measured material or a calibrated detector.'),
    ...result.assumptions.map(text=>make('li',text)));
   if(selected.evaluated){const item=make('li'),link=make('a','NNDC evaluated source ↗');link.href=selected.evaluated.source.url;item.append(link);list.append(item);}
   status.textContent='';exportButton.disabled=pending;renderRefinement();
  }catch(error){latest=null;metrics.replaceChildren();renderPlots(plot,[]);renderPlots(checkPlot,[]);checkText.textContent='';list.replaceChildren();status.textContent=error instanceof Error?error.message:String(error);}
 }
 for(const [key,title,unit,min,max,step,value,log]of fields){
  const box=make('div'),caption=make('label'),output=make('output'),input=make('input');box.className='control';
  Object.assign(input,{id:`neutron-transport-${key}`,type:'range',min,max,step,value});caption.htmlFor=input.id;caption.append(make('span',title),output);box.append(caption,input);controls.append(box);
  input.dataset.rangeScale=log?'log10':'linear';input.dataset.unit=unit;
  boxes.set(key,box);reads.set(key,()=>log?10**Number(input.value):Number(input.value));
  const readout=()=>{output.textContent=`${fmt(reads.get(key)!())} ${unit}`.trim();input.setAttribute('aria-valuetext',output.textContent);};
  input.addEventListener('input',()=>{readout();calculate();});readout();
 }
 function setMaterial(){const evaluated=material.value==='endfb-h1';for(const key of ['total','absorption'])boxes.get(key)!.hidden=evaluated;boxes.get('density')!.hidden=!evaluated;calculate();}
 material.addEventListener('change',setMaterial);
 checks.addEventListener('toggle',renderRefinement);
 exportButton.addEventListener('click',()=>{
  if(!latest||pending)return;const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,...latest},null,2)],{type:'application/json'})),a=make('a');
  a.href=url;a.download='mass-spinner-neutron-first-flight.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 setMaterial();return {update(value:SourceNeutronState|null){source=value;calculate();},read:()=>latest,setPending(value:boolean){
  pending=Boolean(value);pendingNote.hidden=!pending;pendingNote.textContent='The source calculation is in progress. The display shows the last completed source state.';
  panel.dataset.pending=String(pending);exportButton.disabled=pending||!latest;
 }};
}
