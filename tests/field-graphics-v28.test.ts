import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldGraphics} from '../src/field-graphics.js';
import {DEFAULT_CONFIG,fields,rfField} from '../src/physics.js';

test('rendered DC field samples preserve the solver vectors, radial dependence and sign',()=>{
 for(const voltage of [400,-400,0])for(const magneticT of [.1,-.1,0]){
  const c={...DEFAULT_CONFIG,voltage,magneticT},g=fieldGraphics(c);
  for(const sample of g.electric){const expected=fields(sample.position,c).electric;sample.vector.forEach((v,i)=>assert.ok(v===expected[i]));}
  for(const sample of g.magnetic)assert.deepEqual(sample.vector,[0,0,magneticT]);
  assert.equal(g.electricReferenceVM,2*Math.abs(voltage)/c.radius);
  if(voltage){const a=g.electric[0],b=g.electric[8];assert.ok(Math.abs(b.vector[0]/a.vector[0]-.65/.25)<1e-12);}
  for(const {position}of [...g.electric,...g.magnetic]){
   assert.ok(Math.hypot(position[0],position[1])<c.radius);assert.ok(position[2]>0&&position[2]<c.length);
  }
 }
});

test('ICR graphics show uniform rotating RF at the stated physical phase and handedness',()=>{
 for(const rfHandedness of [-1,1] as const)for(const fraction of [0,.25,.5]){
  const c={...DEFAULT_CONFIG,mode:'icr' as const,voltage:0,rfAmplitudeVM:60,rfFrequencyHz:40000,rfHandedness};
  const time=fraction/c.rfFrequencyHz,g=fieldGraphics(c,time),expected=rfField(time,60,40000,rfHandedness);
  for(const sample of g.electric)sample.vector.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-12));
  assert.equal(g.electricReferenceVM,60);assert.equal(g.time,time);
 }
 const zero=fieldGraphics({...DEFAULT_CONFIG,mode:'icr',voltage:0,rfAmplitudeVM:0});
 assert.ok(zero.electric.every(s=>s.vector.every(v=>v===0)));assert.equal(zero.electricReferenceVM,0);
});

test('nonfinite or singular field graphics are rejected before producing render geometry',()=>{
 for(const change of [{radius:0},{length:0},{magneticT:NaN},{voltage:Infinity},{mode:'icr' as const,rfFrequencyHz:NaN}])
  assert.throws(()=>fieldGraphics({...DEFAULT_CONFIG,...change}),/finite fields/);
});
