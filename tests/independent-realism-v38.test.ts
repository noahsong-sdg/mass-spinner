import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceLithiumCoating} from '../src/lithium-coating.js';
import {evolveDecayNetwork} from '../src/decay-network.js';
import {stoppingDomainForFilm} from '../src/material-realism.js';

const coating={lithiumNumberDensityM3:1e28,heatCapacityPerLiJK:1,referenceK:300,
 depositionFluxM2S:.2,erosionFluxM2S:.2,depositedTritiumPerLi:.14,depositedDeuteriumPerLi:.86,depositionTemperatureK:500};
const close=(a:number,b:number,scale=1,tolerance=2e-11)=>assert.ok(Math.abs(a-b)<=tolerance*scale,`${a} != ${b}`);

test('independent coating recurrence retains a fully occupied convex mixture without false domain rejection',()=>{
 for(const [p,e]of [[.2,.2],[.2,.3],[.3,.2],[0,.1]]){
  const c={...coating,depositionFluxM2S:p,erosionFluxM2S:e};
  let state={lithiumColumnM2:1,tritiumColumnM2:.37,deuteriumColumnM2:.63,sensibleEnergyJm2:50};
  for(let i=0;i<200;i++){
   let r:ReturnType<typeof advanceLithiumCoating>;
   try{r=advanceLithiumCoating(state,c,.01);}
   catch(error){throw new Error(`p=${p}, e=${e}, step=${i}, state=${JSON.stringify(state)}`,{cause:error});}
   state=r.state;
   assert.ok(state.tritiumColumnM2>=0&&state.deuteriumColumnM2>=0);
   close(state.tritiumColumnM2+state.deuteriumColumnM2,state.lithiumColumnM2);
   assert.ok(r.temperatureK>=350-1e-9&&r.temperatureK<=500+1e-9);
  }
  const once=advanceLithiumCoating({lithiumColumnM2:1,tritiumColumnM2:.37,deuteriumColumnM2:.63,sensibleEnergyJm2:50},c,2);
  for(const key of Object.keys(state)as(keyof typeof state)[])close(state[key],once.state[key],Math.max(1,Math.abs(state[key])));
 }
});

test('tiny physical coating export remains positive instead of being replaced by cancellation of inventories',()=>{
 const e=1e-30,p=1000,dt=10;
 const r=advanceLithiumCoating({lithiumColumnM2:1,tritiumColumnM2:.7,deuteriumColumnM2:0,sensibleEnergyJm2:50},
  {...coating,depositionFluxM2S:p,erosionFluxM2S:e,depositedTritiumPerLi:.5,depositedDeuteriumPerLi:0},dt);
 // Analytic e→0 expansion of e ∫ f(t)dt, with O(e²) negligible here:
 // f(t) = fin + (f0-fin)*N0/(N0+p*t).
 const expected=e*(.5*dt+(.7-.5)/p*Math.log1p(p*dt));
 assert.ok(r.eroded.tritiumM2>=0);close(r.eroded.tritiumM2,expected,expected,2e-11);
});

test('tiny deposition into an eroding empty coating retains its positive incoming-isotope export',()=>{
 const p=1e-30,e=.1,dt=1;
 const r=advanceLithiumCoating({lithiumColumnM2:1,tritiumColumnM2:0,deuteriumColumnM2:0,sensibleEnergyJm2:50},
  {...coating,depositionFluxM2S:p,erosionFluxM2S:e,depositedTritiumPerLi:1,depositedDeuteriumPerLi:0},dt);
 const n1=1-e*dt,expected=p*(dt+n1/e*Math.log(n1));
 assert.ok(r.eroded.tritiumM2>0);close(r.eroded.tritiumM2,expected,expected,2e-11);
});

test('independent branching/reaction network reaches the stationary distribution under maximum admitted optical time',()=>{
 const r=evolveDecayNetwork({nodes:[{id:'a',decayRateS:0},{id:'b',decayRateS:0}],
  reactions:[{from:'a',to:'b',rateS:2},{from:'b',to:'a',rateS:3}]},[1e8,0],1e6/3,true);
 close(r.populations[0],6e7,1e8,2e-9);close(r.populations[1],4e7,1e8,2e-9);
 close(r.balanceResidualAtoms,0,1e8,2e-9);assert.equal(r.lostAtoms,0);
 assert.ok(r.populations.every(x=>x>=0));
});

test('independent affine stable-source and irreversible sink limits conserve inventory',()=>{
 const duration=11,production=7,lambda=.4,initial=19;
 const r=evolveDecayNetwork({nodes:[{id:'a',decayRateS:lambda}],productionAtomsS:[production]},[initial],duration,true);
 const expected=initial*Math.exp(-lambda*duration)+production/lambda*(-Math.expm1(-lambda*duration));
 close(r.populations[0],expected,initial+production*duration);
 close(r.lostAtoms,initial+production*duration-expected,initial+production*duration);
 close(r.balanceResidualAtoms,0,initial+production*duration);
 const stable=evolveDecayNetwork({nodes:[{id:'a',decayRateS:0}],productionAtomsS:[production]},[initial],duration,true);
 close(stable.populations[0],initial+production*duration,initial+production*duration);assert.equal(stable.lostAtoms,0);
});

test('aggregate inventory overflow is rejected instead of returning a nonfinite conservation residual',()=>{
 assert.throws(()=>evolveDecayNetwork({nodes:[{id:'a',decayRateS:0},{id:'b',decayRateS:0}]},[1e308,1e308],0,false),/finite|domain|inventory/i);
});

test('independent stopping-domain boundary is consistent for every allowed energy and zero-length path',()=>{
 const composition={tritiumFraction:1,deuteriumFraction:0};
 const minimum=stoppingDomainForFilm(100,0,composition,32).minimumEnergyKeV;
 const atEdge=stoppingDomainForFilm(minimum,0,composition,32);
 assert.equal(atEdge.supportedColumnM2,0);assert.equal(atEdge.refinementDeltaM2,0);assert.equal(atEdge.exitEnergyKeV,minimum);
 const beyond=stoppingDomainForFilm(minimum,1,composition,32);assert.equal(beyond.exitEnergyKeV,null);
 for(const energy of [minimum,1,10,100,500]){
  const range=stoppingDomainForFilm(energy,0,composition,128);
  assert.equal(range.exitEnergyKeV,energy);assert.ok(range.supportedColumnM2>=0);
  const exit=stoppingDomainForFilm(energy,range.supportedColumnM2,composition,128);
  close(exit.exitEnergyKeV!,minimum,energy,1e-11);
 }
});
