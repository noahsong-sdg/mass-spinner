import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {AMU,E_CHARGE,type Particle,type Vec} from '../src/physics.js';
import {advanceDoublewell,canonicalMomentum,doublewellEnergy,validateDoublewellOrbitSettings,type DoublewellModel} from '../src/doublewell-orbits.js';

interface Checkpoint {timeS:number;state:number[];energyJ:number;canonicalMomentumSI:number}
interface ReferenceCase {
 name:string;config:DoublewellModel&{massU:number;chargeState:number};initialState:number[];
 checkpoints:Checkpoint[];energyNormalizationJ:number;momentumNormalizationSI:number;
 refinements:{maxPositionDifferenceM:number;maxVelocityDifferenceMS:number}[];
}
interface Reference {
 schemaVersion:1;solver:string;constants:{elementaryChargeC:number;atomicMassUnitKG:number};
 sourceHashes:Record<string,string>;cases:ReferenceCase[];
}
const finite=(values:number[])=>values.every(Number.isFinite);
const particle=(state:number[]):Particle=>({position:state.slice(0,3) as Vec,velocity:state.slice(3,6) as Vec});

/** A reference is a versioned physical case, not an interchangeable curve. */
export function validateOrbitReference(value:unknown):asserts value is Reference {
 const r=value as Reference;
 if(!r||r.schemaVersion!==1||r.solver!=='SciML OrdinaryDiffEqVerner.Vern9'
  ||r.constants?.elementaryChargeC!==E_CHARGE||r.constants?.atomicMassUnitKG!==AMU
  ||!r.sourceHashes||!Object.values(r.sourceHashes).length
  ||!Object.values(r.sourceHashes).every(h=>/^[a-f0-9]{64}$/.test(h))
  ||!Array.isArray(r.cases)||!r.cases.length)throw new Error('Unsupported or incomplete orbit reference.');
 const names=new Set<string>();
 for(const c of r.cases){
  if(!c?.name||names.has(c.name))throw new Error('Reference case names must be unique.');names.add(c.name);
  if(!Array.isArray(c.initialState)||c.initialState.length!==6||!finite(c.initialState)
   ||!finite([c.energyNormalizationJ,c.momentumNormalizationSI])
   ||c.energyNormalizationJ<=0||c.momentumNormalizationSI<=0
   ||!Array.isArray(c.checkpoints)||c.checkpoints.length<2||c.checkpoints[0].timeS!==0
   ||!Array.isArray(c.refinements)||!c.refinements.length)throw new Error('Incomplete orbit case.');
  validateDoublewellOrbitSettings(c.config,25e-9,c.config);
  let prior=-1;
  for(const p of c.checkpoints){
   if(!finite([p.timeS,p.energyJ,p.canonicalMomentumSI])||p.timeS<=prior
    ||!Array.isArray(p.state)||p.state.length!==6||!finite(p.state)
    ||Math.hypot(p.state[0],p.state[1])>=c.config.radius||p.state[2]<=0||p.state[2]>=c.config.length)
    throw new Error('Reference requires increasing interior orbit checkpoints.');
   prior=p.timeS;
  }
  if(c.initialState.some((x,i)=>Math.abs(x-c.checkpoints[0].state[i])>1e-10*Math.max(1,Math.abs(x))))
   throw new Error('Reference initial state and first checkpoint differ.');
  for(const f of c.refinements)if(!finite([f.maxPositionDifferenceM,f.maxVelocityDifferenceMS])
   ||f.maxPositionDifferenceM<0||f.maxVelocityDifferenceMS<0)throw new Error('Invalid reference refinement.');
 }
}

