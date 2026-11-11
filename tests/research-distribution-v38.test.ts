import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateDistributionPacket,recordedDistribution,distributionCurves} from '../src/research-distribution.js';
const load=()=>JSON.parse(readFileSync('web-assets/research-depth/recorded-distributions.json','utf8'));
const moments=JSON.parse(readFileSync('web-assets/research-recordings.json','utf8'));
test('all actual saved marginals conserve archived number, mean and variance under declared quadrature',()=>{
 const packet=validateDistributionPacket(load());let checked=0;
 for(const c of packet.cases)for(const s of c.states){
  const original=moments.cases.find((v:any)=>v.id===c.id).states.find((v:any)=>v.step===s.step);
  assert.equal(original.timeS,s.timeS);
  for(const [species,p] of s.species.entries())for(const [axis,m] of p.axes.entries()){
   const integral=[0,0,0];
   for(let i=1;i<m.x.length;i++)for(let power=0;power<3;power++)integral[power]+=(m.x[i]-m.x[i-1])*(m.density[i]*m.x[i]**power+m.density[i-1]*m.x[i-1]**power)/2;
   for(let k=0;k<3;k++)assert.ok(Math.abs(integral[k]-m.moments[k])<=1e-8*Math.max(1,Math.abs(m.moments[k])));
   assert.ok(Math.abs(integral[0]-m.number)<1e-8);
   const mean=integral[1]/integral[0],variance=integral[2]/integral[0]-mean**2;
   assert.ok(Math.abs(mean-original.means[species][axis])<1e-8);
   assert.ok(Math.abs(variance-original.temperatureTensorEV[species][axis][axis]/(5*(species?2.1:1)))<1e-8);checked++;
  }
 }
 assert.equal(checked,378);
});
test('packet pins original scientific arrays and preserves archived physical entropy and coarse/fine decisions',()=>{
 const packet=load();
 for(const [path,hash] of Object.entries(packet.sourceSHA256))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash);
 for(const c of packet.cases){const audit=JSON.parse(readFileSync(c.auditSource,'utf8')).report;
  assert.deepEqual(c.gates,audit.gates);
  for(const [i,s] of c.states.entries())for(const key of ['H','sensitivityPerInitialNumber','quadratureGate'])assert.equal(s.physicalEntropy[key],audit.states[i].physicalEntropy[key]);
 }
 for(const group of packet.refinements){const source=JSON.parse(readFileSync(group.source,'utf8'));assert.deepEqual(group.records,source.records??source.crossIncrementRefinements);}
 assert.ok(packet.refinements.some((g:any)=>g.study==='v16 isotropic'&&g.records.some((r:any)=>r.gate==='PASS')));
 assert.ok(packet.refinements.some((g:any)=>g.study==='v17 general 3D'&&g.records.some((r:any)=>r.gate==='FAIL')));
});
test('exact saved state selection refuses stale schema and unsaved time reconstruction',()=>{
 const data=load(),c=data.cases[0];assert.equal(recordedDistribution(data,c.id,10).state.step,10);
 assert.throws(()=>recordedDistribution(data,c.id,10.5),/exact case/);
 assert.throws(()=>recordedDistribution(data,'missing',0),/exact case/);
 data.schemaVersion='moments-only-v0';assert.throws(()=>validateDistributionPacket(data),/Unsupported/);
 const invalid=load();invalid.cases[0].states[0].species[0].axes[0].density[0]=-1;assert.throws(()=>validateDistributionPacket(invalid),/marginal/);
});
test('entropy curves use archived physical H, expose uncertainty and retain selected saved time',()=>{
 const packet=load(),c=packet.cases[0],value=distributionCurves(packet,c.id,20,1),curves=value.curves;
 assert.deepEqual(curves[0].y,c.states[20].species[0].axes[1].density);
 const number=c.states[0].species.reduce((n:number,s:any)=>n+s.axes[0].number,0);
 const h=curves[2];assert.equal(h.y[0],0);assert.equal(h.y[20],(c.states[20].physicalEntropy.H-c.states[0].physicalEntropy.H)/number);
 assert.ok(curves[3].y.every((v:number,i:number)=>v>=h.y[i]));assert.ok(curves[4].y.every((v:number,i:number)=>v<=h.y[i]));
 assert.throws(()=>distributionCurves(packet,c.id,0,3),/axis/);
});
