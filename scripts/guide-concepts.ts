type State={label:string;reading:string;body:string};
type Concept={title:string;description:string;caption:string;states:State[]};
const text=(x:number,y:number,value:string)=>`<text x="${x}" y="${y}" text-anchor="middle">${value}</text>`;
const box=(x:number,y:number,label:string)=>`<rect x="${x}" y="${y}" width="104" height="46" rx="5"/>${text(x+52,y+28,label)}`;
const route=(id:string,path:string)=>`<path d="${path}" class="concept-flow" marker-end="url(#concept-${id}-arrow)"/>`;

/** An exact two-population reference with equal, constant inertias and no wall drag. */
export function spinReference(time:number,coupling=1,cut=Infinity){
 const driven=Math.min(time,cut),sum=driven;
 const difference=-Math.expm1(-2*coupling*driven)/(2*coupling)*Math.exp(-2*coupling*(time-driven));
 return {ion:(sum+difference)/2,neutral:(sum-difference)/2,total:sum};
}
function spinDiagram(id:string):Concept{
 const compare=id==='compare';
 const states=compare?[{label:'Coupling ×1',coupling:1,cut:Infinity},{label:'Coupling ×2',coupling:2,cut:Infinity}]
  :[{label:'Drive stays on',coupling:1,cut:Infinity},{label:'Power off at 2',coupling:1,cut:2}];
 return {title:compare?'Change one input. Compare at the same time.':'Ions accelerate first. Collisions accelerate neutral gas.',
  description:'Curves show an exact two-population reference. Equal, constant inertias and linear collisions give the ion and neutral speeds. Without wall drag, total angular momentum increases only while drive is on.',
  caption:'Analytic reference, not your run. Time and speed use fixed reference scales. Inertias are equal and constant. No wall drag or radial transport.',
  states:states.map(({label,coupling,cut})=>({label,reading:compare?`Coupling ×${coupling}: collisions change the speed difference. They do not change total angular momentum.`
   :cut===Infinity?'While power stays on, total angular momentum increases.':'After power stops at time 2, collisions exchange angular momentum without changing its total.',
   body:`${text(180,18,'Speed / reference speed')}<path d="M42 36V190H328" class="diagram-axis"/>
   ${[0,1,2].map(v=>`${text(28,194-v*65,String(v))}<path d="M42 ${190-v*65}H328" class="diagram-grid"/>`).join('')}
   ${[0,2,4].map(t=>text(42+t*70,210,String(t))).join('')}${text(185,233,'Time / reference time')}
   <g clip-path="url(#concept-${id}-reveal)">${(['ion','neutral'] as const).map((kind,i)=>`<path class="concept-trace ${i?'concept-neutral':'concept-ion'}" d="${Array.from({length:81},(_,j)=>{const t=j/20,v=spinReference(t,coupling,cut)[kind];return `${j?'L':'M'}${42+t*70} ${190-65*v}`;}).join(' ')}"/>`).join('')}
   </g>${cut===Infinity?'':`<path d="M182 36V190" class="concept-cut"/>${text(230,50,'power off →')}`}
   <g class="concept-key">${text(100,265,'━ Ions')}${text(240,265,'┄ Neutral gas')}</g>`})),};
}
function ratioDiagram(id:string):Concept{
 const magnetic=id==='magnetic';
 const cases=magnetic?[['B ×1',1],['B ×2',.25]] as const:[['Reference',1],['Speed ×2',4],['Temperature ×2',.5]] as const;
 return {title:magnetic?'Keep torque constant. Compare resistive heat.':'Compare the separation exponent, not purity.',
  description:magnetic?'At fixed torque, geometry and conductivity, doubling the magnetic field halves current and divides resistive heat by four.':'At fixed mass difference and radius, the equilibrium exponent is proportional to angular speed squared divided by temperature.',
  caption:magnetic?'Constant-torque reference, not a constant-current run. This does not include coil power, magnetic limits or discharge changes.':'Uniform-temperature equilibrium reference. The exponent is ln α. These factors do not multiply purity or recovery.',
  states:cases.map(([label,factor])=>({label,reading:magnetic?`Resistive heat / reference heat = ${factor}. Current changes to keep torque constant.`:`Separation exponent / reference exponent = ${factor}. Other inputs stay constant.`,
   body:`${text(180,35,magnetic?'Resistive heat / reference heat':'Separation exponent / reference exponent')}
   <rect x="40" y="80" width="280" height="40" class="concept-bar-background"/>
   <rect x="40" y="80" width="${280*factor/(magnetic?1:4)}" height="40" class="concept-bar" data-ratio="${factor}"/>
   ${text(180,155,`${factor} × reference`)}${text(180,195,magnetic?'Same torque · different current':'Different exponent ≠ same change in purity')}`})),};
}
function routingDiagram(id:string):Concept|undefined{
 const scenarios:Record<string,Concept>={
  goal:{title:'A higher percentage does not mean more light atoms.',description:'A sample can have a higher light-isotope fraction while retaining few of the original light atoms. Purity and recovery answer different questions.',caption:'Atom-count example, not your run. Selecting a sample does not calculate extraction flow.',states:[
   {label:'Whole vessel',reading:'76 light atoms out of 1,000 atoms give 7.6% purity. The vessel contains all 76 original light atoms.',body:`${text(180,65,'76 light + 924 heavy atoms')}${box(128,95,'7.6% purity')}${text(180,185,'100% light recovery')}`},
   {label:'Sample',reading:'10 light atoms out of 100 atoms give 10% purity. Light recovery is only 10 / 76, approximately 13.2%.',body:`${text(180,65,'10 light + 90 heavy atoms')}${box(128,95,'10% purity')}${text(180,185,'13.2% light recovery')}`},]},
  energy:{title:'Follow energy from the supply to cooling.',description:'Electrical input supplies mechanical work and Ohmic heat. Collisions and wall drag change rotational energy into heat. Cooling removes heat.',caption:'Energy paths, not measured rates. Heat deposition and cooling are model assumptions.',states:[
   {label:'Supply',reading:'The supply must provide both mechanical work and resistive heat.',body:`${box(128,22,'Supply')}${box(18,134,'Rotation')}${box(238,134,'Heat')}${route(id,'M150 68L70 128')}${route(id,'M210 68L290 128')}`},
   {label:'Heat',reading:'Collisions and wall drag can change rotational energy into heat. More rotation is not the only result of drive.',body:`${box(18,90,'Rotation')}${box(238,90,'Heat')}${route(id,'M126 112H232')}${text(180,165,'speed difference + wall drag')}`},
   {label:'Cooling',reading:'Cooling must remove net heat input to keep temperature constant.',body:`${box(18,90,'Gas / liner')}${box(238,90,'Coolant')}${route(id,'M126 112H232')}${text(180,165,'heat leaves the system')}`},]},
  stages:{title:'A stage gives two streams. A cascade routes them.',description:'Inner and outer streams move through a countercurrent cascade in opposite directions. Internal circulation can exceed the feed flow.',caption:'Routing diagram only. Arrow motion gives direction, not flow rate. Stage performance and turnover times are specified.',states:[
   {label:'One stage',reading:'A single stage divides a feed into inner and outer streams. Their isotope fractions can differ.',body:`${text(42,112,'feed')}${box(128,90,'Stage')}${text(300,65,'inner')}${text(300,178,'outer')}${route(id,'M66 112H122')}${route(id,'M238 100L282 65')}${route(id,'M238 126L282 170')}`},
   {label:'Cascade',reading:'Inner streams move toward the product. Outer streams return toward earlier stages. Compare purity, recovery and circulation together.',body:`${[18,128,238].map((x,i)=>box(x,90,`Stage ${i+1}`)).join('')}${route(id,'M70 84V52H180V84')}${route(id,'M180 84V52H290V84')}${route(id,'M290 142V178H180V142')}${route(id,'M180 142V178H70V142')}${text(180,27,'inner streams → product')}${text(180,212,'outer streams → earlier stages')}`},]},
  pumping:{title:'Gas must pass the inlet and the pump.',description:'The inlet conductance and outer pump speed each limit gas throughput. At a specified rotating state, the reference calculates the upstream pressure needed for that gas load.',caption:'Steady reference, not flow in the closed vessel. Motion shows the gas path, not a calculated fluid velocity.',states:[
   {label:'Inlet',reading:'Finite inlet conductance needs a pressure difference: upstream pressure = axis pressure + gas load / conductance.',body:`${box(18,90,'Upstream')}${box(238,90,'Vessel')}${route(id,'M126 112H232')}${text(180,65,'inlet conductance C')}${text(180,178,'pressure falls across the inlet')}`},
   {label:'Pump',reading:'At a specified wall pressure, pump speed sets gas load Q = S p_w. The inlet must supply the same gas load.',body:`${box(18,90,'Vessel')}${box(238,90,'Pump')}${route(id,'M126 112H232')}${text(180,65,'wall pressure p_w')}${text(180,178,'same steady gas load Q')}`},]},
  'fuel-cycle':{title:'Enrichment, breeding and recovery do different jobs.',description:'Enrichment changes lithium isotope fractions. Breeding makes tritium through nuclear reactions. Exhaust processing returns fuel that did not react.',caption:'Process diagram only. These arrows give no breeding rate, return efficiency or total plant inventory.',states:[
   {label:'Enrich',reading:'The centrifuge increases the lithium-6 fraction in one stream. It makes no tritium.',body:`${box(18,90,'Lithium')}${box(238,90,'Enriched Li')}${route(id,'M126 112H232')}${text(180,178,'separate isotopes')}`},
   {label:'Breed',reading:'Neutrons react with lithium in a blanket. One reaction makes helium-4 and tritium from lithium-6.',body:`${box(18,90,'Li + neutron')}${box(238,90,'He + tritium')}${route(id,'M126 112H232')}${text(180,178,'nuclear reaction')}`},
   {label:'Recover',reading:'Processing returns unburned fuel. This process does not make new tritium.',body:`${box(18,65,'D–T plasma')}${box(238,65,'Processing')}${route(id,'M126 87H232')}${route(id,'M290 117V180H70V117')}${text(180,44,'unburned exhaust →')}${text(180,212,'← returned fuel')}`},]},
  scope:{title:'Exhaust inventory is one part of plant inventory.',description:'A processing-delay calculation includes unburned exhaust fuel. It does not include storage, startup reserves, blanket inventory or evolving losses.',caption:'Inventory categories only. Box areas do not give masses. No total plant inventory is calculated.',states:[
   {label:'Included',reading:'The equation calculates unburned exhaust fuel held during a specified processing delay.',body:`${box(128,90,'Exhaust')}${text(180,178,'calculated processing inventory')}`},
   {label:'Missing',reading:'A plant also needs fuel in other equipment and reserves. A small exhaust inventory does not prove a small total.',body:`${box(18,55,'Storage')}${box(238,55,'Blanket')}${box(18,145,'Reserves')}${box(238,145,'Other loops')}${text(180,27,'additional inventories are unknown')}`},]},
  evidence:{title:'Use a different check for each accuracy question.',description:'Verification tests the equations in code. Convergence tests numerical refinement. Validation compares a matched experiment with its observation model.',caption:'These checks answer different questions. Passing one does not show that the other checks pass.',states:[
   {label:'Equations',reading:'Compare the code with a known solution or a conservation law. This tests implementation, not the apparatus assumptions.',body:`${box(18,90,'Known result')}${box(238,90,'Calculation')}${text(180,178,'same equations? same answer?')}`},
   {label:'Refinement',reading:'Decrease cell size and timestep. Check whether the answer changes less than the stated error limit.',body:`${[0,1].map(i=>`<g>${Array.from({length:i?9:5},(_,j)=>`<path d="M${30+i*190+j*(i?12:24)} 55V155" class="diagram-grid"/>`).join('')}${Array.from({length:i?9:5},(_,j)=>`<path d="M${30+i*190} ${55+j*(i?12:24)}h96" class="diagram-grid"/>`).join('')}</g>`).join('')}${text(78,190,'coarse')}${text(268,190,'fine')}`},
   {label:'Measurement',reading:'Match the apparatus, inputs and diagnostic. Then compare quantities that the instrument actually measures.',body:`${box(18,90,'Apparatus')}${box(238,90,'Instrument')}${route(id,'M126 112H232')}${text(180,178,'compare the measured quantity')}`},]},
  diagnostic:{title:'The instrument receives light along a sightline.',description:'Local gas speed is not always the measured Doppler velocity. Light from different positions and the spectral estimator can change the calculated value.',caption:'Diagnostic geometry only. No emission profile, measured velocity or agreement is assumed.',states:[
   {label:'Local motion',reading:'Gas at each position has a local velocity. The instrument measures the component along its sightline.',body:`<circle cx="135" cy="116" r="75" class="concept-vessel"/>${[75,135,195].map(x=>`<circle cx="${x}" cy="116" r="5" class="concept-sample"/>`).join('')}${text(135,220,'positions inside the gas')}`},
   {label:'Collected light',reading:'Light reaches the detector from several positions. The spectrum includes that light. The velocity estimate uses the spectrum.',body:`<circle cx="105" cy="116" r="70" class="concept-vessel"/>${route(id,'M25 116H250')}${box(252,94,'Detector')}${[55,105,155].map(x=>`<circle cx="${x}" cy="116" r="5" class="concept-sample"/>`).join('')}${text(150,220,'one sightline · multiple positions')}`},]},
  views:{title:'A view changes the display. Controls change the run.',description:'Coupled separation and coupled spin-up display the same solution. Equilibrium and flow references answer different questions.',caption:'View key only. These shapes are not new simulation results.',states:[
   {label:'Coupled',reading:'One calculated history supplies rotation, composition and heat. Physical time selects a state. The two coupled views show the same solution.',body:`${box(128,22,'One run')}${box(18,145,'Separation')}${box(238,145,'Spin-up')}${route(id,'M150 74L70 138')}${route(id,'M210 74L290 138')}`},
   {label:'References',reading:'Equilibrium gives an ideal final distribution. Flow shows a prescribed path. Neither view adds fluid dynamics to the coupled solution.',body:`${box(18,90,'Equilibrium')}${box(238,90,'Flow path')}${text(180,178,'separate reference assumptions')}`},]},
 };
 return scenarios[id];
}
function inventoryDiagram():Concept{
 const cases=[['Initial',.05,100],['Half burn fraction',.025,100],['Twice the delay',.05,200]] as const;
 return {title:'Unburned fuel stays in processing equipment.',description:'At fixed fusion power, exhaust inventory is proportional to (1 / burn fraction − 1) times the processing delay.',caption:'Steady-flow reference. Fusion power stays constant. Only unburned exhaust inventory is included.',states:cases.map(([label,burn,delay])=>{
  const ratio=(1/burn-1)*delay/(19*100);
  return {label,reading:`Burn fraction ${burn}; delay ${delay} s. Exhaust inventory = ${ratio.toFixed(2)} × the initial inventory.`,body:`${box(18,40,'Plasma')}${box(238,40,'Processing')}${route('inventory','M126 62H232')}${route('inventory','M290 92V125H70V92')}
   ${text(180,158,'Exhaust inventory / initial inventory')}<rect x="40" y="180" width="${260*ratio/2.1}" height="24" class="concept-bar" data-ratio="${ratio}"/>${text(180,234,`${ratio.toFixed(2)} × initial inventory`)}`};}),};
}
export function conceptDiagram(id:string):string|null{
 let concept:Concept|undefined;
 if(id==='spin'||id==='compare')concept=spinDiagram(id);
 else if(id==='bias'||id==='magnetic')concept=ratioDiagram(id);
 else if(id==='inventory')concept=inventoryDiagram();
 else concept=routingDiagram(id);
 if(!concept)return null;
 const moving=concept.states.some(state=>/concept-flow|concept-trace/.test(state.body));
 return `<figure class="concept-example" data-concept-example="${id}" data-state="0" data-motion="paused">
 <div class="drive-heading"><span>${concept.title}</span>${moving?'<button type="button" data-concept-motion disabled>Play motion</button>':''}</div>
 <div class="diagram-cases" role="group" aria-label="${concept.title}">${concept.states.map((state,i)=>`<button type="button" data-concept-select="${i}" aria-pressed="${i===0}" disabled>${state.label}</button>`).join('')}</div>
 <svg viewBox="0 0 360 282" role="img" aria-labelledby="concept-${id}-title concept-${id}-description">
 <title id="concept-${id}-title">${concept.title}</title><desc id="concept-${id}-description">${concept.description}</desc>
 <defs><clipPath id="concept-${id}-reveal"><rect x="0" y="0" width="360" height="282" class="concept-reveal"/></clipPath><marker id="concept-${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#e4ac76"/></marker></defs>
 ${concept.states.map((state,i)=>`<g data-concept-panel="${i}"${i?' hidden':''}>${state.body}</g>`).join('')}
 </svg><p class="diagram-reading" data-concept-reading aria-live="polite">${concept.states[0].reading}</p>
 ${concept.states.map((state,i)=>`<template data-concept-description="${i}">${state.reading}</template>`).join('')}
 <figcaption>${concept.caption}</figcaption></figure>`;
}
