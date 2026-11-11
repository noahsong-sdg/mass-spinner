import {resolveMaterialGeometry,stoppingDomainForFilm} from './material-realism.ts';
import {advanceLithiumCoating} from './lithium-coating.ts';
import {renderPlots} from './laboratory.js';

const format=x=>Number(x.toPrecision(4)).toString();
/** Geometry linking edits the existing solver inputs. Coating is a separate external balance. */
export function setupMaterialRealism({document:doc=document,readSource}={}){
 const byId=id=>doc.getElementById(id),make=(tag,text)=>{const el=doc.createElement(tag);if(text)el.textContent=text;return el;};
 const host=make('details'),title=make('summary','Material'),mode=make('select'),density=make('input'),readout=make('p'),error=make('p'),map=make('p');
 host.className='material-realism';host.append(title);byId('fusion-assumption-controls').append(host);
 mode.id='material-geometry-mode';for(const [value,name]of [['independent','Independent column & thickness'],['number-density','Link at fixed Li-site density']]){const option=make('option',name);option.value=value;mode.append(option);}
 density.id='material-number-density';density.type='number';density.min='1e-100';density.step='any';
 const label=(name,input)=>{const row=make('label',name);row.append(input);host.append(row);return row;};
 label('Geometry',mode);const densityLabel=label('Li sites / m³',density);error.setAttribute('role','alert');host.append(readout,map,error);
 const column=byId('fusion-materialColumnM2'),thickness=byId('coupled-filmThicknessM');
 const physical=range=>10**Number(range.value);density.value=String(physical(column)/physical(thickness));
 let linking=false,lastGeometry={column:column.value,thickness:thickness.value};
 function setExact(range,value){const coordinate=Math.log10(value);if(!Number.isFinite(coordinate)||coordinate<Number(range.min)||coordinate>Number(range.max))throw new RangeError('Linked geometry lies outside the solver control domain; adjust density, column or thickness.');range.step='any';range.value=String(coordinate);range.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));}
 function update(edited='thickness',apply=false){
  if(linking)return;linking=true;
  try{
   const linked=mode.value==='number-density';densityLabel.hidden=!linked;
   const value=resolveMaterialGeometry({mode:mode.value,materialColumnM2:physical(column),filmThicknessM:physical(thickness),numberDensityM3:density.valueAsNumber},edited);
   if(linked&&apply){const target=edited==='column'?thickness:column,derived=edited==='column'?value.filmThicknessM:value.materialColumnM2;setExact(target,derived);}
   if(!linked)density.value=String(value.numberDensityM3);
   readout.textContent=`${format(value.numberDensityM3)} Li sites/m³ · ${format(value.filmThicknessM*1e6)} µm · ${format(value.materialColumnM2)} Li sites/m²`;
   error.textContent='';const source=readSource();map.textContent='';
   if(source.stoppingModel==='geant4-bragg'){
    const t=source.targetColumnM2/value.materialColumnM2;
    const domain=stoppingDomainForFilm(source.beamEnergyKeV,value.materialColumnM2,{tritiumFraction:t,deuteriumFraction:1-t});
    map.textContent=domain.exitEnergyKeV===null?'Film extends beyond the stopping fit; no stopped-tail extrapolation.':`Mean exit energy ${format(domain.exitEnergyKeV)} keV · atomic stopping estimate`;
   }
   lastGeometry={column:column.value,thickness:thickness.value};
  }catch(reason){
   if(apply){for(const [range,value]of [[column,lastGeometry.column],[thickness,lastGeometry.thickness]]){range.step='any';range.value=value;range.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));}}
   error.textContent=reason.message;
  }
  finally{linking=false;}
 }
 for(const [range,edited]of [[column,'column'],[thickness,'thickness']])range.addEventListener('input',()=>update(edited,true),{capture:true});
 mode.addEventListener('change',()=>update('thickness',true));density.addEventListener('input',()=>update('thickness',true));
 byId('fusion-beamEnergyKeV').addEventListener('input',()=>update());byId('fusion-tritiumSiteFraction').addEventListener('input',()=>update());byId('fusion-stopping-model').addEventListener('change',()=>update());
 host.addEventListener('toggle',()=>{if(host.open)update();});update();
 const coating=make('details'),coatingTitle=make('summary','Li deposition & erosion'),note=make('p','External well-mixed inventory; does not evolve the reacting film or its temperature.'),plots=make('div'),summary=make('p'),coatingError=make('p');
 coating.className='material-realism';coating.append(coatingTitle,note);plots.className='live-plots';coatingError.setAttribute('role','alert');host.after(coating);
 const controls={};
 for(const [key,name,value,min,max]of [['deposition','Li deposition / m²/s',0,0,null],['erosion','Li erosion / m²/s',0,0,null],['incoming-t','Incoming T / Li',0,0,1],['incoming-d','Incoming D / Li',0,0,1],['temperature','Incoming temperature / K',293.15,.01,null],['duration','Duration / s',60,0,1e6]]){
  const input=make('input'),row=make('label',name);input.id=`coating-${key}`;input.type='number';input.step='any';input.min=String(min);if(max!==null)input.max=String(max);input.value=String(value);row.append(input);coating.append(row);controls[key]=input;input.addEventListener('input',drawCoating);
 }
 coating.append(summary,plots,coatingError);
 function drawCoating(){
  if(!coating.open)return;
  try{
   if(Object.values(controls).some(input=>!input.checkValidity()||!Number.isFinite(input.valueAsNumber)))throw new RangeError('Enter finite coating inputs in their stated domains.');
   const source=readSource();if(source.stoppingModel!=='geant4-bragg')throw new RangeError('Use material stopping for a coating balance tied to these initial source inputs.');
   const n=physical(column)/physical(thickness),temperature=Number(byId('coupled-initialK').value)+273.15,N=physical(column),t=source.targetColumnM2/N;
   const initial={lithiumColumnM2:N,tritiumColumnM2:N*t,deuteriumColumnM2:N*(1-t),sensibleEnergyJm2:0};
   const config={lithiumNumberDensityM3:n,heatCapacityPerLiJK:10**Number(byId('coupled-filmHeatCapacityJm3K').value)/n,referenceK:temperature,
    depositionFluxM2S:controls.deposition.valueAsNumber,erosionFluxM2S:controls.erosion.valueAsNumber,depositedTritiumPerLi:controls['incoming-t'].valueAsNumber,depositedDeuteriumPerLi:controls['incoming-d'].valueAsNumber,depositionTemperatureK:controls.temperature.valueAsNumber};
   const x=Array.from({length:41},(_,i)=>controls.duration.valueAsNumber*i/40),samples=x.map(time=>advanceLithiumCoating(initial,config,time)),last=samples.at(-1);
   renderPlots(plots,[{label:'External Li film',x,y:samples.map(r=>r.thicknessM*1e6),xLabel:'Time (s)',yLabel:'Thickness (µm)'},
    ...['tritiumColumnM2','deuteriumColumnM2'].map((key,i)=>({label:['External T','External D'][i],x,y:samples.map(r=>r.state[key]),xLabel:'Time (s)',yLabel:'Column (m⁻²)'}))]);
   summary.textContent=`${format(last.thicknessM*1e6)} µm · ${format(last.temperatureK)} K · ${format(last.massKgm2)} kg/m² · assumed constant fluxes`;
   coatingError.textContent='';
  }catch(reason){renderPlots(plots,[]);summary.textContent='';coatingError.textContent=reason.message;}
 }
 coating.addEventListener('toggle',drawCoating);
 byId('fusion-target-enabled').addEventListener('change',()=>{update();drawCoating();});byId('fusion-stopping-model').addEventListener('change',drawCoating);
 for(const node of [column,thickness,byId('fusion-tritiumSiteFraction'),byId('coupled-initialK'),byId('coupled-filmHeatCapacityJm3K')])node.addEventListener('input',drawCoating);
 return {update};
}
