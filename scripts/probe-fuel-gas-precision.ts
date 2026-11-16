/** Replay accepted fields only in offline CI; no field/velocity fitting. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {advanceFuelGasMass} from '../src/fuel-gas.js';
const output=process.argv[2];mkdirSync(output);
const source=readFileSync('src/fuel-gas.ts');
const retained=JSON.parse(readFileSync('radial-input/graded-output/histories.json','utf8'));
const cases=[];
for(const record of retained.cases){
 if(record.config.axialCells!==32||record.config.steps!==256)continue;
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
if(cases.length!==6)throw new Error('Expected exactly three radial replay histories and two declared amplitudes.');
writeFileSync(output+'/precision-input.json',JSON.stringify({sourceHash:createHash('sha256').update(source).digest('hex'),
 retainedSourceHash:retained.sourceHash,cases})+'\n',{flag:'wx'});
