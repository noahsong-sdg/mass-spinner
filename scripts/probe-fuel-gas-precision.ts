/** Replay accepted fields only in offline CI; no field/velocity fitting. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {advanceFuelGasMass} from '../src/fuel-gas.js';
const output=process.argv[2];mkdirSync(output);
const source=readFileSync('src/fuel-gas.ts');
const bytes=readFileSync('radial-input/graded-output/histories.json');
const retainedHistoriesSha256=createHash('sha256').update(bytes).digest('hex');
if(retainedHistoriesSha256!=='e765a5cbe85b92f3565dca9d57a661402faa801923a60c11da5c59b3f50b8323')
 throw new Error('Retained graded histories differ from the frozen 93-run receipt.');
const retained=JSON.parse(bytes.toString('utf8'));
const expectedIds=['r8-z32-t256','r16-z32-t256','r32-z32-t256'];
const cases=[];
for(const record of retained.cases){
 if(!expectedIds.includes(record.id))continue;
 const history=record.result,n=record.config.radialCells,initial=history.snapshots[0].lightMass;
 for(const amplitude of [1,1000]){
  let mass=[...initial];const samples=[];
  for(const row of history.snapshots.slice(1)){
   const temperatureK=row.temperatureK.map((t:number)=>record.config.temperatureK+amplitude*(t-record.config.temperatureK));
   const result=advanceFuelGasMass(mass,temperatureK,history.conditions.speciesMassKg[0],row.omegaRadS,
    history.conditions.radiusM,history.conditions.diffusivityM2S,record.config.durationS/record.config.steps);
   mass=result.mass;
   samples.push({temperatureK,omegaRadS:row.omegaRadS,mass,faceTransfers:result.faceTransfers});
  }
  cases.push({id:record.id,amplitude,initial,speciesMassKg:history.conditions.speciesMassKg[0],
   radiusM:history.conditions.radiusM,diffusivityM2S:history.conditions.diffusivityM2S,
   dtS:record.config.durationS/record.config.steps,samples});
 }
}
if(cases.length!==6||expectedIds.some(id=>cases.filter(c=>c.id===id).length!==2))
 throw new Error('Expected exactly three radial replay histories and two declared amplitudes.');
writeFileSync(output+'/precision-input.json',JSON.stringify({sourceHash:createHash('sha256').update(source).digest('hex'),
 retainedSourceHash:retained.sourceHash,retainedHistoriesSha256,cases})+'\n',{flag:'wx'});
