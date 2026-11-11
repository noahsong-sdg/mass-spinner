import type { SpeciesResult, Destination, simulate } from './physics.js';

type OrbitResult = ReturnType<typeof simulate>;
const destinations = ['end', 'wall', 'source', 'remaining'] as const;
const z95 = 1.959963984540054;
export interface Curve { label:string; x:number[]; y:number[]; xLabel:string; yLabel:string }

/** Pointwise 95% score interval for a single species' Bernoulli outcome.
 * Sampling uncertainty only: it excludes timestep error and model discrepancy.
 */
export function recoveryInterval(count:number, total:number) {
  if (!Number.isSafeInteger(total) || total <= 0 || !Number.isSafeInteger(count) || count < 0 || count > total)
    throw new Error('Recovery needs integer counts with 0 <= count <= total and total > 0.');
  const fraction=count/total, z2=z95*z95, denominator=1+z2/total;
  const center=(fraction+z2/(2*total))/denominator;
  const half=z95*Math.sqrt(fraction*(1-fraction)/total+z2/(4*total*total))/denominator;
  return {count,total,fraction,low:count===0?0:center-half,high:count===total?1:center+half,
    confidence:.95,method:'Wilson' as const};
}

function checkSpecies(s:SpeciesResult, duration:number) {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isSafeInteger(s.injected) || s.injected <= 0
      || destinations.some(d=>!Number.isSafeInteger(s[d]) || s[d]<0)
      || destinations.reduce((sum,d)=>sum+s[d],0)!==s.injected)
    throw new Error('Particle destinations must account for every injected ion.');
  if (s.impacts.length!==s.injected-s.remaining || s.impacts.some(p=>
      !['end','wall','source'].includes(p.destination) || !Number.isFinite(p.time) || p.time<0
      || p.time>duration || !Number.isFinite(p.kineticEV) || p.kineticEV<0))
    throw new Error('Impact records must match collected counts and the observation horizon.');
  for (const d of ['end','wall','source'] as Destination[])
    if (s.impacts.filter(p=>p.destination===d).length!==s[d])
      throw new Error('Impact destinations do not match the particle ledger.');
}

function summarizeSpecies(species:Pick<SpeciesResult,'massU'|'chargeState'|'injected'|'end'|'wall'|'source'|'remaining'>[]) {
  return species.map(s=>({massU:s.massU,chargeState:s.chargeState,injected:s.injected,
    outcomes:Object.fromEntries(destinations.map(d=>[d,recoveryInterval(s[d],s.injected)])) as
      Record<typeof destinations[number],ReturnType<typeof recoveryInterval>>}));
}

export function collectionSummary(result:OrbitResult) {
  result.species.forEach(s=>checkSpecies(s,result.config.duration));
  return {species:summarizeSpecies(result.species)};
}

/** Right-continuous empirical cumulative incidence, including competing outlets.
 * All four curves share pre/post event samples, including source returns at t=0.
 * The still-inside curve at the final horizon is the uncollected fraction.
 */
export function arrivalCurves(result:OrbitResult):Curve[] {
  result.species.forEach(s=>checkSpecies(s,result.config.duration));
  const times=[...new Set([0,result.config.duration,...result.species.flatMap(s=>s.impacts.map(p=>p.time))])].sort((a,b)=>a-b);
  const curves:Curve[]=[];
  result.species.forEach((s,i)=>{
    const label=String.fromCharCode(65+i),counts={end:0,wall:0,source:0,remaining:s.injected};
    const impacts=[...s.impacts].sort((a,b)=>a.time-b.time);
    let next=0;
    const x:number[]=[],ys=destinations.map(()=>[] as number[]);
    const sample=(time:number)=>{x.push(time*1e6);destinations.forEach((d,j)=>ys[j].push(counts[d]/s.injected));};
    for(const t of times){
      sample(t);
      while(next<impacts.length && impacts[next].time<=t){counts[impacts[next].destination]++;counts.remaining--;next++;}
      sample(t);
    }
    destinations.forEach((d,j)=>curves.push({label:`${label} ${d==='remaining'?'still inside':d}`,
      x:[...x],y:ys[j],xLabel:'Time since injection (µs)',yLabel:`Fraction of injected ${label} ions`}));
    const energies=s.impacts.map(p=>p.kineticEV).sort((a,b)=>a-b);
    if(energies.length)curves.push({label, x:energies.flatMap(v=>[v,v]),
      y:energies.flatMap((_,j)=>[j/energies.length,(j+1)/energies.length]),
      xLabel:'Impact energy (eV)',yLabel:'Energy CDF conditional on collected ions'});
    if(s.endRadialBins.length)curves.push({label,
      x:s.endRadialBins.map((_,j)=>result.config.radius*(j+.5)/s.endRadialBins.length),
      y:s.endRadialBins.map(n=>n/s.injected),xLabel:'Axial-end impact radius (m)',yLabel:'Injected fraction per radial bin'});
  });
  return curves;
}

