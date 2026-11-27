import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseRecordedArgonReference,loadRecordedArgonReference} from '../src/argon-reference.js';
import {ARGON_REFERENCE_ASSET} from '../src/argon-reference-identity.js';

const bytes=readFileSync(new URL('../web-assets/argon-reference/v98.json',import.meta.url));
const fixture=()=>JSON.parse(bytes.toString());

test('published reference retains all recorded refinements, fixed argon conditions and false qualification',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),ARGON_REFERENCE_ASSET.sha256);
 const data=parseRecordedArgonReference(fixture());assert.equal(data.cases.length,24);
 assert.equal(data.comparisons.length,8);assert.equal(data.manifest.branchCurrentA,100);
 assert.equal(data.experimentalQualification,false);assert.equal(data.livePlaygroundQualified,false);
 for(const row of data.cases){assert.equal(row.chordVelocityMS.length,11);assert.equal(row.experimentalQualification,false);}
});

test('obsolete, partial, relabeled, nonfinite and duplicate reference packets are rejected',()=>{
 const mutations=[
  (d:any)=>d.schemaVersion=0,(d:any)=>d.kind='live-surrogate',
  (d:any)=>d.experimentalQualification=true,(d:any)=>d.livePlaygroundQualified=true,
  (d:any)=>d.currentFitted=true,(d:any)=>d.manifest.branchCurrentA=101,
  (d:any)=>d.manifest.chordsM[2]=.017,(d:any)=>d.cases.pop(),
  (d:any)=>d.cases[0].chordVelocityMS[0]=NaN,
  (d:any)=>d.cases[0].chordVelocityMS.pop(),(d:any)=>d.cases[0].packetSHA256='bad',
  (d:any)=>d.cases[0].packet='../other.npz',
  (d:any)=>d.cases[0]=d.cases[1],(d:any)=>d.cases[0].refinement='1',
  (d:any)=>d.scenarios[0].electronTemperatureEV=9,(d:any)=>d.comparisons.pop(),
  (d:any)=>d.comparisons[0]=d.comparisons[1],
  (d:any)=>d.numericalGates.refinement=false,(d:any)=>d.origin.memberSha256='0'.repeat(64),
 ];
 for(const mutate of mutations){const data=fixture();mutate(data);assert.throws(()=>parseRecordedArgonReference(data),/Invalid recorded argon/);}
});

test('loader verifies exact fetched bytes and rejects stale assets, failed requests and cancellation',async()=>{
 const response=()=>new Response(bytes,{status:200});
 const data=await loadRecordedArgonReference(async(url,options)=>{
  assert.equal(url,ARGON_REFERENCE_ASSET.url);assert.equal(options?.signal,undefined);return response();
 });assert.equal(data.cases.length,24);
 await assert.rejects(loadRecordedArgonReference(async()=>new Response('{}')),/source identity/);
 await assert.rejects(loadRecordedArgonReference(async()=>new Response('',{status:404})),/unavailable/);
 await assert.rejects(loadRecordedArgonReference(async()=>new Response(bytes,{headers:{'content-length':'300000'}})),/size limit/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(loadRecordedArgonReference(async()=>response(),controller.signal),{name:'AbortError'});
});
