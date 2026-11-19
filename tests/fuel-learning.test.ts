import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge,type FuelConfig} from '../src/fuel-centrifuge.js';
import {sampleFuelField} from '../src/fuel-field.js';
import {fuelCompositionCurves,fuelLearningComparison,fuelDensityCurves,zoomCompositionCurves} from '../src/fuel-learning.js';

const K=1.380649e-23,U=1.66053906892e-27;
const close=(actual:number,expected:number,tolerance=2e-11)=>{
 assert.ok(Number.isFinite(actual)&&Number.isFinite(expected));
 assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);
};
const rotor=(overrides:Partial<FuelConfig>={})=>simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:0,...overrides});

// Independently integrated Boltzmann weights in equal-volume coordinate y=r²/R².
// No production radial PDF/CDF, interpolation or collection helper is used.
function integral(beta:number,end=1){
 const intervals=1024,h=end/intervals;
 let total=1+Math.exp(beta*end);
 for(let i=1;i<intervals;i++)total+=(i%2?4:2)*Math.exp(beta*i*h);
 return total*h/3;
}
function equilibrium(r:ReturnType<typeof rotor>,omega:number,temperatureK:number){
 const beta=r.pair.masses.map(m=>m*U*(omega*r.config.radiusM)**2/(2*K*temperatureK));
 const norms=beta.map(b=>integral(b));
 return {
  fraction(y:number){
   const light=r.config.lightFraction*Math.exp(beta[0]*y)/norms[0];
   const heavy=(1-r.config.lightFraction)*Math.exp(beta[1]*y)/norms[1];
   return light/(light+heavy);
  },
  collection(cut:number){
   const light=integral(beta[0],cut**2)/norms[0],heavy=integral(beta[1],cut**2)/norms[1];
   const count=r.config.lightFraction*light+(1-r.config.lightFraction)*heavy;
   return {purity:count>0?r.config.lightFraction*light/count:null,recovery:r.config.lightFraction>0?light:null};
  },
 };
}
function freeze<T>(value:T):T{
 if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}
 return value;
}

test('composition percentages use number inventories rather than normalized density or isotope mass fractions',()=>{
 const r=rotor({lightFraction:.2}),state={lightMass:[.1,.2,.3,.4],heavyMass:[.4,.3,.2,.1],neutralRadS:100,timeS:.25};
 const [light,heavy]=fuelCompositionCurves(r,state);
 assert.equal(light.label,r.pair.light);assert.equal(heavy.label,r.pair.heavy);
 assert.deepEqual(light.yDomain,[0,100]);assert.equal(light.yLabel,'Local composition (%)');
 for(let i=0;i<4;i++){
  const expected=.2*state.lightMass[i]/(.2*state.lightMass[i]+.8*state.heavyMass[i]);
  const massFraction=.2*state.lightMass[i]*r.pair.masses[0]/(.2*state.lightMass[i]*r.pair.masses[0]+.8*state.heavyMass[i]*r.pair.masses[1]);
  for(const j of [2*i,2*i+1]){close(light.y[j],100*expected);close(heavy.y[j],100*(1-expected));close(light.y[j]+heavy.y[j],100);}
  assert.ok(Math.abs(light.y[2*i]-100*massFraction)>1e-3,'number and mass fractions must be distinguishable');
 }
});

test('transient composition curves retain both sides of each equal-volume cell jump and the full axis-to-wall domain',()=>{
 const r=rotor({lightFraction:.3}),R=r.config.radiusM;
 const state={lightMass:[.1,.3,.6],heavyMass:[.6,.3,.1],neutralRadS:0};
 const [light]=fuelCompositionCurves(r,state);
 assert.equal(light.x.length,6);assert.equal(light.x[0],0);close(light.x.at(-1),R*100);
 for(let i=0;i<3;i++){
  close(light.x[2*i],100*R*Math.sqrt(i/3));close(light.x[2*i+1],100*R*Math.sqrt((i+1)/3));
  const atCenter=sampleFuelField(r,R*Math.sqrt((i+.5)/3),state);
  close(light.y[2*i],100*atCenter.lightFraction!);assert.equal(light.y[2*i],light.y[2*i+1]);
  if(i<2){close(light.x[2*i+1],light.x[2*i+2]);assert.notEqual(light.y[2*i+1],light.y[2*i+2]);}
 }
 close(sampleFuelField(r,0,state).lightFraction!,light.y[0]/100);
 close(sampleFuelField(r,R,state).lightFraction!,light.y.at(-1)/100);
});

test('empty cells leave both composition curves undefined and pure feeds remain exact percentages',()=>{
 const r=rotor({lightFraction:.23});
 const [light,heavy]=fuelCompositionCurves(r,{lightMass:[0,1],heavyMass:[0,1]});
 assert.deepEqual(light.y.slice(0,2),[null,null]);assert.deepEqual(heavy.y.slice(0,2),[null,null]);
 close(light.y[2],23);close(heavy.y[2],77);
 for(const lightFraction of [0,1]){
  const [a,b]=fuelCompositionCurves(rotor({lightFraction}),{lightMass:[.25,.75],heavyMass:[.6,.4]});
  assert.ok(a.y.every((v:number)=>v===100*lightFraction));assert.ok(b.y.every((v:number)=>v===100*(1-lightFraction)));
 }
});

