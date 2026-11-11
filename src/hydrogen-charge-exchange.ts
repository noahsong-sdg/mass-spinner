/** A reaction kernel, NOT a coupled orbit channel. Both products must be tracked.
 * Janev–Reiter–Samm, Jülich 4105 (2003), §2.2.3 Eq44/Table9, n=1.
 * https://juser.fz-juelich.de/record/38224/files/Juel_4105_Reiter.pdf
 * Independent implementation: FIDASIM atomic_tables.f90 / p_cx_1_janev.
 * Nuclear-trajectory approximation: electron inertia neglected, no nuclear deflection.
 */
const AMU=1.66053906660e-27,E=1.602176634e-19;
export const PROTON_MASS_U=1.007276466879;
export interface HydrogenNucleus {atomicIdentity:'H-1';massU:number;chargeState:0|1;velocityMS:[number,number,number]}

/** Restricted below the equal-mass n=2 excitation threshold, to avoid inventing final-state branching. */
export function hydrogenGroundCaptureCrossSection(relativeEnergyEVPerU:number){
 const roundoff=16*Number.EPSILON*Math.max(1,Math.abs(relativeEnergyEVPerU));
 if(!Number.isFinite(relativeEnergyEVPerU)||relativeEnergyEVPerU<.1-roundoff||relativeEnergyEVPerU>20+roundoff)
  throw new Error('Ground-resonant H-1 kernel supports only 0.1–20 eV/u relative laboratory energy.');
 const e=relativeEnergyEVPerU/1000;
 return 3.2345e-20*Math.log(235.88/e+2.3713)/(1+.038371*e+3.8068e-6*e**3.5+1.1832e-10*e**5.4);
}

export function hydrogenCaptureHazard(velocityMS:[number,number,number],neutralDensityM3:number){
 if(velocityMS.length!==3||!velocityMS.every(Number.isFinite)||!Number.isFinite(neutralDensityM3)||neutralDensityM3<0)throw new Error('Finite velocity and nonnegative neutral density required.');
 // Zero density is the exact disabled limit and does not require a collision-energy model.
 if(neutralDensityM3===0)return {ratePerS:0,crossSectionM2:null,relativeEnergyEVPerU:null};
 const speed=Math.hypot(...velocityMS),energy=.5*AMU*speed**2/E,crossSectionM2=hydrogenGroundCaptureCrossSection(energy);
 return {ratePerS:neutralDensityM3*crossSectionM2*speed,crossSectionM2,relativeEnergyEVPerU:energy};
}

/** Exact constant-hazard draw. A field solver must integrate varying hazard to the event. */
export function constantCaptureTime(ratePerS:number,uniform:number){
 if(!Number.isFinite(ratePerS)||ratePerS<0||!Number.isFinite(uniform)||uniform<0||uniform>=1)throw new Error('Nonnegative finite rate and a uniform draw in [0,1) required.');
 return ratePerS===0?Infinity:-Math.log1p(-uniform)/ratePerS;
}

export function hydrogenCaptureProducts(ion:HydrogenNucleus,target:HydrogenNucleus){
 for(const [p,charge] of [[ion,1],[target,0]] as const){
  if(p.atomicIdentity!=='H-1'||Math.abs(p.massU-PROTON_MASS_U)>1e-12||p.chargeState!==charge||p.velocityMS.length!==3||!p.velocityMS.every(Number.isFinite))throw new Error('Explicit H-1 proton and neutral nuclear states are required.');
 }
 if(target.velocityMS.some(v=>v!==0))throw new Error('This scoped channel requires a cold stationary H-1 neutral target.');
 hydrogenCaptureHazard(ion.velocityMS,1);
 const fastNeutral={...ion,chargeState:0 as const,velocityMS:[...ion.velocityMS] as [number,number,number]};
 const slowIon={...target,chargeState:1 as const,velocityMS:[...target.velocityMS] as [number,number,number]};
 return {fastNeutral,slowIon,ledger:{incomingNuclei:2,outgoingNuclei:2,incomingChargeE:1,outgoingChargeE:1,
  reservoirNeutralsConsumed:1,reservoirNucleiPromotedToIon:1,
  nuclearKineticEnergyChangeJ:0,nuclearMomentumChangeKGMS:[0,0,0] as [number,number,number]},
  approximation:'Ground-state electron transfer, cold target, unchanged nuclear velocities; electron inertia and nuclear deflection omitted.'};
}
