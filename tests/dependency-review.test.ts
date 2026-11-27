import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDependencies} from '../scripts/check-dependencies.ts';

test('dependency review rejects new advisories, incomplete graphs and expired exceptions',()=>{
 const url='https://github.com/advisories/GHSA-example',audit={vulnerabilities:{parser:{via:[{name:'parser',url,severity:'high'}]}}};
 const reviews={'GHSA-example':{package:'parser',upstream:url,expires:'2026-12-01',reason:'bounded test'}};
 assert.throws(()=>checkDependencies(audit,{},new Date('2026-11-17')),/Unreviewed/);
 assert.deepEqual(checkDependencies(audit,reviews,new Date('2026-11-17')),['GHSA-example']);
 assert.throws(()=>checkDependencies(audit,reviews,new Date('2026-12-01')),/expired/);
 assert.throws(()=>checkDependencies({vulnerabilities:{child:{via:['missing']}}},reviews),/Incomplete/);
});
