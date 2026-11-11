import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.js';
import {fusionPlaygroundData} from '../src/fusion-playground.js';

test('material energy scan reports unsupported tail points without discarding a valid selected source',()=>{
 const source=simulateFusionBeam({...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg',
  materialColumnM2:1e23,targetColumnM2:1e23});
 const view=fusionPlaygroundData(source);
 assert.ok(source.exitEnergyKeV>.5/.6);
 assert.ok(view.excludedEnergiesKeV.includes(20));
 assert.ok(!view.excludedEnergiesKeV.includes(source.config.beamEnergyKeV));
 assert.ok(view.curves[0].x.includes(source.config.beamEnergyKeV));
 assert.ok(view.curves.every(c=>c.x.length===c.y.length&&c.y.every(Number.isFinite)));
 assert.ok(view.profiles.slice(0,3).every(c=>c.xLabel==='Fraction of fixed material column'));
});

test('current changes source strength and power together, while spot area changes heat but not source count',()=>{
 const a=simulateFusionBeam(DEFAULT_FUSION_BEAM);
 const current=simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamCurrentA:2*DEFAULT_FUSION_BEAM.beamCurrentA});
 const spot=simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamAreaM2:DEFAULT_FUSION_BEAM.beamAreaM2/2});
 assert.equal(current.neutronRateS,2*a.neutronRateS);assert.equal(current.beamPowerW,2*a.beamPowerW);
 assert.equal(current.beamGain,a.beamGain);assert.equal(spot.neutronRateS,a.neutronRateS);
 assert.equal(spot.targetLayerHeatFluxWM2,2*a.targetLayerHeatFluxWM2);
 assert.ok(Math.abs(fusionPlaygroundData(spot).spotRadiusM/fusionPlaygroundData(a).spotRadiusM-1/Math.sqrt(2))<1e-15);
});
test('specific yield includes efficiency; beam-off and empty-target outputs retain their distinct limits',()=>{
 const a=fusionPlaygroundData(simulateFusionBeam(DEFAULT_FUSION_BEAM));
 const b=fusionPlaygroundData(simulateFusionBeam({...DEFAULT_FUSION_BEAM,acceleratorEfficiency:.4}));
 assert.equal(b.curves[1].y[4],a.curves[1].y[4]/2);assert.deepEqual(a.curves[0].y,b.curves[0].y);
 const off=fusionPlaygroundData(simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamCurrentA:0}));
 assert.equal(off.metrics[0][1],0);assert.equal(off.metrics[5][1],null);
 const empty=fusionPlaygroundData(simulateFusionBeam({...DEFAULT_FUSION_BEAM,targetColumnM2:0}));
 assert.ok(empty.curves[0].y.every(p=>p===0));assert.equal(empty.metrics[0][1],0);
 assert.ok(empty.curves.every(c=>c.yDomain[0]===0&&c.yDomain[1]>0));
});
test('energy scans include the actual selected operating point and survival has a physical 0–1 scale',()=>{
 const r=simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamEnergyKeV:115}),p=fusionPlaygroundData(r);
 assert.equal(p.curves[0].selectedX,115);const i=p.curves[0].x.indexOf(115);
 assert.ok(i>=0);assert.equal(p.curves[0].y[i],r.fusionProbability);
 assert.deepEqual(p.profiles[0].yDomain,[0,1]);
 const baseline=simulateFusionBeam(DEFAULT_FUSION_BEAM);assert.ok(Math.abs(baseline.beamGain!-176*baseline.fusionProbability)<1e-15);
});
