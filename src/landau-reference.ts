/** Offline, isotropic homogeneous Rosenbluth finite-volume reference candidate.
 * Independent of the stochastic pair map. Number-conservative and positive;
 * energy is NOT projected: its truncation defect must be measured and refined.
 * No spatial transport, drift/anisotropy, electrons, or magnetic closure.
 */
const E=1.602176634e-19,U=1.66053906660e-27,EPS=8.8541878128e-12;
export interface LandauSpecies {massU:number;charge:number;densityM3:number;temperatureEV:number}
export interface LandauReferenceConfig {
 species:LandauSpecies[];coulombLog:number;durationS:number;dtS:number;bins:number;
 velocityScaleMS:number;maximumScaledSpeed:number;sampleEvery?:number;
}
export const DEFAULT_LANDAU_REFERENCE:LandauReferenceConfig={
 species:[{massU:40,charge:1,densityM3:5e17,temperatureEV:2},
  {massU:84,charge:1,densityM3:5e17,temperatureEV:10}],
 coulombLog:12,durationS:1e-3,dtS:5e-7,bins:256,
 velocityScaleMS:3500,maximumScaledSpeed:8,sampleEvery:100,
};
const sum=(v:number[])=>v.reduce((s,x)=>s+x,0);
function bernoulli(w:number){
 if(Math.abs(w)<1e-4)return 1-w/2+w*w/12-w**4/720;
 if(w>700)return 0;
 return w/Math.expm1(w);
}
function solveTridiagonal(lower:number[],diagonal:number[],upper:number[],rhs:number[]){
 const d=[...diagonal],r=[...rhs],n=d.length;
 for(let i=1;i<n;i++){
  const ratio=lower[i]/d[i-1];d[i]-=ratio*upper[i-1];r[i]-=ratio*r[i-1];
 }
 const f=Array(n).fill(0);f[n-1]=r[n-1]/d[n-1];
 for(let i=n-2;i>=0;i--)f[i]=(r[i]-upper[i]*f[i+1])/d[i];
 if(f.some(x=>!Number.isFinite(x)||x<0))throw new Error('Landau reference left the finite positive domain.');
 return f;
}
function potentials(f:number[],dx:number){
 const n=f.length,m2=[0],m4=[0],tail=Array(n+1).fill(0);
 for(let i=0;i<n;i++){
  const l=i*dx,r=(i+1)*dx;
  m2.push(m2[i]+f[i]*(r**3-l**3)/3);
  m4.push(m4[i]+f[i]*(r**5-l**5)/5);
 }
 for(let i=n-1;i>=0;i--){const l=i*dx,r=(i+1)*dx;tail[i]=tail[i+1]+f[i]*(r*r-l*l)/2;}
 return Array.from({length:n+1},(_,i)=>{
  const x=i*dx;
  return i===0?{diffusion:8*Math.PI/3*tail[0],drag:0}:
   {diffusion:8*Math.PI/3*(m4[i]/x**3+tail[i]),drag:8*Math.PI*m2[i]/x**2};
 });
}

