import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

test('strict test coverage excludes only the recorded historical harness debt',()=>{
 const config=JSON.parse(readFileSync('tsconfig.tests.json','utf8')) as {include:string[];exclude:string[]};
 const debt=JSON.parse(readFileSync('docs/tooling-type-debt.json','utf8')) as {files:Record<string,Record<string,number>>};
 assert.deepEqual(config.include,['tests/**/*.ts'],'new tests must be checked by default');
 assert.deepEqual([...config.exclude].sort(),Object.keys(debt.files).sort(),'exemptions require a diagnostic inventory');
 for(const [file,codes]of Object.entries(debt.files)){
  assert.match(file,/^tests\/.+\.test\.ts$/);assert.ok(existsSync(file),file);
  assert.ok(Object.keys(codes).length>0,file);
  for(const count of Object.values(codes))assert.ok(Number.isSafeInteger(count)&&count>0,file);
 }
});