test('the light-percentage zoom preserves values and includes every feed and pinned-run extreme',()=>{
 const r=rotor({lightFraction:.0759}),source=fuelCompositionCurves(r,{lightMass:[.49,.51],heavyMass:[.51,.49]}),before=JSON.stringify(source);
 const shown=zoomCompositionCurves([source[0],source[2],{...source[0],y:[6,9]}]);
 assert.equal(JSON.stringify(source),before);assert.equal(shown[0].y,source[0].y);
 for(const curve of shown){assert.deepEqual(curve.yDomain,shown[0].yDomain);for(const value of curve.y)if(value!==null)assert.ok(value>=curve.yDomain![0]&&value<=curve.yDomain![1]);}
 assert.ok(shown[0].yDomain![1]-shown[0].yDomain![0]<5);assert.match(shown[0].yLabel,/zoomed/);
 for(const fraction of [0,1]){const curves=zoomCompositionCurves(fuelCompositionCurves(rotor({lightFraction:fraction})).filter((_,i)=>i!==1));assert.ok(curves[0].yDomain![0]>=0&&curves[0].yDomain![1]<=100&&curves[0].yDomain![0]<curves[0].yDomain![1]);}
});

test('density curves show cellwise volume density, not radial shell probability or composition',()=>{
 const r=rotor({lightFraction:.2}),state={lightMass:[.1,.2,.3,.4],heavyMass:[.05,.15,.3,.5]};
 const [light,heavy]=fuelDensityCurves(r,state);
 for(let i=0;i<4;i++)for(const j of [2*i,2*i+1]){close(light.y[j]!,4*state.lightMass[i]);close(heavy.y[j]!,4*state.heavyMass[i]);}
 close(light.x.at(-1)!,100*r.config.radiusM);assert.equal(light.yLabel,'Density / species volume mean');
 const pure=fuelDensityCurves(rotor({lightFraction:1}),state);assert.ok(pure[1].y.every(v=>v===null),'an absent species has no density/own-mean ratio');
});

test('equilibrium composition matches separately normalized Boltzmann number inventories',()=>{
 for(const currentA of [0,.015,.06])for(const lightFraction of [.0759,.7]){
  const r=rotor({currentA,lightFraction}),omega=r.samples.at(-1)!.neutralRadS;
  const expected=equilibrium(r,omega,r.config.gasK),[light,heavy]=fuelCompositionCurves(r);
  assert.equal(light.x.length,r.profiles.length);
  for(let i=0;i<light.x.length;i++){
   const fraction=expected.fraction((light.x[i]/(100*r.config.radiusM))**2);
   close(light.y[i],100*fraction);close(heavy.y[i],100*(1-fraction));
  }
 }
});

test('temperature comparison holds the current sampled rotation fixed and does not mutate accepted inputs',()=>{
 const r=freeze(rotor({lightFraction:.2})),state=freeze({neutralRadS:9000,timeS:.2,thermal:{gasK:650}});
 const before=JSON.stringify({r,state}),comparison=fuelLearningComparison(r,state,'temperature');
 assert.equal(JSON.stringify({r,state}),before);
 assert.deepEqual(comparison.cases.map((v:any)=>v.omega),[9000,9000]);
 assert.deepEqual(comparison.cases.map((v:any)=>v.temperatureK),[650,1300]);
 assert.match(comparison.scope,/rotation fixed/i);assert.match(comparison.scope,/do not predict drive, heating or extraction/i);
 for(const row of comparison.cases){
  const expected=equilibrium(r,row.omega,row.temperatureK);
  for(const point of row.profiles)close(point.lightFraction,expected.fraction((point.radiusM/r.config.radiusM)**2));
 }
 // Hotter equilibrium is less segregated relative to the same bulk number fraction.
 for(const index of [0,80])assert.ok(Math.abs(comparison.cases[1].profiles[index].lightFraction-.2)<Math.abs(comparison.cases[0].profiles[index].lightFraction-.2));
});

test('rotation comparison holds temperature fixed and doubles the sampled speed rather than the final reference',()=>{
 const r=rotor({currentA:.06,gasK:400}),state={neutralRadS:7000,thermal:{gasK:600}};
 assert.notEqual(state.neutralRadS,r.samples.at(-1)!.neutralRadS);
 const comparison=fuelLearningComparison(r,state,'rotation');
 assert.deepEqual(comparison.cases.map((v:any)=>v.omega),[7000,14000]);
 assert.deepEqual(comparison.cases.map((v:any)=>v.temperatureK),[600,600]);
 assert.match(comparison.scope,/temperature held/i);
 const [a,b]=comparison.cases;
 const logOddsChange=(row:any)=>{
  const center=row.profiles[0].lightFraction,wall=row.profiles.at(-1).lightFraction;
  return Math.log(wall/(1-wall))-Math.log(center/(1-center));
 };
 close(logOddsChange(b),4*logOddsChange(a));
 const zero=fuelLearningComparison(r,{neutralRadS:0},'rotation');
 for(const row of zero.cases){assert.equal(row.omega,0);for(const point of row.profiles)close(point.lightFraction,r.config.lightFraction);}
});

