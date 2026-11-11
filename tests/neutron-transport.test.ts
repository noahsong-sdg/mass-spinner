import test from 'node:test';
import assert from 'node:assert/strict';
import {firstFlightRay,simulateFirstFlightNeutrons,type NeutronLayer} from '../src/neutron-transport.js';

const close=(actual:number,expected:number,tolerance=1e-12)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
const layer=(changes:Partial<NeutronLayer>={}):NeutronLayer=>({name:'assumed reference',thicknessM:.1,totalMInv:10,absorptionMInv:4,...changes});
const config={sourceRateS:1e12,sourceEnergyMeV:14.1,distanceM:.1,sampleAreaM2:Math.PI*.1**2,layers:[layer()]};

test('normal and oblique first-flight rays obey independent Beer–Lambert channels',()=>{
 for(const cosine of [1,.7,.1]){
  const r=firstFlightRay([layer()],cosine),uncollided=Math.exp(-1/cosine);
  close(r.uncollidedEscaped,uncollided);
  close(r.firstAbsorbed,(1-uncollided)*.4);
  close(r.firstScatteredUnresolved,(1-uncollided)*.6);
  close(r.firstAbsorbed+r.firstScatteredUnresolved+r.uncollidedEscaped,1);
 }
});

test('ordered layers attenuate source before first interactions and detection',()=>{
 const a=layer({thicknessM:.1,totalMInv:5,absorptionMInv:2,detectorEfficiency:.25});
 const b=layer({name:'second',thicknessM:.2,totalMInv:3,absorptionMInv:1,detectorEfficiency:.7});
 const r=firstFlightRay([a,b]);
 const first=-Math.expm1(-.5),second=Math.exp(-.5)*-Math.expm1(-.6);
 close(r.perLayer[0].firstAbsorbed,.4*first);
 close(r.perLayer[1].firstAbsorbed,second/3);
 close(r.detected,.25*.4*first+.7*second/3);
 close(r.uncollidedEscaped,Math.exp(-1.1));
 close(r.firstAbsorbed+r.firstScatteredUnresolved+r.uncollidedEscaped,1);
});

test('tiny, opaque, zero-thickness and vacuum limits stay nonnegative without cancellation',()=>{
 const tiny=firstFlightRay([layer({totalMInv:1e-19,absorptionMInv:1e-19})]);
 close(tiny.firstAbsorbed,1e-20,1e-35);
 const opaque=firstFlightRay([layer({totalMInv:1e308,absorptionMInv:1e308,thicknessM:1e308})]);
 assert.equal(opaque.uncollidedEscaped,0);assert.equal(opaque.firstAbsorbed,1);
 for(const layers of [[],[layer({thicknessM:0})],[layer({totalMInv:0,absorptionMInv:0})]]){
  const r=firstFlightRay(layers);assert.equal(r.uncollidedEscaped,1);assert.equal(r.firstAbsorbed,0);assert.equal(r.firstScatteredUnresolved,0);
 }
});

test('vacuum finite-cylinder geometry retains hemisphere and stable far-field limits',()=>{
 for(const distanceM of [0,.1,1,1e9]){
  const r=simulateFirstFlightNeutrons({...config,distanceM,layers:[]});
  const geometric=.5*(.1/Math.hypot(distanceM,.1))**2/(1+distanceM/Math.hypot(distanceM,.1));
  close(r.fractions.uncollidedEscaped,geometric,Math.max(1e-40,geometric*1e-13));
  close(r.fractions.missed,1-geometric);assert.equal(r.rates.firstAbsorbed,0);
  close(r.fractionResidual,0);assert.equal(r.sourceEnergyMeV,14.1);
 }
});

test('finite-cylinder absorption agrees with independent radial Simpson quadrature and refines',()=>{
 const radius=.1,distance=.1,thickness=.1,sigma=10,n=100000,dr=radius/n;
 function integrand(r:number){
  const length=Math.hypot(distance,r),mu=distance/length,sine=r/length;
  const path=Math.min(thickness/mu,sine===0?Infinity:(radius-r)/sine);
  return distance*r/(2*length**3)*-Math.expm1(-sigma*path);
 }
 let sum=integrand(0)+integrand(radius);
 for(let i=1;i<n;i++)sum+=(i%2?4:2)*integrand(i*dr);
 const reference=sum*dr/3;
 const pure=[layer({absorptionMInv:10})];
 const coarse=simulateFirstFlightNeutrons({...config,layers:pure,angularSamples:16});
 const fine=simulateFirstFlightNeutrons({...config,layers:pure,angularSamples:1024});
 assert.ok(Math.abs(fine.fractions.firstAbsorbed-reference)<2e-7);
 assert.ok(Math.abs(fine.fractions.firstAbsorbed-reference)<Math.abs(coarse.fractions.firstAbsorbed-reference)*.01);
 assert.ok(fine.fractions.firstAbsorbed<fine.geometry.interceptedFraction);
 close(fine.fractionResidual,0);assert.equal(fine.fractions.firstScatteredUnresolved,0);
});

