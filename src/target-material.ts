import {atomicStoppingCrossSection} from './deuteron-stopping.js';

export interface TargetSiteComposition {tritiumFraction:number;deuteriumFraction:number}
export interface TargetIsotopeMasses {lithiumMassU?:number;deuteriumMassU?:number;tritiumMassU?:number}

/** Mean energy loss per fixed Li site: Li + fD D + fT T, with empty H sites.
 * Atomic additivity is a scenario model. Temperature, density and compound
 * chemistry do not acquire an unmeasured empirical correction here.
 */
export function stoppingForComposition(energyKeV:number,composition:TargetSiteComposition,masses:TargetIsotopeMasses={}){
 const {tritiumFraction:t,deuteriumFraction:d}=composition;
 if(![t,d].every(Number.isFinite)||t<0||d<0||t+d>1)
  throw new RangeError('Hydrogen-site fractions must be nonnegative and sum to at most one.');
 const li=atomicStoppingCrossSection(energyKeV,3,masses.lithiumMassU===undefined?7:masses.lithiumMassU),
  deuterium=atomicStoppingCrossSection(energyKeV,1,masses.deuteriumMassU===undefined?2:masses.deuteriumMassU),
  tritium=atomicStoppingCrossSection(energyKeV,1,masses.tritiumMassU===undefined?3:masses.tritiumMassU);
 const electronicKeVM2=li.electronicKeVM2+d*deuterium.electronicKeVM2+t*tritium.electronicKeVM2;
 const nuclearKeVM2=li.nuclearKeVM2+d*deuterium.nuclearKeVM2+t*tritium.nuclearKeVM2;
 return {electronicKeVM2,nuclearKeVM2,totalKeVM2:electronicKeVM2+nuclearKeVM2,vacancyFraction:1-(t+d)};
}

/** Explicit scenario weights; normalization does not imply an implantation law. */
export function normalizeImplantationWeights(weights:readonly number[]){
 if(!weights.length||weights.some(w=>!Number.isFinite(w)||w<0))
  throw new RangeError('Implantation weights must be finite, nonnegative and nonempty.');
 const sum=weights.reduce((a,b)=>a+b,0);
 if(!Number.isFinite(sum)||sum<=0)throw new RangeError('Implantation weights must have a finite positive sum.');
 return weights.map(w=>w/sum);
}

/** Bin actual deposited-ion samples without renormalizing missing projectiles.
 * Profiles describe prompt deposition only; reflected/untracked projectiles
 * cannot be distinguished by deposited positions alone. Edges and samples use m.
 * Internal-edge samples enter the deeper cell; the final edge is downstream.
 */
export function binImplantationDepths(edgesM:readonly number[],depthsM:readonly number[],incidentCount:number){
 if(edgesM.length<2||edgesM[0]!==0||edgesM.some((x,i)=>!Number.isFinite(x)||i>0&&x<=edgesM[i-1])
  ||!Number.isSafeInteger(incidentCount)||incidentCount<=0||depthsM.length>incidentCount
  ||depthsM.some(x=>!Number.isFinite(x)||x<0))
  throw new RangeError('Deposited-depth binning requires increasing edges from zero, nonnegative depths and a complete incident count.');
 const counts=Array<number>(edgesM.length-1).fill(0);let beyondTargetCount=0;
 for(const x of depthsM){
  if(x>=edgesM.at(-1)!){beyondTargetCount++;continue;}
  let low=0,high=counts.length;
  while(low+1<high){const mid=(low+high)>>1;if(x<edgesM[mid])high=mid;else low=mid;}
  counts[low]++;
 }
 return {counts,cellFractions:counts.map(n=>n/incidentCount),
  beyondTargetFraction:beyondTargetCount/incidentCount,
  unclassifiedFraction:(incidentCount-depthsM.length)/incidentCount,
  incidentCount,depositedSampleCount:depthsM.length};
}
