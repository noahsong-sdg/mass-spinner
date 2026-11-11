import {AMU,E_CHARGE,type Vec} from './physics.js';

/** Equal-weight ion representatives. Density belongs to the entire local cell. */
export interface CoulombIon {velocity:Vec;massU:number;chargeState:number}
export type CoulombScatteringMethod='takizuka-abe'|'nanbu';
export const EPSILON_0=8.8541878128e-12;
const checkIon=(p:CoulombIon)=>{
 if(!Number.isFinite(p.massU)||p.massU<=0||!Number.isSafeInteger(p.chargeState)||p.chargeState<1
  ||p.velocity.length!==3||!p.velocity.every(Number.isFinite))throw new Error('Coulomb ions require positive mass/integer charge and finite 3D velocity.');
};
const checkParameters=(density:number,log:number,dt:number)=>{
 if(![density,log,dt].every(Number.isFinite)||density<0||log<=0||dt<0)
  throw new Error('Coulomb density/time must be nonnegative and Coulomb logarithm positive.');
};
const uniform=(random:()=>number)=>{
 const u=random();if(!Number.isFinite(u)||u<0||u>=1)throw new Error('Collision RNG must return uniform values in [0,1).');return u;
};

/** Nanbu (1997) cumulative angular law, with s=2*TA half-angle variance.
 * Its first Legendre moment is exp(-s); higher moments approximate angular
 * diffusion and still require timestep convergence. This is not an exact
 * finite-time Landau propagator. See docs/COLLISION-ANGLE-V30.md.
 */
function sampleNanbuComponents(s:number,random:()=>number){
 if(Number.isNaN(s)||s<0)throw new Error('Nanbu scattering length must be nonnegative.');
 if(s===0)return {cosine:1,sine:0};
 const u=uniform(random),r=Math.exp(-s);
 if(r===0){const q=2*u;return {cosine:1-2*u,sine:Math.sqrt(q*(2-q))};}
 let inverseA:number;
 if(s<=.05){
  // A>=20.5: the omitted coth(A)-1 term is below 3e-18. Keeping 1/A
  // also avoids overflowing A for positive subnormal scattering lengths.
  inverseA=-Math.expm1(-s);
 }else if(r<1e-4){
  const square=r*r;
  const a=r*(3+square*(9/5+square*(297/175+square*1539/875)));
  // The quantile's omitted O(A^3) term is below 3e-17 here. This form
  // remains a well-resolved uniform limit even for subnormal exp(-s).
  if(r<1e-6){
   const q=2*u*(1-a*(1-u)-(2/3)*a*a*(1-u)*(2*u-1));
   return {cosine:1-2*u+2*a*u*(1-u)+(4/3)*a*a*u*(1-u)*(2*u-1),sine:Math.sqrt(q*(2-q))};
  }
  inverseA=1/a;
 }else{
  let low=0,high=1/(1-r),a=r*(3-r*r)/(1-r*r),converged=false;
  for(let i=0;i<8;i++){
   const square=a*a,e=Math.exp(-2*a),denominator=-Math.expm1(-2*a);
   const mean=a<.1?a*(1/3+square*(-1/45+square*(2/945+square*(-1/4725+square*2/93555)))):
    1+2*e/denominator-1/a;
   const derivative=a<.1?1/3+square*(-1/15+square*(2/189+square*(-7/4725+square*18/93555))):
    1/square-4*e/denominator**2;
   const error=mean-r;
   if(Math.abs(error)<=4e-15){converged=true;break;}
   if(error>0)high=a;else low=a;
   const next=a-error/derivative;a=next>low&&next<high?next:(low+high)/2;
  }
  if(!converged)throw new Error('Nanbu angular moment inversion did not converge.');
  inverseA=1/a;
 }
 // Inverse survival CDF. Positive addition resolves the rare backward tail;
 // log1p resolves forward draws and small A without cancellation near one.
 const logProbability=u>.5&&inverseA<1?Math.log((1-u)+u*Math.exp(-2/inverseA)):
  Math.log1p(u*Math.expm1(-2/inverseA));
 // Preserve the small deflection before adding it to one: its cosine can
 // round to one while its transverse sine/velocity impulse is representable.
 const q=-inverseA*logProbability;
 // Taking square roots before the small product also preserves impulses when
 // q underflows, including positive subnormal scattering lengths/uniforms.
 return {cosine:1+inverseA*logProbability,sine:Math.sqrt(inverseA*(2-q))*Math.sqrt(-logProbability)};
}

