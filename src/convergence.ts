import {E_CHARGE} from './physics.js';
import {type DoublewellConfig,type DoublewellExecutionMode,type DoublewellRandomSource,resolveDoublewellRandomSource,simulateDoublewell} from './doublewell-dynamics.js';

type Result=ReturnType<typeof simulateDoublewell>;
export type Verdict='pass'|'fail'|'unknown';
export interface SeedInterval {n:number;mean:number|null;standardError:number|null;halfWidth95:number|null}
export interface ConvergenceLevel {id:string;config:DoublewellConfig}
export interface Refinement {kind:'timestep'|'particle'|'spatial'|'alignment'|'orientation'|'method';coarse:string;fine:string}
export interface ConvergencePlan {
 id:string;description:string;levels:ConvergenceLevel[];seeds:number[];comparisons:Refinement[];
 executionMode?:DoublewellExecutionMode;
 physicalEffect?:{control:string;collisional:string};
 tolerances:{fraction:number;radiusFraction:number;temperatureEV:number;timeFraction:number;
  normalizedAngularMomentum:number;maxRawMomentumResidual:number;maxUnresolvedExposure:number;minimumSeeds:number};
}
export interface SeedRun {
 level:string;seed:number;config:DoublewellConfig;durationMs:number;status:'complete'|'error';error?:string;
 executionMode?:DoublewellExecutionMode;
 sourceHash?:string;
 randomSource?:DoublewellRandomSource;
 observables:Record<string,number|null>;diagnostics?:{maxRawMomentumResidual:number;maxEnergyResidual:number;
  unresolvedExposure:number|null;outsideSnapshots:number;unpairedExposure:number|null;particleSteps:number};
 numericalGeometry?:{baseCellWidthM:number;baseAxialCells:number;baseAxialLengthM:number;uniformColumnMeanRepresentativesPerFullBaseCell:number|null;coordinates:'Cartesian'|'annular-r-z'};
 raw?:Pick<Result,'species'|'history'|'conservation'|'collisions'|'regimeSummary'|'regimeHistory'|'spatialCollision'> & {radialDensity:Result['curves']};
}
export interface Check {name:string;status:Verdict;reason:string;details?:unknown}

/** A t interval across independent whole runs, not across interacting ions.
 * Small-sample inference assumes the run means are approximately normal.
 * The table is the two-sided 95% Student-t quantile for 1..30 degrees of freedom.
 */
export function seedInterval(values:readonly number[]):SeedInterval {
 if(values.some(v=>!Number.isFinite(v)))throw new Error('Seed statistics require finite whole-run observations.');
 const n=values.length;if(!n)return {n,mean:null,standardError:null,halfWidth95:null};
 const mean=values.reduce((a,b)=>a+b,0)/n;
 if(n<2)return {n,mean,standardError:null,halfWidth95:null};
 const standardError=Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/(n*(n-1)));
 const t=[12.706205,4.302653,3.182446,2.776445,2.570582,2.446912,2.364624,2.306004,2.262157,2.228139,
  2.200985,2.178813,2.160369,2.144787,2.13145,2.119905,2.109816,2.100922,2.093024,2.085963,
  2.079614,2.073873,2.068658,2.063899,2.059539,2.055529,2.051831,2.048407,2.04523,2.042272];
 // For larger samples use the t asymptotic expansion, rather than abruptly
 // replacing the finite-n interval with a narrower normal interval.
 const df=n-1,z=1.959963984540054;
 const critical=df<=30?t[df-1]:z+(z**3+z)/(4*df)+(5*z**5+16*z**3+3*z)/(96*df**2);
 const spread=Math.max(...values)-Math.min(...values),scale=Math.max(...values.map(Math.abs));
 // Identical discrete outcomes do not bound an unobserved rare tail. Tiny
 // differences at arithmetic-roundoff scale are not observed sampling spread.
 const resolvedSpread=spread>256*Number.EPSILON*scale;
 return {n,mean,standardError,halfWidth95:resolvedSpread?critical*standardError:null};
}

export function equivalence(interval:SeedInterval,tolerance:number,minimumSeeds:number):Verdict {
 if(!Number.isFinite(tolerance)||tolerance<=0||!Number.isInteger(minimumSeeds)||minimumSeeds<2)
  throw new Error('Convergence needs positive declared tolerances and at least two independent seeds.');
 if(interval.n<minimumSeeds||interval.mean===null||interval.halfWidth95===null)return 'unknown';
 if(Math.abs(interval.mean)+interval.halfWidth95<=tolerance)return 'pass';
 if(Math.abs(interval.mean)-interval.halfWidth95>tolerance)return 'fail';
 return 'unknown';
}

