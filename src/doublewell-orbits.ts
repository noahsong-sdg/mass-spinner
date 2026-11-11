import {polynomialAdd,polynomialScale,polynomialShift,polynomialMultiply,polynomialValue,polynomialDerivative,polynomialRoots} from './polynomial-roots.js';
import {AMU,E_CHARGE,step,type Fields,type IonSpecies,type Model,type Particle,type Vec,type Destination} from './physics.js';

export interface DoublewellModel extends Model { quadraticShape:number }
export interface DoublewellAdvance {
 particle:Particle;
 elapsedS:number;
 hit:{destination:Destination;timeS:number;position:Vec}|null;
}

/** Prescribed laboratory potential. There is no centrifugal term in E. */
export function quarticPotential(position:Vec,model:Pick<DoublewellModel,'radius'|'voltage'|'quadraticShape'>):number{
 const s=(position[0]**2+position[1]**2)/model.radius**2;
 return model.voltage*(s*s-model.quadraticShape*s);
}

export function quarticFields(position:Vec,model:DoublewellModel):Fields{
 const r2=position[0]**2+position[1]**2;
 const slope=2*model.voltage/model.radius**2*(model.quadraticShape-2*r2/model.radius**2);
 return {electric:[slope*position[0],slope*position[1],0],magnetic:[0,0,model.magneticT]};
}

/** Total laboratory H in joules, including the signed electrostatic energy. */
export function doublewellEnergy(particle:Particle,species:IonSpecies,model:DoublewellModel):number{
 return species.massU*AMU*particle.velocity.reduce((sum,v)=>sum+v*v,0)/2
  +species.chargeState*E_CHARGE*quarticPotential(particle.position,model);
}

/** Canonical angular momentum about z, in kg m²/s, symmetric gauge. */
export function canonicalMomentum(particle:Particle,species:IonSpecies,model:DoublewellModel):number{
 const [x,y]=particle.position,[vx,vy]=particle.velocity;
 return species.massU*AMU*(x*vy-y*vx)+species.chargeState*E_CHARGE*model.magneticT*(x*x+y*y)/2;
}

/** Call once per species/configuration, before an ensemble advance loop. */
export function validateDoublewellOrbitSettings(species:IonSpecies,dt:number,model:DoublewellModel):void{
 const {radius:a,length,magneticT,voltage,quadraticShape:k}=model;
 if(![a,length,magneticT,voltage,k,dt,species.massU,species.chargeState].every(Number.isFinite)
  ||a<=0||length<=0||voltage<0||k<0||dt<=0||species.massU<=0||!Number.isSafeInteger(species.chargeState)||species.chargeState<=0)
  throw new Error('Invalid double-well orbit inputs.');
 const qm=species.chargeState*E_CHARGE/(species.massU*AMU);
 const rate=Math.max(Math.abs(qm*magneticT),Math.sqrt(qm*voltage*(12+2*k)/a**2));
 if(dt*rate>.08)throw new Error('Double-well timestep must resolve gyro and electric-field curvature rates.');
}

/** Exact wall polynomial for the synchronized partial Boris step in this
 * uniform-B, quartic-E model. Positions are normalized by the wall radius.
 * With u=t/dt and b=qm B dt/2, the denominator is D=1+b²u². Electric impulse
 * at the ballistic midpoint is degree four in u; position numerators are degree
 * six. Nx²+Ny²-D² is therefore a degree-at-most-twelve wall equation.
 */
function wallPolynomial(p:Particle,qm:number,dt:number,m:DoublewellModel){
 const a=m.radius,x=p.position[0]/a,y=p.position[1]/a,vx=p.velocity[0]*dt/a,vy=p.velocity[1]*dt/a;
 const mx=[x,vx/2],my=[y,vy/2],b=qm*m.magneticT*dt/2,D=[1,0,b*b];
 const r2=polynomialAdd(polynomialMultiply(mx,mx),polynomialMultiply(my,my));
 const slope=polynomialAdd([m.quadraticShape],polynomialScale(r2,-2));
 const strength=qm*m.voltage*dt*dt/(a*a);
 const ix=polynomialScale(polynomialShift(polynomialMultiply(slope,mx)),strength);
 const iy=polynomialScale(polynomialShift(polynomialMultiply(slope,my)),strength);
 const nx=polynomialAdd(polynomialScale(D,x),polynomialShift(polynomialAdd([vx,b*vy],polynomialAdd(ix,polynomialScale(polynomialShift(iy),b)))));
 const ny=polynomialAdd(polynomialScale(D,y),polynomialShift(polynomialAdd([vy,-b*vx],polynomialAdd(iy,polynomialScale(polynomialShift(ix),-b)))));
 const result=polynomialAdd(polynomialAdd(polynomialMultiply(nx,nx),polynomialMultiply(ny,ny)),polynomialScale(polynomialMultiply(D,D),-1));
 // Fractional impact projection can leave a few coordinate ulps on the wall.
 // Snap only this surface invariant, so an inward reflected launch is not
 // mistaken for a new outgoing crossing of a tiny positive roundoff offset.
 if(Math.abs(Math.hypot(x,y)-1)<=16*Number.EPSILON)result[0]=0;
 return result;
}

