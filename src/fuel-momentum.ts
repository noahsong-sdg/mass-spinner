/** Axisymmetric neutral shear flow at prescribed density/temperature.
 * d(ρ r² Ω)/dt = (1/r) d(μ r³ Ω')/dr + r fθ.
 * This kernel has no radial mass advection, discharge closure or axial flow.
 * It is not a replacement for the coupled species/thermal operating backend.
 */
export type FuelMomentumInput={edgesM:readonly number[];lengthM:number;
 densityKgM3:readonly number[];viscosityPaS:readonly number[];
 innerWallRadS:number|null;outerWallRadS:number|null;
 shearScheme?:'integrated-resistance'|'volume-coordinate'};
export type FuelMomentumGrid=FuelMomentumInput&{radiusM:number[];inertiaKgM2:number[];conductance:number[]};
export type FuelMomentumEnergy={driveWorkJ:number;wallWorkJ:number;shearHeatJ:number;numericalLossJ:number;
 driveImpulseKgM2S:number;wallImpulseKgM2S:number};
const positive=(v:number)=>Number.isFinite(v)&&v>0;
const sum=(a:readonly number[])=>a.reduce((s,x)=>s+x,0);
// Integral dr/(2π L μ r³). Factored differences retain close-radius accuracy.
const resistance=(a:number,b:number,mu:number,length:number)=>(b-a)*(b+a)/(4*Math.PI*length*mu*a*a*b*b);

/** Half-cell shear resistance. The volume-coordinate option discretizes
 * Tface=4πL μ qface² ∂qΩ for conserved q=r² cell states; the default retains
 * the exact constant-torque Couette integration used by the v65 references.
 */
export function fuelMomentumHalfResistance(grid:FuelMomentumInput&{radiusM:readonly number[]},cell:number,face:number){
 const edge=grid.edgesM[face],center=grid.radiusM[cell],a=Math.min(edge,center),b=Math.max(edge,center);
 return grid.shearScheme==='volume-coordinate'?
  (b-a)*(b+a)/(4*Math.PI*grid.lengthM*grid.viscosityPaS[cell]*edge**4):
  resistance(a,b,grid.viscosityPaS[cell],grid.lengthM);
}

export function createFuelMomentumGrid(input:FuelMomentumInput):FuelMomentumGrid{
 const {edgesM:e,lengthM:l,densityKgM3:rho,viscosityPaS:mu}=input,n=e.length-1;
 if(n<2||!positive(l)||e.some((r,i)=>!Number.isFinite(r)||r<0||(i>0&&r<=e[i-1]))||
  rho.length!==n||mu.length!==n||[...rho,...mu].some(v=>!positive(v)))throw new RangeError('Need ordered nonnegative radial edges and positive density, viscosity and length.');
 for(const wall of [input.innerWallRadS,input.outerWallRadS])if(wall!==null&&!Number.isFinite(wall))throw new RangeError('Wall rotation must be finite or null for zero stress.');
 if(e[0]===0&&input.innerWallRadS!==null)throw new RangeError('The symmetry axis is not a solid wall.');
 if(input.shearScheme!==undefined&&input.shearScheme!=='integrated-resistance'&&input.shearScheme!=='volume-coordinate')throw new RangeError('Unsupported momentum shear scheme.');
 const radiusM=Array.from({length:n},(_,i)=>input.shearScheme==='volume-coordinate'?Math.sqrt((e[i]**2+e[i+1]**2)/2):(e[i]+e[i+1])/2);
 const inertiaKgM2=rho.map((v,i)=>Math.PI*l*v*(e[i+1]-e[i])*(e[i+1]+e[i])*(e[i+1]**2+e[i]**2)/2);
 const conductance=Array<number>(n+1).fill(0);
 const geometry={...input,radiusM};
 for(let i=1;i<n;i++)conductance[i]=1/(fuelMomentumHalfResistance(geometry,i-1,i)+fuelMomentumHalfResistance(geometry,i,i));
 if(input.innerWallRadS!==null)conductance[0]=1/fuelMomentumHalfResistance(geometry,0,0);
 if(input.outerWallRadS!==null)conductance[n]=1/fuelMomentumHalfResistance(geometry,n-1,n);
 if(inertiaKgM2.some(v=>!positive(v))||conductance.some(v=>!Number.isFinite(v)||v<0))throw new RangeError('Momentum geometry exceeds the floating-point domain.');
 return {...input,edgesM:[...e],densityKgM3:[...rho],viscosityPaS:[...mu],radiusM,inertiaKgM2,conductance};
}

