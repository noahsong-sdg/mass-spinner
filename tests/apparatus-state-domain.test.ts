import test from 'node:test';
import assert from 'node:assert/strict';
import {targetSceneState} from '../src/apparatus-state.js';

const snapshot=(filmThicknessM: unknown)=>({
 result:{config:{depthCells:1,filmThicknessM}},
 state:{timeS:0,depthM:[.5e-6],temperatureK:[400],tritiumFraction:[.4],deuteriumFraction:[.5],vacancyFraction:[.1]},
});

test('target scene admits only finite numeric positive film thickness',()=>{
 for(const thickness of ['1e-6',Infinity,-Infinity,NaN,0,-1e-6,null,undefined])
  assert.equal(targetSceneState(snapshot(thickness)),null,`Invalid film thickness ${String(thickness)}`);
 const accepted=targetSceneState(snapshot(1e-6));
 assert.ok(accepted);
 assert.equal(accepted.filmThicknessM,1e-6);
 assert.deepEqual(accepted.cells,[{depthM:.5e-6,temperatureK:400,tritiumFraction:.4,deuteriumFraction:.5,vacancyFraction:.1}]);
});
