import {DEFAULT_HYDROGEN_TRACER,simulateHydrogenTracer} from './hydrogen-tracer.js';
import {renderPlots} from './laboratory.js';

/** Separate restricted experiment; never replaces generic-ion configuration. */
export function setupHydrogenTracer(container,{onResult=()=>{}}={}){
 const make=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
 const root=make('details'),controls=make('div'),status=make('p'),plots=make('div'),ledger=make('p'),info=make('details');
 root.id='hydrogen-capture-tracer';root.className='model-info';controls.className='control-grid';plots.className='live-plots';status.setAttribute('role','status');
 root.append(make('summary','Hydrogen capture'),controls,status,plots,ledger,info);
 const specs=[
  ['energyEVPerU','h1-energy','Energy',.1,20,.1,'eV/u'],
  ['magneticT','h1-field','Magnetic field',-.05,.05,.0001,'T'],
  ['pitchDeg','h1-pitch','Pitch',0,85,1,'°'],
  ['neutralDensityM3','h1-neutral-density','H-1 neutral density',0,1e20,1e17,'m⁻³'],
  ['radiusM','h1-radius','Radius',.01,.5,.01,'m'],
  ['lengthM','h1-length','Length',.05,2,.05,'m'],
  ['particles','h1-particles','Independent tracers',16,2048,1,''],
  ['seed','h1-seed','Seed',0,4294967295,1,''],
 ];
 const fields=new Map();
 for(const [key,id,label,min,max,step,unit] of specs){
  const row=make('div'),caption=make('label'),input=make('input'),value=make('output');row.className='control';caption.htmlFor=id;caption.append(make('span',label),value);input.id=id;input.dataset.unit=unit;input.dataset.rangeScale='linear';
  if(key==='particles'||key==='seed')input.dataset.integer='true';
  input.type=key==='seed'?'number':'range';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(DEFAULT_HYDROGEN_TRACER[key]);
  row.append(caption,input);controls.append(row);fields.set(key,{input,value,unit});
 }
 const scope=make('p','H-1 only · E=RF=0 · first capture. Straight-through product approximation; further scattering and secondary atomic reactions unresolved.');scope.className='model-validity';controls.prepend(scope);
 info.append(make('summary','Assumptions'),make('p','Uniform axial B; an on-axis monoenergetic test beam starts at z=0.02 L in stationary H-1 gas. The Janev total-capture fit determines the first exponential event. It does not validate differential nuclear scattering. The fast neutral then follows a straight ray; the slow reservoir ion is retained with prescribed-field-only motion. Its subsequent zero-energy atomic kinetics are not extrapolated or solved. No physical feed weights, throughput or generic separator qualification.'),
  make('p','Plots compare sampled first-capture survival with the analytic expectation for the prescribed fit, whose reported cross-section uncertainty is 10–20%. The transverse footprint of the first tracer is shown; repeated identical turns are omitted. The slow-ion position is marked at capture. Dense full 3D trajectories are withheld when their turns exceed the display sampling budget.'));
 const button=make('button','Run tracer');button.type='button';button.className='text-button';controls.append(button);
 let result;
 const read=()=>({...DEFAULT_HYDROGEN_TRACER,...Object.fromEntries([...fields].map(([key,{input}])=>[key,input.valueAsNumber]))});
 function labels(){for(const [key,{input,value,unit}] of fields){const n=input.valueAsNumber;value.textContent=(key==='neutralDensityM3'?n.toExponential(2):String(n))+(unit?' '+unit:'');}}
 function run(){
  labels();
  try{
   result=simulateHydrogenTracer(read());
   const path=result.paths[0],base={xLabel:'x (m)',yLabel:'First tracer transverse footprint · y (m)',equalAspect:true,selectedX:path.slowIon?.[0]??path.chargedTerminalPosition[0]};
   const wall=Array.from({length:257},(_,i)=>[result.config.radiusM*Math.cos(2*Math.PI*i/256),result.config.radiusM*Math.sin(2*Math.PI*i/256)]);
   const spatial=[{...base,label:'Charged footprint (repeated turns omitted)',x:path.chargedProjectionXY.map(p=>p[0]),y:path.chargedProjectionXY.map(p=>p[1]),color:'#a4c4b1'},
    {...base,label:'Absorbing cylindrical wall',x:wall.map(p=>p[0]),y:wall.map(p=>p[1]),color:'#69716b',dash:'3 4'}];
   spatial.push({...base,label:'Charged segment endpoint',x:[path.chargedTerminalPosition[0]],y:[path.chargedTerminalPosition[1]],color:'#a4c4b1',dash:''});
   if(path.neutral.length)spatial.push({...base,label:'Fast neutral after capture',x:path.neutral.map(p=>p[0]),y:path.neutral.map(p=>p[1]),color:'#d2956b',dash:''});
   if(path.slowIon)spatial.push({...base,label:'Reservoir slow ion (field-only position)',x:[path.slowIon[0]],y:[path.slowIon[1]],color:'#95b3d4',dash:''});
   renderPlots(plots,[...result.curves,...spatial]);
   const p=result.primary;
   status.textContent=`Tagged beam: ${p.neutralOut}/${p.injected} neutral · ${p.chargedOut}/${p.injected} charged. Prescribed-fit expected capture ${(100*result.expectedCaptureFraction).toFixed(1)}%.`;
   ledger.textContent=`${p.end} end · ${p.wall} wall. Separate reservoir: ${result.ledger.retainedReservoirIons} slow ions retained (field-only). Charge: ${result.ledger.outgoingChargeE} out + ${result.ledger.retainedChargeE} retained = ${result.ledger.incomingChargeE} in.`;
   onResult(result);return result;
  }catch(error){result=null;renderPlots(plots,[]);status.textContent=error.message;ledger.textContent='';return null;}
 }
 for(const {input} of fields.values())input.addEventListener('input',()=>{labels();if(root.open||result)run();});
 root.addEventListener('toggle',()=>{if(root.open&&!result)run();});button.addEventListener('click',()=>{root.open=true;run();});
 labels();container.append(root);return {element:root,run,get result(){return result;}};
}