/** Jr>0 is outward and Bz>0 is axial: er×ez=−eθ. The drive cutoff does
 * not remove the gas core. The returned signed torque integrates J×B exactly.
 */
export function fuelRadialCurrentTorques(grid:FuelMomentumGrid,driveInnerRadiusM:number,currentA:number,magneticT:number){
 const e=grid.edgesM;
 if(!positive(driveInnerRadiusM)||driveInnerRadiusM<e[0]||driveInnerRadiusM>=e.at(-1)!||!Number.isFinite(currentA)||!Number.isFinite(magneticT))throw new RangeError('Radial-current injection needs a positive radius inside the gas domain; current and field must be finite.');
 return grid.radiusM.map((_,i)=>{const a=Math.max(e[i],driveInnerRadiusM),b=e[i+1];return b>a?-currentA*magneticT*(b-a)*(b+a)/2:0;});
}

export function fuelMomentumState(grid:FuelMomentumGrid,omega:readonly number[]){
 if(omega.length!==grid.radiusM.length||omega.some(v=>!Number.isFinite(v)))throw new RangeError('Need one finite angular speed per cell.');
 const state={angularMomentumKgM2S:sum(omega.map((v,i)=>grid.inertiaKgM2[i]*v)),
  kineticJ:sum(omega.map((v,i)=>.5*grid.inertiaKgM2[i]*v*v))};
 if(!Object.values(state).every(Number.isFinite))throw new RangeError('Momentum state exceeds the floating-point energy domain.');
 return state;
}

/** Symmetric, reciprocal viscous torques; fully implicit backward Euler.
 * Physical shear heat stays distinct from numerical BE dissipation. A fixed
 * no-slip wall removes angular momentum with zero mechanical boundary work.
 */
export function advanceFuelMomentum(grid:FuelMomentumGrid,old:readonly number[],torque:readonly number[],dtS:number){
 const before=fuelMomentumState(grid,old),n=old.length,g=grid.conductance,I=grid.inertiaKgM2;
 if(!Number.isFinite(dtS)||dtS<0||torque.length!==n||torque.some(v=>!Number.isFinite(v)))throw new RangeError('Need finite cell torques and a nonnegative timestep.');
 const diagonal=I.map((v,i)=>v+dtS*(g[i]+g[i+1]));
 const rhs=old.map((v,i)=>I[i]*v+dtS*torque[i]);
 rhs[0]+=dtS*g[0]*(grid.innerWallRadS??0);rhs[n-1]+=dtS*g[n]*(grid.outerWallRadS??0);
 for(let i=1;i<n;i++){
  const lower=-dtS*g[i],factor=lower/diagonal[i-1];
  diagonal[i]-=factor*lower;rhs[i]-=factor*rhs[i-1];
 }
 const omegaRadS=Array<number>(n);omegaRadS[n-1]=rhs[n-1]/diagonal[n-1];
 for(let i=n-2;i>=0;i--)omegaRadS[i]=(rhs[i]+dtS*g[i+1]*omegaRadS[i+1])/diagonal[i];
 const after=fuelMomentumState(grid,omegaRadS);
 const innerTorque=g[0]*((grid.innerWallRadS??0)-omegaRadS[0]);
 const outerTorque=g[n]*((grid.outerWallRadS??0)-omegaRadS[n-1]);
 const shearPowerByFace=Array.from({length:n+1},(_,i)=>{
  const a=i===0?(grid.innerWallRadS??omegaRadS[0]):omegaRadS[i-1];
  const b=i===n?(grid.outerWallRadS??omegaRadS[n-1]):omegaRadS[i];
  return g[i]*(b-a)**2;
 });
 const increment:FuelMomentumEnergy={driveWorkJ:dtS*sum(torque.map((v,i)=>v*omegaRadS[i])),
  wallWorkJ:dtS*(innerTorque*(grid.innerWallRadS??0)+outerTorque*(grid.outerWallRadS??0)),
  shearHeatJ:dtS*sum(shearPowerByFace),numericalLossJ:sum(old.map((v,i)=>.5*I[i]*(omegaRadS[i]-v)**2)),
  driveImpulseKgM2S:dtS*sum(torque),wallImpulseKgM2S:dtS*(innerTorque+outerTorque)};
 const angularResidualKgM2S=after.angularMomentumKgM2S-before.angularMomentumKgM2S-increment.driveImpulseKgM2S-increment.wallImpulseKgM2S;
 const energyResidualJ=after.kineticJ-before.kineticJ-increment.driveWorkJ-increment.wallWorkJ+increment.shearHeatJ+increment.numericalLossJ;
 if(!Object.values(increment).every(Number.isFinite)||!Number.isFinite(angularResidualKgM2S)||!Number.isFinite(energyResidualJ))throw new RangeError('Momentum evolution exceeds the floating-point domain.');
 return {omegaRadS,...after,increment,shearPowerByFace,innerWallTorqueNm:innerTorque,outerWallTorqueNm:outerTorque,
  angularResidualKgM2S,energyResidualJ};
}

