import {fields,type Vec} from './physics.js';
import {quarticFields,quarticPotential} from './doublewell-orbits.js';

/** Renderer contract: all positions are solver SI [x,y,z], with axial z in [0,L].
 * Scene rotations belong to the geometry transform, never to these data. */
export interface SurfaceField {
 id:string;label:string;unit:string;coordinate:'radius'|'depth';
 measure:'point'|'cell-average';region:'plasma'|'film'|'backing';
 positionsM:number[];values:number[];boundsM?:number[];domain:[number,number];
 speciesIndex?:number;scope:string;
}
export interface SurfaceImpact {
 speciesIndex:number;destination:'wall'|'end'|'source';timeS:number;injected:number;
 positionM?:Vec;radiusM?:number;kineticEV?:number;hamiltonianJ?:number;
 scope:'positioned-event'|'radial-event-only';
}
export interface SurfaceSnapshot {
 model:string;timeS:number|null;
 domain:{kind:'cylinder'|'target'|'reference';radiusM?:number;lengthM?:number;
  filmThicknessM?:number;backingThicknessM?:number;beamAreaM2?:number};
 fields:SurfaceField[];
 tracks:{speciesIndex:number;positionsM:Vec[];scope:string}[];
 impacts:SurfaceImpact[];
 counts:{speciesIndex:number;injected:number;wall:number;end:number;source:number;remaining:number}[];
 scalars:{id:string;label?:string;value:number;unit:string;scope:string}[];
 unsupported:string[];
}
export type SurfaceState={status:'ready';snapshot:SurfaceSnapshot}
 |{status:'pending'|'invalid';reason:string};
/** Accepted settings must come from the completed request, not the current UI.
 * Some reduced solvers do not echo their configuration; this provenance is required. */
export interface SurfaceRequest {
 model:string;settings:any;result:any;acceptedModel:string;acceptedSettings:any;
 pending?:boolean;selectedState?:any;source?:any;acceptedSource?:any;
}

