/** Numerical characterization of one frozen argon experiment, not qualification.
 * Nested cells/clocks only. No point interpolation or background-temperature norm.
 */
import type {simulateFuelSpatialExperiment,FuelSpatialExperimentSnapshot} from './fuel-spatial-experiment.js';
type History=Pick<ReturnType<typeof simulateFuelSpatialExperiment>,'config'|'conditions'|'snapshots'>;
export type SpatialRefinementAxis='radialCells'|'axialCells'|'steps';
const sum=(a:readonly number[])=>a.reduce((s,v)=>s+v,0);
const peak=(a:readonly number[])=>Math.max(...a.map(Math.abs));

/** Shared gates for coupled studies and isolated transport probes. A screen
 * withholds precision claims; it never turns an error into an accepted pass. */
export function classifySpatialConvergence(scale:number,coarseDifference:number,fineDifference:number,representationScreen:number,tolerance:number){
 if([scale,coarseDifference,fineDifference,representationScreen,tolerance].some(v=>!Number.isFinite(v)||v<0)||tolerance===0)
  throw new RangeError('Convergence scoring needs finite nonnegative magnitudes and a positive tolerance.');
 const resolved=tolerance*scale>representationScreen;
 const coarseRelative=resolved?coarseDifference/scale:null,fineRelative=resolved?fineDifference/scale:null;
 const exact=coarseDifference===0&&fineDifference===0;
 const contractionResolved=representationScreen===0||exact||Math.abs(coarseDifference-fineDifference)>representationScreen;
 const contracting=fineDifference<coarseDifference||exact;
 const status=!resolved||!contractionResolved?'unresolved':coarseRelative!==null&&fineRelative!==null&&coarseRelative<tolerance&&fineRelative<tolerance&&contracting?'pass':'fail';
 return {coarseRelative,fineRelative,contracting,status};
}

/** Equal-volume nested shells. Restrict extensive state before intensive fields.
 * The actual fine-grid kinetic energy is retained; mixing Ω does not retain it.
 */
export function restrictSpatialSnapshot(row:FuelSpatialExperimentSnapshot,n:number,number:number):FuelSpatialExperimentSnapshot {
 const m=row.omegaRadS.length,ratio=m/n;
 if(!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(ratio)||ratio<1)throw new RangeError('Nested radial restriction required.');
 if(ratio===1)return row;
 const group=(a:readonly number[],i:number)=>a.slice(i*ratio,(i+1)*ratio);
 const extensive=(a:readonly number[])=>Array.from({length:n},(_,i)=>sum(group(a,i)));
 const densityKgM3=extensive(row.densityKgM3).map(v=>v/ratio);
 const lightMass=extensive(row.lightMass),heavyMass=extensive(row.heavyMass),gasCellEnergyJ=extensive(row.gasCellEnergyJ);
 const inertiaKgM2=extensive(row.inertiaKgM2);
 const omegaRadS=Array.from({length:n},(_,i)=>sum(group(row.omegaRadS,i).map((v,k)=>v*row.inertiaKgM2[i*ratio+k]))/inertiaKgM2[i]);
 const temperatureK=gasCellEnergyJ.map((u,i)=>u/(1.5*1.380649e-23*number*(lightMass[i]+heavyMass[i])/2));
 return {...row,densityKgM3,lightMass,heavyMass,gasCellEnergyJ,omegaRadS,temperatureK,inertiaKgM2,
  radiusM:Array.from({length:n},(_,i)=>row.radiusM.at(-1)!/Math.sqrt((m-.5)/m)*Math.sqrt((i+.5)/n)),
  jouleByGasCellW:extensive(row.jouleByGasCellW),torqueByGasCellNm:extensive(row.torqueByGasCellNm)};
}

