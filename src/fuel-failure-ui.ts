import {DEFAULT_FUEL_FAILURE,validateFuelFailureLimits,type FuelFailure,type FuelFailureLimits} from './fuel-failure.js';

export function createFuelFailureUI(doc:Document,controls:HTMLElement,host:HTMLElement,onChange:()=>void,onRewind:()=>void,onEdit:(selector:string)=>void){
 const details=doc.createElement('details'),summary=doc.createElement('summary');summary.textContent='Failure limits';details.append(summary);
 const inputs=new Map<keyof FuelFailureLimits,HTMLInputElement>();
 for(const [key,title,min,max]of [['pressurePa','Pressure difference limit (Pa)',.001,1e9],['externalPa','External pressure (Pa)',0,1e9],['linerK','Liner temperature limit (K)',300,1900]] as const){
  const label=doc.createElement('label'),input=doc.createElement('input');input.id=`fuel-failure-${key}`;input.type='number';input.min=String(min);input.max=String(max);input.step='any';input.value=String(DEFAULT_FUEL_FAILURE[key]);label.htmlFor=input.id;label.textContent=title;
  input.addEventListener('input',onChange);inputs.set(key,input);details.append(label,input);
 }
 const note=doc.createElement('p');note.textContent='These limits are inputs, not Marathon equipment ratings. Pressure uses the outer neutral gas-cell mean. The burst animation does not calculate fracture.';details.append(note);controls.append(details);
 const panel=doc.createElement('section'),title=doc.createElement('strong'),reading=doc.createElement('p'),scope=doc.createElement('p'),rewind=doc.createElement('button');
 panel.className='fuel-failure';panel.id='fuel-failure';panel.hidden=true;panel.setAttribute('role','status');title.textContent='Run stopped';
 scope.textContent='Burst illustration. The model does not calculate fracture, gas release or motion after failure.';
 const edit=doc.createElement('button');let displayed:FuelFailure|null=null;
 edit.type='button';edit.textContent='Change limits';edit.addEventListener('click',()=>{details.open=true;onEdit(`#fuel-failure-${displayed?.causes.includes('pressure')?'pressurePa':'linerK'}`);});
 rewind.type='button';rewind.textContent='Rewind';rewind.addEventListener('click',onRewind);panel.append(title,reading,scope,rewind,edit);host.append(panel);
 const fmt=(n:number)=>n.toLocaleString(undefined,{maximumSignificantDigits:4});
 let key='';
 return {
  read():FuelFailureLimits{
   for(const input of inputs.values())if(input.value.trim()===''||!input.checkValidity())throw new RangeError('Enter permitted failure limits.');
   const limits=Object.fromEntries([...inputs].map(([name,input])=>[name,Number(input.value)])) as FuelFailureLimits;validateFuelFailureLimits(limits);return limits;
  },
  show(failure:FuelFailure|null,error?:string,pinned=false){
   const next=JSON.stringify([failure,error,pinned]);if(next===key)return;key=next;panel.hidden=!failure&&!error;
   panel.dataset.state=error?'invalid':failure?'failed':'intact';rewind.hidden=!failure;
   displayed=failure;edit.hidden=!failure;rewind.disabled=failure?.timeS===0;rewind.title=rewind.disabled?'The initial state is above a limit. Change the inputs.':'';
   title.textContent=error?'Check failure limits':pinned?'Pinned run stopped':'Run stopped';scope.hidden=!!error;
   reading.textContent=error??(failure?`${failure.causes.includes('pressure')?`Pressure difference ${fmt(failure.pressurePa-failure.limits.externalPa)} Pa > ${fmt(failure.limits.pressurePa)} Pa. `:''}${failure.causes.includes('temperature')?`Liner ${fmt(failure.linerK!)} K > ${fmt(failure.limits.linerK)} K. `:''}First stored state above the limit: ${fmt(failure.timeS)} s.`:'');
  },
 };
}
