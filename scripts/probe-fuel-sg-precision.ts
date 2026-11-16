/** Captures for an independent high-precision CELL-SG oracle. */
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {advanceFuelGasMass} from '../src/fuel-gas.js';
const output=process.argv[2],cases=[];
for(const n of [2,8,32])for(const profile of ['uniform','gradient','pressure-equilibrium','depleted'])
 for(const dtS of [0,1e-20,.01,1e8])for(const omegaRadS of [0,3e5]){
 const temperatureK=Array.from({length:n},(_,i)=>1000+(profile==='gradient'?1e-8:profile==='pressure-equilibrium'?700:0)*i/(n-1));
 const raw=temperatureK.map((t,i)=>profile==='pressure-equilibrium'?1/t:profile==='depleted'?(i===0?1:0):1);
 const total=raw.reduce((a,b)=>a+b,0),mass=raw.map(v=>v/total),speciesMassKg=7*1.66053906892e-27,radiusM=.01;
 for(const diffusivityM2S of [0,1e-30,.001]){
  let native;
  try{native={...advanceFuelGasMass(mass,temperatureK,speciesMassKg,omegaRadS,radiusM,diffusivityM2S,dtS),failure:null};}
  catch(error){native={failure:String(error)};}
  cases.push({id:`${n}-${profile}-${dtS}-${omegaRadS}-${diffusivityM2S}`,mass,temperatureK,omegaRadS,speciesMassKg,radiusM,diffusivityM2S,dtS,native});
 }
}
const sourceFiles=Object.fromEntries(['scripts/probe-fuel-sg-precision.ts','src/fuel-gas.ts','package-lock.json']
 .map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(output+'/sg-precision-input.json',JSON.stringify({schemaVersion:1,sourceFiles,cases})+'\n');
console.log(JSON.stringify({sgCases:cases.length,failures:cases.filter(c=>c.native.failure).map(c=>({id:c.id,failure:c.native.failure}))}));
if(cases.some(c=>c.native.failure))process.exitCode=1;
