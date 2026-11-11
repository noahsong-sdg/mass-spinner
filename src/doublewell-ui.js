import {DEFAULT_DOUBLEWELL} from './doublewell-dynamics.ts';

const fields=[
 ['radius','Column radius','m',.05,.5,.01,'geometry'],
 ['length','Column length','m',.1,3,.1,'geometry'],
 ['magneticT','Imposed axial B','T',.01,.2,.01,'geometry'],
 ['voltage','Quartic potential coefficient V','V',0,200,1,'geometry'],
 ['quadraticShape','Quadratic coefficient κ','',0,2,.05,'geometry'],
 ['ionTemperatureEV','Initial ion temperature','eV',1,30,.5,'source'],
 ['rotationRadS','Common initial angular velocity','rad/s',-100000,50000,1000,'source'],
 ['beamEV','Initial axial drift energy','eV',0,100,1,'source'],
 ['sourceRadiusFraction','Initial pulse radius r/a','',.05,.95,.01,'source'],
 ['pulseLengthFraction','Initial pulse length / L','',.05,1,.05,'source'],
 ['densityM3','Pulse / column mean ion density','m⁻³',16,20,.1,'collision',true],
 ['electronTemperatureEV','Screening electron temperature','eV',.5,30,.5,'collision'],
 ['coulombLog','Prescribed Coulomb logarithm','',2,15,.5,'collision'],
];
const selectors=[
 ['boundary','Boundaries',[['open','Open · source, end and wall absorb'],['closed','Closed · periodic z, reflecting wall']],'source'],
 ['initialState','Initial distribution',[['pulse','Finite cylindrical pulse'],['equilibrium','Common-Ω equilibrium benchmark']],'source'],
 ['rotationMode','Initial rotation',[['zero-canonical','Species-specific zero mean Pθ'],['common','Common rigid rotation']],'source'],
 ['collisions','Ion–ion Coulomb collisions',[['true','On · pair scattering'],['false','Off · collisionless control']],'collision'],
 ['collisionScattering','Angular scattering',[['takizuka-abe','TA · small-angle baseline'],['nanbu','Nanbu · cumulative scattering']],'collision'],
 ['collisionMethod','Spatial collision cells',[['fixed','Fixed Cartesian baseline'],['adaptive','Adaptive geometric cells · exploratory'],['axisymmetric','Axisymmetric annular r–z cells · experimental']],'collision'],
 ['collisionSourceAligned','Fixed faces at initial source interfaces',[['false','Uniform grid · comparison'],['true','Source-fitted grid · pulse only']],'collision'],
 ['collisionTarget','Adaptive target markers per cell',[[16,'16'],[32,'32'],[64,'64'],[128,'128'],[256,'256']],'collision'],
 ['particlesPerSpecies','Particles per species',[[64,'64 · coarse'],[128,'128 · quick, coarse'],[256,'256'],[512,'512'],[1024,'1024 · refinement'],[2048,'2048 · refinement'],[4096,'4096 · browser limit']],'collision'],
 ['cellsAcross','Cartesian cells across / annular radial cells',[[2,'2 · coarse'],[3,'3 · coarse pulse grid'],[4,'4'],[6,'6 · co-refine particles'],[8,'8 · co-refine particles'],[12,'12 · co-refine particles']],'collision'],
 ['collisionAxialCells','Annular axial cells',[[0,'Coupled to radial grid · baseline'],[3,'3'],[6,'6'],[9,'9'],[18,'18'],[36,'36'],[72,'72']],'collision'],
 ['dt','Physical timestep',[[2.5e-8,'25 ns'],[5e-8,'50 ns'],[1e-7,'100 ns'],[2e-7,'200 ns']],'collision'],
 ['duration','Observation duration',[[5e-5,'50 µs'],[1e-4,'100 µs'],[2e-4,'200 µs'],[5e-4,'500 µs'],[1e-3,'1 ms']],'collision'],
];
const $=id=>document.getElementById('dw-'+id);
const reads=new Map(),updates=[];
function synchronize(changed){
 if(changed==='initialState'&&$('initialState').value==='equilibrium'){
  $('boundary').value='closed';$('rotationMode').value='common';$('beamEV').value=0;
 }else if($('boundary').value!=='closed'||$('rotationMode').value!=='common')$('initialState').value='pulse';
 const equilibrium=$('initialState').value==='equilibrium';
 for(const key of ['sourceRadiusFraction','pulseLengthFraction','beamEV'])$(key).disabled=equilibrium;
 $('rotationRadS').disabled=$('rotationMode').value!=='common';
 $('collisionTarget').disabled=$('collisionMethod').value!=='adaptive';
 $('cellsAcross').disabled=$('collisionMethod').value==='adaptive';
 $('collisionAxialCells').disabled=$('collisionMethod').value!=='axisymmetric';
 $('collisionSourceAligned').disabled=$('collisionMethod').value!=='axisymmetric'||equilibrium;
 document.getElementById('doublewell-initial-note').textContent=equilibrium
  ? 'The equilibrium benchmark uses common ion rotation and temperature in a closed column. Selecting it sets closed boundaries, common rotation and zero axial drift; pulse size does not apply.'
  : 'Both species start with equal physical particle weights in a finite cylindrical pulse at t = 0. There is no continuous reservoir. Zero-mean-Pθ rotation is species dependent; collisions may exchange that angular momentum.';
 updates.forEach(update=>update());
}
export function setupDoublewellControls(onInput){
 reads.clear();updates.length=0;
 const host=document.getElementById('doublewell-controls'),groups=new Map();
 const notice=document.createElement('p');notice.className='kinetic-validation-note';
 notice.textContent='Exploratory kinetic model: spatial and particle convergence is not established. The fast default uses a coarse pulse grid. Check collision-cell torque and local-regime diagnostics, and refine particles together with cells. Outlet counts are not calibrated product-purity predictions.';
 host.append(notice);
 for(const [key,title]of [['geometry','Column & shaped potential'],['source','Initial mixture & boundaries'],['collision','Coulomb scattering & resolution']]){
  const details=document.createElement('details'),summary=document.createElement('summary');
  details.className='source-controls';details.open=key==='geometry';summary.textContent=title;details.append(summary);host.append(details);groups.set(key,details);
 }
 const event=(key)=>{synchronize(key);onInput();};
 for(const [key,label,unit,min,max,step,group,log]of fields){
  const box=document.createElement('div'),l=document.createElement('label'),title=document.createElement('span'),out=document.createElement('output'),input=document.createElement('input');
  box.className='control';input.id='dw-'+key;input.type='range';input.min=min;input.max=max;input.step=step;
  input.dataset.rangeScale=log?'log10':'linear';input.dataset.unit=unit;
  const initial=key==='sourceRadiusFraction'?DEFAULT_DOUBLEWELL.sourceRadius/DEFAULT_DOUBLEWELL.radius:DEFAULT_DOUBLEWELL[key];
  input.value=log?Math.log10(initial):initial;l.htmlFor=input.id;title.textContent=label;
  const read=()=>log?10**Number(input.value):Number(input.value);
  reads.set(key,read);updates.push(()=>out.textContent=`${log?read().toExponential(2):read().toLocaleString(undefined,{maximumSignificantDigits:4})} ${unit}`);
  input.addEventListener('input',()=>event(key));l.append(title,out);box.append(l,input);groups.get(group).append(box);
 }
 for(const [key,label,options,group]of selectors){
  const l=document.createElement('label'),select=document.createElement('select');l.textContent=label;select.id='dw-'+key;
  for(const [value,title]of options){const option=document.createElement('option');option.value=String(value);option.textContent=title;select.add(option);}
  const fallback={collisionMethod:'fixed',collisionScattering:'takizuka-abe',collisionSourceAligned:false,collisionAxialCells:0};
  select.value=String(DEFAULT_DOUBLEWELL[key]??fallback[key]??32);reads.set(key,()=>['collisions','collisionSourceAligned'].includes(key)?select.value==='true':['boundary','initialState','rotationMode','collisionMethod','collisionScattering'].includes(key)?select.value:Number(select.value));
  select.addEventListener('change',()=>event(key));l.append(select);groups.get(group).append(l);
 }
 const label=document.createElement('label'),seed=document.createElement('input');label.textContent='Random seed';seed.id='dw-seed';seed.type='number';seed.min=0;seed.max=4294967295;seed.step=1;seed.value=DEFAULT_DOUBLEWELL.seed;
 label.append(seed);groups.get('collision').append(label);reads.set('seed',()=>Number(seed.value));seed.addEventListener('input',()=>event('seed'));
 synchronize();
}
export function doublewellConfig(ions){
 const c={...DEFAULT_DOUBLEWELL,species:ions.map(s=>({...s}))};
 for(const [key,read]of reads)c[key]=read();
 c.sourceRadius=c.sourceRadiusFraction*c.radius;delete c.sourceRadiusFraction;
 if(c.collisionAxialCells===0)delete c.collisionAxialCells;
 return c;
}
