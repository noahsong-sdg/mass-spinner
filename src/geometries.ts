import { AMU, E_CHARGE, step, type Particle, type Vec } from './physics.js';

export type GeometryMode='gyro'|'curved'|'doublewell'|'mirror'|'azimuthal'|'poms';
export interface GeometryConfig {
  massA:number;massB:number;chargeA:number;chargeB:number;magneticT:number;voltage:number;
  temperatureEV:number;beamEV:number;radius:number;length:number;curvatureRadius:number;
  mirrorRatio:number;pitchDeg:number;rotationRadS:number;duration:number;endRadiusRatio:number;dt?:number;
  quadraticShape?:number;canonicalMomentum?:number;plotInnerFraction?:number;
}
export interface GeometryResult {
  curves:{label:string;x:number[];y:number[];xLabel:string;yLabel:string;equalAspect?:boolean}[];
  metrics:{label:string;value:number;unit:string}[];
  assumptions:string[];
}
export const DEFAULT_GEOMETRY:GeometryConfig={massA:40,massB:84,chargeA:1,chargeB:1,
  magneticT:.1,voltage:400,temperatureEV:5,beamEV:20,radius:.48,length:2.8,
  curvatureRadius:2,mirrorRatio:3,pitchDeg:45,rotationRadS:10000,duration:.0006,endRadiusRatio:1.5,dt:2e-8,
  quadraticShape:1,canonicalMomentum:0,plotInnerFraction:0};
const grid=(a:number,b:number,n=200)=>Array.from({length:n+1},(_,i)=>a+(b-a)*i/n);
const speed=(energy:number,mass:number)=>Math.sqrt(2*E_CHARGE*energy/(mass*AMU));
const norm2=(v:Vec)=>v.reduce((sum,x)=>sum+x*x,0);

/** Independently defined reduced Section-II diagnostics, not calibrated devices.
 * Energy inputs are fixed kinetic energies, not Maxwellian temperatures in this module.
 */
