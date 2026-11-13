/** Frozen retrospective observation, not an argon operating preset or fitted drive law.
 * Source: Wijnakker & Granneman (1979), conference Fig. 2 / journal Fig. 9.
 * Pixel records transcribed independently in the v79 study; no predictions imported.
 */
export const FUEL_BENCHMARK_SOURCE={
 id:'wijnakker-1979-neutral-profile',url:'https://doi.org/10.1051/jphyscol:19797236',
 apparatusUrl:'https://doi.org/10.1515/zna-1979-0602',
 pdfSha256:'235f0180bfa134e6e82895ceb2615ea2b396efb3c950dc2992ab1cbe0e7d2c67',
 cropSha256:'07bdee0628c73b9cb411996214a513055c9ab1381579ed9eff4c6e755ad61f4f',
 extractionSha256:'8bc1cf5f11e4c4a2b15ff2f31129d0b158a75b99b8daa90bdc994d804997de17',
 independence:'Retrospective development data; not an unseen operating condition.',
 conditions:'Neutral argon · radius 6 cm · B 0.13 T · 100 A per opposed branch · 1 Torr fill behind cathodes',
 excluded:'Two near-axis features overlap the ordinate and cannot be resolved; theory curves and legend are excluded.',
} as const;
export const FUEL_BENCHMARK_PIXELS={
 uncertaintyPx:6,xAnchors:[[0,170],[1,274],[2,382],[3,490],[4,595],[5,704],[6,811]],
 yAnchors:[[0,978],[500,718],[1000,458],[1500,197]],
 markers:[
  {id:'ar-i-r1',center:[274,831],bar:[798,868]},
  {id:'ar-i-r2',center:[382,704],bar:[670,739]},
  {id:'ar-i-r3',center:[489,614],bar:[578,650]},
  {id:'ar-i-r4',center:[594,649],bar:[614,683]},
  {id:'ar-i-r5',center:[705,767],bar:[733,801]},
 ],
} as const;
type Range=readonly[number,number];
export type RotationObservation={id:string;radiusM:number;velocityMS:number;radiusRangeM:Range;
 extractionRangeMS:Range;barRangeMS:Range;combinedRangeMS:Range;extractionUnderFivePercent:boolean};
function calibrated(value:number,anchors:readonly(readonly[number,number])[],factor:number){
 const [a,b]=[anchors[0],anchors.at(-1)!],u=FUEL_BENCHMARK_PIXELS.uncertaintyPx;
 const at=(v:number,lo:number,hi:number)=>factor*(a[0]+(v-lo)*(b[0]-a[0])/(hi-lo));
 const values=[];
 for(const dv of [-u,u])for(const da of [-u,u])for(const db of [-u,u])values.push(at(value+dv,a[1]+da,b[1]+db));
 return {value:at(value,a[1],b[1]),range:[Math.min(...values),Math.max(...values)] as Range};
}
export function fuelBenchmarkObservations():RotationObservation[]{
 const {xAnchors,yAnchors,markers}=FUEL_BENCHMARK_PIXELS;
 return markers.map(m=>{
  const r=calibrated(m.center[0],xAnchors,.01),v=calibrated(m.center[1],yAnchors,1);
  const bars=m.bar.map(y=>calibrated(y,yAnchors,1));
  return {id:m.id,radiusM:r.value,velocityMS:v.value,radiusRangeM:r.range,extractionRangeMS:v.range,
   barRangeMS:[Math.min(...bars.map(b=>b.value)),Math.max(...bars.map(b=>b.value))],
   combinedRangeMS:[Math.min(...bars.map(b=>b.range[0])),Math.max(...bars.map(b=>b.range[1]))],
   extractionUnderFivePercent:Math.max(...v.range.map(x=>Math.abs(x-v.value)))<.05*Math.abs(v.value)};
 });
}
export type RigidProfileBox={id:string;radiusM:Range;velocityMS:Range};
/** Necessary compatibility only: each box can choose its most favorable coordinates.
 * Enlarging the feasible set makes rejection conservative; overlap is not validation.
 * This gate deliberately admits resolved positive sightlines only, not the unresolved axis.
 */
export function rigidProfileCompatibility(points:readonly RigidProfileBox[],relativeScreen=.2){
 if(!points.length||!Number.isFinite(relativeScreen)||relativeScreen<0||relativeScreen>=1)throw new RangeError('A nonempty profile and a fractional screen in [0,1) are required.');
 let lower=0,upper=Infinity,lowerWitness='',upperWitness='';
 for(const p of points){
  const [r0,r1]=p.radiusM,[v0,v1]=p.velocityMS;
  if(!p.id||![r0,r1,v0,v1].every(Number.isFinite)||r0<=0||r1<r0||v0<0||v1<v0)throw new RangeError('Profile boxes need resolved positive radii and ordered nonnegative velocities.');
  const lo=(1-relativeScreen)*v0/r1,hi=(1+relativeScreen)*v1/r0;
  if(!Number.isFinite(lo)||!Number.isFinite(hi))throw new RangeError('Angular-speed interval exceeds the finite numerical domain.');
  if(lo>lower){lower=lo;lowerWitness=p.id;}if(hi<upper){upper=hi;upperWitness=p.id;}
 }
 const roundoff=32*Number.EPSILON*Math.max(Math.abs(lower),Math.abs(upper));
 return {status:lower-upper>roundoff?'incompatible' as const:'not-excluded' as const,lowerRadS:lower,upperRadS:upper,
  lowerWitness,upperWitness,relativeScreen};
}
/** These scores test only the live rigid-rotation family, independent of all drive coefficients. */
export function fuelBenchmarkReport(){
 const points=fuelBenchmarkObservations(),cases={} as Record<'nominal'|'digitization'|'bars'|'combined',ReturnType<typeof rigidProfileCompatibility>>;
 for(const mode of ['nominal','digitization','bars','combined'] as const)cases[mode]=rigidProfileCompatibility(points.map<RigidProfileBox>(p=>({id:p.id,
  radiusM:mode==='nominal'?[p.radiusM,p.radiusM]:p.radiusRangeM,
  velocityMS:mode==='nominal'?[p.velocityMS,p.velocityMS]:mode==='digitization'?p.extractionRangeMS:mode==='bars'?p.barRangeMS:p.combinedRangeMS})));
 const q=points.map(p=>p.velocityMS/p.radiusM),lo=Math.min(...q),hi=Math.max(...q);
 return {source:FUEL_BENCHMARK_SOURCE,points,cases,nominalMinimaxFraction:(hi-lo)/(hi+lo),
  experimentallyQualified:false,absolutePrediction:'unavailable' as const,
  observationOperator:'Rigid rotation predicts Doppler speed Ω × sightline offset for an optically thin full-line centroid, independent of positive emissivity. The original spectral estimator/transfer is unknown.',
  blockers:['No matched argon preset, local temperature field, current footprint or independently measured drag/collision coefficients in the live model.',
   'The actual live model imposes rigid rotation; no local shear, meridional flow or evolving extraction is solved.',
   'Optical estimator and apparatus mapping are unresolved; this is a conditional structural challenge, not a measured-performance prediction.']};
}
