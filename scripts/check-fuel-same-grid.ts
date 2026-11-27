/** CI prepares these baseline modules from the exact pre-change commit. */
import assert from 'node:assert/strict';
import {simulateFuelSpatialExperiment} from '../src/fuel-spatial-experiment.js';
import {simulateFuelSpatialExperiment as baseline} from '../src/.baseline-experiment.js';
for(const config of [{},{radialCells:8,axialCells:8,steps:16,driveFraction:.5,axialSpacingPower:2}]){
 assert.deepEqual(simulateFuelSpatialExperiment(config),baseline(config));
}
console.log('Two complete same-grid public trajectories match the pre-change implementation exactly.');
