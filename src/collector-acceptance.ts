import type {Destination, SpeciesResult} from './physics.js';

export interface CollectorMask {destination:Destination;innerRadiusM:number;outerRadiusM:number;minZM?:number;maxZM?:number}
type Inventory=Pick<SpeciesResult,'massU'|'chargeState'|'injected'|'end'|'wall'|'source'|'remaining'|'impacts'>;
const inBounds=(value:number,lo:number,hi:number)=>{
 const tolerance=16*Number.EPSILON*Math.max(Math.abs(value),Number.isFinite(lo)?Math.abs(lo):0,Number.isFinite(hi)?Math.abs(hi):0);
 return value>=lo-tolerance&&value<=hi+tolerance;
};

/** Passive geometric acceptance of saved impacts; fields and trajectories do not change. */
export function collectorAcceptance(species:Inventory[],mask:CollectorMask){
 if(!['end','wall','source'].includes(mask.destination)||![mask.innerRadiusM,mask.outerRadiusM].every(Number.isFinite)||mask.innerRadiusM<0||mask.outerRadiusM<mask.innerRadiusM)
  throw new Error('A finite ordered nonnegative radial aperture is required.');
 const minZ=mask.minZM??-Infinity,maxZ=mask.maxZM??Infinity;
 if(Number.isNaN(minZ)||Number.isNaN(maxZ)||minZ>maxZ)throw new Error('Ordered axial bounds are required.');
 if(!species.length)throw new Error('An incident species inventory is required.');
 const records=species.map(s=>{
  const counts=[s.end,s.wall,s.source,s.remaining];
  if(!Number.isSafeInteger(s.injected)||s.injected<=0||counts.some(n=>!Number.isSafeInteger(n)||n<0)||counts.reduce((a,b)=>a+b,0)!==s.injected||s.impacts.length!==s.injected-s.remaining)
   throw new Error('Impact records must close the complete incident inventory.');
  for(const destination of ['end','wall','source'] as const)if(s.impacts.filter(hit=>hit.destination===destination).length!==s[destination])throw new Error('Impact destinations disagree with inventory.');
  let accepted=0;
  for(const hit of s.impacts){
   if(!hit.position||hit.position.length!==3||!hit.position.every(Number.isFinite))throw new Error('Complete impact positions are required; binned or sampled paths cannot define acceptance.');
   const r=Math.hypot(hit.position[0],hit.position[1]);
   if(hit.destination===mask.destination&&mask.outerRadiusM>mask.innerRadiusM&&inBounds(r,mask.innerRadiusM,mask.outerRadiusM)&&inBounds(hit.position[2],minZ,maxZ))accepted++;
  }
  return {massU:s.massU,chargeState:s.chargeState,injected:s.injected,accepted,rejected:s[mask.destination]-accepted,
   otherDestinations:s.injected-s[mask.destination]-s.remaining,remaining:s.remaining,recovery:accepted/s.injected};
 });
 const totalAccepted=records.reduce((sum,s)=>sum+s.accepted,0);
 return {kind:'passive-impact-mask' as const,destination:mask.destination,totalAccepted,
  species:records.map(s=>({...s,purity:totalAccepted?s.accepted/totalAccepted:null})),
  normalization:'Original simulated incident counts; no physical feed weights or mass-flow rate.'};
}
