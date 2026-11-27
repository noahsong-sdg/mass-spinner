import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPublicComponents,qualifyPublicComponents} from '../scripts/qualify-public-components.mjs';

test('production component limits produce finite, complete, audited numerical receipts',()=>{
 const report=qualifyPublicComponents(),audit=auditPublicComponents(report);
 assert.equal(audit.rows,60);assert.equal(audit.passed,true);assert.equal(audit.experimentallyQualified,false);
 assert.equal(Object.keys(report.sourceFiles).length,9);
 assert.match(report.interpretation,/discrete BE/);assert.match(report.interpretation,/not full live-model qualification/);
});

test('component receipt audit rejects missing, duplicate, nonfinite, stale, and altered gates/status',()=>{
 const original=qualifyPublicComponents();
 for(const mutate of [
  (r:any)=>{r.rows.pop();},(r:any)=>{r.rows[1]=r.rows[0];},
  (r:any)=>{r.rows[0].actual=NaN;},(r:any)=>{r.rows[0].limit=1e9;},
  (r:any)=>{r.rows[0].error=99;},(r:any)=>{r.rows[0].pass=false;},
  (r:any)=>{r.rows[0].gate='power';},(r:any)=>{r.sourceHash='0'.repeat(64);},
  (r:any)=>{delete r.sourceFiles['src/fuel-current.ts'];},
  (r:any)=>{r.schemaVersion=0;},(r:any)=>{r.numericallyVerified=false;},
  (r:any)=>{r.experimentallyQualified=true;},
 ]){
  const changed=structuredClone(original);mutate(changed);assert.throws(()=>auditPublicComponents(changed));
 }
});
