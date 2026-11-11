import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,relative,resolve} from 'node:path';
import {cpus} from 'node:os';
import {AMU,E_CHARGE} from '../src/physics.js';
import {DEFAULT_DOUBLEWELL,simulateDoublewell,type DoublewellConfig} from '../src/doublewell-dynamics.js';

const output='assets/ring-equilibrium-v10.json';
if(existsSync(output))throw new Error('Refusing to overwrite existing equilibrium evidence.');
// Criteria and cases are fixed before execution; this campaign cannot establish
// general transport accuracy, independent timestep convergence or rare tails.
const criteria={minimumSeeds:6,temperatureStationarityEV:.1,rotationStationarityFraction:.01,
 radialCdfStationarity:.01,maxRawMomentumResidual:.001,maxEnergyResidual:1e-5,
 explanation:'Chosen educational budgets, not literature standards. 95% pointwise whole-run Student-t intervals; no independent-ion or simultaneous-CDF claim. Identical empirical values withhold intervals.'};
const seeds=[713,1427,2857,5717,11447,22897];
const physical:DoublewellConfig={...DEFAULT_DOUBLEWELL,boundary:'closed',initialState:'equilibrium',rotationMode:'common',
 rotationRadS:-12000,beamEV:0,magneticT:.02,voltage:2,ionTemperatureEV:10,collisionMethod:'axisymmetric',
 collisionSourceAligned:false,dt:1e-7,duration:2e-4};
const levels=[{id:'c6-N1024',settings:{cellsAcross:6,particlesPerSpecies:1024,collisions:true}},
 {id:'c12-N4096',settings:{cellsAcross:12,particlesPerSpecies:4096,collisions:true}},
 {id:'c12-N4096-off',settings:{cellsAcross:12,particlesPerSpecies:4096,collisions:false}}];
const sources=new Map<string,string>(),root=resolve('.');
function collect(file:string){
 file=resolve(file);if(sources.has(file))return;
 const source=readFileSync(file,'utf8');sources.set(file,source);
 for(const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g))if(match[1].startsWith('.')){
  const path=resolve(dirname(file),match[1]),ts=path.replace(/\.js$/,'.ts');collect(existsSync(ts)?ts:path);
 }
}
collect('scripts/check-ring-equilibrium-v10.ts');collect('package.json');collect('package-lock.json');
const sourceHashes=Object.fromEntries([...sources].map(([file,source])=>[relative(root,file),createHash('sha256').update(source).digest('hex')]).sort(([a],[b])=>a.localeCompare(b)));
const sourceHash=createHash('sha256').update(JSON.stringify(sourceHashes)).digest('hex');

