import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {DEFAULT_LANDAU_REFERENCE as d,simulateLandauReference} from '../src/landau-reference.js';
import {collideCoulombCell,type CoulombIon} from '../src/coulomb.js';

const output=process.argv[2]??'assets/landau-reference-results.json';
const checkpoints=[0,1e-4,2.5e-4,5e-4,1e-3],seeds=[9143,17389,27077,39041];
const density=d.species.reduce((s,v)=>s+v.densityM3,0),nPerSpecies=512;
const rng=(seed:number)=>()=>{seed=(seed+0x6d2b79f5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
const normal=(r:()=>number)=>Math.sqrt(-2*Math.log1p(-r()))*Math.cos(2*Math.PI*r());
const mean=(x:number[])=>x.reduce((s,v)=>s+v,0)/x.length;
const summary=(x:number[])=>({mean:mean(x),standardError:Math.sqrt(x.reduce((s,v)=>s+(v-mean(x))**2,0)/(x.length*(x.length-1))),seeds:x.length});
const start=performance.now();
const referenceSettings=[
 {name:'mesh128',bins:128,dtS:1.25e-7,maximumScaledSpeed:8},
 {name:'mesh256',bins:256,dtS:1.25e-7,maximumScaledSpeed:8},
 {name:'mesh512',bins:512,dtS:1.25e-7,maximumScaledSpeed:8},
 {name:'time1us',bins:256,dtS:1e-6,maximumScaledSpeed:8},
 {name:'time0.5us',bins:256,dtS:5e-7,maximumScaledSpeed:8},
 {name:'time0.25us',bins:256,dtS:2.5e-7,maximumScaledSpeed:8},
 {name:'cutoff10',bins:640,dtS:1.25e-7,maximumScaledSpeed:10},
];
const references=referenceSettings.map(({name,...settings})=>{
 const t=performance.now(),r=simulateLandauReference({...d,...settings,sampleEvery:1});
 const at=checkpoints.map(timeS=>r.history.reduce((a,b)=>Math.abs(b.timeS-timeS)<Math.abs(a.timeS-timeS)?b:a));
 console.log(`${name}: E defect ${r.maxEnergyResidual.toExponential(4)}; final T ${r.history.at(-1)!.temperaturesEV}`);
 return {name,config:r.config,runtimeMS:performance.now()-t,history:at,
  maxEnergyResidual:r.maxEnergyResidual,maxNumberResidual:r.maxNumberResidual,
  initialNormalizationDefect:r.initialNormalizationDefect};
});
const stochastic=[];
for(const dtS of [1e-6,5e-7,2.5e-7]){
 const runs=seeds.map(seed=>{
  const t=performance.now(),random=rng(seed);
  const ions:CoulombIon[]=d.species.flatMap(s=>Array.from({length:nPerSpecies},()=>({massU:s.massU,chargeState:s.charge,
   velocity:Array.from({length:3},()=>Math.sqrt(1.602176634e-19*s.temperatureEV/(s.massU*1.66053906660e-27))*normal(random)) as [number,number,number]})));
  const record=(timeS:number)=>({timeS,temperaturesEV:d.species.map((s,k)=>{
   const markers=ions.slice(k*nPerSpecies,(k+1)*nPerSpecies);
   return s.massU*1.66053906660e-27*mean(markers.map(p=>p.velocity.reduce((sum,v)=>sum+v*v,0)))/(3*1.602176634e-19);
  })});
  const history=[record(0)];let time=0;
  for(const target of checkpoints.slice(1)){
   const steps=Math.round((target-time)/dtS),step=(target-time)/steps;
   for(let i=0;i<steps;i++)collideCoulombCell(ions,density,d.coulombLog,step,random);
   time=target;history.push(record(time));
  }
  return {seed,dtS,particlesPerSpecies:nPerSpecies,runtimeMS:performance.now()-t,history};
 });
 stochastic.push({dtS,runs,history:checkpoints.map((timeS,i)=>({timeS,
  species:d.species.map((_,k)=>summary(runs.map(r=>r.history[i].temperaturesEV[k])))}))});
 console.log(`TA dt ${dtS}: ${JSON.stringify(stochastic.at(-1)!.history.at(-1))}`);
}
const identities=Object.fromEntries(['src/landau-reference.ts','src/coulomb.ts','src/physics.ts','scripts/run-landau-reference.ts'].map(name=>
 [name,createHash('sha256').update(readFileSync(name)).digest('hex')]));
const artifact={schemaVersion:1,modelVersion:9,createdUTC:new Date().toISOString(),sourceHashes:identities,
 runtime:{node:process.version,platform:process.platform,architecture:process.arch},
 case:{species:d.species,coulombLog:d.coulombLog,durationS:d.durationS,
  description:'Closed homogeneous isotropic Maxwellian 40/84-u relaxation, no fields/drift/spatial cells. Second-moment temperatures, not drift-subtracted.'},
 declaredChecks:{maxReferenceEnergyDefect:.001,meshAndTimeTemperatureDifferenceEV:.01,
  selection:'Pilot-informed engineering targets fixed before the full reference/TA comparison campaign; not independent preregistration or a literature standard.',
  taComparison:'Use whole-run independent-seed variability; four seeds are exploratory. No acceptance from pair conservation or temperature direction alone.'},
 referenceAccepted:false,separatorTransportValidated:false,totalRuntimeMS:performance.now()-start,references,stochastic,
 limitations:['The deterministic FV algorithm is an independent reference candidate, not a published-code reproduction or exact energy-conserving DG scheme.',
  'Energy/truncation/cutoff/time defects are recorded without projection. No general-purpose Coulomb or separator validation is claimed.',
  'TA finite-N empirical self-exclusion differs from the continuum limit; raw second moments include finite-sample center-of-mass drift.',
  'Only isotropic temperature relaxation is compared. Anisotropic distributions, drift friction, spatial locality and collector observables remain separate gates.']};
writeFileSync(output,JSON.stringify(artifact,null,2)+'\n');console.log(`Wrote ${output}`);
