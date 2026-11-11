import {AMU,E_CHARGE} from './physics.js';
export type TransportMode='advection'|'diffusion'|'mobility'|'ionization'|'transit';
export interface TransportConfig {
  massA:number; massB:number; chargeA:number; chargeB:number;
  temperatureEV:number; magneticT:number; electricVM:number; collisionHz:number;
  densityM3:number; crossSectionM2:number; length:number; duration:number; beamEV:number;
  electronTemperatureEV:number; thresholdAEV:number; thresholdBEV:number;
  ionizationRateA:number; ionizationRateB:number;
  collisionModel:'fixed'|'coulomb-heavy-light'; backgroundMassU:number; coulombLog:number;
  energySpreadFraction:number; pulseWidthS:number;
  ionizationModel:'prescribed'|'step-cross-section'; ionizationCrossSectionA:number; ionizationCrossSectionB:number;
}
export const DEFAULT_TRANSPORT:TransportConfig={
  massA:40,massB:84,chargeA:1,chargeB:1,temperatureEV:5,magneticT:.1,electricVM:100,
  collisionHz:10000,densityM3:1e18,crossSectionM2:1e-19,length:2.8,duration:.0006,beamEV:20,
  electronTemperatureEV:5,thresholdAEV:15.76,thresholdBEV:14,ionizationRateA:1e-14,ionizationRateB:2e-14,
  collisionModel:'fixed',backgroundMassU:4,coulombLog:5,energySpreadFraction:.1,pulseWidthS:1e-5,
  ionizationModel:'prescribed',ionizationCrossSectionA:1e-20,ionizationCrossSectionB:1e-20,
};
export interface TransportResult {
  curves:{label:string;x:number[];y:number[];xLabel:string;yLabel:string}[];
  metrics:{label:string;value:number;unit:string}[];
  assumptions:string[];
}
/** Heavy trace-ion collision rate in a light singly charged background, tutorial Eq.8.
 * n is converted SI→cm^-3; masses u, Ti eV. It is not a neutral gas rate.
 */
export function coulombTestIonRate(massU:number,c:TransportConfig):number {
  return 2.3e-7*(c.densityM3/1e6)*c.coulombLog*Math.sqrt(c.backgroundMassU)/(massU*c.temperatureEV**1.5);
}
/** Constant cross section above threshold, Maxwellian electrons. A teaching surrogate,
 * never an empirical ionization-rate fit. Returned coefficient is m³/s.
 */
export function stepIonizationRate(temperatureEV:number,thresholdEV:number,crossSectionM2:number):number {
  if(![temperatureEV,thresholdEV,crossSectionM2].every(Number.isFinite)||temperatureEV<=0||thresholdEV<0||crossSectionM2<0)
    throw new Error('Ionization temperature must be positive; threshold and cross section nonnegative.');
  const electronMass=9.1093837139e-31,x=thresholdEV/temperatureEV;
  if(x>745)return 0;
  return crossSectionM2*Math.sqrt(8*E_CHARGE*temperatureEV/(Math.PI*electronMass))*(1+x)*Math.exp(-x);
}
function validate(c:TransportConfig,mode:TransportMode):void {
  if(!['advection','diffusion','mobility','ionization','transit'].includes(mode))throw new Error('Unknown transport model.');
  for(const [key,value] of Object.entries(c))if(typeof value==='number'&&!Number.isFinite(value))throw new Error(`${key} must be finite.`);
  for(const key of ['massA','massB','temperatureEV','length','duration','beamEV','electronTemperatureEV','backgroundMassU'] as const)
    if(c[key]<=0)throw new Error(`${key} must be positive.`);
  for(const key of ['collisionHz','densityM3','crossSectionM2','thresholdAEV','thresholdBEV','ionizationRateA','ionizationRateB','coulombLog','pulseWidthS','ionizationCrossSectionA','ionizationCrossSectionB'] as const)
    if(c[key]<0)throw new Error(`${key} must be nonnegative.`);
  if(![c.chargeA,c.chargeB].every(z=>Number.isInteger(z)&&z>0))throw new Error('Positive integer charge states required.');
  if(c.energySpreadFraction<0||c.energySpreadFraction>=1)throw new Error('Relative energy half-width must lie in [0,1).');
  if(!['fixed','coulomb-heavy-light'].includes(c.collisionModel))throw new Error('Unknown collision closure.');
  if(!['prescribed','step-cross-section'].includes(c.ionizationModel))throw new Error('Unknown ionization closure.');
  if(c.collisionModel==='coulomb-heavy-light'&&mode!=='ionization'&&mode!=='transit'){
    if(c.chargeA!==1||c.chargeB!==1||Math.min(c.massA,c.massB)<=c.backgroundMassU)
      throw new Error('Heavy-on-light Coulomb closure requires singly charged trace ions heavier than the background species.');
  }
  if(c.collisionModel==='coulomb-heavy-light'&&mode!=='diffusion'&&mode!=='ionization'&&mode!=='transit')
    throw new Error('The Coulomb-frequency convention is supported only for the tutorial diffusion benchmark; use fixed momentum-transfer frequency for drag/mobility.');
  if(mode==='diffusion'&&c.collisionModel==='coulomb-heavy-light'&&c.magneticT===0)throw new Error('Tutorial Eq.8 requires a magnetized plasma.');
  if(mode==='mobility'&&c.collisionHz===0&&c.collisionModel==='fixed')throw new Error('Steady mobility requires a nonzero collision frequency.');
}
/** CDF of flight time for a uniform energy packet, optionally convolved with a
 * uniform emission pulse. No thermal tail, scattering, space charge or finite slit.
 */
