const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const percent=n=>n===null?'undefined':(100*n).toFixed(2)+'%';
const fraction=interval=>interval.mean===null?'undefined':percent(interval.mean)+(interval.halfWidth95===null?' · interval withheld':` ± ${(100*interval.halfWidth95).toFixed(2)} pp`);

/** Frozen offline evidence is explicitly separate from live slider results. */
export function renderConvergenceEvidence(evidence){
 document.getElementById('convergence-status').textContent=`Recorded ${evidence.horizonUS} µs case · ${evidence.runCount} whole runs · ${evidence.seedCount} independent seeds/level · gate ${evidence.status.toUpperCase()}. Static audit evidence; changing sliders does not rerun this matrix.`;
 document.getElementById('convergence-identity').textContent=`Model ${evidence.modelVersion} · executed source ${evidence.sourceHash} · ${evidence.inference}`;
 const body=document.getElementById('convergence-rows');body.replaceChildren();
 for(const level of evidence.levels){
  const row=element('tr');row.append(...[level.id,level.particlesPerSpecies,String(level.dtNS),String(level.cellsAcross),
   fraction(level.endA),fraction(level.endB),percent(level.maxRawMomentumResidual),percent(level.maxUnresolvedExposure)].map(value=>element('td',String(value))));body.append(row);
 }
 const list=document.getElementById('convergence-checks');list.replaceChildren();
 for(const check of evidence.checks)list.append(element('li',`${check.status.toUpperCase()} · ${check.name}: ${check.reason}`));
}
