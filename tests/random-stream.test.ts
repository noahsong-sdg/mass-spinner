import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {createRandomStream,philox4x32,type Counter128,type PhiloxKey,RANDOM_STREAM_VERSION} from '../src/random-stream.js';

test('all upstream Philox4x32 ten-round known-answer vectors',()=>{
  // Official tests/kat_vectors at Random123 commit named in the module.
  const vectors=[
    '00000000 00000000 00000000 00000000 00000000 00000000 6627e8d5 e169c58d bc57ac4c 9b00dbd8',
    'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff 408f276d 41c83b0e a20bc7c6 6d5451fd',
    '243f6a88 85a308d3 13198a2e 03707344 a4093822 299f31d0 d16cfe09 94fdcceb 5001e420 24126ea1'];
  for(const line of vectors){
    const data=line.split(' ').map(word=>parseInt(word,16));
    assert.deepEqual(philox4x32(data.slice(0,4) as unknown as Counter128,
      data.slice(4,6) as unknown as PhiloxKey),data.slice(6,10));
  }
  assert.equal(RANDOM_STREAM_VERSION,'philox4x32-10-u32-v1');
});

test('stream words, counter carry, maximum key, replay and input immutability',()=>{
  const counters:readonly [Counter128,Counter128][]=[
    [[0,0,0,0],[1,0,0,0]],
    [[0xffffffff,0,0,0],[0,1,0,0]],
    [[0xffffffff,0xffffffff,0,0],[0,0,1,0]],
    [[0xffffffff,0xffffffff,0xffffffff,0],[0,0,0,1]],
    [[0xfffffffe,0xffffffff,0xffffffff,0xffffffff],[0xffffffff,0xffffffff,0xffffffff,0xffffffff]]];
  for(const [initial,next] of counters){
    const saved=[...initial];
    const stream=createRandomStream(0xffffffff,0xffffffff,initial);
    assert.deepEqual(Array.from({length:8},()=>stream()),
      [...philox4x32(initial,[0xffffffff,0xffffffff]),...philox4x32(next,[0xffffffff,0xffffffff])]
        .map(word=>word/4294967296));
    assert.deepEqual(initial,saved);
  }
  const a=createRandomStream(505,0),b=createRandomStream(505,0),other=createRandomStream(505,1);
  const draws=Array.from({length:4000},()=>a());
  assert.deepEqual(draws,Array.from({length:4000},()=>b()));
  assert.notDeepEqual(draws,Array.from({length:4000},()=>other()));
  assert.ok(draws.every(u=>u>=0&&u<1&&Number.isInteger(u*4294967296)));
});

test('last complete 128-bit counter block is available, then exhaustion throws',()=>{
  const last:Counter128=[0xffffffff,0xffffffff,0xffffffff,0xffffffff];
  const stream=createRandomStream(0,1,last);
  assert.deepEqual(Array.from({length:4},()=>stream()),philox4x32(last,[0,1]).map(word=>word/4294967296));
  assert.throws(stream,/exhausted/);assert.throws(stream,/exhausted/);
});

test('invalid and sparse words cannot alias valid seed/key/counter tuples',()=>{
  for(const bad of [-1,4294967296,.1,NaN,Infinity,-Infinity,null,undefined,'1']){
    assert.throws(()=>createRandomStream(bad as number,0));
    assert.throws(()=>createRandomStream(0,bad as number));
    assert.throws(()=>createRandomStream(0,0,[0,0,0,bad as number]));
  }
  assert.throws(()=>philox4x32(new Array(4) as unknown as Counter128,[0,0]));
  assert.throws(()=>philox4x32([0,0,0,0],new Array(2) as unknown as PhiloxKey));
  assert.throws(()=>createRandomStream(0,0,[0,0,0] as unknown as Counter128));
  assert.throws(()=>philox4x32([0,0,0,0],[0,0,0] as unknown as PhiloxKey));
});
