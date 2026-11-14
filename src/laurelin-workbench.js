import {LAURELIN_DEFAULTS,PULSE_PHASES,simulateLaurelin} from './laurelin-physics.js';
import {LAURELIN_COMPONENTS} from './laurelin-scene.js';
export function mountLaurelin({document,createScene,modelSource,requestFrame}){
const $=id=>document.getElementById(id),config={...LAURELIN_DEFAULTS};
$('model-source').href=modelSource;
const definitions=[
 ['temperatureKeV','Initial temperature',.5,5,.1,x=>`${x.toFixed(1)} keV`],
 ['densityM3','Initial D density',20,23,.1,x=>`10${sup(x.toFixed(1))} m⁻³`,true],
 ['speedKmS','Each plasmoid speed',0,600,10,x=>`${x} km/s`],
 ['compression','Volume compression',1,30,.5,x=>`${x.toFixed(1)}×`],
 ['durationUs','Pulse duration',25,1000,5,x=>`${x} µs`],
 ['confinementUs','Energy confinement',50,2000,25,x=>`${x} µs`],
 ['driverEfficiency','Driver efficiency',.1,1,.01,x=>`${Math.round(x*100)}%`],
 ['recoveryEfficiency','Expansion recovery',0,1,.01,x=>`${Math.round(x*100)}%`],
 ['frequencyHz','Repetition rate',.1,20,.1,x=>`${x.toFixed(1)} Hz`],
 ['parasiticKW','Steady auxiliary load',0,100,1,x=>`${x} kW`],
];
function sup(s){return [...s].map(c=>({'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','.':'·'}[c]??c)).join('');}
const controls=[];
for(const [key,name,min,max,step,format,log]of definitions){
 const label=document.createElement('label'),line=document.createElement('span'),output=document.createElement('output'),input=document.createElement('input');
 const id=`parameter-${key}`;input.id=id;label.htmlFor=id;output.htmlFor=id;
 line.append(document.createTextNode(name),output);input.type='range';input.min=min;input.max=max;input.step=step;
 input.value=log?Math.log10(config[key]):config[key];output.value=format(log?Math.log10(config[key]):config[key]);
 input.addEventListener('input',()=>{const value=Number(input.value);config[key]=log?10**value:value;output.value=format(value);recalculate();});
 label.append(line,input);$('sliders').append(label);controls.push({input,output,key,format,log});
}
let result=simulateLaurelin(config),fraction=0,playing=false,lastTime=null,scene;
function openPanel(id){
 for(const key of ['controls','plots','model','inspector'])$(key).hidden=key!==id;
 for(const button of document.querySelectorAll('[data-panel]'))button.setAttribute('aria-expanded',String(button.dataset.panel===id));
}
function inspectComponent(id){
 const [name,purpose,material]=LAURELIN_COMPONENTS[id];
 $('component-name').textContent=name;$('component-purpose').textContent=purpose;$('component-material').textContent=material;openPanel('inspector');
 $('inspector').querySelector('button').focus();
}
for(const [id,[name]]of Object.entries(LAURELIN_COMPONENTS)){
 const option=document.createElement('option');option.value=id;option.textContent=name;$('component-select').append(option);
}
$('component-select').addEventListener('change',()=>{const id=$('component-select').value;if(id)inspectComponent(id);});
for(const button of document.querySelectorAll('[data-panel]'))button.addEventListener('click',()=>openPanel($(button.dataset.panel).hidden?button.dataset.panel:null));
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>openPanel(null));
try{scene=createScene($('reactor'),inspectComponent);}catch(error){console.error('Laurelin graphics initialization failed',error);$('graphics-error').hidden=false;}
$('home').addEventListener('click',()=>scene?.home());
$('play').addEventListener('click',()=>{if(fraction>=1)fraction=0;playing=!playing;$('play').textContent=playing?'Pause':'Play';lastTime=null;});
$('restart').addEventListener('click',()=>{fraction=0;playing=false;$('play').textContent='Play';draw();});
$('timeline').addEventListener('input',()=>{fraction=Number($('timeline').value);playing=false;$('play').textContent='Play';draw();});
$('reset').addEventListener('click',()=>{
 Object.assign(config,LAURELIN_DEFAULTS);
 for(const c of controls){const value=c.log?Math.log10(config[c.key]):config[c.key];c.input.value=value;c.output.value=c.format(value);}
 recalculate();
});
const number=(value,unit='')=>value===null?'Unsupported':`${Math.abs(value)>=1e6?value.toExponential(2):value.toLocaleString(undefined,{maximumSignificantDigits:3})}${unit}`;
function plot(title,key,color,unit){
 const values=result.samples.map(s=>s[key]).filter(x=>x!==null),max=Math.max(...values,1e-30);
 let pen=false,path='';for(const s of result.samples){
  if(s[key]===null){pen=false;continue;}path+=`${pen?'L':'M'}${(s.fraction*250+30).toFixed(2)},${(106-90*s[key]/max).toFixed(2)}`;pen=true;
 }
 return `<figure><figcaption>${title}<span>${number(max,unit)}</span></figcaption><svg viewBox="0 0 290 129" role="img" aria-label="${title} over pulse time. Linear scale, zero to ${max} ${unit}"><path d="M30 14V106H280" fill="none" stroke="#35483c"/><text x="26" y="116" fill="#adbcaf" font-size="9">0</text><text x="238" y="123" fill="#adbcaf" font-size="9">${config.durationUs} µs</text><path d="${path}" fill="none" stroke="${color}" stroke-width="1.8"/><line class="plot-cursor" x1="30" x2="30" y1="14" y2="106"/></svg></figure>`;
}
function recalculate(){result=simulateLaurelin(config);updateResults();draw();}
function updateResults(){
 $('charts').innerHTML=plot('Temperature','temperatureKeV','#d7b777',' keV')+plot('D density','densityM3','#b0c6ad',' m⁻³')+plot('D–D neutron rate','neutronRateS','#d4a891',' s⁻¹');
 const rows=[['Plasma driver input',result.driverJ],['Expansion return',result.recoveredJ],['Auxiliary load',result.parasiticJ],['Nonfusion net',result.netNonfusionJ],['Charged fusion energy',result.chargedJ],['Neutron energy',result.neutronJ]];
 $('ledger').innerHTML=rows.map(([label,v])=>`<dt>${label}</dt><dd>${number(v===null?null:v/1000,' kJ')}</dd>`).join('');
 const note=result.unsupportedSteps?'D–D yield unavailable: part of this pulse leaves the 0.2–100 keV fit range.':
  !result.diagnosticValid?'D–D yield exceeds the low-burn / negligible-heating approximation; coupled burn is required.':
  'D–D yield: low-burn estimate. Fusion electricity is unsolved.';
 $('validity').textContent=note;
}
function draw(){
 const state=result.samples[Math.min(result.samples.length-1,Math.round(fraction*(result.samples.length-1)))];
 $('timeline').value=fraction;$('clock').value=`${state.timeUs.toFixed(1)} µs`;$('phase').textContent=PULSE_PHASES[state.phase];
 $('temperature').textContent=state.temperatureKeV.toFixed(2);$('density').textContent=state.densityM3.toExponential(1);$('field').textContent=state.balanceFieldT.toFixed(2);
 for(const line of document.querySelectorAll('.plot-cursor')){line.setAttribute('x1',30+fraction*250);line.setAttribute('x2',30+fraction*250);}
 scene?.update(state,config);
}
function frame(time){
 if(playing&&lastTime!==null){fraction=Math.min(1,fraction+(time-lastTime)/10000);if(fraction===1){playing=false;$('play').textContent='Play';}}
 lastTime=time;draw();requestFrame(frame);
}
updateResults();draw();requestFrame(frame);
return {get result(){return result;},get fraction(){return fraction;}};
}
