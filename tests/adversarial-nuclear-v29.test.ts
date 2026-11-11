import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam,dtCrossSectionM2} from '../src/fusion-reactor.ts';
import {litStoppingCrossSection} from '../src/deuteron-stopping.ts';
import {simulateTargetLoading} from '../src/target-loading.ts';
import {mercury197GroundStateBatch,HG197_HALF_LIFE_HOURS} from '../src/blanket-reference.ts';
import {JSDOM} from 'jsdom';
import {setupBlanketExplorer} from '../src/blanket-ui.js';

const evidence:any={scope:'Independent audit witnesses, not measured Marathon qualification'};
const relative=(a:number,b:number)=>Math.abs(a-b)/Math.max(Math.abs(a),Math.abs(b),1e-300);

test('constant-energy cold-target attenuation and particle-current conversion',()=>{
 const r=simulateFusionBeam({...DEFAULT_FUSION_BEAM,stoppingFraction:0});
 const expected=-Math.expm1(-r.config.targetColumnM2*dtCrossSectionM2(60));
 assert.ok(relative(r.fusionProbability,expected)<1e-12);
 assert.ok(relative(r.neutronRateS,r.config.beamCurrentA/1.602176634e-19*expected)<1e-12);
 evidence.constantEnergy={probability:r.fusionProbability,crossSectionBarn:dtCrossSectionM2(60)/1e-28};
});

test('mean product powers agree with independent angular two-body quadrature',()=>{
 const r=simulateFusionBeam({...DEFAULT_FUSION_BEAM,stoppingFraction:0});
 // Integer nuclear masses are the declared production approximation. Construct
 // velocities explicitly and integrate uniformly in CM cos(theta), independently
 // of production's .56/.44 energy-partition coefficients.
 const mD=2,mT=3,mN=1,mA=4,E=100,Q=17600;
 const vCM=Math.sqrt(2*mD*E)/(mD+mT),internal=Q+E*mT/(mD+mT);
 const p=Math.sqrt(2*internal/(1/mN+1/mA));
 let neutron=0,alpha=0;const n=2000;
 for(let i=0;i<n;i++){
  const mu=-1+2*(i+.5)/n;
  neutron+=.5*mN*(vCM*vCM+(p/mN)**2+2*vCM*p/mN*mu)/n;
  alpha+=.5*mA*(vCM*vCM+(p/mA)**2-2*vCM*p/mA*mu)/n;
 }
 const rateEnergy=r.neutronRateS*1000*1.602176634e-19;
 assert.ok(relative(r.neutronPowerW/rateEnergy,neutron)<2e-12);
 assert.ok(relative(r.alphaPowerW/rateEnergy,alpha)<2e-12);
 assert.ok(Math.abs(neutron+alpha-Q-E)<1e-8);
 assert.ok(Math.abs(r.relativeEnergyResidual!)<1e-12);
 evidence.kinematics={meanNeutronKeV:neutron,meanAlphaKeV:alpha,qualification:'isotropic-CM integer-mass nonrelativistic mean only'};
});

test('stopping is positive across declared domain and isotope changes are nuclear only',()=>{
 const values=[];
 for(let i=0;i<=200;i++){
  const E=(.5/.6)*(500/(.5/.6))**(i/200),a=litStoppingCrossSection(E),b=litStoppingCrossSection(E,6,2);
  assert.ok(a.electronicKeVM2>0&&a.nuclearKeVM2>0&&a.totalKeVM2>0);
  assert.equal(a.electronicKeVM2,b.electronicKeVM2);
  assert.equal(a.totalKeVM2,a.electronicKeVM2+a.nuclearKeVM2);
  if(i%50===0)values.push({E,...a});
 }
 evidence.stopping=values;
});

test('zero-T loaded target has exactly zero DT yield; this is not a total-neutron prediction',()=>{
 const source={config:{targetColumnM2:0,beamAreaM2:.01,exposureS:10},siteColumnM2:1e22,
  unitLoadingOpticalDepth:1e-5,particleRateS:1e15};
 const r=simulateTargetLoading(source,{replacementProbability:1});
 assert.equal(r.final.deuteriumFraction,1);
 assert.equal(r.final.neutronRateS,0);
 assert.equal(r.final.cumulativeNeutrons,0);
 assert.ok(r.assumptions.some(x=>x.includes('D–D reactions')));
 evidence.DTOnlyWitness={deuteriumFraction:r.final.deuteriumFraction,DTNeutronRateS:r.final.neutronRateS,
  qualification:'D-D and D-Li rates and heat are not calculated; no claim of zero physical neutron emission'};
});