export function compareOrbitReference(reference:unknown){
 validateOrbitReference(reference);
 // Prospective engineering checks for this orbit comparison, not device tolerances.
 const budgets={finestPositionM:1e-5,finestVelocityMS:1,referencePositionM:1e-8,referenceVelocityMS:1e-3};
 const cases=reference.cases.map(c=>{
  const initial=particle(c.initialState),initialH=doublewellEnergy(initial,c.config,c.config),initialP=canonicalMomentum(initial,c.config,c.config);
  const levels=[100e-9,50e-9,25e-9].map(dtS=>{
   validateDoublewellOrbitSettings(c.config,dtS,c.config);
   let p=particle(c.initialState),time=0,maxPositionDifferenceM=0,maxVelocityDifferenceMS=0,maxEnergyResidual=0,maxCanonicalMomentumResidual=0;
   for(const checkpoint of c.checkpoints.slice(1)){
    const steps=Math.round((checkpoint.timeS-time)/dtS),step=(checkpoint.timeS-time)/steps;
    if(steps<1||Math.abs(step/dtS-1)>1e-8)throw new Error('Checkpoint spacing must be an integer number of comparison timesteps.');
    for(let i=0;i<steps;i++){
     const next=advanceDoublewell(p,c.config,step,c.config);
     if(next.hit)throw new Error(`Unexpected boundary event in interior case ${c.name}`);
     p=next.particle;
    }
    time=checkpoint.timeS;
    maxPositionDifferenceM=Math.max(maxPositionDifferenceM,...p.position.map((x,i)=>Math.abs(x-checkpoint.state[i])));
    maxVelocityDifferenceMS=Math.max(maxVelocityDifferenceMS,...p.velocity.map((v,i)=>Math.abs(v-checkpoint.state[i+3])));
    maxEnergyResidual=Math.max(maxEnergyResidual,Math.abs(doublewellEnergy(p,c.config,c.config)-initialH)/c.energyNormalizationJ);
    maxCanonicalMomentumResidual=Math.max(maxCanonicalMomentumResidual,Math.abs(canonicalMomentum(p,c.config,c.config)-initialP)/c.momentumNormalizationSI);
   }
   return {dtS,maxPositionDifferenceM,maxVelocityDifferenceMS,maxEnergyResidual,maxCanonicalMomentumResidual};
  });
  const fine=levels.at(-1)!,ref=c.refinements.at(-1)!;
  const checked=ref.maxPositionDifferenceM<=budgets.referencePositionM&&ref.maxVelocityDifferenceMS<=budgets.referenceVelocityMS;
  return {name:c.name,config:c.config,levels,positionRefinementRatios:levels.slice(1).map((l,i)=>l.maxPositionDifferenceM>0?levels[i].maxPositionDifferenceM/l.maxPositionDifferenceM:null),
   velocityRefinementRatios:levels.slice(1).map((l,i)=>l.maxVelocityDifferenceMS>0?levels[i].maxVelocityDifferenceMS/l.maxVelocityDifferenceMS:null),referenceRefinement:ref,
   verdict:!checked?'UNKNOWN':fine.maxPositionDifferenceM<=budgets.finestPositionM&&fine.maxVelocityDifferenceMS<=budgets.finestVelocityMS?'PASS':'FAIL'};
 });
 return {schemaVersion:1,createdUTC:new Date().toISOString(),comparison:'Production synchronized Boris against independent Julia/SciML continuous-time interior orbits',
  budgets,cases,verdict:cases.some(c=>c.verdict==='FAIL')?'FAIL':cases.some(c=>c.verdict==='UNKNOWN')?'UNKNOWN':'PASS',
  collisionsValidated:false,collectorEventsValidated:false,separatorTransportValidated:false,
  limitations:['Budgets are declared orbit-comparison engineering tolerances, not experimental accuracy claims.',
   'Reference tolerance refinement is an empirical numerical check, not a rigorous global error bound.',
   'Sampled trajectory/invariant checks exclude collisions, boundary events, plasma response and long-time behavior.']};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw new Error('Usage: compare-external-orbits.ts INPUT.json OUTPUT.json');
 const bytes=readFileSync(input),r=compareOrbitReference(JSON.parse(bytes.toString()));
 const sourceHashes=Object.fromEntries(['src/physics.ts','src/collisions.ts','src/doublewell-orbits.ts','scripts/compare-external-orbits.ts'].map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
 writeFileSync(output,JSON.stringify({...r,referenceSHA256:createHash('sha256').update(bytes).digest('hex'),sourceHashes},null,2)+'\n');
 console.log(JSON.stringify({verdict:r.verdict,cases:r.cases.map(c=>({name:c.name,finest:c.levels.at(-1),verdict:c.verdict}))},null,2));
}
