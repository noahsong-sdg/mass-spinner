import {DEFAULT_HYDROGEN_TRACER,simulateHydrogenTracer} from './hydrogen-tracer.js';
import {renderPlots, type PlotCurve} from './laboratory.js';
import type {HydrogenTracerConfig} from './hydrogen-tracer.js';
export type HydrogenTracerResult = ReturnType<typeof simulateHydrogenTracer>;
type TracerField = 'energyEVPerU'|'magneticT'|'pitchDeg'|'neutralDensityM3'|'radiusM'|'lengthM'|'particles'|'seed';

/** Separate restricted experiment; never replaces generic-ion configuration. */
export function setupHydrogenTracer(container: HTMLElement,{onResult=()=>{}}: {onResult?: (result: HydrogenTracerResult) => void}={}){
 const make=<K extends keyof HTMLElementTagNameMap>(tag: K,text?: string): HTMLElementTagNameMap[K]=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
 const root=make('details'),controls=make('div'),status=make('p'),plots=make('div'),ledger=make('p'),info=make('details');
 root.id='hydrogen-capture-tracer';root.className='model-info';controls.className='control-grid';plots.className='live-plots';status.setAttribute('role','status');
 root.append(make('summary','Hydrogen capture'),controls,status,plots,ledger,info);
 const specs: [TracerField,string,string,number,number,number,string][]=[
  ['energyEVPerU','h1-energy','Energy',.1,20,.1,'eV/u'],
  ['magneticT','h1-field','Magnetic field',-.05,.05,.0001,'T'],
  ['pitchDeg','h1-pitch','Pitch',0,85,1,'°'],
  ['neutralDensityM3','h1-neutral-density','H-1 neutral density',0,1e20,1e17,'m⁻³'],
  ['radiusM','h1-radius','Radius',.01,.5,.01,'m'],
  ['lengthM','h1-length','Length',.05,2,.05,'m'],
  ['particles','h1-particles','Independent tracers',16,2048,1,''],
  ['seed','h1-seed','Seed',0,4294967295,1,''],
 ];
 const fields=new Map<TracerField,{input: HTMLInputElement; value: HTMLOutputElement; unit: string}>();
 for(const [key,id,label,min,max,step,unit] of specs){
  const row=make('div'),caption=make('label'),input=make('input'),value=make('output');row.className='control';caption.htmlFor=id;caption.append(make('span',label),value);input.id=id;input.dataset.unit=unit;input.dataset.rangeScale='linear';
  if(key==='particles'||key==='seed')input.dataset.integer='true';
  input.type=key==='seed'?'number':'range';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(DEFAULT_HYDROGEN_TRACER[key]);
  row.append(caption,input);controls.append(row);fields.set(key,{input,value,unit});
 }
 const scope=make('p','This H-1 tracer uses E=RF=0 and includes the first capture only. After capture, the fast neutral continues straight ahead. Later scattering and secondary atomic reactions remain unresolved.');scope.className='model-validity';controls.prepend(scope);
 info.append(make('summary','Assumptions'),make('p','An on-axis test beam starts at z=0.02 L in stationary H-1 gas with uniform axial B. All beam particles have the same energy. The Janev total-capture fit gives the first event time with an exponential distribution; it does not validate differential nuclear scattering. After capture, the fast neutral continues straight ahead; the slow reservoir ion moves only under the specified field. The model does not extend atomic reaction rates to zero energy. It does not calculate feed weights or throughput, or qualify a generic separator.'),
  make('p','Plots compare sampled survival before first capture with the analytic result for the specified fit. The reported cross-section uncertainty is 10–20%. The transverse plot shows the first tracer without repeated identical turns. A marker shows the slow-ion position at capture. If the number of turns exceeds the display limit, the display does not show complete 3D paths.'));
 const button=make('button','Run tracer');button.type='button';button.className='text-button';controls.append(button);
 let result: HydrogenTracerResult | null | undefined;
 const read=(): HydrogenTracerConfig=>({...DEFAULT_HYDROGEN_TRACER,...Object.fromEntries([...fields].map(([key,{input}])=>[key,input.valueAsNumber]))});
 function labels(){for(const [key,{input,value,unit}] of fields){const n=input.valueAsNumber;value.textContent=(key==='neutralDensityM3'?n.toExponential(2):String(n))+(unit?' '+unit:'');}}
 function run(){
  labels();
  try{
   const accepted=simulateHydrogenTracer(read());result=accepted;
   const path=accepted.paths[0],base={xLabel:'x (m)',yLabel:'First tracer transverse footprint · y (m)',equalAspect:true,selectedX:path.slowIon?.[0]??path.chargedTerminalPosition[0]};
   const wall=Array.from({length:257},(_,i)=>[accepted.config.radiusM*Math.cos(2*Math.PI*i/256),accepted.config.radiusM*Math.sin(2*Math.PI*i/256)]);
   const spatial: PlotCurve[]=[{...base,label:'Charged footprint (without repeated turns)',x:path.chargedProjectionXY.map(p=>p[0]),y:path.chargedProjectionXY.map(p=>p[1]),color:'#a4c4b1'},
    {...base,label:'Absorbing cylindrical wall',x:wall.map(p=>p[0]),y:wall.map(p=>p[1]),color:'#69716b',dash:'3 4'}];
   spatial.push({...base,label:'Charged segment endpoint',x:[path.chargedTerminalPosition[0]],y:[path.chargedTerminalPosition[1]],color:'#a4c4b1',dash:''});
   if(path.neutral.length)spatial.push({...base,label:'Fast neutral after capture',x:path.neutral.map(p=>p[0]),y:path.neutral.map(p=>p[1]),color:'#d2956b',dash:''});
   if(path.slowIon)spatial.push({...base,label:'Reservoir slow ion (field-only position)',x:[path.slowIon[0]],y:[path.slowIon[1]],color:'#95b3d4',dash:''});
   renderPlots(plots,[...result.curves,...spatial]);
   const p=result.primary;
   status.textContent=`Tagged beam: ${p.neutralOut}/${p.injected} neutral · ${p.chargedOut}/${p.injected} charged. Expected capture from specified fit ${(100*result.expectedCaptureFraction).toFixed(1)}%.`;
   ledger.textContent=`${p.end} end · ${p.wall} wall. Separate reservoir: ${result.ledger.retainedReservoirIons} slow ions retained (field-only). Charge: ${result.ledger.outgoingChargeE} out + ${result.ledger.retainedChargeE} retained = ${result.ledger.incomingChargeE} in.`;
   onResult(result);return result;
  }catch(error){result=null;renderPlots(plots,[]);status.textContent=error instanceof Error?error.message:String(error);ledger.textContent='';return null;}
 }
 for(const {input} of fields.values())input.addEventListener('input',()=>{labels();if(root.open||result)run();});
 root.addEventListener('toggle',()=>{if(root.open&&!result)run();});button.addEventListener('click',()=>{root.open=true;run();});
 labels();container.append(root);return {element:root,run,get result(){return result;}};
}