/** One synchronized drift–Boris–drift step, with absorbing events located on
 * the reintegrated fractional step instead of interpolating velocities.
 * Wall roots are isolated from the actual numerical path; axial motion is
 * exactly ballistic. These are numerical contacts, not exact physical orbits;
 * timestep convergence is still required.
 * The caller validates settings once with validateDoublewellOrbitSettings and
 * provides finite particles inside the cylinder. Periodic axial mode leaves z
 * unwrapped; its caller owns periodic wrapping.
 */
export function advanceDoublewell(particle:Particle,species:IonSpecies,dt:number,
 model:DoublewellModel,axialBoundary:'absorbing'|'periodic'='absorbing'):DoublewellAdvance{
 const {radius:a,length,voltage,quadraticShape:k}=model;
 const qm=species.chargeState*E_CHARGE/(species.massU*AMU);
 const at=(time:number)=>time===0?particle:step(particle,qm,time,p=>quarticFields(p,model));
 const end=at(dt);
 // Until a hypothetical first wall contact, |E| <= 2V(k+2)/a. Magnetic
 // force does no work. This overestimates all transverse travel in the step.
 const travel=dt*(Math.hypot(...particle.velocity)+qm*2*voltage*(k+2)/a*dt);
 const wallExcluded=a-Math.hypot(particle.position[0],particle.position[1])>travel;
 const axialExcluded=axialBoundary==='periodic'||(end.position[2]>0&&end.position[2]<length
  &&!(particle.position[2]===0&&particle.velocity[2]<0)
  &&!(particle.position[2]===length&&particle.velocity[2]>0));
 if(wallExcluded&&axialExcluded)return {particle:end,elapsedS:dt,hit:null};
 const hits:{destination:Destination;time:number}[]=[];
 if(axialBoundary==='absorbing'){
  const vz=particle.velocity[2],z=particle.position[2];
  const time=vz>0?(length-z)/vz:vz<0?-z/vz:Infinity;
  if(time>=0&&time<=dt)hits.push({destination:vz>0?'end':'source',time});
 }
 if(!wallExcluded){
  const polynomial=wallPolynomial(particle,qm,dt,model),derivative=polynomialDerivative(polynomial);
  // Multiple wall roots can disappear in coefficient roundoff even though
  // the reintegrated path touches the wall. Check stationary candidates on
  // that path directly. An unresolved sub-ulp near miss must fail explicitly,
  // rather than being arbitrarily converted to either collection or survival.
  const candidates=[
   ...polynomialRoots(derivative).filter(t=>t>0&&t<1).map(fraction=>({fraction,stationary:true})),
   ...polynomialRoots(polynomial).map(fraction=>({fraction,stationary:false})),
  ].sort((u,v)=>u.fraction-v.fraction||Number(v.stationary)-Number(u.stationary));
  for(const {fraction,stationary} of candidates){
   // Later hypothetical motion is irrelevant after the first actual exit.
   if(hits.length&&fraction*dt>hits[0].time)break;
   if(stationary){
    const r=Math.hypot(...at(fraction*dt).position.slice(0,2))/a;
    if(Math.abs(r-1)>32*Number.EPSILON)continue;
    if(r!==1)throw new Error('Unresolved grazing wall contact: reduce timestep or change grazing initial data.');
    hits.push({destination:'wall',time:fraction*dt});break;
   }
   const direction=polynomialValue(derivative,fraction);
   // Roots approached from outside are reentries, not first wall encounters.
   if(direction<0)continue;
   if(fraction===0){
    const first=polynomial.slice(1).find(v=>v!==0);
    if(first!==undefined&&first<0)continue;
   }
   const r=Math.hypot(...at(fraction*dt).position.slice(0,2))/a;
   if(Math.abs(r-1)>128*Number.EPSILON)
    throw new Error('Unresolved grazing wall contact: reduce timestep or change grazing initial data.');
   hits.push({destination:'wall',time:fraction*dt});break;
  }
 }
 if(hits.length){
   hits.sort((u,v)=>u.time-v.time);
   const hit=hits[0],impact=at(hit.time);
   // Put the returned coordinate exactly on the declared absorbing surface.
   // The projection is at most the root solve's roundoff, not a chord repair.
   if(hit.destination==='wall'){
    const r=Math.hypot(impact.position[0],impact.position[1]);
    impact.position=[impact.position[0]*a/r,impact.position[1]*a/r,impact.position[2]];
   }else impact.position[2]=hit.destination==='end'?length:0;
   return {particle:impact,elapsedS:hit.time,hit:{destination:hit.destination,timeS:hit.time,position:[...impact.position]}};
 }
 return {particle:end,elapsedS:dt,hit:null};
}