export function transitCDF(time:number,massU:number,length:number,beamEV:number,halfWidth:number,pulseWidthS:number):number {
  const C=massU*AMU*length**2/(2*E_CHARGE),emin=beamEV*(1-halfWidth),emax=beamEV*(1+halfWidth);
  const tmin=Math.sqrt(C/emax),tmax=Math.sqrt(C/emin);
  if(halfWidth===0)return pulseWidthS===0?Number(time>=tmin):Math.min(1,Math.max(0,(time-tmin)/pulseWidthS));
  const primitive=(t:number):number=>{
    if(t<=tmin)return 0;
    const u=Math.min(t,tmax);
    // This equivalent expression avoids cancellation at the first arrival.
    const integral=emax*(u-tmin)**2/(u*(emax-emin));
    return integral+Math.max(0,t-tmax);
  };
  if(pulseWidthS>0)return Math.min(1,Math.max(0,(primitive(time)-primitive(time-pulseWidthS))/pulseWidthS));
  if(time<=tmin)return 0;if(time>=tmax)return 1;
  return (emax-C/time**2)/(emax-emin);
}
export function transport(mode:TransportMode,input:Partial<TransportConfig>={}):TransportResult {
  const c={...DEFAULT_TRANSPORT,...input};validate(c,mode);
  const result:TransportResult={curves:[],metrics:[],assumptions:[]};
  const metric=(label:string,value:number,unit:string)=>result.metrics.push({label,value,unit});
  const grid=(max:number)=>Array.from({length:241},(_,i)=>max*i/240);
  const species=[{label:'A',mass:c.massA,charge:c.chargeA},{label:'B',mass:c.massB,charge:c.chargeB}];
  const rates=species.map(s=>c.collisionModel==='fixed'?c.collisionHz:coulombTestIonRate(s.mass,c));
  const omegas=species.map(s=>s.charge*E_CHARGE*c.magneticT/(s.mass*AMU));
  if(mode==='ionization'){
    const coefficients=c.ionizationModel==='prescribed'?[c.ionizationRateA,c.ionizationRateB]:[
      stepIonizationRate(c.electronTemperatureEV,c.thresholdAEV,c.ionizationCrossSectionA),
      stepIonizationRate(c.electronTemperatureEV,c.thresholdBEV,c.ionizationCrossSectionB)];
    species.forEach((s,i)=>{
      const x=grid(c.duration),rate=c.densityM3*coefficients[i];
      result.curves.push({label:s.label,x,y:x.map(t=>-Math.expm1(-rate*t)),xLabel:'Time (s)',yLabel:'Ionized fraction'});
      metric(`${s.label} rate coefficient`,coefficients[i],'m³/s');metric(`${s.label} final ionized fraction`,-Math.expm1(-rate*c.duration),'');
    });
    result.assumptions=[c.ionizationModel==='prescribed'?'User-prescribed rate coefficients; changing Te or thresholds does not change those coefficients.':'Assumed step cross sections Maxwellian-averaged analytically; not measured atomic data.',
      'Constant imposed electron density and temperature; initially neutral independent species; irreversible single ionization only.',
      'No depletion of the electron reservoir, recombination, molecules, multi-charge kinetics, or extraction efficiency.'];
  }else if(mode==='transit'){
    const maximum=Math.max(c.duration,...species.map(s=>Math.sqrt(s.mass*AMU*c.length**2/(2*E_CHARGE*c.beamEV*(1-c.energySpreadFraction)))+c.pulseWidthS))*1.05;
    species.forEach(s=>{
      const x=grid(maximum),root=Math.sqrt(s.mass*AMU*c.length**2/(2*E_CHARGE));
      result.curves.push({label:s.label,x,y:x.map(t=>transitCDF(t,s.mass,c.length,c.beamEV,c.energySpreadFraction,c.pulseWidthS)),xLabel:'Arrival time (s)',yLabel:'Arrived fraction'});
      const mean=2*root/(Math.sqrt(c.beamEV*(1+c.energySpreadFraction))+Math.sqrt(c.beamEV*(1-c.energySpreadFraction)))+c.pulseWidthS/2;
      metric(`${s.label} mean arrival time`,mean,'s');
    });
    result.assumptions=['Ballistic fixed-energy pulse or uniform bounded energy packet; relative spread is energy half-width, not a temperature.',
      'Uniform source pulse convolved analytically with flight-time distribution; same kinetic energy for both masses, not same acceleration voltage.',
      'No collisions, space charge, finite slit transmission, collector rotation, or electrostatic guiding optics.'];
  }else{
    const diffusion=species.map((s,i)=>{
      const nu=rates[i],omega=mode==='mobility'?0:omegas[i],denominator=nu**2+omega**2;
      if(denominator===0)throw new Error('Diffusive/steady closure requires finite collision or gyrofrequency; free unmagnetized motion is ballistic.');
      // Tutorial Eq.8 uses half the random-walk gyro-radius squared times ν.
      // Its ν convention must not silently be equated to Drude momentum relaxation.
      if(c.collisionModel==='coulomb-heavy-light')return .5*E_CHARGE*c.temperatureEV/(s.mass*AMU)*nu/omega**2;
      return E_CHARGE*c.temperatureEV/(s.mass*AMU)*nu/denominator;
    });
    species.forEach((s,i)=>{
      const nu=rates[i],omega=mode==='mobility'?0:omegas[i];
      if(mode!=='diffusion'&&nu===0)throw new Error('Steady drag advection requires collisions; use full orbits for collisionless motion.');
      const mobility=s.charge*E_CHARGE/(s.mass*AMU)*nu/(nu**2+omega**2);
      metric(`${s.label} collision frequency`,nu,'s⁻¹');metric(`${s.label} diffusion coefficient`,diffusion[i],'m²/s');
      if(mode==='diffusion'){
        const rmax=Math.max(1e-6,6*Math.sqrt(2*Math.max(...diffusion)*c.duration)),x=grid(rmax),D=diffusion[i];
        result.curves.push({label:s.label,x,y:x.map(r=>D===0?1:-Math.expm1(-r*r/(4*D*c.duration))),xLabel:'Radius (m)',yLabel:'Probability within radius'});
        metric(`${s.label} RMS radial spread`,Math.sqrt(4*D*c.duration),'m');
      }else{
        const x=grid(c.duration),velocity=mobility*c.electricVM;
        result.curves.push({label:s.label,x,y:x.map(t=>velocity*t),xLabel:'Time (s)',yLabel:'Mean drift displacement (m)'});
        metric(`${s.label} steady drift`,velocity,'m/s');metric(`${s.label} RMS 1D diffusive width`,Math.sqrt(2*diffusion[i]*c.duration),'m');
      }
    });
    result.assumptions=[c.collisionModel==='fixed'?'Same user-prescribed momentum-transfer frequency for each species; no empirical gas-rate calibration.':'Tutorial Eq.8: D=½ρ²νii with ρ=√(eTi/m)/Ω; its Coulomb νii convention differs from Drude momentum relaxation. Density is light-background ion density.',
      mode==='diffusion'?'Infinite-plane guiding-centre diffusive spread, not finite-temperature instantaneous gyro-orbit width; requires times long compared with decorrelation. No wall losses or turbulent transport.':'Established steady Drude drag closure; start-up inertia and boundary/sheath field screening are absent.',
      mode==='mobility'?'Unmagnetized mobility q/(mν), tutorial Eq.9; specified bulk E is assumed accessible.':'Cross-field coefficient ν/(ν²+Ωci²); diffusion needs times long compared with velocity decorrelation.',
      `For diffusion density interpretation require νt≫1; minimum current νt=${Math.min(...rates)*c.duration}.`,
      c.collisionModel==='coulomb-heavy-light'?`Eq.8 requires heavy trace ions and ν/|Ω|≪1; maximum current ratio=${Math.max(...rates.map((n,i)=>n/Math.abs(omegas[i])))}. Not a general unmagnetized closure.`:'The collisionless D=0 limit means zero guiding-centre diffusion, not zero gyro-orbit size.',
      'For heavy-on-light Coulomb scattering in the strongly magnetized limit, the leading heavy-mass dependence cancels: diffusion alone gives little separation.'];
  }
  if(result.curves.some(curve=>[...curve.x,...curve.y].some(v=>!Number.isFinite(v)))||result.metrics.some(m=>!Number.isFinite(m.value)))
    throw new Error('Parameters exceed the finite numerical domain of this reduced model.');
  return result;
}
