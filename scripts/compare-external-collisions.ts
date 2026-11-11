import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {AMU,E_CHARGE,type Vec} from '../src/physics.js';
import {collideCoulombCell,type CoulombIon} from '../src/coulomb.js';

interface SpeciesSnapshot {massU:number;massKG:number;chargeC:number;weights:number[];velocitiesMS:Vec[]}
interface Snapshot {timeS:number;maximumFieldAbsSI:Record<string,number>;species:SpeciesSnapshot[]}
interface WarpReference {
 schemaVersion:1;solver:'WarpX';solverVersion:'26.10';runnerSHA256:string;inputSHA256:string;
 config:{particlesPerSpecies:number;dtS:number;seed:number;durationS:number;densityPerSpeciesM3:number;coulombLog:number;
  commonTemperature:boolean;collisions:boolean;spatialCells:number;spatialPush:boolean;selfConsistentFields:boolean;unitTransverseAreaM2:number;cellLengthM:number};
 checkpoints:Snapshot[];
}
const mean=(v:number[])=>v.reduce((a,b)=>a+b,0)/v.length;
const norm2=(v:number[])=>v.reduce((a,b)=>a+b*b,0);
const rng=(seed:number)=>()=>{seed=(seed+0x6d2b79f5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

export function validateWarpReference(value:unknown):asserts value is WarpReference {
 const r=value as WarpReference,c=r?.config;
 if(!r||r.schemaVersion!==1||r.solver!=='WarpX'||r.solverVersion!=='26.10'
  ||![r.runnerSHA256,r.inputSHA256].every(h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h))
  ||!c||!Number.isSafeInteger(c.particlesPerSpecies)||c.particlesPerSpecies<2||!Number.isSafeInteger(c.seed)||c.seed<0||c.seed>0xffffffff
  ||![c.dtS,c.durationS,c.densityPerSpeciesM3,c.coulombLog].every(x=>Number.isFinite(x)&&x>0)
  ||c.spatialCells!==1||c.spatialPush!==false||c.selfConsistentFields!==false||typeof c.collisions!=='boolean'
  ||typeof c.commonTemperature!=='boolean'||c.unitTransverseAreaM2!==1||c.cellLengthM!==1
  ||!Array.isArray(r.checkpoints)||r.checkpoints.length<2||r.checkpoints[0].timeS!==0)
  throw new Error('Unsupported or incomplete homogeneous WarpX reference.');
 let prior=-1;
 for(const p of r.checkpoints){
  if(!Number.isFinite(p.timeS)||p.timeS<=prior||!p.maximumFieldAbsSI
   ||!['Ex','Ey','Ez','Bx','By','Bz'].every(k=>p.maximumFieldAbsSI[k]===0)
   ||!Array.isArray(p.species)||p.species.length!==2)throw new Error('Reference is not a zero-field homogeneous case.');
  prior=p.timeS;
  p.species.forEach((s,i)=>{
   if(s.massU!==[40,84][i]||s.massKG!==s.massU*AMU||s.chargeC!==E_CHARGE
    ||!Array.isArray(s.velocitiesMS)||s.velocitiesMS.length!==c.particlesPerSpecies
    ||!s.velocitiesMS.every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite))
    ||!Array.isArray(s.weights)||s.weights.length!==c.particlesPerSpecies
    ||!s.weights.every(w=>Number.isFinite(w)&&w>0&&Math.abs(w/(c.densityPerSpeciesM3/c.particlesPerSpecies)-1)<1e-12))
    throw new Error('Reference mass, charge, equal physical weights or inventory mismatch.');
  });
 }
 if(Math.abs(prior/c.durationS-1)>1e-10)throw new Error('Reference duration mismatch.');
}

