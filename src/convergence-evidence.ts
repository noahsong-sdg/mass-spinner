import type {SeedInterval,Check} from './convergence.js';
export interface ConvergenceEvidence {
 horizonUS:number;runCount:number;seedCount:number;status:string;modelVersion:number;sourceHash:string;inference:string;
 levels:{id:string;particlesPerSpecies:number;dtNS:number;cellsAcross:number;endA:SeedInterval;endB:SeedInterval;maxRawMomentumResidual:number|null;maxUnresolvedExposure:number|null}[];
 checks:Check[];
}
const element=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const percent=(n:number|null)=>n===null?'undefined':(100*n).toFixed(2)+'%';
const fraction=(interval:SeedInterval)=>interval.mean===null?'undefined':percent(interval.mean)+(interval.halfWidth95===null?' · interval withheld':` ± ${(100*interval.halfWidth95).toFixed(2)} pp`);

/** Frozen offline evidence is explicitly separate from live slider results. */
export function renderConvergenceEvidence(evidence:ConvergenceEvidence){
 document.getElementById('convergence-status')!.textContent=`Recorded ${evidence.horizonUS} µs case · ${evidence.runCount} whole runs · ${evidence.seedCount} independent seeds/level · gate ${evidence.status.toUpperCase()}. Static audit evidence; changing sliders does not rerun this matrix.`;
 document.getElementById('convergence-identity')!.textContent=`Model ${evidence.modelVersion} · executed source ${evidence.sourceHash} · ${evidence.inference}`;
 const body=document.getElementById('convergence-rows')!;body.replaceChildren();
 for(const level of evidence.levels){
  const row=element('tr');row.append(...[level.id,level.particlesPerSpecies,String(level.dtNS),String(level.cellsAcross),
   fraction(level.endA),fraction(level.endB),percent(level.maxRawMomentumResidual),percent(level.maxUnresolvedExposure)].map(value=>element('td',String(value))));body.append(row);
 }
 const list=document.getElementById('convergence-checks')!;list.replaceChildren();
 for(const check of evidence.checks)list.append(element('li',`${check.status.toUpperCase()} · ${check.name}: ${check.reason}`));
}