test('particle-channel and detector accounting survive layered geometry and zero source',()=>{
 const layers=[layer({detectorEfficiency:.3}),layer({name:'back',thicknessM:.5,totalMInv:7,absorptionMInv:7,detectorEfficiency:.8})];
 for(const sourceRateS of [0,1,1e20]){
  const r=simulateFirstFlightNeutrons({...config,sourceRateS,layers});
  close(Object.values(r.fractions).reduce((a,b)=>a+b,0),1);
  for(const value of Object.values(r.rates))assert.ok(value>=0&&Number.isFinite(value));
  close(r.perLayer.reduce((s,x)=>s+x.firstAbsorbed,0),r.fractions.firstAbsorbed);
  close(r.perLayer.reduce((s,x)=>s+x.detectionRateS,0)/Math.max(1,sourceRateS),r.detectionRateS/Math.max(1,sourceRateS));
  assert.ok(r.detectionRateS<=r.rates.firstAbsorbed);
  if(sourceRateS===0){assert.ok(Object.values(r.rates).every(v=>v===0));assert.equal(r.detectionRateS,0);}
 }
});

test('far-field direction retains lateral escape after the direction cosine rounds to one',()=>{
 const distanceM=1e8,n=100000;
 // Independent entrance-area quadrature in the paraxial limit. Errors from
 // neglecting r/d in the path metric are below double precision here.
 const integrand=(u:number)=>-Math.expm1(-Math.min(1,u===0?Infinity:1/Math.sqrt(u)-1));
 let sum=integrand(0)+integrand(1);
 for(let i=1;i<n;i++)sum+=(i%2?4:2)*integrand(i/n);
 const reference=sum/(3*n);
 const r=simulateFirstFlightNeutrons({...config,distanceM,sampleAreaM2:Math.PI,angularSamples:2048,
  layers:[layer({thicknessM:distanceM,totalMInv:1/distanceM,absorptionMInv:1/distanceM})]});
 close(r.fractions.firstAbsorbed/r.geometry.interceptedFraction,reference,2e-7);
});

test('invalid physical channels and nonrepresentable geometry fail explicitly',()=>{
 for(const changes of [{thicknessM:-1},{totalMInv:-1},{absorptionMInv:11},{absorptionMInv:NaN},{detectorEfficiency:2},{name:''}])
  assert.throws(()=>firstFlightRay([layer(changes)]),/Layers require/);
 for(const cosine of [0,-1,1.01,NaN])assert.throws(()=>firstFlightRay([],cosine),/cosine/);
 for(const changes of [{sourceRateS:-1},{sourceEnergyMeV:0},{distanceM:-1},{sampleAreaM2:0}])
  assert.throws(()=>simulateFirstFlightNeutrons({...config,...changes}),/source requires/);
 for(const angularSamples of [0,8.5,4097,Infinity])assert.throws(()=>simulateFirstFlightNeutrons({...config,angularSamples}),/samples/);
 assert.throws(()=>simulateFirstFlightNeutrons({...config,angularSamples:null as unknown as number}),/samples/);
 assert.throws(()=>firstFlightRay([layer({detectorEfficiency:null as unknown as number})]),/Layers require/);
 assert.throws(()=>simulateFirstFlightNeutrons({...config,distanceM:1e308,layers:[layer({thicknessM:1e308})]}),/geometric/);
});

test('no-emission state retains undefined birth energy and exact zero rates',()=>{
 const r=simulateFirstFlightNeutrons({...config,sourceRateS:0,sourceEnergyMeV:null});
 assert.equal(r.sourceEnergyMeV,null);assert.equal(r.detectionRateS,0);
 assert.ok(Object.values(r.rates).every(value=>value===0));
 assert.throws(()=>simulateFirstFlightNeutrons({...config,sourceEnergyMeV:null}),/source requires/);
});