export function simulateLandauReference(config:LandauReferenceConfig){
 const c=structuredClone(config),{species:ss,bins:n,velocityScaleMS:scale,dtS:dt,durationS:duration}=c;
 if(ss.length<1||ss.length>4||!Number.isInteger(n)||n<16||n>2048
  ||![scale,c.maximumScaledSpeed,dt,duration,c.coulombLog].every(x=>Number.isFinite(x)&&x>0)
  ||duration/dt>200000||n*ss.length**2*Math.ceil(duration/dt)>1e8
  ||ss.some(s=>![s.massU,s.densityM3,s.temperatureEV].every(x=>Number.isFinite(x)&&x>0)
   ||!Number.isInteger(s.charge)||s.charge<1))
  throw new Error('Landau reference requires a finite positive, bounded isotropic case.');
 const stride=c.sampleEvery??Math.max(1,Math.ceil(duration/dt/100));
 if(!Number.isSafeInteger(stride)||stride<1)throw new Error('Landau sample stride must be a positive integer.');
 const densityScale=Math.max(...ss.map(s=>s.densityM3)),dx=c.maximumScaledSpeed/n;
 const volume=Array.from({length:n},(_,i)=>4*Math.PI*((i+1)**3-i**3)*dx**3/3);
 const energyWeight=Array.from({length:n},(_,i)=>4*Math.PI*((i+1)**5-i**5)*dx**5/5);
 // Cell averages from independent 8-panel Simpson quadrature. The signed
 // normalization defect includes both tail truncation and quadrature error.
 const initialNormalizationDefect:number[]=[];
 let distributions=ss.map(s=>{
  const variance=E*s.temperatureEV/(s.massU*U*scale**2),prefactor=s.densityM3/densityScale/(2*Math.PI*variance)**1.5;
  const f=volume.map((vol,i)=>{
   let integral=0;const h=dx/8;
   for(let j=0;j<=8;j++){
    const x=i*dx+j*h;integral+=(j===0||j===8?1:j%2?4:2)*4*Math.PI*x*x*prefactor*Math.exp(-x*x/(2*variance));
   }
   return integral*h/(3*vol);
  });
  const mass=sum(f.map((x,i)=>x*volume[i])),target=s.densityM3/densityScale;
  if(!Number.isFinite(mass)||mass<=0)throw new Error('Initial velocity distribution is not resolved on this finite grid.');
  initialNormalizationDefect.push(1-mass/target);return f.map(x=>x*target/mass);
 });
 const initial=distributions.map(f=>[...f]);
 const densities=(f:number[][])=>f.map(v=>sum(v.map((x,i)=>x*volume[i]))*densityScale);
 const energies=(f:number[][])=>f.map((v,k)=>sum(v.map((x,i)=>x*energyWeight[i]))*ss[k].massU*U*scale**2*densityScale/2);
 const initialDensity=densities(distributions),initialEnergy=sum(energies(distributions));
 if(!Number.isFinite(initialEnergy)||initialEnergy<=0||initialDensity.some(x=>!Number.isFinite(x)||x<=0))
  throw new Error('Landau physical moment scales exceed the finite numerical domain.');
 let maxEnergyResidual=0,maxNumberResidual=0;
 const history:{timeS:number;temperaturesEV:number[];energyResidual:number;numberResidual:number}[]=[];
 const record=(timeS:number)=>{
  const density=densities(distributions),energy=energies(distributions);
  if([...density,...energy].some(x=>!Number.isFinite(x)||x<=0))
   throw new Error('Landau physical moments exceed the finite positive domain.');
  const energyResidual=(sum(energy)-initialEnergy)/initialEnergy;
  const numberResidual=Math.max(...density.map((x,i)=>Math.abs(x/initialDensity[i]-1)));
  maxEnergyResidual=Math.max(maxEnergyResidual,Math.abs(energyResidual));maxNumberResidual=Math.max(maxNumberResidual,numberResidual);
  history.push({timeS,temperaturesEV:energy.map((x,i)=>2*x/(3*E*density[i])),energyResidual,numberResidual});
 };
 record(0);let time=0,steps=0;
 while(time<duration){
  const step=Math.min(dt,duration-time),pots=distributions.map(f=>potentials(f,dx));
  distributions=distributions.map((f,a)=>{
   const alpha=Array(n+1).fill(0),beta=Array(n+1).fill(0);
   for(let j=1;j<n;j++){
    let diffusion=0,drag=0;
    ss.forEach((b,k)=>{
     const ma=ss[a].massU*U,coefficient=(ss[a].charge*b.charge*E**2/EPS)**2*c.coulombLog/(8*Math.PI*ma**2)*densityScale/scale**3;
     diffusion+=coefficient*pots[k][j].diffusion;
     drag+=coefficient*ss[a].massU/b.massU*pots[k][j].drag;
    });
    const w=drag*dx/diffusion,multiplier=4*Math.PI*(j*dx)**2*diffusion/dx*step;
    alpha[j]=multiplier*bernoulli(-w);beta[j]=multiplier*bernoulli(w);
   }
   const diagonal=volume.map((v,i)=>v+beta[i+1]+alpha[i]);
   return solveTridiagonal(volume.map((_,i)=>-beta[i]),diagonal,
    volume.map((_,i)=>-alpha[i+1]),f.map((x,i)=>x*volume[i]));
  });
  time=Math.min(duration,time+step);steps++;
  if(steps%stride===0||time===duration)record(time);
 }
 const stationarityL1=distributions.map((f,k)=>sum(f.map((x,i)=>Math.abs(x-initial[k][i])*volume[i]))/(ss[k].densityM3/densityScale));
 return {model:'isotropic-rosenbluth-fv-candidate' as const,config:c,steps,history,
  speedMS:volume.map((_,i)=>(i+.5)*dx*scale),
  distributionPerVelocityVolume:distributions.map(f=>f.map(x=>x*densityScale/scale**3)),
  distributionUnit:'s^3/m^6',initialNormalizationDefect,maxEnergyResidual,maxNumberResidual,stationarityL1,
  finiteTimeReferenceAccepted:false,
  assumptions:['Isotropic spatially homogeneous closed velocity-space collision problem; no drift, field, electrons or separator geometry.',
   'Rosenbluth coefficients use piecewise-constant distribution moments and are lagged one backward-Euler step. Face flux is exponential-fit finite volume.',
   'Zero flux at v=0 and the supplied finite maximum speed. The signed initial normalization defect includes finite-tail truncation and quadrature error; the initial distribution is renormalized.',
   'Species number is conserved and positivity is retained. Total energy is not projected or exactly conserved by this discretization; its defect must converge.',
   'This independently derived candidate is not the conservative DG algorithm of Shiroto et al. and has no accepted reference status until independent review and accuracy gates.'],
  sources:['https://arxiv.org/html/2011.13086','https://doi.org/10.1016/j.jcp.2021.110813']};
}