function requireValue(condition:unknown,message:string):asserts condition {
 if(!condition)throw new RangeError(message);
}
function key(value:any):string {
 if(value===null)return 'null';
 if(Array.isArray(value))return '['+value.map(key).join(',')+']';
 if(typeof value==='object')return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort()
  .map(k=>JSON.stringify(k)+':'+key(value[k])).join(',')+'}';
 requireValue(typeof value!=='number'||Number.isFinite(value),'Nonfinite accepted input.');
 requireValue(value!==undefined,'Missing accepted input.');
 return JSON.stringify(value);
}
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
const positive=(x:unknown):x is number=>finite(x)&&x>0;
const count=(x:unknown):x is number=>Number.isSafeInteger(x)&&Number(x)>=0;
function vector(p:any):p is Vec{return Array.isArray(p)&&p.length===3&&p.every(finite);}
function close(a:number,b:number,scale=1){return Math.abs(a-b)<=1e-9*Math.max(scale,Math.abs(a),Math.abs(b));}
function field(s:SurfaceSnapshot,input:Omit<SurfaceField,'domain'>,fixedDomain?:[number,number]){
 const {positionsM:x,values:y,boundsM:b}=input;
 requireValue(x.length>0&&x.length===y.length&&x.every(finite)&&y.every(finite),'Missing or nonfinite field samples.');
 requireValue(x.every((v,i)=>i===0||v>x[i-1]),'Field coordinates must increase.');
 if(input.measure==='cell-average')requireValue(b&&b.length===x.length+1&&b.every(finite)
  &&b.every((v,i)=>i===0||v>b[i-1])&&x.every((v,i)=>v>b[i]&&v<b[i+1]),'Invalid cell boundaries.');
 const domain: [number,number]=fixedDomain??[Math.min(...y),Math.max(...y)];
 requireValue(y.every(v=>v>=domain[0]&&v<=domain[1]),'Field values outside their declared domain.');
 s.fields.push({...input,domain});
}
function cylinder(s:SurfaceSnapshot,c:any){
 requireValue(positive(c?.radius),'Missing physical cylinder radius.');
 s.domain={kind:'cylinder',radiusM:c.radius};
 if(c.length!==undefined){requireValue(positive(c.length),'Invalid physical cylinder length.');s.domain.lengthM=c.length;}
}
function counts(s:SurfaceSnapshot,species:any[],remaining:'active'|'remaining'){
 requireValue(Array.isArray(species)&&species.length>0,'Missing species results.');
 species.forEach((p,i)=>{
  requireValue([p.injected,p.wall,p.end,p.source,p[remaining]].every(count)&&p.injected>0,'Invalid population counts.');
  requireValue(p.wall+p.end+p.source+p[remaining]===p.injected,'Population ledger does not close.');
  s.counts.push({speciesIndex:i,injected:p.injected,wall:p.wall,end:p.end,source:p.source,remaining:p[remaining]});
 });
}
function injectedSpecies(c:any,r:any){
 const expected=c.species??[{massU:40,chargeState:1},{massU:84,chargeState:1}];
 requireValue(r.species.length===expected.length&&r.species.every((p:any,i:number)=>
  p.injected===c.particlesPerSpecies&&p.massU===expected[i].massU&&p.chargeState===expected[i].chargeState),
  'Result species/injected count differs from the accepted request.');
}
function imposedFields(s:SurfaceSnapshot,c:any,quartic=false){
 const radii=Array.from({length:65},(_,i)=>c.radius*i/64);
 const model={...c,voltage:c.mode==='icr'?0:c.voltage};
 requireValue(finite(model.voltage)&&finite(model.magneticT),'Missing imposed field inputs.');
 const samples=radii.map(r=>quartic?quarticFields([r,0,0],model):fields([r,0,0],model));
 const scope='Prescribed laboratory field; axisymmetric and axially uniform. Not a self-consistent plasma response.';
 field(s,{id:'electric-radial',label:'Radial electric field',unit:'V/m',coordinate:'radius',measure:'point',region:'plasma',positionsM:radii,
  values:samples.map(v=>v.electric[0]),scope});
 field(s,{id:'magnetic-axial',label:'Axial magnetic field',unit:'T',coordinate:'radius',measure:'point',region:'plasma',positionsM:radii,
  values:samples.map(v=>v.magnetic[2]),scope});
 field(s,{id:'potential',label:'Laboratory potential',unit:'V',coordinate:'radius',measure:'point',region:'plasma',positionsM:radii,
  values:radii.map(r=>quartic?quarticPotential([r,0,0],model):model.voltage*(1-(r/model.radius)**2)),scope});
}
function orbit(s:SurfaceSnapshot,c:any,r:any){
 cylinder(s,c);counts(s,r.species,'remaining');injectedSpecies(c,r);imposedFields(s,{...c,mode:s.model});
 requireValue((c.mode??'rotating')===s.model,'Orbit mode does not match the completed request.');
 r.species.forEach((p:any,i:number)=>{
  requireValue(Array.isArray(p.impacts)&&Array.isArray(p.paths),'Missing orbit event/path samples.');
  requireValue(p.impacts.length===p.wall+p.end+p.source,'Unexpected orbit impact event.');
  for(const d of ['wall','end','source'])requireValue(p.impacts.filter((e:any)=>e.destination===d).length===p[d],'Impact ledger does not match counts.');
  p.impacts.forEach((e:any)=>{
   requireValue(['wall','end','source'].includes(e.destination)&&vector(e.position)&&finite(e.time)&&e.time>=0&&e.time<=c.duration&&finite(e.kineticEV)&&e.kineticEV>=0,'Invalid positioned impact.');
   const radius=Math.hypot(e.position[0],e.position[1]),z=e.position[2];
   requireValue(radius<=c.radius+1e-9&&z>=-1e-9&&z<=c.length+1e-9,'Impact outside the solver cylinder.');
   requireValue(e.destination==='wall'?close(radius,c.radius):close(z,e.destination==='source'?0:c.length),'Impact does not lie on its named boundary.');
   s.impacts.push({speciesIndex:i,destination:e.destination,timeS:e.time,positionM:e.position,injected:p.injected,kineticEV:e.kineticEV,scope:'positioned-event'});
  });
  p.paths.forEach((path:any)=>{
   requireValue(Array.isArray(path.positions)&&path.positions.length>0&&path.positions.every(vector),'Invalid display path.');
   s.tracks.push({speciesIndex:i,positionsM:path.positions,scope:'Sampled display trajectory; not a density or complete population.'});
  });
 });
 s.timeS=c.duration;
 s.unsupported.push('Density, local heat flux and physical throughput: unweighted finite injected representatives do not supply these quantities.');
 if(s.model==='icr')s.unsupported.push('RF electric field is time dependent and transverse; the radial field map excludes RF.');
}
function equilibrium(s:SurfaceSnapshot,c:any,r:any){
 cylinder(s,c);
 requireValue(Array.isArray(r.profiles)&&r.profiles.length>=2&&Array.isArray(r.species),'Missing equilibrium profiles.');
 const profiles=r.profiles,x=profiles.map((p:any)=>p.radius),n=r.species.length;
 requireValue(close(x[0],0)&&close(x.at(-1),c.radius),'Equilibrium radial bounds mismatch.');
 requireValue(profiles.every((p:any)=>p.ionDensities?.length===n&&p.ionDensities.every((v:any)=>finite(v)&&v>=0)),'Invalid equilibrium densities.');
 const sum=profiles.map((p:any)=>p.ionDensities.reduce((a:number,b:number)=>a+b,0));
 requireValue(sum.every(positive),'Empty equilibrium composition.');
 const gaussian=r.gaussianProfiles;
 requireValue((c.closure==='magnetic-gaussian'?r.model==='coupled-magnetic-gaussian':c.closure==='gaussian'?r.model==='prescribed-gaussian':!r.model),'Equilibrium closure mismatch.');
 if(gaussian)requireValue(gaussian.length===x.length&&gaussian.every((p:any,i:number)=>p.radius===x[i]&&positive(p.totalIonDensityM3)),'Mismatched Gaussian profiles.');
 for(let i=0;i<n;i++){
  const scope='Radial equilibrium point samples; axisymmetric, no axial profile or collection prediction.';
  field(s,{id:`fraction-${i}`,label:`Species ${i+1} number fraction`,unit:'fraction',coordinate:'radius',measure:'point',region:'plasma',positionsM:x,
   values:profiles.map((p:any,j:number)=>p.ionDensities[i]/sum[j]),speciesIndex:i,scope},[0,1]);
  field(s,{id:`density-${i}`,label:`Species ${i+1} density`,unit:gaussian?'m⁻³':'n / n_axis',coordinate:'radius',measure:'point',region:'plasma',positionsM:x,
   values:profiles.map((p:any,j:number)=>gaussian?gaussian[j].totalIonDensityM3*p.ionDensities[i]/sum[j]:p.ionDensities[i]),speciesIndex:i,scope});
 }
 field(s,{id:'effective-potential',label:'Rotating-frame potential ψ',unit:'V',coordinate:'radius',measure:'point',region:'plasma',positionsM:x,
  values:profiles.map((p:any)=>p.effectivePotentialV),scope:'ψ = φ − Ω∫Bz r dr; not laboratory potential.'});
 if(gaussian){
  for(const [id,label,unit,property] of [
   ['potential','Laboratory potential','V','laboratoryPotentialV'],['electric-radial','Radial electric field','V/m','electricFieldVM'],
   ['current-azimuthal','Azimuthal current density','A/m²','currentDensityAM2'],['ion-velocity','Ion azimuthal velocity','m/s','ionVelocityMS']])
   field(s,{id,label,unit,coordinate:'radius',measure:'point',region:'plasma',positionsM:x,values:gaussian.map((p:any)=>p[property]),scope:'Solved prescribed-Gaussian radial equilibrium.'});
  field(s,{id:'magnetic-axial',label:'Axial magnetic field',unit:'T',coordinate:'radius',measure:'point',region:'plasma',positionsM:x,
   values:gaussian.map((p:any)=>r.model==='coupled-magnetic-gaussian'?p.magneticFieldT:c.magneticT),scope:r.model==='coupled-magnetic-gaussian'?'Self-consistent radial B from the bounded equilibrium.':'Imposed uniform B; perturbation diagnostic is not fed back.'});
 }else s.unsupported.push('Absolute density, laboratory potential, electric and magnetic field: common-corotation closure exports only normalized density and ψ.');
 s.unsupported.push('Throughput, equilibration time, collector impacts and thermal engineering are not predicted by radial equilibrium.');
}
function doublewell(s:SurfaceSnapshot,c:any,r:any){
 cylinder(s,c);counts(s,r.species,'active');injectedSpecies(c,r);imposedFields(s,c,true);s.timeS=c.duration;
 const density=r.curves?.filter((p:any)=>p.xLabel==='Radius (m)'&&p.yLabel==='Final axially averaged active density (m⁻³)');
 requireValue(density?.length===r.species.length,'Missing final double-well density curves.');
 density.forEach((p:any,i:number)=>{
  requireValue(p.x.length===20&&p.x.every((v:number,j:number)=>close(v,c.radius*(j+.5)/20))&&p.y.every((v:any)=>finite(v)&&v>=0),'Invalid annular density samples.');
  field(s,{id:`density-${i}`,label:`Species ${i+1} final active density`,unit:'m⁻³',coordinate:'radius',measure:'cell-average',region:'plasma',
   positionsM:p.x,values:p.y,boundsM:Array.from({length:21},(_,j)=>c.radius*j/20),speciesIndex:i,
   scope:'Final active marker density divided by exact annular volume and full column length; no axial/azimuthal detail.'});
  const species=r.species[i];requireValue(Array.isArray(species.impacts),'Missing double-well impacts.');
  const volume=Math.PI*c.radius**2*c.length;
  const support=c.initialState==='equilibrium'?volume:Math.PI*c.sourceRadius**2*c.length*c.pulseLengthFraction;
  const weight=c.densityM3*support/(2*c.particlesPerSpecies);
  const inventory=p.y.reduce((sum:number,v:number,j:number)=>sum+v*volume*((j+1)**2-j*j)/400,0);
  requireValue(close(inventory,species.active*weight,Math.max(weight,1e-100)),'Annular density does not close the active population ledger.');
  requireValue(species.impacts.length===species.wall+species.end+species.source,'Unexpected double-well impact event.');
  for(const d of ['wall','source','end'])requireValue(species.impacts.filter((e:any)=>e.destination===d).length===species[d],'Double-well impact ledger mismatch.');
  species.impacts.forEach((e:any)=>{
   requireValue(['wall','end','source'].includes(e.destination)&&finite(e.radius)&&e.radius>=0&&e.radius<=c.radius+1e-9&&finite(e.time)&&e.time>=0&&e.time<=c.duration&&finite(e.energyJ),'Invalid radial impact.');
   s.impacts.push({speciesIndex:i,destination:e.destination,timeS:e.time,radiusM:e.radius,hamiltonianJ:e.energyJ,injected:species.injected,scope:'radial-event-only'});
  });
 });
 const [a,b]=density;
 if(b){
  // Empty cells have no defined composition. Do not replace 0/0 with a colour.
  const occupied=a.y.map((v:number,i:number)=>v+b.y[i]>0);
  if(occupied.every(Boolean))field(s,{id:'fraction-1',label:'Species 2 active number fraction',unit:'fraction',coordinate:'radius',measure:'cell-average',region:'plasma',
   positionsM:a.x,values:a.y.map((v:number,i:number)=>b.y[i]/(v+b.y[i])),boundsM:Array.from({length:21},(_,j)=>c.radius*j/20),speciesIndex:1,
   scope:'Ratio of final annular species inventories, axially averaged.'},[0,1]);
  else s.unsupported.push('Full-domain composition: empty annuli have undefined number fraction; inspect species density instead.');
 }
 s.unsupported.push('Impact azimuth and wall axial position were not retained; radius-only impacts cannot form local collector hotspots.');
 s.unsupported.push('Density is final axially averaged finite-marker output; collision transport qualification remains separate from rendering.');
}
function reduced(s:SurfaceSnapshot,c:any,r:any){
 requireValue(Array.isArray(r.curves)&&r.curves.length>0,'Missing reduced-model curves.');
 if(c.radius!==undefined)cylinder(s,c);
 if(s.model==='gyro'){
  r.curves.forEach((p:any,i:number)=>{
   requireValue(p.xLabel==='Transverse x (m)'&&p.yLabel==='Transverse y (m)'&&p.x.length===p.y.length&&p.x.every(finite)&&p.y.every(finite),'Invalid gyro locus.');
   s.tracks.push({speciesIndex:i,positionsM:p.x.map((x:number,j:number)=>[x,p.y[j],0]),scope:'Exact transverse monoenergetic locus in z=0 plane; not an axial trajectory or common-time endpoint.'});
  });
  s.unsupported.push('No finite chamber, RF, population density or collection is solved for the gyro locus.');
 }else if(s.model==='doublewell'){
  r.curves.forEach((p:any,i:number)=>{
   requireValue(p.xLabel==='Radius (m)'&&p.yLabel==='Effective energy (eV)','Invalid effective-energy profile.');
   field(s,{id:`effective-energy-${i}`,label:`Species ${i+1} effective radial energy`,unit:'eV',coordinate:'radius',measure:'point',region:'plasma',
    positionsM:p.x,values:p.y,speciesIndex:i,scope:'One canonical angular-momentum slice; inner-axis exclusion is a plot crop, not a physical wall.'});
  });
  imposedFields(s,{...c,quadraticShape:c.quadraticShape??1},true);
  s.unsupported.push('Population density, collisional filling and product purity are not predicted by an effective-potential landscape.');
 }else if(s.model==='curved'){
  requireValue(r.curves.every((p:any)=>p.xLabel==='Arc length (m)'&&p.yLabel==='Cross-field deflection (m)'),'Invalid curved-field result.');
  s.domain={kind:'reference',lengthM:c.length};
  s.unsupported.push('Guiding-centre arc-length/deflection curves are scalar diagnostics; full toroidal vector fields, channel cross-section and collector surfaces are not solved.');
 }else{
  s.domain={kind:'reference'};
  s.unsupported.push('This reduced diagnostic has no defensible local surface field; its production curves remain available in plots.');
 }
}
function target(s:SurfaceSnapshot,c:any,r:any,selected:any,source:any){
 requireValue(r.model==='coupled-depth-target-scenario'&&Array.isArray(r.history)&&r.history.includes(selected),'Selected target state must be an accepted history sample.');
 const reaction=r.reactionOutput;
 requireValue(reaction?.reaction==='D–T'&&typeof reaction.limitation==='string'&&reaction.limitation.length>0,'Missing or unsupported target reaction scope.');
 requireValue(positive(c.filmThicknessM)&&positive(c.backingThicknessM)&&count(c.depthCells)&&c.depthCells>0&&count(c.backingCells)&&c.backingCells>0,'Invalid material geometry.');
 requireValue(positive(source?.beamAreaM2),'Missing accepted beam area.');
 const n=c.depthCells,m=c.backingCells;
 requireValue(selected.depthM?.length===n&&selected.thermalDepthM?.length===n+m&&selected.temperatureK?.length===n+m,'Missing film/backing thermal state.');
 requireValue(selected.depthM.every((v:number,i:number)=>close(v,(i+.5)*c.filmThicknessM/n,c.filmThicknessM)),'Film centers do not match accepted geometry.');
 const thermal=selected.thermalDepthM;
 requireValue(thermal.every((v:number,i:number)=>close(v,i<n?(i+.5)*c.filmThicknessM/n:c.filmThicknessM+(i-n+.5)*c.backingThicknessM/m,c.filmThicknessM+c.backingThicknessM)),'Thermal centers do not match material regions.');
 requireValue(selected.temperatureK.every(positive)&&finite(selected.timeS)&&selected.timeS>=0,'Invalid target temperature/time.');
 for(const name of ['tritiumFraction','deuteriumFraction','vacancyFraction'])requireValue(selected[name]?.length===n&&selected[name].every((v:any)=>finite(v)&&v>=0&&v<=1+1e-12),'Invalid film site fraction.');
 requireValue(selected.tritiumFraction.every((v:number,i:number)=>close(v+selected.deuteriumFraction[i]+selected.vacancyFraction[i],1)),'Target site ledger does not close.');
 s.domain={kind:'target',filmThicknessM:c.filmThicknessM,backingThicknessM:c.backingThicknessM,beamAreaM2:source.beamAreaM2};s.timeS=selected.timeS;
 const fullThermalDomain:[number,number]=[Math.min(...selected.temperatureK),Math.max(...selected.temperatureK)];
 for(const region of ['film','backing'] as const){
  const start=region==='film'?0:n,end=region==='film'?n:n+m,offset=region==='film'?0:c.filmThicknessM;
  const width=region==='film'?c.filmThicknessM:c.backingThicknessM,cells=end-start;
  field(s,{id:`temperature-${region}`,label:`${region} temperature`,unit:'K',coordinate:'depth',measure:'cell-average',region,
   positionsM:thermal.slice(start,end),values:selected.temperatureK.slice(start,end),boundsM:Array.from({length:cells+1},(_,i)=>offset+i*width/cells),
   scope:'Accepted 1D thermal cell average, uniform over the declared illuminated area; interface/contact jump preserved.'},fullThermalDomain);
 }
 for(const name of ['tritiumFraction','deuteriumFraction','vacancyFraction'])field(s,{id:name,label:name.replace('Fraction',' site fraction'),unit:'fraction',coordinate:'depth',measure:'cell-average',region:'film',
  positionsM:selected.depthM,values:selected[name],boundsM:Array.from({length:n+1},(_,i)=>i*c.filmThicknessM/n),scope:'Accepted film site occupancy; not a backing composition.'},[0,1+1e-12]);
 for(const [id,property,unit] of [['neutron-rate','neutronRateS','s⁻¹'],['assembly-heat','assemblyHeatW','W']]){
  requireValue(finite(selected[property])&&selected[property]>=0,'Invalid accepted target output.');
  s.scalars.push({id,...(id==='neutron-rate'?{label:`${reaction.reaction} neutron rate`}:{}),value:selected[property],unit,scope:'Whole illuminated assembly output; no lateral distribution is resolved.'});
 }
 s.unsupported.push(reaction.limitation);
 s.unsupported.push('Lateral temperature hotspots, radial beam profile, backing isotope occupancy, deformation and stress are not solved by the 1D target model.');
}

