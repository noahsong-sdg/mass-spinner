import {AMU,E_CHARGE} from './physics.js';
import {gaussianCentrifuge,type GaussianCentrifugeConfig,type GaussianProfile} from './gaussian-centrifuge.js';
import type {CentrifugeResult} from './centrifuge.js';

const MU0=1.25663706127e-6,ELECTRON_MASS=9.1093837139e-31;

export interface MagneticCentrifugeConfig extends GaussianCentrifugeConfig {
 /** magneticT specifies Bz at this boundary, not a uniform field. */
 magneticBoundary:'axis'|'wall';
}
export interface MagneticCentrifugeProfile extends GaussianProfile {
 magneticFieldT:number;
 /** Integral from the axis of Bz(r) r dr; not the flux through a full disk. */
 magneticFluxTM2:number;
 /** Actual solved Bz(r)-Bz(0), replacing the imposed-field perturbation estimate. */
 magneticPerturbationT:number;
}
export interface MagneticCentrifugeResult extends CentrifugeResult {
 model:'coupled-magnetic-gaussian';
 magneticBoundary:'axis'|'wall';boundaryMagneticT:number;axisMagneticT:number;wallMagneticT:number;
 gaussianProfiles:MagneticCentrifugeProfile[];
 requiredMagneticPressureRisePa:number;
 maxRelativeMagneticPerturbation:number;
 maxElectronInertiaRatio:number;
 maxRelativeForceBalanceResidual:number;
 /** Independent midpoint finite-difference Ampere defect, in T/m. */
 maxAmpereResidualTM:number;
 /** Supremum defect divided by the supremum current source, not a validity threshold. */
 maxRelativeAmpereResidual:number;
}

/** Radial quasineutral, equal-Z, isothermal equilibrium with self-consistent
 * Bz(r) and Jtheta(r). Total Gaussian density and rigid ion rotation remain
 * prescribed. Electron inertia is omitted and reported, not silently repaired.
 * This solves a bounded equilibrium, not a source, axial discharge or stability.
 */
