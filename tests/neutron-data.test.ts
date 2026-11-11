import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {neutronHydrogenReference,type HydrogenReferenceData} from '../src/neutron-data.js';

const raw=JSON.parse(readFileSync(new URL('../web-assets/marathon-reference/h1-endfb81-v35.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(raw) as HydrogenReferenceData;
const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<=Math.abs(expected)*4e-14+1e-30,`${actual} != ${expected}`);

test('native interpolation matches eleven actual OpenMC ENDF-parser oracle energies',()=>{
 for(const row of raw.referenceRows){
  const result=neutronHydrogenReference(copy(),row.energyEV/1e6,1e28);
  close(result.totalBarns,row.total);close(result.elasticBarns,row.elastic);close(result.absorptionBarns,row.absorption);
  close(result.totalMInv,row.total);close(result.elasticMInv,row.elastic);close(result.absorptionMInv,row.absorption);
 }
});

test('all native fast-grid knots retain original evaluated cross sections',()=>{
 const data=copy();
 for(const [channel,key] of [['total','totalBarns'],['elastic','elasticBarns'],['absorption','absorptionBarns']] as const){
  for(let i=0;i<data.channels[channel].energyEV.length;i++){
   const energyEV=data.channels[channel].energyEV[i];
   if(energyEV<1e5||energyEV>2e7)continue;
   close(neutronHydrogenReference(data,energyEV/1e6,0)[key],data.channels[channel].barns[i]);
  }
 }
});

test('ENDF one-based region boundary selects log-log then lin-lin interpolation',()=>{
 const data=copy();
 for(const channel of Object.values(data.channels)){
  channel.energyEV=[1e5,1e6,2e7];channel.barns=[1,100,200];
  channel.breakpoints=[2,3];channel.interpolation=[5,2];
 }
 close(neutronHydrogenReference(data,.2,1e28).totalBarns,4);
 close(neutronHydrogenReference(data,1,1e28).totalBarns,100);
 close(neutronHydrogenReference(data,10.5,1e28).totalBarns,150);
 close(neutronHydrogenReference(data,20,1e28).totalBarns,200);
});

test('macroscopic conversion preserves explicitly assumed density and vacuum limit',()=>{
 const low=neutronHydrogenReference(copy(),14.1,1e25),high=neutronHydrogenReference(copy(),14.1,3e25);
 close(high.totalMInv,3*low.totalMInv);close(high.absorptionMInv,3*low.absorptionMInv);
 const vacuum=neutronHydrogenReference(copy(),14.1,0);
 assert.equal(vacuum.totalMInv,0);assert.equal(vacuum.absorptionMInv,0);
 assert.equal(vacuum.source.rawSHA256,raw.rawSHA256);assert.equal(vacuum.source.nuclide,'H1');
});

test('stale resampled data, invalid native regions and extrapolation reject explicitly',()=>{
 assert.throws(()=>neutronHydrogenReference({...copy(),schemaVersion:1 as unknown as 2},14.1,1e28),/pinned native/);
 for(const energy of [0,.099999,20.000001,Infinity,NaN])assert.throws(()=>neutronHydrogenReference(copy(),energy,1e28),/requires/);
 assert.throws(()=>neutronHydrogenReference(copy(),14.1,-1),/requires/);
 const broken=copy();broken.channels.total.interpolation[0]=3;
 assert.throws(()=>neutronHydrogenReference(broken,14.1,1e28),/interpolation/);
 const unsorted=copy();unsorted.channels.total.energyEV[1]=unsorted.channels.total.energyEV[0];
 assert.throws(()=>neutronHydrogenReference(unsorted,14.1,1e28),/increase/);
 const incomplete=copy();incomplete.channels.total.breakpoints[incomplete.channels.total.breakpoints.length-1]--;
 assert.throws(()=>neutronHydrogenReference(incomplete,14.1,1e28),/final breakpoint/);
});