/** Exact constant-emissivity chord centroid of the piecewise-constant Ω field.
 * This is an observation operator, not the speed of an optical spoke/wave.
 * Annular holes contribute no emission. Chords must intersect emitting gas.
 */
export function fuelDopplerCentroid(grid:FuelMomentumGrid,omega:readonly number[],chordM:number){
 fuelMomentumState(grid,omega);const R=grid.edgesM.at(-1)!;
 if(!Number.isFinite(chordM)||Math.abs(chordM)>=R)throw new RangeError('Chord must intersect the gas interior.');
 const x=Math.abs(chordM);let integral=0,path=0;
 for(let i=0;i<omega.length;i++){
  const a=Math.max(x,grid.edgesM[i]),b=grid.edgesM[i+1];if(b<=a)continue;
  const segment=Math.sqrt((b-x)*(b+x))-Math.sqrt((a-x)*(a+x));
  integral+=omega[i]*segment;path+=segment;
 }
 return chordM*integral/path;
}

/** Conditional neutral isotope odds change at common Ω(r),T(r). It does not
 * predict Ω, density redistribution times, or an extracted product purity.
 */
export function fuelIsotopeLogOddsChange(grid:FuelMomentumGrid,omega:readonly number[],temperatureK:readonly number[],deltaMassKg:number,raM:number,rbM:number){
 fuelMomentumState(grid,omega);
 if(temperatureK.length!==omega.length||temperatureK.some(t=>!positive(t))||!Number.isFinite(deltaMassKg)||
  !Number.isFinite(raM)||!Number.isFinite(rbM)||raM<grid.edgesM[0]||rbM>grid.edgesM.at(-1)!||rbM<raM)throw new RangeError('Need positive cell temperatures and ordered sampling radii inside the gas.');
 return sum(omega.map((v,i)=>{const a=Math.max(raM,grid.edgesM[i]),b=Math.min(rbM,grid.edgesM[i+1]);
  return b>a?deltaMassKg*v*v*(b-a)*(b+a)/(2*1.380649e-23*temperatureK[i]):0;}));
}

/** Bouledroua2006, dilute monatomic neutral Li,100–3000K. Published theoretical
 * fits, not measured mixture/plasma uncertainties. Micropoise→Pa s; mW→W.
 */
export function fuelLithiumNeutralTransport(temperatureK:number){
 if(!Number.isFinite(temperatureK)||temperatureK<100||temperatureK>3000)throw new RangeError('Neutral Li fit requires100–3000K.');
 return {viscosityPaS:3.14e-8*temperatureK**.863,conductivityWmK:1.398e-4*temperatureK**.863};
}