/** Never publish stale output under new geometry/inputs. No fallback to a prior run. */
export function surfaceState(request:SurfaceRequest):SurfaceState {
 if(request.pending)return {status:'pending',reason:'A current accepted solution is pending.'};
 try{
  const {model,settings:c,result:r}=request;
  requireValue(model===request.acceptedModel,'Accepted model differs from the current model.');
  requireValue(key(c)===key(request.acceptedSettings),'Accepted settings differ from the current settings.');
  requireValue(r&&typeof r==='object','No accepted result.');
  if(r.config)requireValue(key(r.config)===key(request.acceptedSettings),'Result configuration differs from accepted settings.');
  const s:SurfaceSnapshot={model,timeS:null,domain:{kind:'reference'},fields:[],tracks:[],impacts:[],counts:[],scalars:[],unsupported:[]};
  if(model==='rotating'||model==='icr')orbit(s,c,r);
  else if(model==='centrifuge')equilibrium(s,c,r);
  else if(model==='doublewell-dynamics')doublewell(s,c,r);
  else if(model==='marathon'||model==='coupled-target'||model==='beam-target'){
   requireValue(key(request.source)===key(request.acceptedSource),'Accepted beam source differs from the current source.');
   target(s,c,r,request.selectedState,request.source);
  }else if(['gyro','curved','doublewell','mirror','centrifugal','poms','azimuthal','advection','diffusion','mobility','ionization','transit'].includes(model))reduced(s,c,r);
  else if(['blanket','future-blanket','research','research-replay','reference'].includes(model))s.unsupported.push('Reference geometry/evidence only; no current spatial solution or live engineering prediction.');
  else throw new RangeError('Unknown surface model.');
  // Comparable species use a common colour scale for each quantity/unit.
  for(const prefix of ['density-','effective-energy-']){
   const group=s.fields.filter(f=>f.id.startsWith(prefix));
   if(group.length>1){const domain:[number,number]=[Math.min(...group.map(f=>f.domain[0])),Math.max(...group.map(f=>f.domain[1]))];
    group.forEach(f=>{f.domain=domain;});}
  }
  return {status:'ready',snapshot:s};
 }catch(error){return {status:'invalid',reason:error instanceof Error?error.message:String(error)};}
}

/** Raw sample picking: right cell owns an internal face; final cell owns the last
 * boundary. Outside support returns null. Point ties choose the lower sample. */
export function sampleSurfaceField(f:SurfaceField,coordinateM:number){
 if(!finite(coordinateM))return null;
 let index=-1;
 if(f.measure==='cell-average'){
  const b=f.boundsM!;
  if(coordinateM<b[0]||coordinateM>b.at(-1)!)return null;
  index=coordinateM===b.at(-1)?f.values.length-1:b.findIndex((v,i)=>i<b.length-1&&coordinateM>=v&&coordinateM<b[i+1]);
 }else{
  if(coordinateM<f.positionsM[0]||coordinateM>f.positionsM.at(-1)!)return null;
  index=f.positionsM.reduce((best,v,i)=>Math.abs(v-coordinateM)<Math.abs(f.positionsM[best]-coordinateM)?i:best,0);
 }
 return index<0?null:{index,positionM:f.positionsM[index],value:f.values[index],unit:f.unit,
  ...(f.boundsM?{boundsM:[f.boundsM[index],f.boundsM[index+1]] as [number,number]}:{})};
}
