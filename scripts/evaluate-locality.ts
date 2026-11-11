import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {DEFAULT_DOUBLEWELL,simulateDoublewell,type DoublewellConfig} from '../src/doublewell-dynamics.js';

const seeds=[11,22,33,44,55,66];
const levels=[
 {label:'fixed-128-c3',collisionMethod:'fixed',particlesPerSpecies:128,cellsAcross:3},
 {label:'adaptive-128-t32',collisionMethod:'adaptive',particlesPerSpecies:128,collisionTarget:32},
 {label:'fixed-512-c4',collisionMethod:'fixed',particlesPerSpecies:512,cellsAcross:4},
 {label:'adaptive-512-t32',collisionMethod:'adaptive',particlesPerSpecies:512,collisionTarget:32},
 {label:'adaptive-512-t64',collisionMethod:'adaptive',particlesPerSpecies:512,collisionTarget:64},
 {label:'adaptive-2048-t64',collisionMethod:'adaptive',particlesPerSpecies:2048,collisionTarget:64},
] as const;
const sourceFiles=['src/physics.ts','src/coulomb.ts','src/doublewell-orbits.ts','src/doublewell-dynamics.ts',
 'src/doublewell-regime.ts','src/collision-locality.ts','scripts/evaluate-locality.ts'];
const sources=Object.fromEntries(sourceFiles.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
const runs=[];
for(const level of levels)for(const seed of seeds){
 const {label,...settings}=level,config:DoublewellConfig={...DEFAULT_DOUBLEWELL,...settings,collisionMaxDepth:15,seed};
 const start=performance.now(),r=simulateDoublewell(config),last=r.history.at(-1)!;
 const volume=Math.PI*config.sourceRadius**2*config.length*config.pulseLengthFraction;
 const observable={rawP:r.conservation.maxMomentumResidual,H:r.conservation.maxEnergyResidual,
  correctedP:r.conservation.maxCorrectedMomentumResidual,torqueQV:r.conservation.localityQuadraticVariationScale,
  rmsPairSeparationM:Math.sqrt(r.collisions.pairSeparationSquaredSumM2/r.collisions.pairs),
  unpairedExposure:r.collisions.unpairedIonSteps/r.collisions.activeIonSteps,
  unresolvedSnapshotFraction:r.regimeSummary.unresolvedSnapshots/r.regimeHistory.length,
  initialDensityMultiplier:r.spatialCollision.initial.markerMeanCellDensityM3!/config.densityM3,
  initialSelfExcludedDensitySquaredRatio:r.spatialCollision.initial.selfExcludedDensitySquaredIntegral/(config.densityM3**2*volume),
  endA:r.species[0].end/config.particlesPerSpecies,endB:r.species[1].end/config.particlesPerSpecies,
  wallA:r.species[0].wall/config.particlesPerSpecies,wallB:r.species[1].wall/config.particlesPerSpecies,
  meanRadiusA:last.species[0].meanRadius,meanRadiusB:last.species[1].meanRadius};
 runs.push({label,config,runtimeMs:performance.now()-start,observable,spatial:r.spatialCollision,
  collisions:r.collisions,conservation:r.conservation,regimeSummary:r.regimeSummary,
  destinationCounts:r.species.map(s=>({active:s.active,wall:s.wall,end:s.end,source:s.source})),
  finalRadialDensity:r.curves.filter(c=>c.yLabel==='Final axially averaged active density (m⁻³)')});
 console.log(JSON.stringify({label,seed,runtimeMs:runs.at(-1)!.runtimeMs,observable}));
}
const interval=(values:number[])=>{
 const n=values.length,mean=values.reduce((a,b)=>a+b,0)/n;
 if(!values.every(Number.isFinite))return {n,mean:null,standardError:null,low:null,high:null,reason:'Some runs have undefined observations.'};
 const sampleVariance=values.reduce((s,v)=>s+(v-mean)**2,0)/(n-1),standardError=Math.sqrt(sampleVariance/n);
 if(standardError===0)return {n,mean,standardError,low:null,high:null,reason:'No observed between-run variability; bounds withheld rather than implying absent tails.'};
 return {n,mean,standardError,low:mean-2.570581835636314*standardError,high:mean+2.570581835636314*standardError};
};
const summaries=levels.map(level=>({label:level.label,observable:Object.fromEntries(
 Object.keys(runs[0].observable).map(key=>[key,interval(runs.filter(r=>r.label===level.label).map(r=>r.observable[key as keyof typeof r.observable] as number))]))}));
const comparison=(a:string,b:string)=>({a,b,pairedSeedDifference:Object.fromEntries(Object.keys(runs[0].observable).map(key=>[
 key,interval(seeds.map(seed=>{
  const left=runs.find(r=>r.label===a&&r.config.seed===seed)!,right=runs.find(r=>r.label===b&&r.config.seed===seed)!;
  return (right.observable[key as keyof typeof right.observable] as number)-(left.observable[key as keyof typeof left.observable] as number);
 }))]))});
const comparisons=[comparison('fixed-128-c3','adaptive-128-t32'),comparison('fixed-512-c4','adaptive-512-t32'),
 comparison('adaptive-512-t32','adaptive-512-t64'),comparison('adaptive-512-t64','adaptive-2048-t64')];
const finest=summaries.at(-1)!,difference=comparisons.at(-1)!.pairedSeedDifference;
const observableChecks=Object.fromEntries(['endA','endB','wallA','wallB','meanRadiusA','meanRadiusB'].map(key=>{
 const d=difference[key],tolerance=key.startsWith('meanRadius')?.005:.01;
 return [key,{tolerance,change:d,withinBudget:d.low!==null&&d.high!==null?d.low>=-tolerance&&d.high<=tolerance:null}];
}));
const artifact={modelVersion:9,createdAt:new Date().toISOString(),sourceHashes:sources,node:process.version,
 physicalHorizonS:DEFAULT_DOUBLEWELL.duration,seeds,
 methodStatus:'exploratory; transport convergence NOT established',
 criteriaDeclaredBeforeExecution:{outletFractionChange:0.01,survivorMeanRadiusChangeM:0.005,rawMomentumResidualScale:0.005,
  comment:'Chosen educational targets, not literature standards. This matrix lacks independent finite-time Landau and full depth refinement; cannot establish validation.'},
 uncertainty:'Approximate Student-t intervals over six independent whole-run seeds, df=5. Paired differences reuse identical source seeds. No independent-ion intervals.',
 gate:{status:'not-established',observableChecks,
  finestRawMomentumUpper:finest.observable.rawP.high,rawMomentumTarget:.005,
  rawMomentumWithinBudget:finest.observable.rawP.high!==null&&finest.observable.rawP.high<=.005,
  unresolvedSnapshotMean:finest.observable.unresolvedSnapshotFraction.mean,
  reasons:['Finest outlet-change intervals exceed the chosen one-percentage-point budget.',
   'Finest raw Pθ residual exceeds the chosen 0.5% positive-scale target.',
   'Local regimes remain unresolved during parts of the run; density smoothing persists.',
   'No independent depth/timestep matrix or finite-time Landau validation is established by this method-comparison artifact.']},
 runs,summaries,comparisons};
writeFileSync('assets/locality-comparison.json',JSON.stringify(artifact,null,2)+'\n');