export function assessSpatialRefinement(histories:readonly [History,History,History],axis:SpatialRefinementAxis){
 const [a,,c]=histories,base=a.config,n=base.radialCells,steps=base.steps;
 for(let level=0;level<3;level++){
  const h=histories[level];
  if(h.snapshots.length!==h.config.steps+1||h.config.durationS<=0||
   Object.entries(base).some(([k,v])=>k!==axis&&h.config[k as keyof typeof base]!==v)||
   h.config[axis]!==base[axis]*2**level||JSON.stringify(h.conditions)!==JSON.stringify(a.conditions))
   throw new RangeError('Refinement must change exactly one numerical axis at a frozen physical condition.');
 }
 const rows=histories.map(h=>{
  const ratio=h.config.steps/steps;
  return a.snapshots.map((row,i)=>{
   const other=h.snapshots[i*ratio];
   if(!other||other.timeS!==row.timeS)throw new RangeError('Refinement requires identical accepted common clocks.');
   return restrictSpatialSnapshot(other,n,base.numberDensityM3*Math.PI*a.conditions.radiusM**2*a.conditions.lengthM);
  });
 });
 type Metric={name:string;unit:string;shape:'max'|'l1';response:boolean;values:number[][][];representation:boolean};
 const fields:Metric[]=[];
 const add=(name:string,unit:string,get:(row:FuelSpatialExperimentSnapshot)=>number[],response=false,shape:'max'|'l1'='max',representation=false)=>{
  const values=rows.map(history=>history.map(get));
  if(values.flat(2).some(v=>!Number.isFinite(v)))throw new RangeError('Nonfinite convergence observable.');
  fields.push({name,unit,shape,response,values,representation});
 };
 add('angularSpeed','rad/s',r=>r.omegaRadS);
 add('gasTemperatureResponse','K',r=>r.temperatureK,true,'max',true);
 add('linerTemperatureResponse','K',r=>r.linerTemperatureK,true,'max',true);
 add('densityResponse','kg/m³',r=>r.densityKgM3,true,'max',true);
 add('shellAngularMomentum','kg m²/s',r=>r.omegaRadS.map((v,i)=>v*r.inertiaKgM2[i]),false,'l1');
 add('shellInertiaResponse','kg m²',r=>r.inertiaKgM2,true,'l1',true);
 add('outerCurrent','A',r=>[r.electrodeCurrentA]);
 add('projectedJouleHeat','W',r=>r.jouleByGasCellW,false,'l1');
 add('projectedTorque','N m',r=>r.torqueByGasCellNm,false,'l1');
 add('kineticEnergy','J',r=>[r.kineticJ]);
 add('angularMomentum','kg m²/s',r=>[r.angularMomentumKgM2S]);
 // Accepted interval heat is integrated over exactly the same physical intervals.
 const heat=histories.map(h=>{
  const ratio=h.config.steps/steps,values=[0];
  for(let i=1;i<=steps;i++)values.push(sum(h.snapshots.slice((i-1)*ratio+1,i*ratio+1).map(r=>r.intervalGasWallHeatJ)));
  return values;
 });
 if(heat.flat().some(v=>!Number.isFinite(v)))throw new RangeError('Nonfinite accepted interval wall heat.');
 fields.push({name:'intervalWallPower',unit:'W',shape:'max',response:false,representation:false,
  values:heat.map(h=>h.map((v,i)=>[i===0?0:v/(a.snapshots[i].timeS-a.snapshots[i-1].timeS)]))});
 const norm=(v:readonly number[],shape:Metric['shape'])=>shape==='l1'?sum(v.map(Math.abs)):peak(v);
 const tolerance=axis==='steps'?.01:.02;
 const metrics=fields.map(field=>{
  const {values,shape}=field;
  const scale=Math.max(...values.flatMap(history=>history.map(row=>norm(row.map((v,j)=>field.response?v-history[0][j]:v),shape))));
  const differences=[0,1].map(level=>values[level].map((row,i)=>norm(row.map((v,j)=>v-values[level+1][i][j]),shape)));
  const [coarseDifference,fineDifference]=differences.map(peak);
  // Representation sensitivity screen only, NOT a solver-error allowance. It
  // cannot turn a failed metric into a pass; tiny responses stay unassessed.
  const background=field.representation?Math.max(...values.flatMap(h=>h.map(row=>norm(row,shape)))):0;
  const representationScreen=32*Number.EPSILON*(c.config.radialCells/n)*background;
  return {name:field.name,unit:field.unit,scale,coarseDifference,fineDifference,
   ...classifySpatialConvergence(scale,coarseDifference,fineDifference,representationScreen,tolerance),representationScreen,tolerance,
   initialDifference:Math.max(differences[0][0],differences[1][0]),
   worstFineTimeS:a.snapshots[differences[1].indexOf(fineDifference)].timeS};
 });
 return {axis,levels:histories.map(h=>h.config[axis]),sharedClocks:steps+1,
  fineOnlyClocks:c.snapshots.length-(steps+1),metrics,
  allAssessedGatesPass:metrics.every(m=>m.status==='pass'),
  numericallyQualified:false as const,experimentallyQualified:false as const,
  scope:'One frozen condition. Fixed three-cell liner; no solid spatial or fine-only-time qualification. No main-3D promotion.'};
}