/** Public cosine quantile retains its original arithmetic and RNG stream. */
export function sampleNanbuCosine(s:number,random:()=>number):number{
 return sampleNanbuComponents(s,random).cosine;
}

/** TA variance of tan(theta/2), SI units; density is the effective partner density.
 * Identical velocities have no pair exchange. No relative-speed floor is used.
 */
export function coulombVariance(a:CoulombIon,b:CoulombIon,densityM3:number,coulombLog:number,dt:number):number{
 checkIon(a);checkIon(b);checkParameters(densityM3,coulombLog,dt);
 const g=Math.hypot(a.velocity[0]-b.velocity[0],a.velocity[1]-b.velocity[1],a.velocity[2]-b.velocity[2]);
 return varianceAtSpeed(a,b,densityM3,coulombLog,dt,g);
}

function varianceAtSpeed(a:CoulombIon,b:CoulombIon,densityM3:number,coulombLog:number,dt:number,g:number){
 if(g===0||densityM3===0||dt===0)return 0;
 const mu=AMU*a.massU*b.massU/(a.massU+b.massU);
 const variance=(a.chargeState*b.chargeState*E_CHARGE**2/EPSILON_0/mu)**2*densityM3*coulombLog*dt/(8*Math.PI*g**3);
 if(!Number.isFinite(variance))throw new Error('Coulomb angular variance exceeds the finite numerical domain.');
 return variance;
}

/** Conservative pair rotation; omitted method retains the original TA stream.
 * Both angular laws are finite-step approximations requiring convergence.
 */
export function scatterCoulombPair(a:CoulombIon,b:CoulombIon,densityM3:number,coulombLog:number,dt:number,random:()=>number,
 method:CoulombScatteringMethod='takizuka-abe'){
 if(method!=='takizuka-abe'&&method!=='nanbu')throw new Error('Unknown Coulomb scattering method.');
 checkIon(a);checkIon(b);checkParameters(densityM3,coulombLog,dt);
 const gx=a.velocity[0]-b.velocity[0],gy=a.velocity[1]-b.velocity[1],gz=a.velocity[2]-b.velocity[2];
 const g=Math.hypot(gx,gy,gz),variance=varianceAtSpeed(a,b,densityM3,coulombLog,dt,g);
 if(variance===0)return {velocityA:[...a.velocity] as Vec,velocityB:[...b.velocity] as Vec,variance};
 const dx=gx/g,dy=gy/g,dz=gz/g;
 // Choose a numerically nonsingular perpendicular basis. Uniform azimuth makes
 // its arbitrary orientation immaterial to the rotationally invariant law.
 const leastXY=Math.abs(dy)<Math.abs(dx)?1:0;
 const axis=Math.abs(dz)<Math.abs(leastXY===0?dx:dy)?2:leastXY;
 const bx=axis===0?1:0,by=axis===1?1:0,bz=axis===2?1:0;
 const cx=dy*bz-dz*by,cy=dz*bx-dx*bz,cz=dx*by-dy*bx;
 const norm=Math.hypot(cx,cy,cz),e1x=cx/norm,e1y=cy/norm,e1z=cz/norm;
 const e2x=dy*e1z-dz*e1y,e2y=dz*e1x-dx*e1z,e2z=dx*e1y-dy*e1x;
 let cosine:number,sine:number;
 if(method==='nanbu'){
  ({cosine,sine}=sampleNanbuComponents(2*variance,random));
 }else{
  const delta=Math.sqrt(variance)*Math.sqrt(-2*Math.log1p(-uniform(random)))*Math.cos(2*Math.PI*uniform(random)),square=delta*delta;
  // Reciprocal form also avoids overflow for an otherwise finite large delta.
  cosine=Math.abs(delta)>1?(1/square-1)/(1/square+1):(1-square)/(1+square);
  sine=Math.abs(delta)>1?2/(delta+1/delta):2*delta/(1+square);
 }
 const angle=2*Math.PI*uniform(random),cosAngle=Math.cos(angle),sinAngle=Math.sin(angle);
 const rx=g*(dx*cosine+(e1x*cosAngle+e2x*sinAngle)*sine);
 const ry=g*(dy*cosine+(e1y*cosAngle+e2y*sinAngle)*sine);
 const rz=g*(dz*cosine+(e1z*cosAngle+e2z*sinAngle)*sine);
 const fractionA=a.massU/(a.massU+b.massU),fractionB=b.massU/(a.massU+b.massU);
 const centerX=fractionA*a.velocity[0]+fractionB*b.velocity[0];
 const centerY=fractionA*a.velocity[1]+fractionB*b.velocity[1];
 const centerZ=fractionA*a.velocity[2]+fractionB*b.velocity[2];
 return {velocityA:[centerX+fractionB*rx,centerY+fractionB*ry,centerZ+fractionB*rz] as Vec,
  velocityB:[centerX-fractionA*rx,centerY-fractionA*ry,centerZ-fractionA*rz] as Vec,variance};
}

