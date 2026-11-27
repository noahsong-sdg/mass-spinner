import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,relative,resolve} from 'node:path';
import ts from 'typescript';

const workflow=readFileSync('.github/workflows/verify.yml','utf8');
const jobs=Object.fromEntries([...workflow.matchAll(/^  ([\w-]+):\n([\s\S]*?)(?=^  [\w-]+:\n|$(?![\s\S]))/gm)]
 .map(([,name,body])=>[name,body]));

test('browser checkout includes its runtime imports without copying research results',()=>{
 const checkout=jobs.browser.split('      - uses: actions/download-artifact@')[0];
 const sparse=/          sparse-checkout: \|\n((?:            [^\n]+\n)+)/.exec(checkout)?.[1].trim().split(/\n\s*/);
 assert.deepEqual(sparse,['ci','e2e','scripts','src']);
 assert.doesNotMatch(checkout,/sparse-checkout-cone-mode: false/,'cone mode retains root package and configuration files');
 const included=(path:string)=>!path.includes('/')||sparse!.some(directory=>path===directory||path.startsWith(`${directory}/`));
 assert.equal(included('scientific/results.json'),false);assert.equal(included('web-assets/models/centrifuge-assembly.glb'),false);
 const visited=new Set<string>();
 function inspect(path:string){
  if(visited.has(path))return;visited.add(path);
  assert.ok(included(path),`Browser checkout must include ${path}`);
  const source=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
  for(const statement of source.statements){
   if(!ts.isImportDeclaration(statement)||statement.importClause?.isTypeOnly||!ts.isStringLiteral(statement.moduleSpecifier))continue;
   const specifier=statement.moduleSpecifier.text;if(!specifier.startsWith('.'))continue;
   const imported=relative(process.cwd(),resolve(dirname(path),specifier));
   const resolved=[imported,imported.replace(/\.js$/,'.ts')].find(candidate=>existsSync(candidate));
   assert.ok(resolved,`Missing imported file ${imported}`);inspect(resolved);
  }
 }
 for(const path of ['vite.config.mjs','scripts/release-manifest.ts',...readdirSync('e2e').filter(name=>name.endsWith('.spec.ts')).map(name=>`e2e/${name}`)])inspect(path);
 for(const path of ['package.json','package-lock.json','playwright.config.ts','ci/Dockerfile.browser'])assert.ok(included(path),path);
 assert.ok(visited.has('src/equation-derivations.ts'));assert.ok(visited.has('scripts/worker-identity-plugin.mjs'));
});

test('isolated browser projects retain all tests and independent evidence within existing limits',()=>{
 const browser=jobs.browser;
 assert.ok(browser);
 assert.match(browser,/^    needs: verify$/m);
 assert.match(browser,/^    timeout-minutes: 25$/m);
 assert.match(browser,/^      fail-fast: false$/m,'one failed layout must not cancel the other layout');
 const projects=/^        project: \[([^\]]+)\]$/m.exec(browser)?.[1].split(',').map(name=>name.trim());
 const configured=[...readFileSync('playwright.config.ts','utf8').matchAll(/\{name:'([^']+)',use:/g)].map(match=>match[1]);
 assert.deepEqual(projects,['desktop','phone']);
 assert.deepEqual(projects,configured,'every configured browser project must run');
 const shards=/^        shard: \[([^\]]+)\]$/m.exec(browser)?.[1].split(',').map(Number);
 assert.deepEqual(shards,[1,2],'all partitions must run for both layouts');
 assert.match(browser,/PLAYWRIGHT_PROJECT: \$\{\{ matrix.project \}\}/);
 assert.match(browser,/PLAYWRIGHT_SHARD: \$\{\{ matrix.shard \}\}/);
 assert.match(browser,/--network none --memory 2g --cpus 4/);
 assert.match(browser,/-e PLAYWRIGHT_PROJECT -e PLAYWRIGHT_SHARD mass-spinner-browser/);
 const commands=browser.split('mass-spinner-browser sh -eu -c')[1].split("\n          '")[0];
 const before=commands.indexOf('npm run release:verify'),tests=commands.indexOf('npm run test:browser -- --project="$PLAYWRIGHT_PROJECT" --shard="$PLAYWRIGHT_SHARD/2" || status=$?');
 const gate=commands.indexOf('test "$status" -eq 0'),after=commands.lastIndexOf('npm run release:verify');
 assert.ok(before>=0&&before<tests&&tests<gate&&gate<after,'digest verification must surround successful browser tests');
 assert.doesNotMatch(commands,/--(?:grep|retries|timeout|pass-with-no-tests|workers)\b|--project=(?:desktop|phone)\b/);
 assert.equal([...commands.matchAll(/--shard=/g)].length,1,'use only the complete matrix partition');
 assert.doesNotMatch(browser,/continue-on-error:/);
 assert.match(browser,/if: always\(\)/);
 assert.match(browser,/name: browser-evidence-\$\{\{ matrix.project \}\}-\$\{\{ matrix.shard \}\}/);
 assert.match(browser,/playwright-report\/[\s\S]*test-results\//);
 assert.doesNotMatch(browser,/name: verified-site/);
});

test('deployment artifact is admitted only after both browser projects and source checks pass',()=>{
 const qualify=jobs.qualify;
 assert.ok(qualify);
 assert.match(qualify,/^    needs: \[verify, browser\]$/m);
 assert.doesNotMatch(qualify,/^    if:|continue-on-error:|if: always\(\)/m,'artifact admission must retain the default all-needs-success gate');
 const candidate=qualify.indexOf('name: candidate-site'),download=qualify.indexOf('actions/download-artifact@');
 const upload=qualify.indexOf('actions/upload-artifact@'),verified=qualify.indexOf('name: verified-site');
 assert.ok(download>=0&&download<candidate&&candidate<upload&&upload<verified);
 assert.equal([...qualify.matchAll(/path: release\//g)].length,2,'publish the original immutable candidate without a rebuild');
 assert.doesNotMatch(qualify,/\brun:|overwrite:|merge-multiple:/);
 assert.match(qualify,/if-no-files-found: error/);
 assert.deepEqual(Object.keys(jobs).filter(name=>/name: verified-site/.test(jobs[name])),['qualify']);
 const deploy=readFileSync('.github/workflows/deploy.yml','utf8');
 assert.match(deploy,/\.path == "\.github\/workflows\/verify.yml" and \.conclusion == "success"/);
 assert.match(deploy,/name: verified-site\n          path: release\/\n          run-id: \$\{\{ inputs.verify_run_id \}\}/);
});
