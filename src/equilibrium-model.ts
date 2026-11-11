import {centrifuge,type CentrifugeConfig} from './centrifuge.js';
import {solveBinaryBulk} from './centrifuge-bulk.js';
import {gaussianCentrifuge} from './gaussian-centrifuge.js';
import {magneticCentrifuge} from './magnetic-centrifuge.js';
export interface EquilibriumConfig extends CentrifugeConfig {
 closure?:'corotating'|'gaussian'|'magnetic-gaussian';compositionBoundary?:'central'|'bulk';bulkFractionA?:number;
 magneticT?:number;densityWidthM?:number;axisDensityM3?:number;
 magneticBoundary?:'axis'|'wall';
}

/** Legacy requests retain their common-corotation/central-composition closure. */
export function solveEquilibrium(config:EquilibriumConfig){
 if(config.closure!==undefined&&!['corotating','gaussian','magnetic-gaussian'].includes(config.closure))throw new Error('Unknown equilibrium closure.');
 if(config.compositionBoundary!==undefined&&!['central','bulk'].includes(config.compositionBoundary))throw new Error('Unknown composition boundary.');
 const solve=(axisA?:number,axisB?:number,magnetic=true)=>{
  const next={...config,species:config.species.map((s,i)=>({...s,
   axisFraction:axisA===undefined?s.axisFraction:i===0?axisA:axisB!}))};
  const shaped={...next,magneticT:config.magneticT!,densityWidthM:config.densityWidthM!,axisDensityM3:config.axisDensityM3!};
  return config.closure==='magnetic-gaussian'&&magnetic?magneticCentrifuge({...shaped,magneticBoundary:config.magneticBoundary??'axis'})
   :['gaussian','magnetic-gaussian'].includes(config.closure??'')?gaussianCentrifuge(shaped):centrifuge(next);
 };
 if(config.compositionBoundary==='bulk'){
  if(config.species.length!==2)throw new Error('Bulk-composition inversion requires two species.');
  // Equal-charge Gaussian composition is independent of B. Invert it before
  // applying the magnetic boundary: a pure endpoint trial may be pressure-
  // incompatible even when the requested mixture has a regular solution.
  const inverse=solveBinaryBulk((a,b)=>solve(a,b,false),config.bulkFractionA!);
  const result=config.closure==='magnetic-gaussian'?solve(inverse.axisFractionA,inverse.axisFractionB):inverse.result;
  return {...result,composition:{boundary:'bulk' as const,targetFractionA:inverse.targetBulkFractionA,
   actualFractionA:inverse.actualBulkFractionA,residual:inverse.residual}};
 }
 return {...solve(),composition:{boundary:'central' as const}};
}