export function geometry(mode:GeometryMode,c:GeometryConfig):GeometryResult {
  if(!Object.values(c).every(Number.isFinite))throw new Error('Geometry parameters must be finite.');
  if([c.massA,c.massB,c.magneticT,c.beamEV,c.radius,c.length,c.curvatureRadius,c.duration].some(v=>v<=0)
    ||c.temperatureEV<0||c.mirrorRatio<1||c.endRadiusRatio<1||c.pitchDeg<0||c.pitchDeg>90
    ||(c.dt!==undefined&&c.dt<=0)
    ||![c.chargeA,c.chargeB].every(v=>Number.isInteger(v)&&v>0))throw new Error('Invalid geometry or positive-ion domain.');
  if(!['gyro','curved','doublewell','mirror','azimuthal','poms'].includes(mode))throw new Error('Unknown geometry.');
  if((c.plotInnerFraction??0)<0||(c.plotInnerFraction??0)>=1)throw new Error('The plot inner radius must lie inside the chamber.');
  const result:GeometryResult={curves:[],metrics:[],assumptions:[]};
  const metric=(label:string,value:number,unit:string)=>result.metrics.push({label,value,unit});
  const curve=(label:string,x:number[],y:number[],xLabel:string,yLabel:string,equalAspect=false)=>result.curves.push({label,x,y,xLabel,yLabel,...(equalAspect?{equalAspect:true}:{})});
  const ions=[{label:'A',mass:c.massA,z:c.chargeA},{label:'B',mass:c.massB,z:c.chargeB}];
  for(const ion of ions){
    const {label,mass,z}=ion,m=mass*AMU,q=z*E_CHARGE,omega=q*c.magneticT/m;
    const vperp=speed(c.temperatureEV,mass),vpar=speed(c.beamEV,mass),rho=vperp/omega;
    metric(`${label} cyclotron frequency`,omega/(2*Math.PI),'Hz');
    metric(`${label} reference gyroradius`,rho,'m');
    if(mode==='gyro'){
      // A spatial locus repeats after one own period. A shared slow-species
      // horizon can alias a faster ion into a polygon or line at fixed sampling.
      const times=grid(0,Math.min(c.duration,2*Math.PI/omega),2000);
      curve(`${label} exact gyro-orbit`,times.map(t=>rho*Math.sin(omega*t)),times.map(t=>rho*(Math.cos(omega*t)-1)),'Transverse x (m)','Transverse y (m)',true);
      metric(`${label} axial flight in selected duration`,vpar*c.duration,'m');
    } else if(mode==='curved'){
      // Toroidal B~1/R: curvature and grad-B drifts add for positive ions.
      const drift=m*(vpar*vpar+vperp*vperp/2)/(q*c.magneticT*c.curvatureRadius);
      const s=grid(0,c.length);
      curve(`${label} guiding-centre deflection`,s,s.map(x=>drift*x/vpar),'Arc length (m)','Cross-field deflection (m)');
      metric(`${label} curvature + grad-B drift`,drift,'m/s');
      metric(`${label} rho / curvature radius`,rho/c.curvatureRadius,'');
      metric(`${label} gyroperiods during bend`,omega*c.length/vpar/(2*Math.PI),'');
    } else if(mode==='doublewell'){
      const shape=c.quadraticShape??1,p=(c.canonicalMomentum??0)*q*c.magneticT*c.radius**2;
      // Ptheta = m r vtheta + q B r²/2. Nonzero Ptheta has an infinite axis barrier.
      const r=grid(Math.max(c.plotInnerFraction??0,p===0?0:.01)*c.radius,c.radius,1000);
      const energy=(x:number)=>((x===0?0:(p-q*c.magneticT*x*x/2)**2/(2*m*x*x))
        +q*c.voltage*((x/c.radius)**4-shape*(x/c.radius)**2))/E_CHARGE;
      curve(`${label} effective radial potential`,r,r.map(energy),'Radius (m)','Effective energy (eV)');
      const quadratic=q*q*c.magneticT*c.magneticT/(8*m)-q*c.voltage*shape/(c.radius*c.radius);
      if(p===0){
        const stationary=c.voltage>0&&quadratic<0?Math.min(c.radius,Math.sqrt(-quadratic*c.radius**4/(2*q*c.voltage))):0;
        // Reversed quartics have no interior minimum; compare both chamber ends.
        const minR=energy(c.radius)<energy(stationary)?c.radius:stationary;
        metric(`${label} minimum radius`,minR,'m');
      }
    } else if(mode==='mirror'){
      // ΔU = μ(Bm-B) - m Ω²(rm²-r²)/2. Compare with initial parallel energy.
      const centrifugal=m*c.rotationRadS**2*c.radius**2*(1-c.endRadiusRatio**2)/(2*E_CHARGE);
      const theta=grid(0,90),energy=c.beamEV;
      const margin=(angle:number)=>energy*Math.cos(angle*Math.PI/180)**2
        -energy*Math.sin(angle*Math.PI/180)**2*(c.mirrorRatio-1)-centrifugal;
      curve(`${label} outward mirror escape margin`,theta,theta.map(margin),'Initial pitch angle (deg)','Parallel energy minus barrier (eV)');
      metric(`${label} margin at selected pitch`,margin(c.pitchDeg),'eV');
      metric(`${label} inward centrifugal barrier`,m*c.rotationRadS**2*c.radius**2*(1-1/c.endRadiusRatio**2)/(2*E_CHARGE),'eV');
    } else {
      const core=c.radius/3,inner=c.radius/4,logSpan=Math.log(c.radius/inner);
      const normalization=Math.log((c.radius*c.radius+core*core)/(core*core));
      const potential=(p:Vec)=>{
        const r=Math.hypot(p[0],p[1]);
        return mode==='azimuthal'?c.voltage*Math.log(c.radius/r)/logSpan:
          c.voltage*Math.log((c.radius*c.radius+core*core)/(r*r+core*core))/normalization;
      };
      const evaluate=(p:Vec)=>{
        const r=Math.hypot(p[0],p[1]);
        if(mode==='azimuthal')return {
          electric:[c.voltage*p[0]/(r*r*logSpan),c.voltage*p[1]/(r*r*logSpan),0] as Vec,
          magnetic:[-c.magneticT*c.radius*p[1]/(r*r),c.magneticT*c.radius*p[0]/(r*r),0] as Vec};
        const slope=2*c.voltage/((r*r+core*core)*normalization);
        return {electric:[slope*p[0],slope*p[1],0] as Vec,
          magnetic:[0,0,c.magneticT*Math.exp(-r*r/(2*core*core))] as Vec};
      };
      let p:Particle=mode==='azimuthal'?{position:[(inner+c.radius)/2,0,0],velocity:[0,0,vpar]}:
        {position:[c.radius*(1-1e-9),0,0],velocity:[-vpar,0,0]};
      const total=(s:Particle)=>m*norm2(s.velocity)/2+q*potential(s.position);
      const initial=total(p),scale=Math.max(Math.abs(initial),E_CHARGE*c.beamEV);
      const dt=Math.min(c.dt??Infinity,c.duration/2000,.01/(omega*(mode==='azimuthal'?4:1)),
        .01/Math.sqrt(Math.max(1,Math.abs(q*c.voltage/m)/(core*core))));
      if(c.duration/dt>200000)throw new Error('Geometry orbit exceeds browser step budget; reduce duration or field.');
      const points:Vec[]=[p.position];let maxError=0,t=0;
      for(let i=0;t<c.duration;i++){
        const next=step(p,q/m,Math.min(dt,c.duration-t),evaluate),r=Math.hypot(...next.position.slice(0,2));
        // Exact field integration is interior-only. Boundary crossing is a finite step,
        // not a mesh-resolved collection prediction; keep its first outside sample.
        maxError=Math.max(maxError,Math.abs(total(next)-initial)/scale);
        p=next;t+=dt;
        if(i%8===0)points.push(p.position);
        if(r>c.radius||(mode==='azimuthal'&&(r<inner||p.position[2]>c.length||p.position[2]<0)))break;
      }
      points.push(p.position);
      curve(`${label} ${mode==='azimuthal'?'annular-field orbit':'magnetic-core surrogate orbit'}`,
        points.map(p=>mode==='azimuthal'?p[2]:p[0]),points.map(p=>mode==='azimuthal'?Math.hypot(p[0],p[1]):p[1]),
        mode==='azimuthal'?'Axial z (m)':'Transverse x (m)',mode==='azimuthal'?'Radius (m)':'Transverse y (m)',true);
      metric(`${label} numerical energy residual`,maxError,'');metric(`${label} observed flight`,Math.min(t,c.duration),'s');
    }
  }
  const assumptions:Record<GeometryMode,string[]>={
    gyro:['Exact collisionless monoenergetic gyro-orbits; transverse energy is fixed, not a Maxwellian temperature.','Spatial loci stop after one own gyroperiod per species; sub-period arcs use the selected duration. These are not common-time endpoint comparisons. Axial flight metrics use the full selected duration.','No RF drive, scattering, collector geometry or electron response.'],
    curved:['Guiding-centre curvature plus grad-B drift in an ideal toroidal B∝1/R field.','Requires gyroradius ≪ curvature radius and many gyroperiods in the bend. No self-generated electric field, collisional decorrelation or slit acceptance. At fixed energies drift speed is mass-independent; different transit speeds produce different net deflections.'],
    doublewell:['Exact single-particle radial Hamiltonian U=(Pθ−qBr²/2)²/(2mr²)+qφ, with φ=V[(r/a)⁴−κ(r/a)²]. Pθ is conserved in the prescribed axisymmetric fields.','For nonzero Pθ the axis barrier diverges; the plot starts at r/a≥0.01. Increase the plot inner radius to inspect the wells; this crops the view, not the physical domain. A fixed Pθ slice does not represent a thermal population.','The 2014 double-well proposal requires collisional redistribution and sufficient residence time. This energy landscape predicts neither populated density nor product purity; no transport time is calculated.'],
    mirror:['Adiabatic magnetic moment and imposed common rigid rotation; effective barrier ΔU=μΔB−mΩ²Δ(r²)/2. Positive plotted margin permits end escape; negative margin reflects.','The inward metric uses rm/r=1/(end-radius ratio); the outward curve uses rm/r=end-radius ratio. Magnetic mirror and endpoint radius ratios are independent endpoint specifications, not a complete divergence-consistent field reconstruction.','Pitch angle uses beam-energy input as total kinetic energy in this mode. No pitch-angle scattering, replenishment or full MCMF throughput is modeled.'],
    azimuthal:['Prescribed Bθ=Bwall a/r and φ=V ln(a/r)/ln(a/rinner), rinner=a/4, matching the ideal field laws in §II F / Fig.7.','Full test-particle Lorentz orbit with axial injection into the annulus. No field/current closure, electrons, sheaths or calibrated collection. Integration stops at first stepped boundary crossing.'],
    poms:['Exploratory magnetic-core surrogate: Bz=B0 exp[−r²/(2rc²)], rc=a/3, and a softened logarithmic radial potential with specified axis-to-wall voltage.','This divergence-free ideal field is not a reconstructed POMS azimuthator. The tutorial does not specify enough geometry or electron-response information to reproduce POMS. These trajectories only illustrate magnetic-core deflection.','Radial monoenergetic injection; no spontaneous charge-separation field, thermionic emission, source distribution, collisions or experimental efficiency is predicted.'],
  };
  result.assumptions=assumptions[mode];return result;
}
