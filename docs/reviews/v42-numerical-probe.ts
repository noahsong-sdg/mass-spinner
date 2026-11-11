import assert from 'node:assert/strict';
import {centrifuge} from '../../src/centrifuge.ts';
import {centrifugeDiagnostics} from '../../src/centrifuge-diagnostics.ts';
import {simulateFusionBeam,DEFAULT_FUSION_BEAM} from '../../src/fusion-reactor.ts';
import {fusionPlaygroundData} from '../../src/fusion-playground.ts';
import {simulateTargetLoading} from '../../src/target-loading.ts';

// Diagnostic witnesses, not corrected-behavior regression tests.
const config={radius:.1,rotationRadS:2e4,ionTemperatureEV:10,electronTemperatureEV:10,
 species:[{massU:40,chargeState:1,axisFraction:.5},{massU:84,chargeState:1,axisFraction:.5}],bins:2000};
const coarse=centrifuge(config),fineBins=Math.min(2000,config.bins*2),fine=centrifuge({...config,bins:fineBins});
const a=centrifugeDiagnostics(coarse),b=centrifugeDiagnostics(fine);
const delta=Math.max(...a.volumeMeanIonDensities.map((n,i)=>Math.abs(n-b.volumeMeanIonDensities[i])));
assert.equal(fineBins,config.bins);assert.equal(delta,0);
console.log(JSON.stringify({witness:'finest-grid self-comparison',coarseBins:config.bins,fineBins,deltaInventory:delta,
 actualWallDensity:coarse.profiles.at(-1)!.ionDensities}));

const source=simulateFusionBeam(DEFAULT_FUSION_BEAM);
for(const eta of [0,.5]){
 const samples=[];
 for(let trial=0;trial<6;trial++){
  const start=performance.now();fusionPlaygroundData(source);const scanMS=performance.now()-start;
  const loadingStart=performance.now();
  simulateTargetLoading(source,{replacementProbability:eta,intervals:200,relativeTolerance:1e-11,absoluteTolerance:1e-13});
  simulateTargetLoading(source,{replacementProbability:eta,intervals:200,relativeTolerance:1e-12,absoluteTolerance:1e-14});
  samples.push({scanMS,loadingPairMS:performance.now()-loadingStart});
 }
 console.log(JSON.stringify({scope:'Node CPU timings only, no browser/DOM/frame or GPU measurement',replacementProbability:eta,samples}));
}
