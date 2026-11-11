import test from 'node:test';
import assert from 'node:assert/strict';
import {section3Coverage} from '../src/failure-catalog.js';

test('the Section III failure inventory covers every actual A–K heading without claiming complete coupled physics',()=>{
 assert.deepEqual(section3Coverage.map(s=>s.subsection),Array.from({length:11},(_,i)=>`III ${String.fromCharCode(65+i)}`));
 assert.equal(section3Coverage.at(-1)?.title,'Ion throughput');
 for(const row of section3Coverage){
  assert.ok(['partial','diagnostic','omitted'].includes(row.status));
  assert.ok(row.title.length>0);
  for(const key of ['mechanism','iic','iid','nextRequirement'] as const)assert.ok(row[key].length>30);
  assert.ok(row.currentEvidence.length>0);
 }
 // Prevent a reference card or a supplied cross section from being relabeled
 // as a charge-changing collision operator in the coupled simulation.
 const cx=section3Coverage.find(s=>s.subsection==='III D')!;
 assert.equal(cx.status,'omitted');assert.match(cx.iid,/preserve/);
});