// Independent midpoint quadrature in u=r²/a², where the cylindrical Jacobian
// is constant. This does not call the production initializer or orbit helpers.
function quadrature(points:number){
 const species=physical.species.map(s=>{
  const weight=Array.from({length:points},(_,j)=>{
   const u=(j+.5)/points;
   return Math.exp((-s.chargeState*physical.voltage*(u*u-physical.quadraticShape*u)
    +(s.massU*AMU*physical.rotationRadS**2+s.chargeState*E_CHARGE*physical.rotationRadS*physical.magneticT)*physical.radius**2*u/(2*E_CHARGE))/physical.ionTemperatureEV);
  }),sum=weight.reduce((a,b)=>a+b,0),prefix=[0];
  for(const w of weight)prefix.push(prefix.at(-1)!+w);
  const cdf=(rFraction:number)=>{
   const at=Math.min(points,rFraction*rFraction*points),low=Math.floor(at),f=at-low;
   return(prefix[low]+(low<points?f*weight[low]:0))/sum;
  };
  return {cdf: Array.from({length:20},(_,j)=>cdf((j+1)/20)),weight:weight.map(w=>w*points/sum),at:cdf};
 });
 const densitySquaredRatio=species[0].weight.reduce((sum,w,j)=>sum+((w+species[1].weight[j])/2)**2,0)/points;
 return {species,densitySquaredRatio};
}
const q40=quadrature(40000),q80=quadrature(80000);
const quadratureDifference=Math.max(...q80.species.flatMap((s,i)=>s.cdf.map((value,j)=>Math.abs(value-q40.species[i].cdf[j]))));
if(quadratureDifference>1e-8)throw new Error('Independent radial CDF quadrature unresolved at the declared threshold.');
const initialDraws=(n:number,seed:number)=>{
 let state=seed>>>0;
 const random=()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
 const result=[];
 for(let species=0;species<2;species++){
  const cdf=Array(20).fill(0);let minimumThresholdMargin=Infinity;
  for(let i=0;i<n;i++){
   const u=random();for(let j=0;j<20;j++){
    if(u<=q80.species[species].cdf[j])cdf[j]++;
    minimumThresholdMargin=Math.min(minimumThresholdMargin,Math.abs(u-q80.species[species].cdf[j]));
   }
   // Angle, z and three independent two-draw Box-Muller variates.
   for(let j=0;j<8;j++)random();
  }
  result.push({cdf:cdf.map(value=>value/n),minimumThresholdMargin});
 }
 return result;
};
const interval=(values:(number|null)[])=>{
 if(values.length!==6)throw new Error('This campaign requires six whole-run observations.');
 if(values.some(v=>v===null||!Number.isFinite(v)))return {n:6,mean:null,standardError:null,halfWidth95:null,low:null,high:null};
 const finite=values as number[];
 const mean=finite.reduce((a,b)=>a+b,0)/6,se=Math.sqrt(finite.reduce((sum,v)=>sum+(v-mean)**2,0)/30);
 const spread=Math.max(...finite)-Math.min(...finite),scale=Math.max(...finite.map(Math.abs));
 const halfWidth95=spread>256*Number.EPSILON*scale?2.570581835636314*se:null;
 return {n:6,mean,standardError:se,halfWidth95,low:halfWidth95===null?null:mean-halfWidth95,high:halfWidth95===null?null:mean+halfWidth95};
};
const verdict=(values:(number|null)[],tolerance:number)=>{
 const estimate=interval(values);
 const status=estimate.mean===null||estimate.halfWidth95===null?'unknown':Math.abs(estimate.mean)+estimate.halfWidth95<=tolerance?'pass'
  :Math.abs(estimate.mean)-estimate.halfWidth95>tolerance?'fail':'unknown';
 return {status,tolerance,interval:estimate};
};
const start=performance.now(),startedUTC=new Date().toISOString(),runs=[];
for(const level of levels)for(const seed of seeds){
 const config={...physical,...level.settings,seed},runStart=performance.now();
 const result=simulateDoublewell(config),initial=result.history[0],final=result.history.at(-1)!;
 const weight=result.metrics.find(m=>m.label==='Physical ions per representative')!.value;
 const initialCdf=initialDraws(config.particlesPerSpecies,seed);
 const finalCdf=[0,1].map(i=>{
  const curve=result.curves.find(c=>c.yLabel==='Final axially averaged active density (m⁻³)'&&c.label===['A','B'][i])!;
  let cumulative=0;return curve.y.map((n,j)=>{
   cumulative+=n*Math.PI*config.radius**2*((j+1)**2-j*j)/400*config.length/(weight*config.particlesPerSpecies);return cumulative;
  });
 });
 const observables:Record<string,number|null>={rawP:result.conservation.maxMomentumResidual,H:result.conservation.maxEnergyResidual,
  correctedP:result.conservation.maxCorrectedMomentumResidual,unpairedExposure:result.collisions.unpairedIonSteps/(result.collisions.activeIonSteps||1),
  rmsMeridionalPairDistanceM:result.collisions.pairs?Math.sqrt(result.collisions.pairSeparationSquaredSumM2/result.collisions.pairs):null,
  rmsRadialPairDistanceM:result.collisions.pairs?Math.sqrt(result.collisions.pairRadialSeparationSquaredSumM2/result.collisions.pairs):null,
  initialDensitySquaredRatio:result.spatialCollision.initial.selfExcludedDensitySquaredIntegral/(config.densityM3**2*Math.PI*config.radius**2*config.length),
  finalDensitySquaredRatio:result.spatialCollision.final.selfExcludedDensitySquaredIntegral/(config.densityM3**2*Math.PI*config.radius**2*config.length),
  unresolvedSnapshotFraction:result.regimeSummary.unresolvedSnapshots/result.regimeHistory.length};
 for(const i of [0,1]){
  const name=['A','B'][i],a=initial.species[i],b=final.species[i];
  observables[name+'.initialTemperatureEV']=a.temperatureEV!;observables[name+'.finalTemperatureEV']=b.temperatureEV!;
  observables[name+'.temperatureChangeEV']=b.temperatureEV!-a.temperatureEV!;
  observables[name+'.initialRotationRadS']=a.rotationRadS!;observables[name+'.finalRotationRadS']=b.rotationRadS!;
  observables[name+'.rotationChangeFraction']=(b.rotationRadS!-a.rotationRadS!)/Math.abs(config.rotationRadS);
  observables[name+'.maxFinalCdfTheoryError']=Math.max(...finalCdf[i].map((v,j)=>Math.abs(v-q80.species[i].cdf[j])));
  for(let j=0;j<19;j++){
   observables[`${name}.cdfChange.${j}`]=finalCdf[i][j]-initialCdf[i].cdf[j];
   observables[`${name}.cdfTheoryResidual.${j}`]=finalCdf[i][j]-q80.species[i].cdf[j];
  }
 }
 const inventoryInvariant=result.history.every(h=>h.species.every(s=>s.active===config.particlesPerSpecies&&s.wall===0&&s.end===0&&s.source===0))
  &&result.species.every(s=>s.impacts.length===0)&&result.conservation.energyOutJ===0&&result.conservation.canonicalMomentumOut===0;
 runs.push({level:level.id,config,runtimeMs:performance.now()-runStart,inventoryInvariant,observables,
  initialCdfReconstruction:initialCdf,finalCdf,history:result.history,regimeHistory:result.regimeHistory,regimeSummary:result.regimeSummary,
  conservation:result.conservation,collisions:result.collisions,spatialCollision:result.spatialCollision});
 console.log(JSON.stringify({level:level.id,seed,runtimeMs:runs.at(-1)!.runtimeMs,rawP:observables.rawP,H:observables.H,
  deltaTA:observables['A.temperatureChangeEV'],deltaTB:observables['B.temperatureChangeEV']}));
}
const summaries=levels.map(level=>{
 const rows=runs.filter(r=>r.level===level.id),summary=Object.fromEntries(Object.keys(rows[0].observables).map(key=>[key,interval(rows.map(r=>r.observables[key]))]));
 const checks=[];
 for(const species of ['A','B']){
  checks.push({name:species+'.temperature stationarity',...verdict(rows.map(r=>r.observables[species+'.temperatureChangeEV']),criteria.temperatureStationarityEV)});
  checks.push({name:species+'.rotation stationarity',...verdict(rows.map(r=>r.observables[species+'.rotationChangeFraction']),criteria.rotationStationarityFraction)});
  for(let j=0;j<19;j++)for(const kind of ['cdfChange','cdfTheoryResidual'])checks.push({name:`${species}.${kind}.${j}`,
   ...verdict(rows.map(r=>r.observables[`${species}.${kind}.${j}`]),criteria.radialCdfStationarity)});
 }
 checks.push({name:'raw Pθ maximum',status:rows.every(r=>r.observables.rawP!==null&&r.observables.rawP<=criteria.maxRawMomentumResidual)?'pass':'fail'});
 checks.push({name:'Hamiltonian maximum',status:rows.every(r=>r.observables.H!==null&&r.observables.H<=criteria.maxEnergyResidual)?'pass':'fail'});
 checks.push({name:'closed inventory and zero exit flux',status:rows.every(r=>r.inventoryInvariant)?'pass':'fail'});
 return {level:level.id,observables:summary,checks,status:checks.some(c=>c.status==='fail')?'fail':checks.some(c=>c.status==='unknown')?'unknown':'pass'};
});
const comparisons=[['c6-N1024','c12-N4096'],['c12-N4096-off','c12-N4096']].map(([a,b])=>({a,b,
 pairedDifferences:Object.fromEntries(Object.keys(runs[0].observables).map(key=>[key,interval(seeds.map(seed=>{
  const x=runs.find(r=>r.level===b&&r.config.seed===seed)!.observables[key],y=runs.find(r=>r.level===a&&r.config.seed===seed)!.observables[key];
  return x===null||y===null?null:x-y;
 }))]))}));