const destinations=['active','wall','end','source'] as const;
const quantile=(values:number[],p:number)=>{
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b),position=p*(sorted.length-1),i=Math.floor(position);
 return sorted[i]+(sorted[Math.min(i+1,sorted.length-1)]-sorted[i])*(position-i);
};

/** Dimensioned raw results remain in the artifact; these normalized observables
 * give the declared educational error budgets a consistent interpretation.
 * Survivor CDFs below are unconditional fractions of the original population.
 */
export function observeDoublewell(result:Result):Record<string,number|null>{
 const {config:c}=result,last=result.history.at(-1)!,initial=result.history[0];
 const weight=result.metrics.find(m=>m.label==='Physical ions per representative')!.value;
 if(typeof weight!=='number'||!Number.isFinite(weight)||weight<=0)throw new Error('Convergence observations require a positive physical representative weight.');
 const out:Record<string,number|null>={};
 result.species.forEach((s,i)=>{
  const name=['A','B'][i],survivor=last.species[i];
  for(const d of destinations)out[`${name}.fraction.${d}`]=s[d]/s.injected;
  out[`${name}.radius`]=survivor.meanRadius===null?null:survivor.meanRadius/c.radius;
  out[`${name}.temperature`]=survivor.temperatureEV;
  const activeP=survivor.meanCanonicalMomentum===null?0:survivor.meanCanonicalMomentum*s.active;
  out[`${name}.angularTransfer`]=weight*(activeP+s.impacts.reduce((sum,h)=>sum+h.canonicalMomentum,0)
   -initial.species[i].meanCanonicalMomentum!*s.injected)/result.conservation.canonicalMomentumScale;
  for(const q of [.1,.5,.9]){
   const time=quantile(s.impacts.map(h=>h.time/c.duration),q);
   out[`${name}.impactTime.${q}`]=time;
  }
  // energyJ is the signed laboratory Hamiltonian K+qφ, not deposited heat.
  out[`${name}.impactHamiltonianEV`]=s.impacts.length?s.impacts.reduce((sum,h)=>sum+h.energyJ/E_CHARGE,0)/s.impacts.length:null;
  const curve=result.curves.find(curve=>curve.yLabel==='Final axially averaged active density (m⁻³)'&&curve.label===name)!;
  let cumulative=0;
  curve.y.forEach((density,j)=>{
   cumulative+=density*Math.PI*c.radius**2*((j+1)**2-j*j)/curve.y.length**2*c.length/(weight*s.injected);
   out[`${name}.cdf.${j}`]=cumulative;
  });
 });
 return out;
}

export function executeSeed(level:ConvergenceLevel,seed:number,sourceHash?:string,
 executionMode:DoublewellExecutionMode='interactive'):SeedRun {
 const config={...structuredClone(level.config),seed},start=performance.now();
 let randomSource:DoublewellRandomSource|undefined;
 try{
  randomSource=resolveDoublewellRandomSource(config.randomSource);
  const r=simulateDoublewell(config,executionMode);
  const ring=config.collisionMethod==='axisymmetric';
  const width=(ring?1:2)*config.radius/config.cellsAcross,nz=ring&&config.collisionAxialCells!==undefined?config.collisionAxialCells:Math.ceil(config.length/width),dz=config.length/nz;
  // Time-average the sampled active-representative unresolved exposure. This
  // remains a sampled estimate; no-active states contribute no exposure.
  let unresolved=0,total=0;
  for(let i=1;i<r.regimeHistory.length;i++){
   const dt=r.regimeHistory[i].time-r.regimeHistory[i-1].time;
   for(const j of [i-1,i]){
    const active=r.history[j].species.reduce((sum,s)=>sum+s.active,0);
    const fraction=r.regimeHistory[j].assessment.observed.unresolvedRepresentativeFraction;
    if(active){total+=active*dt/2;unresolved+=(fraction??1)*active*dt/2;}
   }
  }
  return {level:level.id,seed,config,sourceHash,executionMode,randomSource,durationMs:performance.now()-start,status:'complete',observables:observeDoublewell(r),
   numericalGeometry:{baseCellWidthM:width,baseAxialCells:nz,baseAxialLengthM:dz,coordinates:ring?'annular-r-z':'Cartesian',
    uniformColumnMeanRepresentativesPerFullBaseCell:ring?null:2*config.particlesPerSpecies*width*width*dz/(Math.PI*config.radius**2*config.length)},
   diagnostics:{maxRawMomentumResidual:r.conservation.maxMomentumResidual,maxEnergyResidual:r.conservation.maxEnergyResidual,
    unresolvedExposure:total?unresolved/total:null,outsideSnapshots:r.regimeSummary.outsideSnapshots,
    unpairedExposure:r.collisions.activeIonSteps?r.collisions.unpairedIonSteps/r.collisions.activeIonSteps:null,
    particleSteps:2*config.particlesPerSpecies*Math.ceil(config.duration/config.dt)},
   raw:{species:r.species,history:r.history,conservation:r.conservation,collisions:r.collisions,
    regimeSummary:r.regimeSummary,regimeHistory:r.regimeHistory,spatialCollision:r.spatialCollision,
    radialDensity:r.curves.filter(c=>c.yLabel==='Final axially averaged active density (m⁻³)')}};
 }catch(error){
  return {level:level.id,seed,config,sourceHash,executionMode,...(randomSource?{randomSource}:{}),durationMs:performance.now()-start,status:'error',
   error:error instanceof Error?error.message:String(error),observables:{}};
 }
}

