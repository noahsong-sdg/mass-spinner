import test from 'node:test';
import assert from 'node:assert/strict';
import {projectEqualVolume,projectGasState,gasBoundaryScales} from '../scientific/hotwall-boundary-v60/metrics.js';

const K=1.380649e-23,sum=(a:readonly number[])=>a.reduce((x,y)=>x+y,0);
function close(a:number,b:number,tolerance=2e-13){
 assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
}

test('cross-grid gas comparison conserves canonical integrals and reconstructs particle-weighted temperature',()=>{
 const lightMass=[.1,.2,.3,.4],heavyMass=[.4,.3,.2,.1],temperatures=[400,800,600,1000],number=1e20,x=.25;
 const counts=lightMass.map((p,i)=>number*(x*p+(1-x)*heavyMass[i]));
 const cellEnergyJ=counts.map((n,i)=>1.5*K*n*temperatures[i]);
 const state=projectGasState({lightMass,heavyMass,cellEnergyJ},2,number,x);
 close(sum(state.lightMass),1);close(sum(state.heavyMass),1);close(sum(state.cellEnergyJ),sum(cellEnergyJ));
 close(state.temperatureK[0],(counts[0]*400+counts[1]*800)/(counts[0]+counts[1]));
 close(state.temperatureK[1],(counts[2]*600+counts[3]*1000)/(counts[2]+counts[3]));
 assert.ok(Math.abs(state.temperatureK[0]-600)>10,'Arithmetic temperature averaging must fail this nonuniform-particle control.');
 assert.ok(Math.abs(state.temperatureK[1]-800)>10);
 const uniform=projectGasState({lightMass,heavyMass,cellEnergyJ:counts.map(n=>1.5*K*n*525)},7,number,x);
 uniform.temperatureK.forEach(t=>close(t,525));
});

test('equal-volume overlap projection handles nonnested meshes without confusing y width and radial width',()=>{
 const projected=projectEqualVolume([1,2,3],2);
 close(projected[0],2);close(projected[1],4);close(sum(projected),6);
 projectEqualVolume([1,-2,3],3).forEach((v,i)=>close(v,[1,-2,3][i]));
 for(const n of [3,7,16,31])for(const m of [2,5,16,33]){
  const source=Array.from({length:n},(_,i)=>(i+1)**2/n**3),result=projectEqualVolume(source,m);
  close(sum(source),sum(result));assert.ok(result.every(v=>v>0));
 }
 // A common uniform physical-volume distribution remains uniform after rebinning.
 projectEqualVolume(Array(7).fill(1/7),11).forEach(p=>close(p,1/11));
 assert.throws(()=>projectEqualVolume([1,Number.NaN],2),RangeError);
 assert.throws(()=>projectEqualVolume([1,2],1.5),RangeError);
 assert.throws(()=>projectGasState({lightMass:[1,0],heavyMass:[1,0],cellEnergyJ:[1,0]},2,1,.5),RangeError);
});

test('hot-wall resolution indicators distinguish the outer annulus from a uniform-radial mesh',()=>{
 const config={radiusM:.12,lengthM:.8,pressurePa:10,initialK:500,conductivityWMK:.1,gasWallWK:.1,cells:64,timeS:1e-7};
 const scale=gasBoundaryScales(config);
 close(scale.outerWidthM,.12*(1-Math.sqrt(63/64)));
 close(scale.alphaM2S,10/3);close(scale.penetrationM,Math.sqrt((10/3)*1e-7));
 close(scale.biot,.1/(2*Math.PI*.8*.1));
 assert.ok(scale.penetrationCells<1,'The early Fourier layer is narrower than the live outer cell.');
 assert.ok(scale.outerWidthM<config.radiusM/config.cells,'Equal-volume wall cells are thinner than uniform radial cells.');
 const fine=gasBoundaryScales({...config,cells:256});
 assert.ok(fine.penetrationCells>2&&fine.penetrationCells<3);
 assert.throws(()=>gasBoundaryScales({...config,conductivityWMK:0}),RangeError);
});
