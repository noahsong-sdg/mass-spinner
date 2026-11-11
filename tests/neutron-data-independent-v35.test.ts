import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {neutronHydrogenReference,type HydrogenReferenceData} from '../src/neutron-data.js';

const read=(path:string)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const independent=read('../scientific/marathon-v35/neutron-independent/independent-first.json');
const native=read('../web-assets/marathon-reference/h1-endfb81-v35.json') as HydrogenReferenceData;
const recorded=read('../web-assets/marathon-reference/neutrons-v35.json');
const channels=[['total','1'],['elastic','2'],['absorption','102']] as const;
const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<=2e-14*Math.abs(expected)+1e-20,`${actual} != ${expected}`);

test('native tables equal independently parsed raw MF3, including NBT/INT',()=>{
 for(const [channel,mt] of channels){
  const raw=independent.h1NativeTables[mt],published=native.channels[channel];
  assert.equal(published.MT,Number(mt));
  for(const key of ['energyEV','barns','breakpoints','interpolation'] as const)assert.deepEqual(published[key],raw[key]);
  assert.equal(published.energyEV.length,153);
 }
});

test('every native fast-domain knot and interval midpoint obeys independent ENDF laws and units',()=>{
 let intervals=0,knots=0;
 for(const [channel,mt] of channels){
  const raw=independent.h1NativeTables[mt],xs:number[]=raw.energyEV,ys:number[]=raw.barns;
  for(let i=0;i<xs.length;i++){
   if(xs[i]>=1e5&&xs[i]<=2e7){
    const result=neutronHydrogenReference(native,xs[i]/1e6,3e28);
    close(result[`${channel}Barns`],ys[i]);
    close(result[`${channel}MInv`],3*ys[i]);knots++;
   }
   if(i===xs.length-1||xs[i]<1e5||xs[i+1]>2e7)continue;
   const x=(xs[i]+xs[i+1])/2;
   const law=raw.interpolation[raw.breakpoints.findIndex((end:number)=>end>=i+2)];
   const fraction=law===2?(x-xs[i])/(xs[i+1]-xs[i]):Math.log(x/xs[i])/Math.log(xs[i+1]/xs[i]);
   const expected=law===2?ys[i]+fraction*(ys[i+1]-ys[i]):Math.exp(Math.log(ys[i])+fraction*(Math.log(ys[i+1])-Math.log(ys[i])));
   close(neutronHydrogenReference(native,x/1e6,3e28)[`${channel}Barns`],expected);intervals++;
  }
 }
 assert.ok(knots>200&&intervals>200);
});

test('NBT region boundary uses preceding law up to boundary and next law after boundary',()=>{
 const data=structuredClone(native);
 for(const [channel,mt] of channels)data.channels[channel]={MT:Number(mt),energyEV:[1e5,2e5,3e5,4e5],barns:[1,4,8,16],breakpoints:[2,4],interpolation:[5,2]};
 close(neutronHydrogenReference(data,.15,1e28).totalBarns,2.25);
 close(neutronHydrogenReference(data,.2,1e28).totalBarns,4);
 close(neutronHydrogenReference(data,.25,1e28).totalBarns,6);
});

test('native domain rejects extrapolation, invalid density, and pre-migration summary data',()=>{
 for(const energy of [.099999,20.000001,NaN,Infinity])assert.throws(()=>neutronHydrogenReference(native,energy,1e28));
 for(const density of [-1,NaN,Infinity])assert.throws(()=>neutronHydrogenReference(native,14.1,density));
 assert.equal(neutronHydrogenReference(native,.1,0).totalMInv,0);
 assert.ok(neutronHydrogenReference(native,20,1e28).totalMInv>0);
 assert.throws(()=>neutronHydrogenReference({...native,schemaVersion:1,rows:[{energyMeV:14.1,totalBarns:1}]} as unknown as HydrogenReferenceData,14.1,1e28));
});

test('published OpenMC statistics and normalization equal independent raw HDF5 readout',()=>{
 assert.equal(recorded.historiesPerCase,500000);assert.equal(recorded.batches,50);
 for(const actual of independent.cases){
  const published=recorded.cases.find((item:{name:string})=>item.name===actual.name);
  assert.equal(published.statepointSHA256,actual.statepointSHA256);
  assert.equal(actual.histories,500000);assert.equal(actual.nRealizations,50);
  assert.equal(published.sourceRateNormalization,'per source neutron');
  for(const [i,key] of ['openmcAbsorption','openmcMeanCollisions'].entries()){
   assert.equal(published[key].mean,actual.statistics[i].mean);
   assert.equal(published[key].stdError,actual.statistics[i].standardError);
  }
  close(published.geometry.radiusM,.1);close(published.geometry.distanceM,.1);close(published.geometry.thicknessM,.1);
  close(published.totalMInv,10);close(published.absorptionMInv,actual.name==='pure-absorption'?10:actual.name==='mixed'?4:0);
  const first=independent.pureAbsorptionOracle.fine;
  assert.ok(Math.abs(published.firstFlight.firstAbsorbed-first*published.absorptionMInv/10)<2e-9);
 }
 assert.equal(recorded.experimentalValidation,false);assert.equal(recorded.fullBrowserMonteCarlo,false);
});
