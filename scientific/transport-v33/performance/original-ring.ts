import {collideCoulombCell,type CoulombIon,type CoulombScatteringMethod} from './original-coulomb.js';
import type {Vec} from '../../../src/physics.js';

interface RingIon extends CoulombIon {position:Vec}
export interface RingSettings {radius:number;length:number;weight:number;radialCells:number;axialCells:number;radiusBreakM?:number;axialBreakM?:number}
export interface RingCell<T> {ions:T[];densityM3:number;volumeM3:number;radialLowM:number;radialHighM:number;axialLowM:number;axialHighM:number}

function basis(position:Vec){
 if(position.length!==3||!position.every(Number.isFinite))throw new Error('Ring positions must be finite 3D vectors.');
 const r=Math.hypot(position[0],position[1]);
 if(!Number.isFinite(r))throw new Error('Ring radius exceeds the finite numerical domain.');
 // At the measure-zero axis the radial direction is a coordinate convention.
 return r?[position[0]/r,position[1]/r]:[1,0];
}

/** Components in each ion's own orthonormal (r, theta, z) basis. This is a
 * symmetry reduction in physical position, not a gyrophase approximation.
 */
export function cylindricalVelocity(position:Vec,velocity:Vec):Vec{
 const [cos,sin]=basis(position);
 if(velocity.length!==3||!velocity.every(Number.isFinite))throw new Error('Ring velocities must be finite 3D vectors.');
 return [cos*velocity[0]+sin*velocity[1],-sin*velocity[0]+cos*velocity[1],velocity[2]];
}

function edges(count:number,extent:number,point?:number){
 const grid=Array.from({length:count+1},(_,i)=>i*extent/count);grid[count]=extent;
 if(point===undefined)return grid;
 if(!Number.isFinite(point)||point<0||point>extent)throw new Error('Fixed ring interfaces must lie inside their physical interval.');
 const nearest=Math.round(point/extent*count);
 // Use the declared interface exactly; avoid a roundoff-width sliver when it
 // coincides mathematically with a regular grid edge.
 if(point===0||point===extent||(nearest>0&&nearest<count&&Math.abs(grid[nearest]-point)<=32*Number.EPSILON*extent))grid[nearest]=point;
 else {grid.push(point);grid.sort((a,b)=>a-b);}
 return grid;
}

function bin(value:number,grid:number[]){
 let low=0,high=grid.length-1;
 while(high-low>1){const mid=(low+high)>>>1;if(grid[mid]<=value)low=mid;else high=mid;}
 return Math.min(grid.length-2,low);
}

/** Executed faces, including vacuum regions, independent of sampled ions. */
export function axisymmetricGrid(s:Omit<RingSettings,'weight'>){
 if(![s.radius,s.length].every(Number.isFinite)||s.radius<=0||s.length<=0
  ||!Number.isSafeInteger(s.radialCells)||s.radialCells<1||!Number.isSafeInteger(s.axialCells)||s.axialCells<1)
  throw new Error('Ring cells require positive finite geometry and positive integer cell counts.');
 return {radialEdgesM:edges(s.radialCells,s.radius,s.radiusBreakM),axialEdgesM:edges(s.axialCells,s.length,s.axialBreakM)};
}

/** Fixed annular r-z cells for an axisymmetric distribution. Uniform-r cells
 * bound radial shear and pair torque by dr; equal-r² cells would be widest at
 * the axis. Optional declared interfaces add FIXED boundaries, not adaptive
 * support estimates. Density always uses the full physical ring-cell volume.
 */
export function axisymmetricCollisionCells<T extends {position:Vec}>(ions:T[],s:RingSettings):RingCell<T>[]{
 if(!Number.isFinite(s.weight)||s.weight<=0)throw new Error('Ring cells require positive finite representative weight.');
 const {radialEdgesM:radial,axialEdgesM:axial}=axisymmetricGrid(s);
 const nr=radial.length-1,cells=new Map<number,T[]>();
 for(const ion of ions){
  basis(ion.position);const r=Math.hypot(ion.position[0],ion.position[1]),z=ion.position[2];
  if(r>s.radius*(1+64*Number.EPSILON)||z<0||z>s.length)throw new Error('Ring particles must lie inside the finite cylinder.');
  const ir=bin(r,radial),iz=bin(z,axial),key=ir+nr*iz;
  if(!cells.has(key))cells.set(key,[]);cells.get(key)!.push(ion);
 }
 return [...cells].map(([key,group])=>{
  const ir=key%nr,iz=Math.floor(key/nr);
  const radialLowM=radial[ir],radialHighM=radial[ir+1],axialLowM=axial[iz],axialHighM=axial[iz+1];
  const dz=axialHighM-axialLowM;
  const volumeM3=Math.PI*(radialHighM**2-radialLowM**2)*dz,densityM3=group.length*s.weight/volumeM3;
  if(!(volumeM3>0)||!Number.isFinite(densityM3))throw new Error('Ring volume/density exceeds the finite numerical domain.');
  return {ions:group,densityM3,volumeM3,radialLowM,radialHighM,axialLowM,axialHighM};
 });
}

/** The same equal-weight random-pair generator and selected angular law, applied
 * to local cylindrical velocities. Each representative denotes an azimuthal ring. Pair energy and
 * axial momentum are conserved; Cartesian transverse pair momentum is not a
 * symmetry-reduced invariant. Physical angular error is (ra-rb)*deltaPtheta,
 * NOT zero. The observer receives original ions and cylindrical impulse on A.
 */
export function collideAxisymmetricCell<T extends RingIon>(ions:T[],densityM3:number,coulombLog:number,dt:number,random:()=>number,
 onPair?:(a:T,b:T,deltaMomentumA:Vec)=>void,method:CoulombScatteringMethod='takizuka-abe'){
 const local=ions.map(original=>({original,massU:original.massU,chargeState:original.chargeState,
  velocity:cylindricalVelocity(original.position,original.velocity)}));
 const originals=new Map(local.map(ion=>[ion,ion.original]));
 const diagnostics=collideCoulombCell(local,densityM3,coulombLog,dt,random,(a,b,impulse)=>{
  onPair?.(originals.get(a as typeof local[number])!,originals.get(b as typeof local[number])!,impulse);
 },method);
 for(const ion of local){
  const [cos,sin]=basis(ion.original.position),[vr,vt,vz]=ion.velocity;
  ion.original.velocity=[cos*vr-sin*vt,sin*vr+cos*vt,vz];
 }
 return diagnostics;
}