/** Distinct reproducible uint32 seeds. Runs retain paired species within a seed. */
export function independentSeeds(base:number,count:number):number[] {
  if(!Number.isSafeInteger(base)||base<0||base>0xffffffff||!Number.isSafeInteger(count)||count<1||count>64)
    throw new Error('Use a uint32 base seed and 1–64 independent-seed runs.');
  return Array.from({length:count},(_,i)=>(base+Math.imul(i,0x9e3779b9))>>>0);
}

function randomGenerator(seed:number) {
  let state=seed>>>0;
  return ()=>{
    state=(state+0x6d2b79f5)>>>0;
    let t=Math.imul(state^(state>>>15),1|state);
    t^=t+Math.imul(t^(t>>>7),61|t);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
const quantile=(sorted:number[],p:number)=>{
  const at=(sorted.length-1)*p,lo=Math.floor(at);
  return sorted[lo]+(sorted[Math.ceil(at)]-sorted[lo])*(at-lo);
};
function configKey(result:OrbitResult) {
  return JSON.stringify(Object.entries(result.config).filter(([key])=>key!=='seed').sort(([a],[b])=>a.localeCompare(b)));
}

/** Percentile bootstrap over whole independent-seed batches, preserving A/B
 * pairing. This is not a binomial interval over mixed collector counts.
 * Sparse samples can resample an empty collector: report no interval then,
 * rather than silently condition the bootstrap on a nonempty collector.
 * An unobserved collector component also has no estimable bootstrap tail;
 * retain its point estimate without claiming a certain zero/one purity.
 */
export function summarizeEnsemble(results:OrbitResult[]) {
  if(results.length<2||results.length>64)throw new Error('An ensemble needs 2–64 independent-seed batches.');
  const seeds=results.map(r=>r.config.seed),key=configKey(results[0]);
  if(new Set(seeds).size!==seeds.length || seeds.some(s=>!Number.isInteger(s)||s<0||s>0xffffffff))
    throw new Error('Independent-seed batches must have distinct uint32 seeds.');
  for(const r of results){
    if(configKey(r)!==key || r.species.length!==2)throw new Error('Ensemble batches must differ only by seed and contain two species.');
    if(r.species.some((s,i)=>s.massU!==results[0].species[i].massU || s.chargeState!==results[0].species[i].chargeState
        || s.injected!==r.config.particlesPerSpecies))
      throw new Error('Ensemble species and injected counts must match their common configuration.');
    r.species.forEach(s=>checkSpecies(s,r.config.duration));
  }
  const pooled=results[0].species.map((s,i)=>({massU:s.massU,chargeState:s.chargeState,
    injected:results.reduce((sum,r)=>sum+r.species[i].injected,0),
    end:results.reduce((sum,r)=>sum+r.species[i].end,0),wall:results.reduce((sum,r)=>sum+r.species[i].wall,0),
    source:results.reduce((sum,r)=>sum+r.species[i].source,0),remaining:results.reduce((sum,r)=>sum+r.species[i].remaining,0)}));
  const bootstrap=(destination:'end'|'wall',target:number)=>{
    const total=pooled.reduce((sum,s)=>sum+s[destination],0);
    const fraction=total?pooled[target][destination]/total:null;
    const draws:number[]=[],random=randomGenerator(seeds.reduce((a,s)=>(a^s)>>>0,0)^0x51ed270b);
    let undefinedResamples=0;
    for(let b=0;b<4096;b++){
      let numerator=0,denominator=0;
      for(let j=0;j<results.length;j++){
        const r=results[Math.floor(random()*results.length)];
        numerator+=r.species[target][destination];denominator+=r.species[0][destination]+r.species[1][destination];
      }
      if(denominator)draws.push(numerator/denominator);else undefinedResamples++;
    }
    draws.sort((a,b)=>a-b);
    const observedBoth=total>0&&pooled[target][destination]>0&&pooled[target][destination]<total;
    const intervalUnavailableReason=total===0?'empty collector':!observedBoth?'one species unobserved in collector':
      undefinedResamples?'empty collector in bootstrap resample':null;
    const defined=draws.length>0&&intervalUnavailableReason===null;
    return {fraction,low:defined?quantile(draws,.025):null,high:defined?quantile(draws,.975):null,
      confidence:.95,method:'paired-batch percentile bootstrap' as const,
      validResamples:draws.length,undefinedResamples,intervalUnavailableReason};
  };
  return {runs:results.length,seeds,species:summarizeSpecies(pooled),purity:{endA:bootstrap('end',0),wallB:bootstrap('wall',1)}};
}