function moments(velocities:Vec[],massU:number){
 const center=[0,1,2].map(i=>mean(velocities.map(v=>v[i])));
 const temperatureAxesEV=[0,1,2].map(i=>massU*AMU/E_CHARGE*mean(velocities.map(v=>(v[i]-center[i])**2)));
 return {temperatureEV:mean(temperatureAxesEV),temperatureAxesEV,meanVelocityMS:center,
  rawSecondMomentEV:massU*AMU/(3*E_CHARGE)*mean(velocities.map(norm2))};
}
export function validateWarpCampaign(values:unknown[]):asserts values is WarpReference[] {
 if(values.length===0)throw new Error('Empty collision campaign.');
 values.forEach(validateWarpReference);
 const references=values as WarpReference[],first=references[0];
 const physicalKeys=['durationS','densityPerSpeciesM3','coulombLog','spatialCells','spatialPush',
  'selfConsistentFields','unitTransverseAreaM2','cellLengthM'] as const;
 for(const r of references){
  if(r.runnerSHA256!==first.runnerSHA256||physicalKeys.some(k=>r.config[k]!==first.config[k]))
   throw new Error('Collision campaign mixes physical configurations or generator revisions.');
  if(r.checkpoints.length!==first.checkpoints.length||r.checkpoints.some((p,i)=>
   Math.abs(p.timeS-first.checkpoints[i].timeS)>1e-16+1e-10*Math.abs(first.checkpoints[i].timeS)))
   throw new Error('Collision campaign mixes observation times.');
 }
}
function speedCDFDistance(left:Vec[],right:Vec[]){
 const a=left.map(v=>Math.sqrt(norm2(v))).sort((x,y)=>x-y),b=right.map(v=>Math.sqrt(norm2(v))).sort((x,y)=>x-y);
 let i=0,j=0,d=0;
 while(i<a.length||j<b.length){
  const next=Math.min(a[i]??Infinity,b[j]??Infinity);
  while(i<a.length&&a[i]<=next)i++;while(j<b.length&&b[j]<=next)j++;
  d=Math.max(d,Math.abs(i/a.length-j/b.length));
 }
 return d;
}
export function compareWarpReference(value:unknown){
 validateWarpReference(value);const r=value,c=r.config,n=c.particlesPerSpecies;
 const ions:CoulombIon[]=r.checkpoints[0].species.flatMap(s=>s.velocitiesMS.map(v=>({massU:s.massU,chargeState:1,velocity:[...v] as Vec})));
 const random=rng(c.seed),energy=()=>ions.reduce((sum,p)=>sum+p.massU*AMU*norm2(p.velocity)/2,0);
 const momentum=()=>[0,1,2].map(j=>ions.reduce((sum,p)=>sum+p.massU*AMU*p.velocity[j],0));
 const e0=energy(),p0=momentum(),momentumScale=ions.reduce((sum,p)=>sum+p.massU*AMU*Math.sqrt(norm2(p.velocity)),0);
 let time=0,maxEnergyResidual=0,maxMomentumResidual=0,maxVariance=0,largeAnglePairs=0,totalPairs=0;
 const history=r.checkpoints.map(checkpoint=>{
  if(checkpoint.timeS>time){
   const steps=Math.round((checkpoint.timeS-time)/c.dtS),dt=(checkpoint.timeS-time)/steps;
   if(steps<1||Math.abs(dt/c.dtS-1)>1e-8)throw new Error('Reference checkpoints must match the declared time lattice.');
   if(c.collisions)for(let i=0;i<steps;i++){
    const d=collideCoulombCell(ions,2*c.densityPerSpeciesM3,c.coulombLog,dt,random);
    maxVariance=Math.max(maxVariance,d.maxVariance);largeAnglePairs+=d.largeAnglePairs;totalPairs+=d.pairs;
   }
   time=checkpoint.timeS;
  }
  maxEnergyResidual=Math.max(maxEnergyResidual,Math.abs(energy()-e0)/e0);
  maxMomentumResidual=Math.max(maxMomentumResidual,Math.hypot(...momentum().map((v,j)=>v-p0[j]))/momentumScale);
  return {timeS:checkpoint.timeS,species:checkpoint.species.map((s,k)=>{
   const velocities=ions.slice(k*n,(k+1)*n).map(p=>p.velocity),ta=moments(velocities,s.massU),warpx=moments(s.velocitiesMS,s.massU);
   return {massU:s.massU,ta,warpx,temperatureDifferenceEV:ta.temperatureEV-warpx.temperatureEV,
    rawSecondMomentDifferenceEV:ta.rawSecondMomentEV-warpx.rawSecondMomentEV,speedCDFDistance:speedCDFDistance(velocities,s.velocitiesMS)};
  })};
 });
 return {config:c,history,maxEnergyResidual,maxMomentumResidual,maxVariance,largeAnglePairFraction:totalPairs?largeAnglePairs/totalPairs:0,
  verdict:'UNKNOWN',referenceAccepted:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [directory,output]=process.argv.slice(2);if(!directory||!output)throw new Error('Usage: compare-external-collisions.ts INPUT_DIRECTORY OUTPUT.json');
 const names=readdirSync(directory).filter(n=>/^(n\d+-|stationarity\.|collision-off\.)/.test(n)&&n.endsWith('.json.gz')).sort();
 if(names.length!==11)throw new Error('Expected the declared nine relaxation runs and two controls.');
 const inputs=names.map(name=>{const bytes=readFileSync(`${directory}/${name}`);return {name,bytes,reference:JSON.parse(gunzipSync(bytes).toString())};});
 const references:unknown[]=inputs.map(input=>input.reference);validateWarpCampaign(references);
 const tags=references.map(r=>`${r.config.particlesPerSpecies}/${r.config.dtS}/${r.config.seed}/${r.config.commonTemperature}/${r.config.collisions}`);
 const expected=[[512,1e-6],[2048,1e-6],[2048,2.5e-7]].flatMap(([n,dt])=>[101,202,303].map(seed=>`${n}/${dt}/${seed}/false/true`));
 expected.push('2048/2.5e-7/101/true/true','2048/2.5e-7/101/false/false');
 if(new Set(tags).size!==11||expected.some(tag=>!tags.includes(tag)))throw new Error('Incomplete declared collision campaign.');
 const runs=inputs.map(({name,bytes,reference})=>{const result=compareWarpReference(reference);
  console.log(`${name}: final ΔT(eV) ${result.history.at(-1)!.species.map(s=>s.temperatureDifferenceEV)}`);
  return {file:name,referenceSHA256:hash(bytes),...result};});
 const groups=[...new Set(runs.filter(r=>!r.config.commonTemperature&&r.config.collisions).map(r=>`${r.config.particlesPerSpecies}/${r.config.dtS}`))].map(key=>{
  const selected=runs.filter(r=>`${r.config.particlesPerSpecies}/${r.config.dtS}`===key&&!r.config.commonTemperature&&r.config.collisions);
  if(selected.length!==3||new Set(selected.map(r=>r.config.seed)).size!==3)throw new Error('Incomplete independent-seed group.');
  return {key,seeds:selected.map(r=>r.config.seed),history:selected[0].history.map((h,i)=>({timeS:h.timeS,species:h.species.map((s,k)=>{
   const differences=selected.map(r=>r.history[i].species[k].temperatureDifferenceEV),average=mean(differences);
   const standardError=Math.sqrt(differences.reduce((sum,d)=>sum+(d-average)**2,0)/(3*2));
   return {massU:s.massU,meanTemperatureDifferenceEV:average,pointwise95HalfWidthEV:4.302652729911275*standardError,
    meanTAEV:mean(selected.map(r=>r.history[i].species[k].ta.temperatureEV)),meanWarpXEV:mean(selected.map(r=>r.history[i].species[k].warpx.temperatureEV)),
    meanSpeedCDFDistance:mean(selected.map(r=>r.history[i].species[k].speedCDFDistance))};
  })}))};
 });
 const sourceHashes=Object.fromEntries(['src/physics.ts','src/collisions.ts','src/coulomb.ts','scripts/compare-external-collisions.ts'].map(f=>[f,hash(readFileSync(f))]));
 writeFileSync(output,JSON.stringify({schemaVersion:1,createdUTC:new Date().toISOString(),sourceHashes,runs,groups,verdict:'UNKNOWN',
  finiteTimeCollisionValidated:false,separatorTransportValidated:false,limitations:[
   'Three whole-run seeds per numerical level are exploratory; intervals are pointwise approximate paired Student-t intervals, not simultaneous bands.',
   'Each method starts from the same exact velocities; differing random pairing is compared statistically, not particle by particle.',
   'Speed-CDF distance is descriptive; correlated particles are not independent samples for a KS significance test.',
   'WarpX uses relativistic momentum and separate species pairing; TA uses nonrelativistic mixed equal-weight pairs with finite-N self-exclusion.',
   'No continuum bound or prospective distribution-equivalence tolerance is established by this initial comparison.',
   'Zero-field homogeneous tests do not address spatial collision locality, rotation, boundary losses or experimental validity.']},null,2)+'\n');
}
