import type {RunConfig,simulate} from './physics.js';
import {independentSeeds,summarizeEnsemble} from './ensemble.js';
import {coldOrbitDiagnostics} from './rotating-diagnostics.js';
export type OrbitResult=ReturnType<typeof simulate>;
export interface Study {
  kind:'ensemble'|'scan';batches:number;
  parameter:'voltage'|'magneticT'|'massB';minimum:number;maximum:number;points:number;
}
export function studyConfigurations(config:RunConfig,study:Study):{value:number;config:RunConfig}[]{
  if(!Number.isInteger(study.batches)||study.batches<4||study.batches>16)
    throw new Error('Use 4–16 independent seed batches.');
  if(study.kind==='ensemble')return [{value:0,config:{...config}}];
  if(study.kind!=='scan'||!['voltage','magneticT','massB'].includes(study.parameter)
    ||!Number.isFinite(study.minimum)||!Number.isFinite(study.maximum)||study.maximum<=study.minimum
    ||study.minimum<0||!Number.isInteger(study.points)||study.points<3||study.points>9)
    throw new Error('A scan needs 3–9 points in an increasing nonnegative range.');
  if((study.parameter==='massB'||study.parameter==='magneticT')&&study.minimum===0)
    throw new Error('Mass and magnetic-field scans require positive endpoints.');
  if(config.mode==='icr'&&study.parameter==='voltage')throw new Error('ICR uses zero DC potential; scan B or species B mass.');
  return Array.from({length:study.points},(_,i)=>{
    const value=study.minimum+(study.maximum-study.minimum)*i/(study.points-1);
    const next={...config,species:config.species?.map(s=>({...s}))};
    if(study.parameter==='massB'){
      if(!next.species||next.species.length!==2)throw new Error('Mass scans require two explicit species.');
      next.species[1].massU=value;
    }else next[study.parameter]=value;
    return {value,config:next};
  });
}

/** Sequential worker jobs keep the browser responsive and permit cancellation.
 * Identical seeds across scan points pair operating-point comparisons; different
 * batches are independent replicates. No result is published until the study ends.
 */
export async function runOrbitStudy(config:RunConfig,study:Study,signal:AbortSignal,
 compute:(config:RunConfig,signal:AbortSignal)=>Promise<OrbitResult>,
 onProgress:(complete:number,total:number)=>void=()=>{}){
 const points=studyConfigurations(config,study),seeds=independentSeeds(config.seed,study.batches);
 const results=[];let complete=0;
 for(const point of points){
  const runs:OrbitResult[]=[];
  for(const seed of seeds){
   signal.throwIfAborted();
   runs.push(await compute({...point.config,seed},signal));
   signal.throwIfAborted();onProgress(++complete,points.length*seeds.length);
  }
  const coldReference=point.config.mode!=='icr'?coldOrbitDiagnostics(point.config):null;
  results.push({value:point.value,summary:summarizeEnsemble(runs),coldReference});
 }
 return {study:{...study},seeds,points:results};
}
