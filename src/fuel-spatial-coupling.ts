/** Conditional neutral momentum transport on an equal-volume r² grid.
 * Accepted species mass transfers carry angular momentum. This does not
 * determine those transfers or supply a radial-flow/discharge closure.
 */
import {createFuelMomentumGrid,fuelMomentumState,fuelMomentumHalfResistance,type FuelMomentumGrid,type FuelMomentumEnergy} from './fuel-momentum.js';

export type FuelAdvectedMomentumEnergy=FuelMomentumEnergy&{
 centrifugalWorkJ:number;advectionNumericalLossJ:number;backwardEulerNumericalLossJ:number};
const sum=(values:readonly number[])=>values.reduce((a,b)=>a+b,0);

/** F[i] is accepted kg transferred outward across internal face i during dt.
 * Boundaries are closed. The caller must obtain F from the SAME accepted
 * species transfers used in gas enthalpy and species continuity equations.
 *
 * Kinetic identity: ΔK=Wdrive+Wwall−Qshear−Wcentrifugal−Dadv−DBE.
 * Wcentrifugal is signed gas work. Dadv and DBE are numerical, never heat.
 */
export function advanceFuelAdvectedMomentum(oldGrid:FuelMomentumGrid,oldOmega:readonly number[],
 massTransfersKg:readonly number[],torqueNm:readonly number[],dtS:number){
 const old=createFuelMomentumGrid(oldGrid),n=old.radiusM.length;
 for(const key of ['radiusM','inertiaKgM2','conductance'] as const){
  const expected=old[key],actual=oldGrid[key];
  if(!Array.isArray(actual)||actual.length!==expected.length||actual.some((v,i)=>!Number.isFinite(v)||
   Math.abs(v-expected[i])>64*Number.EPSILON*Math.max(Math.abs(v),Math.abs(expected[i]),Number.MIN_VALUE)))
   throw new RangeError('Momentum grid derived fields must match its geometry, density and viscosity.');
 }
 const before=fuelMomentumState(old,oldOmega),e=old.edgesM;
 const q=Array.from({length:n},(_,i)=>(e[i]**2+e[i+1]**2)/2);
 for(let i=0;i<n-1;i++)if(Math.abs(2*e[i+1]**2-q[i]-q[i+1])>128*Number.EPSILON*Math.max(q[i],q[i+1]))
  throw new RangeError('Conservative centrifugal work requires equal-volume radial-squared cells.');
 if(!Number.isFinite(dtS)||dtS<0||massTransfersKg.length!==n-1||torqueNm.length!==n||
  [...massTransfersKg,...torqueNm].some(v=>!Number.isFinite(v)))
  throw new RangeError('Need finite internal mass transfers, cell torques and a nonnegative timestep.');
 if(dtS===0&&massTransfersKg.some(v=>v!==0))throw new RangeError('A zero-time step cannot transfer mass.');
 const volume=Array.from({length:n},(_,i)=>Math.PI*old.lengthM*(e[i+1]**2-e[i]**2));
 const oldMass=volume.map((v,i)=>v*old.densityKgM3[i]);
 const massKg=oldMass.map((v,i)=>v+(i?massTransfersKg[i-1]:0)-(i<n-1?massTransfersKg[i]:0));
 if(massKg.some(v=>!Number.isFinite(v)||v<=0))throw new RangeError('Accepted transfers must retain positive gas mass in every cell.');
 const density=massKg.map((v,i)=>v===oldMass[i]?old.densityKgM3[i]:v/volume[i]);
 const grid=createFuelMomentumGrid({...old,densityKgM3:density}),I=grid.inertiaKgM2,g=grid.conductance;
 const diagonal=I.map((v,i)=>v+dtS*(g[i]+g[i+1]));
 const lower=Array.from({length:n-1},(_,i)=>-dtS*g[i+1]),upper=[...lower];
 const rhs=oldOmega.map((v,i)=>old.inertiaKgM2[i]*v+dtS*torqueNm[i]);
 rhs[0]+=dtS*g[0]*(grid.innerWallRadS??0);rhs[n-1]+=dtS*g[n]*(grid.outerWallRadS??0);
 for(let i=0;i<n-1;i++){
  const flux=massTransfersKg[i]*e[i+1]**2;
  if(flux>=0){diagonal[i]+=flux;lower[i]-=flux;}
  else{diagonal[i+1]-=flux;upper[i]+=flux;}
 }
 for(let i=1;i<n;i++){
  if(!Number.isFinite(diagonal[i-1])||diagonal[i-1]<=0)throw new RangeError('Advected momentum pivot failed; refine the time step.');
  const factor=lower[i-1]/diagonal[i-1];diagonal[i]-=factor*upper[i-1];rhs[i]-=factor*rhs[i-1];
 }
 if(!Number.isFinite(diagonal[n-1])||diagonal[n-1]<=0)throw new RangeError('Advected momentum pivot failed; refine the time step.');
 const omegaRadS=Array<number>(n);omegaRadS[n-1]=rhs[n-1]/diagonal[n-1];
 for(let i=n-2;i>=0;i--)omegaRadS[i]=(rhs[i]-upper[i]*omegaRadS[i+1])/diagonal[i];
 const after=fuelMomentumState(grid,omegaRadS),centWorkJByCell=Array<number>(n).fill(0),shearHeatJByCell=Array<number>(n).fill(0);
 let centrifugalWorkJ=0,advectionNumericalLossJ=0;
 for(let i=0;i<n-1;i++){
  const work=.25*massTransfersKg[i]*(q[i+1]-q[i])*(omegaRadS[i]**2+omegaRadS[i+1]**2);
  centrifugalWorkJ+=work;centWorkJByCell[i]+=work/2;centWorkJByCell[i+1]+=work/2;
  advectionNumericalLossJ+=.5*Math.abs(massTransfersKg[i])*e[i+1]**2*(omegaRadS[i+1]-omegaRadS[i])**2;
  const heat=dtS*g[i+1]*(omegaRadS[i+1]-omegaRadS[i])**2;
  const left=fuelMomentumHalfResistance(grid,i,i+1);
  const right=fuelMomentumHalfResistance(grid,i+1,i+1);
  shearHeatJByCell[i]+=heat*left/(left+right);shearHeatJByCell[i+1]+=heat*right/(left+right);
 }
 const innerWallTorqueNm=g[0]*((grid.innerWallRadS??0)-omegaRadS[0]);
 const outerWallTorqueNm=g[n]*((grid.outerWallRadS??0)-omegaRadS[n-1]);
 shearHeatJByCell[0]+=dtS*g[0]*((grid.innerWallRadS??0)-omegaRadS[0])**2;
 shearHeatJByCell[n-1]+=dtS*g[n]*((grid.outerWallRadS??0)-omegaRadS[n-1])**2;
 const backwardEulerNumericalLossJ=sum(oldOmega.map((v,i)=>.5*old.inertiaKgM2[i]*(omegaRadS[i]-v)**2));
 const increment:FuelAdvectedMomentumEnergy={driveWorkJ:dtS*sum(torqueNm.map((v,i)=>v*omegaRadS[i])),
  wallWorkJ:dtS*(innerWallTorqueNm*(grid.innerWallRadS??0)+outerWallTorqueNm*(grid.outerWallRadS??0)),
  shearHeatJ:sum(shearHeatJByCell),numericalLossJ:advectionNumericalLossJ+backwardEulerNumericalLossJ,
  driveImpulseKgM2S:dtS*sum(torqueNm),wallImpulseKgM2S:dtS*(innerWallTorqueNm+outerWallTorqueNm),
  centrifugalWorkJ,advectionNumericalLossJ,backwardEulerNumericalLossJ};
 const angularResidualKgM2S=after.angularMomentumKgM2S-before.angularMomentumKgM2S-increment.driveImpulseKgM2S-increment.wallImpulseKgM2S;
 const energyResidualJ=after.kineticJ-before.kineticJ-increment.driveWorkJ-increment.wallWorkJ+
  increment.shearHeatJ+increment.centrifugalWorkJ+increment.numericalLossJ;
 if(!Object.values(increment).every(Number.isFinite)||!Number.isFinite(angularResidualKgM2S)||!Number.isFinite(energyResidualJ))
  throw new RangeError('Advected momentum exceeds the finite energy domain.');
 return {grid,omegaRadS,...after,massKg,increment,centWorkJByCell,shearHeatJByCell,
  innerWallTorqueNm,outerWallTorqueNm,angularResidualKgM2S,energyResidualJ};
}
