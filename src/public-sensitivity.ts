import {type FuelConfig} from './fuel-centrifuge.js';
import {type FuelOperation} from './fuel-operation.js';
import {sampleFuelTransport,type FuelTransportResult} from './fuel-transport.js';
import {producingCode,type ProducingCodeIdentity} from './producing-code.js';

export const PUBLIC_SENSITIVITY_COEFFICIENTS={
 dragHz:{label:'Neutral wall drag',unit:'s⁻¹'},
 collisionHz:{label:'Ion–neutral collision rate',unit:'s⁻¹'},
 conductivitySm:{label:'Perpendicular conductivity',unit:'S/m'},
} as const;
type Coefficient=keyof typeof PUBLIC_SENSITIVITY_COEFFICIENTS;
type Accepted={result:{schemaVersion?:number;config:FuelConfig;transport?:FuelTransportResult};producingCode?:ProducingCodeIdentity|null};
// Frozen V97 input nodes, not a claim about the current source or slider neighborhood.
const historical:FuelConfig={pair:'lithium',application:'enrichment',radiusM:.12,lengthM:.8,
 magneticT:.5,currentA:.03,gasK:500,pressurePa:10,ionFraction:.01,collisionHz:1e4,dragHz:2,conductivitySm:1,
 driveInnerFraction:.3,durationS:1,cutFraction:.65,stages:5,feedStage:3,pumpSpeedM3S:.02,conductanceM3S:.05,
 lightFraction:.0759,linerK:1000,linerConductanceWK:.1,lithiumSeed:false,radialDiffusivityM2S:.02,
 fusionMW:1000,burnFraction:.05,loopTimeS:100};
const equal=(a:unknown,b:unknown)=>typeof a==='number'&&typeof b==='number'
 ?Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=8*Number.EPSILON*Math.max(Math.abs(a),Math.abs(b)):a===b;
export function publicInputCoverage(result:Accepted['result']){
 const t=result.transport,o=t?.operation,thermal=o?.thermal as {enabled?:boolean}|undefined;
 const matches=Boolean(t&&o&&Array.isArray(o.events)&&!o.events.length&&thermal?.enabled===false
  &&t.cells===64&&t.steps===512&&[.015,.03,.06].some(x=>equal(result.config.currentA,x))
  &&Object.entries(historical).every(([k,v])=>k==='currentA'||equal(result.config[k as keyof FuelConfig],v)));
 return {historicalInputMatch:matches,experimentallyQualified:false as const,
  numericalQualification:'not-established-for-this-run' as const,
  text:matches?'Matches a previously tested input node; this run has not been independently refined.'
   :'Outside the previously tested input nodes; numerical accuracy for these settings is unqualified.'};
}
export function publicSensitivityPlan(accepted:Accepted,key:Coefficient,lower:number,upper:number){
 if(!Object.hasOwn(PUBLIC_SENSITIVITY_COEFFICIENTS,key))throw new RangeError('Choose a supported prescribed coefficient.');
 const c=accepted.result.config,current=c[key],operation=accepted.result.transport?.operation;
 if(!producingCode(accepted.producingCode)||!operation)throw new RangeError('Sensitivity needs an identified accepted operating history.');
 if(![lower,current,upper].every(Number.isFinite)||lower>current||upper<current||lower<0
  ||key!=='collisionHz'&&lower===0)throw new RangeError('Finite bounds must include the current value; rates must be nonnegative and drag/conductivity positive.');
 const values=[...new Set([lower,current,upper])];
 return {key,values,configs:values.map(value=>({...c,[key]:value})),
  operation:structuredClone({schemaVersion:1,events:operation.events,thermal:operation.thermal}) as FuelOperation,
  clocks:Array.from({length:41},(_,i)=>c.durationS*(i/40)**3),
  interpretation:'User-selected one-coefficient samples, not measured uncertainty, confidence bounds or an exhaustive range.',
  experimentallyQualified:false as const,numericallyQualified:false as const};
}
/** Read only the production coupled trajectory; do not substitute equilibrium samples. */
export function publicSensitivitySample(reply:Accepted,accepted:Accepted,config:FuelConfig,clocks:number[]){
 const source=producingCode(reply.producingCode),base=producingCode(accepted.producingCode),r=reply.result,t=r?.transport;
 const a=accepted.result.transport?.operation,o=t?.operation;
 if(!source||!base||source.sourceHash!==base.sourceHash||r?.schemaVersion!==1||!t||t.schemaVersion!==1
  ||t.coupling!=='angular-momentum-conserving'||t.durationS!==config.durationS||t.radiusM!==config.radiusM
  ||Object.keys(r.config??{}).length!==Object.keys(config).length||!Object.entries(config).every(([k,v])=>r.config[k as keyof FuelConfig]===v)
  ||!a||!o||o.schemaVersion!==1||o.initialCurrentA!==config.currentA
  ||JSON.stringify(o.events)!==JSON.stringify(a.events)||JSON.stringify(o.thermal)!==JSON.stringify(a.thermal))
  throw new RangeError('Sensitivity response does not match the accepted setup, history or producing code.');
 if(clocks.length<2||clocks[0]!==0||clocks.at(-1)!==config.durationS
  ||clocks.some((v,i)=>!Number.isFinite(v)||(i>0&&v<=clocks[i-1])))throw new RangeError('Sensitivity clocks must span the complete run.');
 const history=t.checkpoints??t.snapshots;
 if(!Array.isArray(history)||history.length<2||history[0].timeS!==0||history.at(-1)!.timeS!==config.durationS
  ||history.some((s,i)=>!Number.isFinite(s.timeS)||(i>0&&s.timeS<=history[i-1].timeS)))
  throw new RangeError('Sensitivity trajectory must retain the complete ordered run.');
 const rows=clocks.map(timeS=>{
  const s=sampleFuelTransport(t,timeS),speedMS=s.neutralRadS*config.radiusM,purity=s.collection.innerLightPurity,gasK=s.thermal?.gasK??config.gasK;
  if(!Number.isFinite(speedMS)||!Number.isFinite(gasK)||gasK<=0||purity!==null&&(!Number.isFinite(purity)||purity<0||purity>1))
   throw new RangeError('Nonfinite or nonphysical sensitivity observable.');
  return {timeS,speedMS,purity,gasK};
 });
 return {config:{...config},rows,sourceHash:source.sourceHash,experimentallyQualified:false as const,numericallyQualified:false as const};
}
