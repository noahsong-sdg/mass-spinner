// Bosch–Hale (1992), table VII; SI conversion and equations cross-checked
// against PlasmaPy's published fusion_reactivity implementation. See LAURELIN-MODEL.md.
const KEV=1.602176634e-16,MEV=1.602176634e-13,MD=3.3435837724e-27,MU0=4e-7*Math.PI;
export const LAURELIN_DEFAULTS=Object.freeze({densityM3:1e22,temperatureKeV:1,speedKmS:200,
 compression:8,durationUs:200,confinementUs:500,driverEfficiency:.8,recoveryEfficiency:.8,
 frequencyHz:1,parasiticKW:10,radiusM:.22,lengthM:1.4});
export const PULSE_PHASES=['Form','Merge','Compress','Hold','Recover'];
const BOUNDS={densityM3:[1e20,1e24],temperatureKeV:[.2,10],speedKmS:[0,600],compression:[1,30],
 durationUs:[25,1000],confinementUs:[10,10000],driverEfficiency:[.1,1],recoveryEfficiency:[0,1],
 frequencyHz:[.1,100],parasiticKW:[0,1000],radiusM:[.05,1],lengthM:[.2,5]};
export function ddReactivity(temperatureKeV,branch){
 if(!['neutron','proton'].includes(branch))throw new RangeError('Unknown D–D branch');
 if(!Number.isFinite(temperatureKeV)||temperatureKeV<.2||temperatureKeV>100)return null;
 const T=temperatureKeV,[c1,c2,c3,c5]=branch==='neutron'
  ?[5.43360e-12,5.85778e-3,7.68222e-3,-2.96400e-6]
  :[5.65718e-12,3.41267e-3,1.99167e-3,1.05060e-5];
 const theta=T/(1-T*c2/(1+T*(c3+T*c5))),xi=Math.cbrt(31.397**2/(4*theta));
 return c1*theta*Math.sqrt(xi/(937814*T**3))*Math.exp(-3*xi)*1e-6;
}
function advanceEnergy(U,power,a,dt){
 const x=a*dt;
 if(Math.abs(x)<1e-7){
  const e1=1+x/2+x*x/6+x*x*x/24,e2=.5+x/6+x*x/24+x*x*x/120;
  return {U:U*Math.exp(x)+power*dt*e1,integral:U*dt*e1+power*dt*dt*e2};
 }
 const next=U*Math.exp(x)+power*Math.expm1(x)/a;
 return {U:next,integral:(next-U-power*dt)/a};
}
function phaseAt(f){return f<.12?0:f<.32?1:f<.56?2:f<.76?3:4;}
function volumeRatio(f,C){
 if(f<.32)return 1;
 if(f<.56)return Math.exp(-Math.log(C)*(f-.32)/.24);
 if(f<.76)return 1/C;
 return Math.exp(-Math.log(C)*(1-f)/.24);
}
export function simulateLaurelin(input={},steps=500){
 const c={...LAURELIN_DEFAULTS,...input};
 for(const [key,[lo,hi]] of Object.entries(BOUNDS))if(!Number.isFinite(c[key])||c[key]<lo||c[key]>hi)
  throw new RangeError(`${key} must be in [${lo}, ${hi}]`);
 if(!Number.isInteger(steps)||steps<100||steps>4000||steps%25)throw new RangeError('Use 100–4000 steps, divisible by 25 to resolve phase boundaries');
 const duration=c.durationUs*1e-6,tau=c.confinementUs*1e-6,dt=duration/steps;
 const V0=4*Math.PI*c.radiusM**2*(c.lengthM/2)/3,N=c.densityM3*V0;
 const initialJ=3*N*c.temperatureKeV*KEV,mergeJ=.5*N*MD*(c.speedKmS*1000)**2;
 let U=initialJ,compressionJ=0,expansionJ=0,lossJ=0,neutrons=0,protons=0,unsupported=0;
 const samples=[];
 const sample=(f)=>{
  const volumeM3=V0*volumeRatio(f,c.compression),temperatureKeV=U/(3*N*KEV),densityM3=N/volumeM3;
  const rn=ddReactivity(temperatureKeV,'neutron'),rp=ddReactivity(temperatureKeV,'proton');
  return {fraction:f,timeUs:f*c.durationUs,phase:phaseAt(f),volumeM3,temperatureKeV,densityM3,
   energyJ:U,radiusM:c.radiusM*Math.sqrt(volumeM3/V0),
   // beta=1 pressure-balance field, not a solved FRC equilibrium or coil field.
   balanceFieldT:Math.sqrt(2*MU0*(2*densityM3*temperatureKeV*KEV)),
   neutronRateS:rn===null?null:.5*densityM3**2*volumeM3*rn,
   protonRateS:rp===null?null:.5*densityM3**2*volumeM3*rp};
 };
 samples.push(sample(0));
 for(let i=0;i<steps;i++){
  const f=i/steps,m=(i+.5)/steps,phase=phaseAt(m),dlog=phase===2?-Math.log(c.compression)/(.24*duration):phase===4?Math.log(c.compression)/(.24*duration):0;
  const power=phase===1?mergeJ/(.2*duration):0,a=-2*dlog/3-1/tau;
  const half=advanceEnergy(U,power,a,dt/2),saved=U;U=half.U;
  const middle=sample(m);U=saved;
  const next=advanceEnergy(U,power,a,dt),work=-2*dlog*next.integral/3;
  U=next.U;lossJ+=next.integral/tau;
  if(work>=0)compressionJ+=work;else expansionJ-=work;
  const endpoint=sample((i+1)/steps);
  // Each constant-coefficient thermal segment is monotone: endpoints bound T.
  if(samples.at(-1).neutronRateS===null||middle.neutronRateS===null||endpoint.neutronRateS===null)unsupported++;
  else{neutrons+=middle.neutronRateS*dt;protons+=middle.protonRateS*dt;}
  samples.push(endpoint);
 }
 const chargedJ=unsupported?null:(protons*4.03+neutrons*.82)*MEV;
 const neutronJ=unsupported?null:neutrons*2.45*MEV;
 const driverJ=(initialJ+mergeJ+compressionJ)/c.driverEfficiency;
 const recoveredJ=c.recoveryEfficiency*expansionJ,parasiticJ=c.parasiticKW*1000/c.frequencyHz;
 const burnFraction=unsupported?null:2*(neutrons+protons)/N;
 const diagnosticValid=!unsupported&&burnFraction<.01&&chargedJ/(initialJ+mergeJ+compressionJ)<.1;
 return {config:c,samples,initialJ,mergeJ,compressionJ,expansionJ,lossJ,remainingJ:U,driverJ,recoveredJ,
  parasiticJ,netNonfusionJ:recoveredJ-driverJ-parasiticJ,chargedJ,neutronJ,
  neutrons:unsupported?null:neutrons,protons:unsupported?null:protons,burnFraction,unsupportedSteps:unsupported,
  diagnosticValid,energyResidualJ:initialJ+mergeJ+compressionJ-expansionJ-lossJ-U,
  // Deliberately do not credit fusion energy to electricity: that coupling is unsolved.
  fusionElectricityJ:null};
}
