import test from 'node:test';
import assert from 'node:assert/strict';
import {evolveDecayNetwork} from '../src/decay-network.ts';
const close=(actual:number,expected:number,tol=1e-9)=>assert.ok(Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),`${actual} vs ${expected}`);
test('single decay, stable daughter, source and lost inventory match analytic controls',()=>{
 const network={nodes:[{id:'P',decayRateS:.2,products:[{to:'D',fraction:.75}]},{id:'D',decayRateS:0}],productionAtomsS:[4,0]};
 const r=evolveDecayNetwork(network,[10,0],8,true),p=10*Math.exp(-1.6)+20*(-Math.expm1(-1.6));
 close(r.populations[0],p);close(r.populations[1],.75*(42-p));close(r.lostAtoms,.25*(42-p));close(r.balanceResidualAtoms,0);
});
test('equal-rate Bateman chain has finite exact repeated-root limit',()=>{
 const r=evolveDecayNetwork({nodes:[{id:'P',decayRateS:.3,products:[{to:'D',fraction:1}]},{id:'D',decayRateS:.3}]},[100,0],7,false);
 close(r.populations[0],100*Math.exp(-2.1));close(r.populations[1],100*2.1*Math.exp(-2.1));close(r.balanceResidualAtoms,0);
});
test('irradiation depletion stops during cooldown; stable source grows linearly',()=>{
 const n={nodes:[{id:'T',decayRateS:0},{id:'P',decayRateS:0}],reactions:[{from:'T',to:'P',rateS:.1}],productionAtomsS:[0,2]};
 const on=evolveDecayNetwork(n,[100,0],10,true),off=evolveDecayNetwork(n,on.populations,10,false);
 close(on.populations[0],100/Math.E);close(on.populations[1],120-100/Math.E);assert.deepEqual(off.populations,on.populations);
});
test('closed cycles remain positive and conserve inventory at stiff qualified boundary',()=>{
 const n={nodes:[{id:'A',decayRateS:0},{id:'B',decayRateS:0}],reactions:[{from:'A',to:'B',rateS:1},{from:'B',to:'A',rateS:2}]};
 const r=evolveDecayNetwork(n,[3,0],5e5,true);close(r.populations[0],2,1e-8);close(r.populations[1],1,1e-8);close(r.balanceResidualAtoms,0,1e-8);
});
test('time splitting agrees and domain failures are explicit',()=>{
 const n={nodes:[{id:'A',decayRateS:.8}],productionAtomsS:[3]},one=evolveDecayNetwork(n,[5],4,true),half=evolveDecayNetwork(n,[5],2,true);
 close(evolveDecayNetwork(n,half.populations,2,true).populations[0],one.populations[0]);
 assert.throws(()=>evolveDecayNetwork(n,[-1],2,true));assert.throws(()=>evolveDecayNetwork(n,[1],2e6,true),/bounded/);
 assert.throws(()=>evolveDecayNetwork({nodes:[{id:'A',decayRateS:1,products:[{to:'A',fraction:1}]}]},[1],1,false));
 assert.throws(()=>evolveDecayNetwork({nodes:[{id:'A',decayRateS:0},{id:'B',decayRateS:0}]},[1e308,1e308],0,false),/Aggregate/);
 assert.throws(()=>evolveDecayNetwork({nodes:[{id:'A',decayRateS:2}]},[1e308],0,false),/Nonfinite/);
});
