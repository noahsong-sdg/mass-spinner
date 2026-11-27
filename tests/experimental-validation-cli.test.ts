import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('actual comparison CLI supports declared no-fit studies, blocks leakage and preserves old output',t=>{
 const dir=mkdtempSync(join(tmpdir(),'no-fit-cli-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const model={name:'TEST-only model',version:'1',sourceSha256:'a'.repeat(64)};
 const data={schemaVersion:1,id:'TEST-only no-fit case',source:{kind:'measured',citation:'Manufactured contract fixture; not an experiment'},expectedModel:model,
  design:{kind:'a-priori',protocol:{citation:'TEST-only protocol declaration',sourceSha256:'b'.repeat(64)},inputEvidence:'TEST-only assumed inputs'},
  acceptance:{maxStandardizedResidual:3,maxNumericalErrorFraction:.25},
  conditions:[{id:'unfitted',split:'heldout',settings:{magneticT:.1},measurements:[{observable:'speed',unit:'m/s',value:10,standardUncertainty:1}]}]};
 const predictions={schemaVersion:1,caseId:data.id,model,convergence:{established:true,evidence:'TEST-only convergence declaration'},calibratedOn:[] as string[],
  conditions:[{id:'unfitted',settings:{magneticT:.1},series:[{observable:'speed',unit:'m/s',values:[10],predictiveStandardUncertainty:[0],numericalErrorBound:[.1]}]}]};
 const bundle=join(dir,'bundle.json');
 const run=(output:string)=>spawnSync(process.execPath,['--import','tsx','scripts/validate-experiment.ts',bundle,output],{encoding:'utf8',timeout:30000});
 const save=()=>writeFileSync(bundle,JSON.stringify({case:data,predictions}));
 save();const output=join(dir,'valid.json'),accepted=run(output);
 assert.equal(accepted.status,0,accepted.stderr);
 const report=JSON.parse(readFileSync(output,'utf8'));assert.equal(report.status,'consistent');assert.equal(report.calibrationCount,0);
 assert.match(report.interpretation,/declarations.*do not show that inputs preceded exposure to measurements/);
 const original=readFileSync(output);assert.notEqual(run(output).status,0);assert.deepEqual(readFileSync(output),original);
 predictions.calibratedOn=['unfitted'];save();const blocked=join(dir,'blocked.json');
 assert.equal(run(blocked).status,0);assert.equal(JSON.parse(readFileSync(blocked,'utf8')).status,'blocked');
 predictions.calibratedOn=[];delete (data as {design?:unknown}).design;save();const legacy=join(dir,'legacy.json');
 assert.equal(run(legacy).status,0);assert.match(JSON.parse(readFileSync(legacy,'utf8')).reasons.join(' '),/calibration condition/);
});
