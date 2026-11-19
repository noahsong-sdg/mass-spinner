import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync('.github/workflows/verify.yml','utf8');
const jobs=Object.fromEntries([...workflow.matchAll(/^  ([\w-]+):\n([\s\S]*?)(?=^  [\w-]+:\n|$(?![\s\S]))/gm)]
 .map(([,name,body])=>[name,body]));

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
 assert.match(browser,/PLAYWRIGHT_PROJECT: \$\{\{ matrix.project \}\}/);
 assert.match(browser,/--network none --memory 2g --cpus 4/);
 assert.match(browser,/-e PLAYWRIGHT_PROJECT mass-spinner-browser/);
 const commands=browser.split('mass-spinner-browser sh -eu -c')[1].split("\n          '")[0];
 const before=commands.indexOf('npm run release:verify'),tests=commands.indexOf('npm run test:browser -- --project="$PLAYWRIGHT_PROJECT" || status=$?');
 const gate=commands.indexOf('test "$status" -eq 0'),after=commands.lastIndexOf('npm run release:verify');
 assert.ok(before>=0&&before<tests&&tests<gate&&gate<after,'digest verification must surround successful browser tests');
 assert.doesNotMatch(commands,/--(?:grep|shard|retries|timeout|pass-with-no-tests|workers)\b|--project=(?:desktop|phone)\b/);
 assert.doesNotMatch(browser,/continue-on-error:/);
 assert.match(browser,/if: always\(\)/);
 assert.match(browser,/name: browser-evidence-\$\{\{ matrix.project \}\}/);
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
