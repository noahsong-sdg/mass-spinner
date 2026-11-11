import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupFiniteFilmReference} from '../src/finite-film-ui.js';

const example=(name:string,film:number,back:number)=>({name,filmUm:film,backingUm:back,count:100,seed:3801,energyKeV:100,inputSha256:'a'.repeat(64),
 partition:{filmRetained:10,backingRetained:back?70:0,reflected:10,transmitted:back?10:80},
 intervals95:{filmRetained:[.05,.2],backingRetained:back?[.6,.8]:[0,.04],reflected:[.05,.2],transmitted:back?[.05,.2]:[.7,.9]},
 energy:{incidentEV:1e7,projectileTransferredEV:8e6,escapedProjectileEnergyEV:1999990,unresolvedProjectileEnergyEV:10,stoppedResidualBoundEV:back?80:10,numericalToleranceEV:.001,passed:true}});
const data={schema:1,cases:[example('free',.1,0),example('backing',2,10)],refinement:{passed:true,comparisonCount:8,alpha:.01},
 materialAssumptions:'Uncalibrated LiT; W example inputs.',binarySha256:'b'.repeat(64),limitation:'No live retention kernel is qualified.'};

test('native finite-film reference stays collapsed and shows source-specific partition/uncertainty',()=>{
 const dom=new JSDOM('<div id="host"></div>'),host=dom.window.document.getElementById('host')!;
 const ui=setupFiniteFilmReference(host,data);
 assert.equal(ui.panel.open,false);assert.equal(ui.select.options.length,2);
 assert.match(host.textContent!,/Recorded 100 keV/);assert.match(host.textContent!,/Upstream escape/);assert.match(host.textContent!,/Downstream escape/);
 assert.match(host.textContent!,/Wilson/);assert.match(host.textContent!,/exclude material\/model uncertainty/);
 ui.select.value='backing';ui.select.dispatchEvent(new dom.window.Event('change'));
 assert.match(host.textContent!,/70/);assert.match(host.textContent!,/10 µm W/);assert.match(host.textContent!,/Seed 3801/);
 assert.match(host.textContent!,/Projectile-energy gate: pass/);assert.match(host.textContent!,/no live loading kernel/);
});

test('reference preserves failed energy status and rejects incomplete incident partitions',()=>{
 const dom=new JSDOM('<div id="host"></div>'),host=dom.window.document.getElementById('host')!;
 const failed=structuredClone(data);failed.cases[0].energy.passed=false;setupFiniteFilmReference(host,failed);
 assert.match(host.textContent!,/Projectile-energy gate: fail/);
 const invalid=structuredClone(data);invalid.cases[0].partition.transmitted=79;
 assert.throws(()=>setupFiniteFilmReference(host,invalid),/complete incident partition/);
 assert.throws(()=>setupFiniteFilmReference(host,{...data,schema:0}),/Unsupported/);
});