export function magneticCentrifuge(config:MagneticCentrifugeConfig):MagneticCentrifugeResult {
 if(config.magneticBoundary!=='axis'&&config.magneticBoundary!=='wall')
  throw new Error('Specify an axis or wall magnetic boundary.');
 // Reuse the unchanged equal-charge composition closure and its input domain.
 // Its imposed-field potential/current are replaced below, not fed into this solve.
 const base=gaussianCentrifuge(config),bins=base.profiles.length-1;
 const {radius:a,rotationRadS:omega,ionTemperatureEV:ti,electronTemperatureEV:te,
  densityWidthM:width,axisDensityM3:n0,magneticT:boundaryB}=config;
 const z=base.species[0].chargeState,masses=base.species.map(s=>s.massU*AMU);
 const state=(r:number)=>{
  const logs=base.species.map((s,i)=>s.axisFraction>0?
   Math.log(s.axisFraction)+masses[i]*(omega*r)**2/(2*E_CHARGE*ti):-Infinity);
  const max=Math.max(...logs),weights=logs.map(x=>Math.exp(x-max)),total=weights.reduce((s,v)=>s+v,0);
  const meanMass=weights.reduce((sum,v,i)=>sum+v*masses[i],0)/total;
  const density=n0*Math.exp(-((r/width)**2));
  const force=meanMass*omega**2+2*E_CHARGE*(ti+z*te)/width**2;
  return {meanMass,density,force};
 };
 // d(B²)/dr = 2 mu0 N(r) r F(r). This positive integrand fixes the regular
 // branch without iterating a potentially singular dB/dr = mu0 N r F/B.
 const source=(r:number)=>{const s=state(r);return 2*MU0*s.density*r*s.force;};
 const h=a/(2*bins),rise=[0];
 for(let j=1;j<=2*bins;j++){
  const left=(j-1)*h,right=j*h;
  rise.push(rise[j-1]+h*(source(left)+4*source((left+right)/2)+source(right))/6);
 }
 const fullRise=rise.at(-1)!;
 const axisSquared=boundaryB**2-(config.magneticBoundary==='wall'?fullRise:0);
 if(!Number.isFinite(axisSquared)||axisSquared<=0||!Number.isFinite(fullRise))
  throw new Error('No regular nonzero-B Gaussian equilibrium: wall magnetic pressure cannot support the prescribed density, temperature and rotation.');
 const field=rise.map(value=>Math.sign(boundaryB)*Math.sqrt(axisSquared+value));
 const axisB=field[0],profiles:MagneticCentrifugeProfile[]=[];
 let flux=0,maxInertia=0,maxForceResidual=0,maxFieldVariation=0,maxAmpereDefect=0,maxAmpereSource=0;
 const relativeResidual=(lhs:number,...terms:number[])=>
  Math.abs(lhs-terms.reduce((s,v)=>s+v,0))/(Math.abs(lhs)+terms.reduce((s,v)=>s+Math.abs(v),0));
 for(let j=0;j<=bins;j++){
  const r=base.profiles[j].radius,b=field[2*j],s=state(r);
  if(j>0){
   const l=(2*j-2)*h,m=(2*j-1)*h;
   flux+=2*h*(field[2*j-2]*l+4*field[2*j-1]*m+b*r)/6;
   const mid=state(m),currentMid=-mid.density*m*mid.force/field[2*j-1];
   const defect=(b-field[2*j-2])/(2*h)+MU0*currentMid;
   maxAmpereDefect=Math.max(maxAmpereDefect,Math.abs(defect));
   maxAmpereSource=Math.max(maxAmpereSource,Math.abs(MU0*currentMid));
  }
  const slopeOverR=omega*b+s.meanMass*omega**2/(z*E_CHARGE)+2*ti/(z*width**2);
  const electronOmega=slopeOverR/b+2*te/(b*width**2);
  const inertia=ELECTRON_MASS*electronOmega**2/
   (E_CHARGE*(2*te/width**2+Math.abs(slopeOverR)+Math.abs(b*electronOmega)));
  for(let i=0;i<masses.length;i++)if(base.species[i].axisFraction>0){
   const pressure=E_CHARGE*ti*(-2/width**2+(masses[i]-s.meanMass)*omega**2/(E_CHARGE*ti));
   maxForceResidual=Math.max(maxForceResidual,relativeResidual(pressure,masses[i]*omega**2,
    -z*E_CHARGE*slopeOverR,z*E_CHARGE*omega*b));
  }
  maxForceResidual=Math.max(maxForceResidual,relativeResidual(-2*E_CHARGE*te/width**2,
   E_CHARGE*slopeOverR,-E_CHARGE*b*electronOmega));
  profiles.push({radius:r,totalIonDensityM3:s.density,
   laboratoryPotentialV:base.profiles[j].effectivePotentialV+omega*flux,
   electricFieldVM:-r*slopeOverR,ionVelocityMS:omega*r,electronVelocityMS:electronOmega*r,
   currentDensityAM2:-s.density*r*s.force/b,magneticFieldT:b,magneticFluxTM2:flux,
   magneticPerturbationT:b-axisB,electronInertiaRatio:inertia});
  maxInertia=Math.max(maxInertia,inertia);
  maxFieldVariation=Math.max(maxFieldVariation,Math.abs((b-axisB)/axisB));
 }
 if(!profiles.every(p=>Object.values(p).every(Number.isFinite))||!Number.isFinite(maxForceResidual)
  ||!Number.isFinite(maxAmpereSource)||maxAmpereSource<=0)
  throw new Error('Coupled magnetic equilibrium exceeds the representable finite domain.');
 return {species:base.species,referenceSpeciesIndex:base.referenceSpeciesIndex,profiles:base.profiles,
  maxRelativeChargeResidual:base.maxRelativeChargeResidual,model:'coupled-magnetic-gaussian',
  magneticBoundary:config.magneticBoundary,boundaryMagneticT:boundaryB,axisMagneticT:axisB,
  wallMagneticT:field.at(-1)!,gaussianProfiles:profiles,
  requiredMagneticPressureRisePa:fullRise/(2*MU0),maxRelativeMagneticPerturbation:maxFieldVariation,
  maxElectronInertiaRatio:maxInertia,maxRelativeForceBalanceResidual:maxForceResidual,
  maxAmpereResidualTM:maxAmpereDefect,maxRelativeAmpereResidual:maxAmpereDefect/maxAmpereSource};
}
