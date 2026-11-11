import {readFileSync,writeFileSync} from 'node:fs';
import {validateExperiment} from '../src/experimental-validation.js';

const args=process.argv.slice(2),[casePath,predictionsPath,outputPath]=args.length===2?[args[0],undefined,args[1]]:args;
if(!casePath||!outputPath||![2,3].includes(args.length))throw new Error('Usage: tsx scripts/validate-experiment.ts CASE.json PREDICTIONS.json OUTPUT.json; or BUNDLE.json OUTPUT.json');
if(outputPath===casePath||outputPath===predictionsPath)throw new Error('Output must not overwrite an input artifact.');
const input=JSON.parse(readFileSync(casePath,'utf8'));
const report=predictionsPath?validateExperiment(input,JSON.parse(readFileSync(predictionsPath,'utf8'))):validateExperiment(input.case,input.predictions);
writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(`${report.status}: ${report.heldoutCount} held-out and ${report.calibrationCount} calibration residuals. ${report.reasons.join(' ')}`);
