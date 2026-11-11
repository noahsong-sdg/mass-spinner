export interface NeutronGeometryConfig {
 neutronRateS:number;
 distanceM:number;
 sampleAreaM2:number;
}

/** Isotropic point source, free flight, circular disk normal to its axis.
 * This is a geometric incident-current reference, not neutron transport or
 * the scalar flux in a finite, scattering, anisotropic D–T irradiation field.
 */
export function isotropicDiskReference({neutronRateS:rate,distanceM:d,sampleAreaM2:area}:NeutronGeometryConfig){
 if(![rate,d,area].every(Number.isFinite)||rate<0||d<0||area<=0)
  throw new Error('Geometry reference requires a nonnegative source rate and distance, and positive finite sample area.');
 const radiusM=Math.sqrt(area/Math.PI),hypotenuse=Math.hypot(d,radiusM);
 // Rationalize 1-d/h to avoid losing the small disk solid angle in the far field.
 const interceptedFraction=.5*(radiusM/hypotenuse)**2/(1+d/hypotenuse);
 const interceptedRateS=rate*interceptedFraction;
 const meanPlaneCurrentM2S=interceptedRateS/area;
 if(![interceptedFraction,interceptedRateS,meanPlaneCurrentM2S].every(Number.isFinite))
  throw new Error('Geometry reference exceeds the representable finite numeric domain.');
 return {radiusM,interceptedFraction,interceptedRateS,meanPlaneCurrentM2S};
}
