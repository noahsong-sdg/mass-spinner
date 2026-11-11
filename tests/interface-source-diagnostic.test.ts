import test from 'node:test';
import assert from 'node:assert/strict';
import {splitInterfaceHeat} from '../src/coupled-target.js';
import {advanceTargetConduction} from '../src/target-conduction.js';

test('massless interface source uses opposing resistance fractions and preserves heat',()=>{
 const split=splitInterfaceHeat(3,7);
 assert.equal(split.leftFraction,.7);assert.equal(split.rightFraction,.3);
 assert.equal(split.leftFraction+split.rightFraction,1);
 for(const pair of [[0,1],[-1,1],[Infinity,1],[NaN,1]])assert.throws(()=>splitInterfaceHeat(...pair as [number,number]),RangeError);
});

for(const [filmCells,backingCells]of [[2,1],[4,2],[8,4],[16,8],[32,32]]){
 test(`backing-side face heating reproduces analytic stationary profile at ${filmCells}/${backingCells}`,()=>{
  const filmL=1e-4,backL=1e-3,kFilm=5,kBack=100,bath=300,h=1000,Q=2000,contact=1e-3;
  const cells=[...Array.from({length:filmCells},()=>({widthM:filmL/filmCells,conductivityWMK:kFilm,volumetricHeatCapacityJm3K:1e6})),
   ...Array.from({length:backingCells},()=>({widthM:backL/backingCells,conductivityWMK:kBack,volumetricHeatCapacityJm3K:3e6}))];
  const resistance=Array(cells.length-1).fill(0);resistance[filmCells-1]=contact;
  const split=splitInterfaceHeat(filmL/filmCells/(2*kFilm)+contact,backL/backingCells/(2*kBack));
  const flux=Array(cells.length).fill(0);flux[filmCells-1]=Q*split.leftFraction;flux[filmCells]=Q*split.rightFraction;
  const r=advanceTargetConduction({cells,contactResistanceM2KPerW:resistance,coolantK:bath,backHeatTransferWM2K:h},Array(cells.length).fill(bath),1e12,flux);
  const expectedFace=bath+Q*(backL/kBack+1/h);
  for(let i=0;i<filmCells;i++)assert.ok(Math.abs(r.temperatureK[i]-expectedFace)<1e-8);
  for(let i=0;i<backingCells;i++){
   const x=(i+.5)*backL/backingCells,expected=bath+Q*((backL-x)/kBack+1/h);
   assert.ok(Math.abs(r.temperatureK[filmCells+i]-expected)<1e-8);
  }
  assert.ok(Math.abs(r.energyResidualJm2)<1e-12*r.depositedJm2);
 });
}