function toleranceFor(key:string,p:ConvergencePlan){
 if(key.includes('.fraction.')||key.includes('.cdf.'))return p.tolerances.fraction;
 if(key.endsWith('.radius'))return p.tolerances.radiusFraction;
 if(key.endsWith('.temperature'))return p.tolerances.temperatureEV;
 if(key.endsWith('.angularTransfer'))return p.tolerances.normalizedAngularMomentum;
 if(key.includes('.impactTime.'))return p.tolerances.timeFraction;
 // Mean impact Hamiltonian is retained as a raw observable, without silently
 // inventing an energy tolerance or treating it as a passed gate.
 return null;
}

export function validateConvergencePlan(plan:ConvergencePlan){
 for(const level of plan.levels)resolveDoublewellRandomSource(level.config.randomSource);
 if(plan.executionMode!==undefined&&plan.executionMode!=='interactive'&&plan.executionMode!=='research')
  throw new Error('Unknown convergence execution mode.');
 if(!plan.id||!plan.levels.length||new Set(plan.levels.map(l=>l.id)).size!==plan.levels.length)
  throw new Error('A convergence case needs unique named levels.');
 if(!plan.seeds.length||new Set(plan.seeds).size!==plan.seeds.length
  ||plan.seeds.some(s=>!Number.isInteger(s)||s<0||s>0xffffffff))throw new Error('Use distinct valid independent-run seeds.');
 if(Object.values(plan.tolerances).some(v=>!Number.isFinite(v)||v<=0)||!Number.isInteger(plan.tolerances.minimumSeeds)||plan.tolerances.minimumSeeds<2)
  throw new Error('Declare positive error budgets and a minimum independent-seed count.');
 const levels=new Map(plan.levels.map(l=>[l.id,l.config]));
 for(const comparison of plan.comparisons){
  if(!['timestep','particle','spatial','method'].includes(comparison.kind))throw new Error('Unknown or executor-unsupported refinement kind: alignment/orientation are not implemented in this solver.');
  const a=levels.get(comparison.coarse),b=levels.get(comparison.fine);
  if(!a||!b||a.duration!==b.duration)throw new Error('Each refinement must compare known levels at the same physical horizon.');
  if((comparison.kind==='method'||comparison.kind==='spatial')&&(!a.collisions||!b.collisions))
   throw new Error('Collision method and spatial comparisons require collisions enabled at both levels.');
  if(comparison.kind==='spatial'&&a.collisionMethod==='adaptive')
   throw new Error('Adaptive partitions require target/depth method comparisons; cellsAcross is not an executed spatial refinement.');
  const axial=(c:DoublewellConfig)=>c.collisionMethod==='axisymmetric'?(c.collisionAxialCells??Math.ceil(c.length/(c.radius/c.cellsAcross))):null;
  const axialA=axial(a),axialB=axial(b);
  const axialCoarsened=axialA!==null&&axialB!==null&&axialB<axialA;
  const spatialImproved=b.cellsAcross>a.cellsAcross||axialA!==null&&axialB!==null&&axialB>axialA;
  if(comparison.kind==='timestep'&&b.dt>=a.dt||comparison.kind==='particle'&&b.particlesPerSpecies<=a.particlesPerSpecies
   ||comparison.kind==='spatial'&&(!spatialImproved||axialCoarsened||b.cellsAcross<a.cellsAcross||b.particlesPerSpecies<a.particlesPerSpecies))
   throw new Error('A refinement must actually improve its advertised resolution.');
  if(comparison.kind==='method'){
   const methodA=a.collisionMethod??'fixed',methodB=b.collisionMethod??'fixed';
   const changed=methodA!==methodB||(a.collisionScattering??'takizuka-abe')!==(b.collisionScattering??'takizuka-abe')||methodA==='adaptive'&&((a.collisionTarget??32)!==(b.collisionTarget??32)
    ||(a.collisionMaxDepth??15)!==(b.collisionMaxDepth??15))
    ||methodA==='axisymmetric'&&a.initialState==='pulse'&&Boolean(a.collisionSourceAligned)!==Boolean(b.collisionSourceAligned);
   if(!changed)throw new Error('A method comparison must change an executed collision method setting.');
  }
  const allowed=comparison.kind==='timestep'?['dt']:comparison.kind==='particle'?['particlesPerSpecies']:
   comparison.kind==='spatial'?['cellsAcross','particlesPerSpecies','collisionAxialCells']:['collisionMethod','collisionTarget','collisionMaxDepth','collisionSourceAligned','collisionScattering'];
  const stripped=(c:DoublewellConfig)=>Object.fromEntries(Object.entries(c).filter(([key])=>key!=='seed'&&!allowed.includes(key)).sort(([a],[b])=>a.localeCompare(b)));
  if(JSON.stringify(stripped(a))!==JSON.stringify(stripped(b)))throw new Error('Refinement changes undeclared physical or numerical settings.');
 }
 if(plan.physicalEffect){
  const control=levels.get(plan.physicalEffect.control),collisional=levels.get(plan.physicalEffect.collisional);
  if(!control||!collisional)throw new Error('Physical-effect levels must exist.');
  const stripped=(c:DoublewellConfig)=>Object.fromEntries(Object.entries(c).filter(([key])=>key!=='seed'&&key!=='collisions').sort(([a],[b])=>a.localeCompare(b)));
  if(control.collisions!==false||collisional.collisions!==true||canonical(stripped(control))!==canonical(stripped(collisional)))
   throw new Error('A collision-on/off physical effect must change only the collision enable switch at the same physical horizon.');
 }
}