/** Random-batch empirical Landau approximation, all species mixed, equal weight.
 * Each other representative contributes n/N to the infinitesimal generator:
 * even N partner probability=1/(N-1), odd N=1/N (one uniformly unpaired ion).
 * This explicit finite-N normalization differs from species-separated TA pairing.
 * Mutates velocities only; positions/species/weights remain the caller's data.
 */
export function collideCoulombCell(ions:CoulombIon[],densityM3:number,coulombLog:number,dt:number,random:()=>number,
 onPair?:(a:CoulombIon,b:CoulombIon,deltaMomentumA:Vec)=>void,method:CoulombScatteringMethod='takizuka-abe'){
 if(method!=='takizuka-abe'&&method!=='nanbu')throw new Error('Unknown Coulomb scattering method.');
 checkParameters(densityM3,coulombLog,dt);ions.forEach(checkIon);
 const n=ions.length,order=Array.from({length:n},(_,i)=>i);
 const diagnostics={pairs:0,maxVariance:0,meanVariance:0,largeAnglePairs:0,unpaired:n%2,zeroRelativePairs:0};
 if(n<2||densityM3===0||dt===0)return diagnostics;
 for(let i=n-1;i>0;i--){const j=Math.floor(uniform(random)*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 const effectiveDensity=densityM3*(n%2?1:(n-1)/n);
 for(let i=0;i+1<n;i+=2){
  const a=ions[order[i]],b=ions[order[i+1]];
  const result=scatterCoulombPair(a,b,effectiveDensity,coulombLog,dt,random,method);
  diagnostics.pairs++;diagnostics.maxVariance=Math.max(diagnostics.maxVariance,result.variance);
  diagnostics.meanVariance+=result.variance;if(result.variance>.1)diagnostics.largeAnglePairs++;
  if(a.velocity.every((v,j)=>v===b.velocity[j]))diagnostics.zeroRelativePairs++;
  onPair?.(a,b,result.velocityA.map((v,j)=>(v-a.velocity[j])*a.massU*AMU) as Vec);
  a.velocity=result.velocityA;b.velocity=result.velocityB;
 }
 diagnostics.meanVariance/=diagnostics.pairs;
 return diagnostics;
}