for(const [file,source]of sources)if(readFileSync(file,'utf8')!==source)throw new Error(`Executed source changed during campaign: ${relative(root,file)}`);
const artifact={schemaVersion:1,modelVersion:10,startedUTC,completedUTC:new Date().toISOString(),runtimeMs:performance.now()-start,
 environment:{node:process.version,platform:process.platform,architecture:process.arch,cpu:cpus()[0]?.model},sourceHashes,sourceHash,
 case:'Existing common-Omega test physical configuration, extended to intended200us horizon; closed reflecting-radial and periodic-axial column.',
 criteria,seeds,theory:{radialCdf:q80.species.map(s=>s.cdf),densitySquaredRatio:q80.densitySquaredRatio,midpointPoints:80000,
  doubledQuadratureMaxCdfDifference:quadratureDifference,
  initialCdfReconstruction:'Radial uniforms regenerated from each source seed using the known nine-draw-per-marker sequence; thresholds use independent80000point physicalCDF. This is not a directly exported initial histogram; the production initializer uses4096point piecewise-linear-weight quadrature, so borderline initial counts can differ. Both initial/final-to-theory and pairedchanges are exposed; noexactinitialcountclaim.'},
 gate:{status:summaries.some(s=>s.status==='fail')?'fail':summaries.some(s=>s.status==='unknown')?'unknown':'pass',
  interpretation:'Bounded stationary-equilibrium falsification only. No independent dt refinement, angular fluctuations, full distribution comparison or experimental validation; no general separator convergence certification.'},
 runs,summaries,comparisons};
writeFileSync(output,JSON.stringify(artifact,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,runtimeMs:artifact.runtimeMs,gate:artifact.gate,sourcesVerified:Object.keys(sourceHashes).length}));