const canonical=(value:unknown):string=>{
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
};

const matchingRandomSource=(run:SeedRun)=>{
 try{return resolveDoublewellRandomSource(run.randomSource)===resolveDoublewellRandomSource(run.config.randomSource);}
 catch{return false;}
};

const nonnegativeFinite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const validExposure=(value:unknown):value is number=>nonnegativeFinite(value)&&value<=1;
const validOutsideCount=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;

export function summarizeConvergence(plan:ConvergencePlan,runs:SeedRun[],expectedSourceHash?:string){
 validateConvergencePlan(plan);
 const checks:Check[]=[];
 const groups=Object.fromEntries(plan.levels.map(l=>[l.id,runs.filter(r=>r.level===l.id&&r.status==='complete'
  &&plan.seeds.includes(r.seed)&&runs.filter(other=>other.level===l.id&&other.seed===r.seed).length===1
  &&canonical(r.config)===canonical({...l.config,seed:r.seed})
  &&matchingRandomSource(r)
  &&(r.executionMode===undefined?'interactive':r.executionMode)===(plan.executionMode??'interactive')
  &&(!expectedSourceHash||r.sourceHash===expectedSourceHash))]));
 checks.push({name:'executed source identity',status:expectedSourceHash?(runs.every(r=>r.sourceHash===expectedSourceHash)?'pass':'fail'):'unknown',
  reason:expectedSourceHash?'Every supplied run must match the declared executed-source hash.':'No expected executed-source hash supplied; provenance is not certified.'});
 if(runs.some(r=>!plan.levels.some(l=>l.id===r.level)||!plan.seeds.includes(r.seed)))
  checks.push({name:'case membership',status:'fail',reason:'Supplied run belongs to an undeclared level or seed.'});
 for(const level of plan.levels){
  const batch=groups[level.id],seeds=batch.map(r=>r.seed);
  if(seeds.length!==plan.seeds.length||new Set(seeds).size!==seeds.length||plan.seeds.some(s=>!seeds.includes(s)))
   checks.push({name:`${level.id}: complete batch`,status:'fail',reason:'Missing, duplicated, failed or stale/config-mismatched run; no partial batch is certified.'});
  if(!level.config.collisions)continue;
  const outside=batch.some(({diagnostics:d})=>d&&validOutsideCount(d.outsideSnapshots)&&d.outsideSnapshots>0);
  const invalid=batch.some(({diagnostics:d})=>!d||!validOutsideCount(d.outsideSnapshots)||!validExposure(d.unresolvedExposure));
  const unresolved=invalid||batch.some(r=>r.diagnostics!.unresolvedExposure! > plan.tolerances.maxUnresolvedExposure);
  checks.push({name:`${level.id}: sampled local coverage`,status:outside?'fail':unresolved||!batch.length?'unknown':'pass',
   reason:outside?'A sampled state leaves the collision model domain.':invalid?'Local representative coverage diagnostics are absent or invalid.':unresolved||!batch.length?'Local representative coverage is absent or exceeds the declared unresolved-exposure budget.':'Sampled exposure meets the chosen coverage budget; unsampled states are not certified.'});
  const raw=batch.map(r=>r.diagnostics?.maxRawMomentumResidual),validRaw=raw.filter(nonnegativeFinite);
  const rawStatus:Verdict=validRaw.some(value=>value>plan.tolerances.maxRawMomentumResidual)?'fail'
   :!batch.length||validRaw.length!==batch.length?'unknown':'pass';
  checks.push({name:`${level.id}: raw angular-momentum budget`,status:rawStatus,
   reason:rawStatus==='unknown'?'Raw residual diagnostics are absent or invalid; the declared angular-momentum budget is unassessed.':'Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger.',details:raw});
 }
 const summaries=Object.fromEntries(plan.levels.map(l=>{
  const batch=groups[l.id],keys=[...new Set(batch.flatMap(r=>Object.keys(r.observables)))];
  return [l.id,Object.fromEntries(keys.map(key=>[key,seedInterval(batch.map(r=>r.observables[key]).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v)))]))];
 }));
 const comparisons=plan.comparisons.map(comparison=>{
  const coarse=groups[comparison.coarse],fine=groups[comparison.fine],keys=Object.keys(summaries[comparison.coarse]);
  const observables=Object.fromEntries(keys.map(key=>{
   const pairs=plan.seeds.map(seed=>[coarse.find(r=>r.seed===seed)?.observables[key],fine.find(r=>r.seed===seed)?.observables[key]]);
   const differences=pairs.filter((p):p is [number,number]=>p.every(v=>typeof v==='number'&&Number.isFinite(v))).map(([a,b])=>b-a);
   const interval=seedInterval(differences),tolerance=toleranceFor(key,plan);
   const status=tolerance===null||differences.length!==plan.seeds.length?'unknown':equivalence(interval,tolerance,plan.tolerances.minimumSeeds);
   return [key,{...interval,tolerance,status}];
  }));
  const gated=Object.entries(observables).filter(([key])=>toleranceFor(key,plan)!==null).map(([,v])=>v.status);
  const status:Verdict=gated.includes('fail')?'fail':gated.length&&gated.every(v=>v==='pass')?'pass':'unknown';
  checks.push({name:`${comparison.kind}: ${comparison.coarse} → ${comparison.fine}`,status,
   reason:'Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown.'});
  return {...comparison,status,observables};
 });
 for(const kind of ['timestep','particle','spatial','alignment','orientation'] as const)
  if(!plan.comparisons.some(c=>c.kind===kind))checks.push({name:`${kind}: required coverage`,status:'unknown',reason:'This case has not supplied this independent refinement/sensitivity comparison.'});
 const physicalEffect=plan.physicalEffect?Object.fromEntries(Object.keys(summaries[plan.physicalEffect.collisional]).map(key=>{
  const differences=plan.seeds.flatMap(seed=>{
   const a=groups[plan.physicalEffect!.control].find(r=>r.seed===seed)?.observables[key];
   const b=groups[plan.physicalEffect!.collisional].find(r=>r.seed===seed)?.observables[key];
   return typeof a==='number'&&typeof b==='number'?[b-a]:[];
  });return [key,seedInterval(differences)];
 })):null;
 checks.push({name:'effect versus numerical error',status:'unknown',reason:'Collision-on/off differences are reported separately; this matrix does not establish a bound on continuum bias relative to the physical effect.'});
 const status:Verdict=checks.some(c=>c.status==='fail')?'fail':checks.every(c=>c.status==='pass')?'pass':'unknown';
 return {status,checks,summaries,comparisons,physicalEffect,
  inference:'Approximate pointwise 95% Student-t intervals across independent whole-run seeds; refinement differences are paired by seed. Intervals are withheld when no sampling spread is observed above floating resolution; identical finite samples cannot bound rare tails. No independent-ion confidence interval, simultaneous band or experimental validation is implied.'};
}
