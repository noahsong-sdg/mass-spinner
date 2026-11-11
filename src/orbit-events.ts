import type {Destination,Model,Particle,Vec} from './physics.js';
import {polynomialAdd as add,polynomialScale as scale,polynomialShift as shift,
 polynomialMultiply as multiply,polynomialDerivative as derivative,polynomialValue as value,
 polynomialRoots as roots,type Polynomial} from './polynomial-roots.js';

export interface OrbitDrive {timeS:number;amplitudeVM:number;frequencyHz:number;handedness:-1|1}
export interface OrbitAdvance {
 particle:Particle;
 elapsedS:number;
 hit:{destination:Destination;timeS:number;position:Vec}|null;
}

/** Wall equation of the fractional drift–Boris–drift step, normalized by a.
 * DC is an exact rational polynomial. RF uses sin(delta) through degree 7 and
 * cos(delta) through degree 8 about the current phase. validate() requires
 * |omega dt| <= .03 and qm A dt²/a <= .0009: the omitted position term is
 * below 1e-25 a. Candidates are always checked on the actual RF partial step.
 */
function wallPolynomial(p:Particle,qm:number,dt:number,m:Model,drive?:OrbitDrive):Polynomial{
 const a=m.radius,x=p.position[0]/a,y=p.position[1]/a;
 const vx=p.velocity[0]*dt/a,vy=p.velocity[1]*dt/a,b=qm*m.magneticT*dt/2,D=[1,0,b*b];
 const strength=qm*m.voltage*dt*dt/(a*a);
 let ix=scale(shift([x,vx/2]),strength),iy=scale(shift([y,vy/2]),strength);
 if(drive?.amplitudeVM){
  const phase=2*Math.PI*drive.frequencyHz*drive.timeS,d=2*Math.PI*drive.frequencyHz*dt/2;
  const sine=[0,d,0,-(d**3)/6,0,d**5/120,0,-(d**7)/5040];
  const cosine=[1,0,-d*d/2,0,d**4/24,0,-(d**6)/720,0,d**8/40320];
  const c=Math.cos(phase),s=Math.sin(phase),force=qm*drive.amplitudeVM*dt*dt/(2*a);
  ix=add(ix,scale(shift(add(scale(cosine,c),scale(sine,-s))),force));
  iy=add(iy,scale(shift(add(scale(sine,c),scale(cosine,s))),force*drive.handedness));
 }
 const nx=add(scale(D,x),shift(add([vx,b*vy],add(ix,scale(shift(iy),b)))));
 const ny=add(scale(D,y),shift(add([vy,-b*vx],add(iy,scale(shift(ix),-b)))));
 return add(add(multiply(nx,nx),multiply(ny,ny)),scale(multiply(D,D),-1));
}

/** First absorbing contact on the reintegrated numerical path. The caller
 * supplies the actual fractional step and a previously computed full step.
 * Exact tangency absorbs; unresolved floating-point grazing fails explicitly.
 * This refines the numerical event, not the orbit's physical truncation error.
 */
export function locateOrbitEvent(p:Particle,qm:number,dt:number,m:Model,
 at:(elapsedS:number)=>Particle,end:Particle,drive?:OrbitDrive):OrbitAdvance{
 const a=m.radius,z=p.position[2],vz=p.velocity[2];
 let time=vz>0?(m.length-z)/vz:vz<0?-z/vz:Infinity;
 let destination:Destination=vz>0?'end':'source';
 if(time<0||time>dt)time=Infinity;
 // Bound the *numerical* partial-step travel using its ballistic midpoint.
 // Rotation preserves speed, and the two electric kicks add at most qm |E| dt.
 const transverseSpeed=Math.hypot(p.velocity[0],p.velocity[1]);
 const midpointRadius=Math.hypot(p.position[0],p.position[1])+transverseSpeed*dt/2;
 const electricBound=2*Math.abs(m.voltage)*midpointRadius/a**2+(drive?.amplitudeVM??0);
 const travel=dt*(transverseSpeed+Math.abs(qm)*electricBound*dt/2);
 if(a-Math.hypot(p.position[0],p.position[1])<=travel){
  const polynomial=wallPolynomial(p,qm,dt,m,drive),d=derivative(polynomial);
  const candidates=[
   ...roots(d).filter(u=>u>0&&u<1).map(u=>({u,stationary:true})),
   ...roots(polynomial).map(u=>({u,stationary:false})),
  ].sort((u,v)=>u.u-v.u||Number(v.stationary)-Number(u.stationary));
  for(const candidate of candidates){
   const {u,stationary}=candidate,elapsed=u*dt;
   if(elapsed>time)break;
   if(!stationary&&value(d,u)<0)continue;
   const firstNonzero=polynomial.slice(1).find(c=>c!==0);
   if(!stationary&&u===0&&firstNonzero!==undefined&&firstNonzero<0)continue;
   const radius=Math.hypot(...at(elapsed).position.slice(0,2))/a;
   if(stationary&&Math.abs(radius-1)>32*Number.EPSILON)continue;
   if((stationary&&radius!==1)||Math.abs(radius-1)>128*Number.EPSILON)
    throw new Error('Unresolved grazing wall contact: reduce timestep or change grazing initial data.');
   time=elapsed;destination='wall';break;
  }
 }
 if(!Number.isFinite(time))return {particle:end,elapsedS:dt,hit:null};
 const impact=at(time);
 if(destination==='wall'){
  const radius=Math.hypot(impact.position[0],impact.position[1]);
  impact.position=[impact.position[0]*a/radius,impact.position[1]*a/radius,impact.position[2]];
 }else impact.position[2]=destination==='end'?m.length:0;
 return {particle:impact,elapsedS:time,hit:{destination,timeS:time,position:[...impact.position]}};
}
