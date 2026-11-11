import {DEFAULT_COUPLED_TARGET} from './coupled-target.ts';
import {requestSimulationWithIdentity} from './worker-client.ts';
import {producingCode} from './producing-code.ts';
import {renderPlots} from './laboratory.js';

const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const format=value=>!Number.isFinite(value)?'—':value===0?'0':Math.abs(value)<.001||Math.abs(value)>=1e5?value.toExponential(3):Number(value.toPrecision(4)).toString();
const requestTarget=async(record,signal)=>{
 const reply=await requestSimulationWithIdentity(record,signal);
 return {...reply.result,producingCode:reply.producingCode};
};

/** One evolving target, with historical observers kept under References. */
export function setupCoupledTarget(host,{onUpdate=()=>{},onStatus=()=>{},onPlot=()=>{},transformPlots=curves=>curves,onMaterialMode=()=>{},request=requestTarget,implantationReference}={}){
 const panel=make('section'),header=make('div'),badge=make('span','Scenario');panel.className='coupled-target';
 header.className='coupled-target-heading';badge.className='scenario-badge';header.append(badge);
 const tabs=make('div'),panels=new Map(),buttons=new Map();tabs.className='target-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Target views');
 for(const [key,title]of [['dynamics','Dynamics'],['depth','Depth'],['settings','Settings']]){
  const button=make('button',title),body=make('div');button.type='button';button.id=`coupled-tab-${key}`;
  button.setAttribute('role','tab');button.setAttribute('aria-controls',`coupled-view-${key}`);
  body.id=`coupled-view-${key}`;body.setAttribute('role','tabpanel');body.setAttribute('aria-labelledby',button.id);
  panels.set(key,body);buttons.set(key,button);tabs.append(button);button.addEventListener('click',()=>selectTab(key));
  button.addEventListener('keydown',event=>{
   const keys=[...buttons.keys()],index=keys.indexOf(key);
   const next=event.key==='ArrowRight'?keys[(index+1)%keys.length]:event.key==='ArrowLeft'?keys[(index+keys.length-1)%keys.length]:event.key==='Home'?keys[0]:event.key==='End'?keys.at(-1):null;
   if(next){event.preventDefault();selectTab(next);buttons.get(next).focus();}
  });
 }
 let active='dynamics',beam=null,latest=null,acceptedSource=null,phase='invalid',timer=null,selected=0,revision=0,controller=null;
 const prompt=make('div'),materialButton=make('button','Use material model');prompt.className='target-mode-prompt';materialButton.type='button';materialButton.addEventListener('click',onMaterialMode);prompt.append(materialButton);
 const status=make('p');status.id='coupled-status';status.className='target-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const snapshot=make('div'),timeLabel=make('label'),timeOutput=make('output'),time=make('input'),beamState=make('span');snapshot.className='target-snapshot';
 time.id='coupled-time';time.type='range';time.min='0';time.max='0';time.step='1';time.value='0';time.disabled=true;
 timeLabel.htmlFor=time.id;timeLabel.append(make('span','Time'),timeOutput);snapshot.append(timeLabel,time,beamState);
 const metrics=make('div');metrics.className='coupled-target-metrics';
 const dynamics=make('div'),depth=make('div');dynamics.className='live-plots';depth.className='live-plots';
 const plotChoice=make('select'),plotLabel=make('label','Plot');plotChoice.id='coupled-plot';plotLabel.htmlFor=plotChoice.id;
 for(const [value,title]of [['source','Neutrons & temperature'],['isotopes','Isotopes'],['energy','Energy budget']]){const option=make('option',title);option.value=value;plotChoice.append(option);}plotChoice.value='source';
 const plotBar=make('div');plotBar.className='target-plot-choice';plotBar.append(plotLabel,plotChoice);panels.get('dynamics').append(plotBar,dynamics);
 const depthBar=make('div'),depthLabel=make('label','Temperature'),depthScope=make('select');depthBar.className='target-plot-choice';depthScope.id='coupled-depth-range';depthLabel.htmlFor=depthScope.id;
 for(const [value,title]of [['film','Film'],['assembly','Film & backing']]){const option=make('option',title);option.value=value;depthScope.append(option);}depthScope.value='film';depthBar.append(depthLabel,depthScope);panels.get('depth').append(depthBar,depth);
 const settings=panels.get('settings'),durationHost=make('div'),reads=new Map(),numericInputs=[];durationHost.className='coupled-duration';
 settings.append(durationHost);
 function section(title){const details=make('details'),body=make('div');details.append(make('summary',title),body);body.className='target-settings-grid';settings.append(details);return body;}
 const operating=make('div');operating.className='target-settings-grid';settings.append(operating);
 const thermal=section('Thermal properties · assumed'),kinetics=section('Material transport · assumed'),numerics=section('Numerics');
 function field(parent,key,title,unit,min,max,step,{log=false,celsius=false}={}){
  const box=make('div'),label=make('label'),output=make('output'),input=make('input');box.className='control';
  Object.assign(input,{id:`coupled-${key}`,type:'range',min:String(min),max:String(max),step:String(step)});
  input.dataset.rangeScale=log?'log10':'linear';input.dataset.unit=unit;
  const value=DEFAULT_COUPLED_TARGET[key];input.value=String(log?Math.log10(value):celsius?value-273.15:value);
  label.htmlFor=input.id;label.append(make('span',title),output);box.append(label,input);parent.append(box);
  const read=()=>log?10**Number(input.value):Number(input.value)+(celsius?273.15:0);reads.set(key,read);
  const readout=()=>{const physical=read();output.textContent=`${format(physical-(celsius?273.15:0))} ${unit}`.trim();input.setAttribute('aria-valuetext',output.textContent);};
  input.addEventListener('input',()=>{readout();schedule();});readout();return input;
 }
 field(operating,'replacementProbability','D replacement probability','',0,1,.01);
 field(operating,'pulseDuty','Beam duty','',0,1,.05);
 field(operating,'pulsePeriodS','Pulse period','s',-2,1,.05,{log:true});
 field(operating,'cooldownS','Cooldown','s',0,30,1);
 field(thermal,'coolantK','Coolant','°C',-20,200,1,{celsius:true});
 field(thermal,'initialK','Initial temperature','°C',-20,300,1,{celsius:true});
 field(thermal,'backHeatTransferWM2K','Back cooling','W m⁻² K⁻¹',0,20000,100);
 field(thermal,'filmThicknessM','Film thickness','m',-8,-4,.05,{log:true});
 field(thermal,'filmConductivityWMK','Film conductivity','W m⁻¹ K⁻¹',-1,2,.05,{log:true});
 field(thermal,'filmHeatCapacityJm3K','Film heat capacity','J m⁻³ K⁻¹',5,7,.05,{log:true});
 field(thermal,'backingThicknessM','Backing thickness','m',-4,-2,.05,{log:true});
 field(thermal,'backingConductivityWMK','Backing conductivity','W m⁻¹ K⁻¹',0,3,.05,{log:true});
 field(thermal,'backingHeatCapacityJm3K','Backing heat capacity','J m⁻³ K⁻¹',5,7,.05,{log:true});
 field(thermal,'contactResistanceM2KPerW','Film/backing contact resistance','m² K W⁻¹',0,.0001,.000001);
 // Explicit zeros retain absent processes; no invented nonzero LiT coefficients.
 for(const [key,title,unit,max]of [
  ['diffusivityM2S','Diffusivity prefactor','m² s⁻¹',1],['diffusionActivationEV','Diffusion activation','eV',10],
  ['releaseAttemptRateS','Release prefactor','s⁻¹',1e16],['releaseActivationEV','Release activation','eV',10],
  ['surfaceReleaseVelocityMS','Front release speed','m s⁻¹',1e3],['surfaceReleaseActivationEV','Front release activation','eV',10],
  ['backPermeationVelocityMS','Back permeation speed','m s⁻¹',1e3],['backPermeationActivationEV','Back permeation activation','eV',10],
  ['renewalRateS','Renewal rate','s⁻¹',1e6],['renewalTritiumFraction','Renewal T fraction','',1]]){
  const box=make('div'),label=make('label'),input=make('input');box.className='control';Object.assign(input,{id:`coupled-${key}`,type:'number',min:'0',max:String(max),step:'any',value:String(DEFAULT_COUPLED_TARGET[key])});
  numericInputs.push(input);
  label.htmlFor=input.id;label.textContent=`${title}${unit?' ('+unit+')':''}`;box.append(label,input);kinetics.append(box);reads.set(key,()=>input.valueAsNumber);input.addEventListener('input',schedule);
 }
 for(const [key,title,values]of [['depthCells','Film cells',[4,8,16,32]],['backingCells','Backing cells',[4,8,16,32]],['maxStepS','Maximum step (s)',[.2,.1,.05,.025]],['relativeTolerance','Relative tolerance',[1e-3,1e-4,1e-5,1e-6,1e-7]]]){
  const label=make('label',title),input=make('select');input.id=`coupled-${key}`;label.htmlFor=input.id;
  for(const value of values){const option=make('option',String(value));option.value=String(value);input.append(option);}input.value=String(DEFAULT_COUPLED_TARGET[key]);label.append(input);numerics.append(label);reads.set(key,()=>Number(input.value));input.addEventListener('change',schedule);
 }
 const ledger=make('details'),ledgerText=make('pre');ledger.append(make('summary','Balances'),ledgerText);
 const info=make('details'),infoList=make('ul'),link=make('a','Equations & evidence ↗');link.href='/COUPLED-TARGET-V35.md';info.append(make('summary','Model info'),infoList,link);
 const references=make('details'),referenceHost=make('div');references.className='target-references';references.append(make('summary','References'),referenceHost);
 if(implantationReference){
  const recorded=make('details'),recordedPlot=make('div'),readout=make('p'),scope=make('p'),caseSelect=make('select'),caseLabel=make('label','Recorded case');
  recordedPlot.className='live-plots';caseSelect.id='implantation-reference-case';caseLabel.htmlFor=caseSelect.id;
  recorded.append(make('summary','Implantation benchmark'),caseLabel,caseSelect,scope,readout,recordedPlot);references.append(recorded);
  const data=implantationReference;
  if(data.schemaVersion!==1||data.geometry!=='HOMOGENEOUS_HALFSPACE'||data.experimentallyValidatedLiT!==false||data.finiteFilmRetentionLaw!==false||data.assumptions?.electronicStoppingMode!=='INTERPOLATED'){
   scope.textContent='Unsupported implantation reference.';caseSelect.disabled=true;
  }else{
   for(const [index,sample]of data.cases.entries()){const option=make('option',`${sample.energyKeV} keV · seed ${sample.seed}`);option.value=String(index);caseSelect.append(option);}caseSelect.value='0';
   scope.textContent=`Recorded homogeneous half-space, uncalibrated LiT. Not a film-retention law. Upstream smoke: ${data.upstreamExample.roundedReferenceMatch?'matched':'mismatch retained'}.`;
   const raw=make('a','Recorded data ↗');raw.href='/marathon-reference/implantation-v35.json';recorded.append(raw);
   const show=()=>{
    const sample=data.cases[Number(caseSelect.value)];
    const display=Array.isArray(data.displayDepthEdgesM)&&Array.isArray(sample.displayPerIncidentDepthFractions),edges=display?data.displayDepthEdgesM:data.depthEdgesM;
    readout.textContent=`${sample.incidentCount} incident ions · reflected ${format(100*sample.reflectedFraction)}% · beyond validation grid ${format(100*sample.beyondHistogramFraction)}% · unclassified ${format(100*sample.unclassifiedFraction)}%.${display?` Extended display only · beyond display ${format(100*sample.beyondDisplayHistogramFraction)}%.`:''}`;
    renderPlots(recordedPlot,[{label:`${sample.energyKeV} keV · seed ${sample.seed}${display?' · extended display':''}`,x:edges.slice(1).map((edge,i)=>(edge+edges[i])/2*1e6),y:display?sample.displayPerIncidentDepthFractions:sample.perIncidentDepthFractions,xLabel:'Deposited depth (µm)',yLabel:'Fraction of incident ions per bin'}]);
   };
   caseSelect.addEventListener('change',show);show();
  }
 }
 const exportButton=make('button','Export');exportButton.type='button';exportButton.className='text-button';exportButton.id='coupled-export';exportButton.disabled=true;
 panel.append(header,tabs,prompt,status,snapshot,metrics,...panels.values(),ledger,info,exportButton,references);host.append(panel);
 function selectTab(key){active=key;for(const [name,body]of panels){body.hidden=name!==key;buttons.get(name).setAttribute('aria-selected',String(name===key));buttons.get(name).tabIndex=name===key?0:-1;}if(latest)renderSelected();}
 const currentSnapshot=()=>latest?{result:latest,state:latest.history[selected],source:acceptedSource}:null;
 const pendingText=()=>latest?`Updating… Showing last completed scenario at ${format(latest.history[selected].timeS)} s; source ${format(acceptedSource.beamEnergyKeV)} keV, ${format(acceptedSource.beamCurrentA)} A. Inputs in Balances.`:'Updating…';
 function report(){panel.dataset.status=phase;onStatus({phase,revision,snapshot:currentSnapshot()});}
 function cancel(){revision++;controller?.abort();controller=null;clearTimeout(timer);timer=null;exportButton.disabled=true;}
 function clear(message){latest=null;acceptedSource=null;phase='invalid';time.disabled=true;timeOutput.textContent='—';beamState.textContent='';metrics.replaceChildren();renderPlots(dynamics,[]);renderPlots(depth,[]);ledgerText.textContent='';infoList.replaceChildren();status.textContent=message;onUpdate(null);report();}
 function readConfig(){const config={...DEFAULT_COUPLED_TARGET};for(const [key,read]of reads)config[key]=read();config.absoluteTolerance=config.relativeTolerance*.0001;return config;}
 function schedule(){
  cancel();prompt.hidden=!beam||beam.config.stoppingModel==='geant4-bragg';
  if(!beam){clear('No valid source.');return;}
  if(beam.config.stoppingModel!=='geant4-bragg'){clear('Material stopping required.');return;}
  if(numericInputs.some(input=>!input.checkValidity()||!Number.isFinite(input.valueAsNumber))){clear('Enter valid material settings.');return;}
  phase='pending';status.textContent=pendingText();report();timer=setTimeout(calculate,250);
 }
 async function calculate(){
  timer=null;const id=revision,current=new AbortController(),source={...beam.config},config=readConfig();controller=current;
  try{
   const result=await request({id,kind:'coupled-target',schemaVersion:1,beam:source,config},current.signal);
   if(id!==revision)return;
   if(result?.model!=='coupled-depth-target-scenario'||!Array.isArray(result.history)||!result.history.length)throw new Error('Unsupported coupled-target result.');
   latest=result;acceptedSource=source;phase='accepted';selected=0;time.max=String(latest.history.length-1);time.value='0';time.disabled=false;exportButton.disabled=false;
   infoList.replaceChildren(...latest.assumptions.map(text=>make('li',text)));status.textContent='';renderSelected();
   if(id===revision)time.dispatchEvent(new time.ownerDocument.defaultView.Event('coupled-accepted',{bubbles:true}));
  }catch(error){if(id!==revision)return;clear(error.message);}
  finally{if(controller===current)controller=null;}
 }
 function renderSelected(){
  const state=latest.history[selected],history=latest.history,x=history.map(sample=>sample.timeS);
  timeOutput.textContent=`${format(state.timeS)} s`;time.setAttribute('aria-valuetext',timeOutput.textContent);beamState.textContent=state.beamOn?'Beam on':'Beam off';
  metrics.replaceChildren(...[['D–T neutrons',format(state.neutronRateS)+' s⁻¹'],['Hottest film cell',format(Math.max(...state.temperatureK.slice(0,latest.config.depthCells))-273.15)+' °C']].map(([label,value])=>{const row=make('div');row.append(make('span',label),make('strong',value));return row;}));
  const draw=(host,curves,observable)=>{renderPlots(host,transformPlots(curves,{host,observable}));onPlot({host,curves,observable});};
  const curve=(label,y,yLabel)=>({label,x,y,xLabel:'Time (s)',yLabel,selectedX:state.timeS});
  if(active==='dynamics'){
   let curves;
   if(plotChoice.value==='isotopes')curves=['tritiumFraction','deuteriumFraction','vacancyFraction'].map((key,i)=>({...curve(['T','D','Vacant'][i],history.map(sample=>sample[key].reduce((a,b)=>a+b,0)/sample[key].length),'Site fraction'),yDomain:[0,1]}));
   else if(plotChoice.value==='energy')curves=['depositedJ','storedChangeJ','coolantJ'].map((key,i)=>curve(['Deposited','Stored change','Coolant'][i],history.map(sample=>sample.energy[key]),'Energy (J)'));
   else curves=[curve('D–T production',history.map(sample=>sample.neutronRateS),'Neutrons (s⁻¹)'),curve('Hottest film cell',history.map(sample=>Math.max(...sample.temperatureK.slice(0,latest.config.depthCells))-273.15),'Cell-average temperature (°C)')];
   draw(dynamics,curves,`target:${plotChoice.value}`);
  }
  if(active==='depth'){
   const count=depthScope.value==='film'?latest.config.depthCells:state.temperatureK.length;
   const depthX=state.depthM.map(value=>value*1e6),thermalX=state.thermalDepthM.slice(0,count).map(value=>value*1e6);
   draw(depth,[{label:'Cell averages',x:thermalX,y:state.temperatureK.slice(0,count).map(value=>value-273.15),xLabel:'Depth (µm)',yLabel:'Cell-average temperature (°C)'},
    ...['tritiumFraction','deuteriumFraction','vacancyFraction'].map((key,i)=>({label:['T','D','Vacant'][i],x:depthX,y:state[key],xLabel:'Film depth (µm)',yLabel:'Site fraction',yDomain:[0,1]}))],`target:depth:${depthScope.value}`);
  }
  ledgerText.textContent=JSON.stringify({source:acceptedSource,config:latest.config,timeS:state.timeS,energyJ:state.energy,atomResiduals:state.atomResiduals,cumulativeNeutrons:state.cumulativeNeutrons},null,2);
  if(phase==='accepted')onUpdate({...currentSnapshot(),status:phase});else status.textContent=pendingText();report();
 }
 time.addEventListener('input',()=>{if(!latest)return;selected=Number(time.value);renderSelected();});plotChoice.addEventListener('change',()=>{if(latest)renderSelected();});
 depthScope.addEventListener('change',()=>{if(latest)renderSelected();});
 exportButton.addEventListener('click',()=>{if(!latest||phase!=='accepted')return;const payload={schemaVersion:1,source:acceptedSource,selectedTimeS:latest.history[selected].timeS,...latest,producingCode:producingCode(latest.producingCode)},url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download='mass-spinner-coupled-target.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 selectTab('dynamics');schedule();return {durationHost,referenceHost,focusSetting(selector){selectTab('settings');const input=settings.querySelector(selector);if(input){for(let parent=input.parentElement;parent&&parent!==settings;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;input.scrollIntoView?.({block:'nearest'});input.focus();}},update(value){beam=value;schedule();},get result(){return latest;},get status(){return {phase,revision,snapshot:currentSnapshot()};}};
}