test('quantify declared-paper and NUBASE2020 Hg197 dataset discrepancy without silently changing replay',()=>{
 const current=64.93,delta=.07;
 const rows=[64.14,100,336,500].map(hours=>{
  const code=mercury197GroundStateBatch(hours),hg=Math.exp(-Math.LN2*hours/current);
  const au=1-hg,lo=1-Math.exp(-Math.LN2*hours/(current+delta)),hi=1-Math.exp(-Math.LN2*hours/(current-delta));
  assert.ok(relative(code.mercury197,Math.exp(-Math.LN2*hours/HG197_HALF_LIFE_HOURS))<1e-15);
  return {hours,codeHalfLifeHours:HG197_HALF_LIFE_HOURS,codeGoldFraction:code.gold197,nubaseGoldFraction:au,
   goldAbsoluteDifference:code.gold197-au,goldRelativeDifference:(code.gold197-au)/au,
   remainingHgRelativeDifference:(code.mercury197-hg)/hg,nubaseHalfLifeUncertaintyGoldRange:[lo,hi]};
 });
 assert.ok(rows.every(x=>x.goldAbsoluteDifference>0));
 evidence.decayDatasetSensitivity=rows;
});

test('decay dataset qualification stays in closed model info and preserves paper values',()=>{
 const dom=new JSDOM('<main></main>');
 const previous=globalThis.document;globalThis.document=dom.window.document;
 try{
  setupBlanketExplorer(document.querySelector('main'));
  const note=[...document.querySelectorAll('p')].find(p=>p.textContent?.includes('Decay inputs retain legacy'));
  assert.ok(note);const details=note.closest('details');assert.ok(details);
  assert.equal(details.querySelector('summary')?.textContent,'Model info');assert.equal(details.open,false);
  assert.match(note.textContent!,/64\.14\(5\).*64\.93\(7\)/);
  assert.equal(note.querySelectorAll('a').length,2);assert.equal(HG197_HALF_LIFE_HOURS,64.14);
 }finally{globalThis.document=previous;dom.window.close();}
});

test('opaque fusion-only survivors retain resolved final rate after one target-inventory dose',()=>{
 const cases=[1e16,1e20].map(tau=>{
  const source={config:{targetColumnM2:1,beamAreaM2:1,exposureS:1},siteColumnM2:1,
   unitLoadingOpticalDepth:tau,particleRateS:1};
  const r=simulateTargetLoading(source,{replacementProbability:0,intervals:10});
  assert.ok(relative(r.final.tritiumFraction*tau,Math.LN2)<1e-12);
  assert.ok(relative(r.final.neutronRateS,.5)<1e-12);
  assert.ok(r.final.tritiumFraction>0&&r.final.vacancyFraction>=0);
  return {tau,finalOpticalDepth:r.final.tritiumFraction*tau,neutronRateS:r.final.neutronRateS};
 });
 evidence.opaqueSurvivor=cases;
});

test('opaque crossover neighbors and ordinary thin fusion-only outputs agree with analytic survivor law',()=>{
 for(const [tau,dose]of [[1e16,1-Number.EPSILON/2],[1e16,1+Number.EPSILON],
  [1e-5,.01],[1e-5,10],[.1,1],[1,1],[10,1]]){
  const r=simulateTargetLoading({config:{targetColumnM2:1,beamAreaM2:1,exposureS:dose},
   siteColumnM2:1,unitLoadingOpticalDepth:tau,particleRateS:1},{replacementProbability:0,intervals:10});
  const expected=tau<100?Math.log1p(Math.expm1(tau)*Math.exp(-tau*dose)):
   Math.log1p(Math.exp(tau*(1-dose)));
  assert.equal(r.final.timeS,dose);
  assert.ok(relative(r.final.tritiumFraction*tau,expected)<2e-11);
  assert.ok(relative(r.final.neutronRateS,-Math.expm1(-expected))<2e-11);
  assert.ok(Math.abs(r.final.tritiumResidualNuclei)<1e-14);
  assert.ok(Math.abs(r.final.incidentResidualNuclei)<1e-14);
 }
});

test('retain exact audited production source identities',()=>{
 evidence.sourceSHA256=Object.fromEntries(['fusion-reactor.ts','deuteron-stopping.ts','target-loading.ts','fusion-playground.ts','blanket-reference.ts','component-catalog.ts'].map(name=>[name,createHash('sha256').update(readFileSync(`src/${name}`)).digest('hex')]));
 if(process.env.AUDIT29_EVIDENCE)writeFileSync(process.env.AUDIT29_EVIDENCE,JSON.stringify(evidence,null,2)+'\n');
});