test('spatial-temperature comparisons explicitly replace the field by its accepted gas mean',()=>{
 const r=rotor({gasK:400}),state={neutralRadS:8000,thermal:{gasK:720,gas:{temperatureK:[500,900]}}};
 for(const kind of ['temperature','rotation','collection']){
  const result=fuelLearningComparison(r,state,kind);
  assert.equal(result.cases[0].temperatureK,720);assert.match(result.scope,/mean gas temperature instead of spatial temperature differences/i);
 }
 const noSpatial=fuelLearningComparison(r,{neutralRadS:8000,thermal:{gasK:720}},'temperature');
 assert.doesNotMatch(noSpatial.scope,/spatial temperature/i);
});

test('collection comparisons integrate each normalized isotope inventory without changing the gas reference',()=>{
 const r=freeze(rotor({lightFraction:.23,cutFraction:.8})),state=freeze({neutralRadS:9000,thermal:{gasK:550}});
 const before=JSON.stringify({r,state}),result=fuelLearningComparison(r,state,'collection');
 assert.equal(JSON.stringify({r,state}),before);assert.equal(result.cases.length,1);
 const row=result.cases[0],expected=equilibrium(r,9000,550);
 assert.equal(row.omega,9000);assert.equal(row.temperatureK,550);assert.equal(row.collections.length,2);
 assert.notEqual(row.collections[0].cutFraction,row.collections[1].cutFraction);
 for(let i=0;i<row.collections.length;i++){
  const cut=row.collections[i],oracle=expected.collection(cut.cutFraction);
  close(cut.purity,oracle.purity!);close(cut.recovery,oracle.recovery!);
  close(result.curves[0].x[i],100*r.config.radiusM*cut.cutFraction);
  close(result.curves[0].y[i],100*oracle.purity!);close(result.curves[1].y[i],100*oracle.recovery!);
 }
 const [outer,inner]=row.collections;assert.ok(inner.purity>outer.purity);assert.ok(inner.recovery<outer.recovery);
 assert.match(result.scope,/closed inventory/i);assert.match(result.scope,/do not predict drive, heating or extraction/i);
});

test('empty collection and absent isotope domains remain undefined instead of inventing purity or recovery',()=>{
 for(const lightFraction of [0,.23,1])for(const cutFraction of [0,1]){
  const r=rotor({lightFraction,cutFraction}),result=fuelLearningComparison(r,{neutralRadS:0},'collection');
  const cut=result.cases[0].collections[0];
  if(cutFraction===0){assert.equal(cut.purity,null);assert.equal(result.curves[0].y[0],null);}
  else close(cut.purity,lightFraction);
  if(lightFraction===0){assert.equal(cut.recovery,null);assert.equal(result.curves[1].y[0],null);}
  else close(cut.recovery,cutFraction**2);
 }
});

test('equilibrium comparisons reject unsupported kinds and otherwise use the accepted final reference when no sampled state is supplied',()=>{
 const r=rotor({currentA:.03});
 assert.throws(()=>fuelLearningComparison(r,{},'drive'),RangeError);
 const comparison=fuelLearningComparison(r,{},'temperature');
 assert.equal(comparison.cases[0].omega,r.samples.at(-1)!.neutralRadS);assert.equal(comparison.cases[0].temperatureK,r.config.gasK);
});


test('composition includes the accepted inventory feed and reference comparisons disclose a zoomed percentage axis',()=>{
 const r=rotor({lightFraction:.0759}),state={neutralRadS:9000};
 const curves=fuelCompositionCurves(r,state),feed=curves.at(-1)!;
 assert.equal(feed.label,`${r.pair.light} feed`);assert.deepEqual(feed.x,[0,100*r.config.radiusM]);
 assert.deepEqual(feed.y,[7.59,7.59]);assert.equal(feed.dash,'4 4');
 for(const lightFraction of [0,.0759,1])for(const neutralRadS of [0,9000])for(const kind of ['temperature','rotation']){
  const comparison=fuelLearningComparison(rotor({lightFraction}),{neutralRadS},kind);
  assert.match(comparison.scope,/Expanded light-fraction axis.*feed.*percentage points/);
  for(const curve of comparison.curves){
   assert.match(curve.yLabel,/%.*zoomed axis/);assert.ok(curve.yDomain[0]>=0&&curve.yDomain[1]<=100&&curve.yDomain[0]<curve.yDomain[1]);
   assert.ok(curve.yDomain[1]-curve.yDomain[0]<100);
   for(const value of [100*lightFraction,...curve.y.filter(Number.isFinite)])assert.ok(value>=curve.yDomain[0]&&value<=curve.yDomain[1]);
   assert.ok(curve.y.every((v:number|null)=>v===null||Number.isFinite(v)&&v>=0&&v<=100));
  }
 }
 const collection=fuelLearningComparison(r,state,'collection');
 assert.deepEqual(collection.curves[0].yDomain,[0,100]);assert.doesNotMatch(collection.scope,/Expanded/);
});
