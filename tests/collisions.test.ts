import test from 'node:test';
import assert from 'node:assert/strict';
import {elasticCollision,collisionProbability} from '../src/collisions.js';
import type {Vec} from '../src/physics.js';

const close=(actual:number,expected:number,tolerance=1e-12)=>
  assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);
const speed2=(v:Vec)=>v.reduce((sum,component)=>sum+component**2,0);

test('unequal-mass elastic collisions conserve both-body momentum and kinetic energy',()=>{
  const initial:Vec=[1200,-700,400];
  for(const [ionMass,neutralMass] of [[40,84],[84,4],[4,84]]){
    for(const draws of [[.1,.2],[.45,.9],[.8,.35]]){
      let index=0;
      const result=elasticCollision(initial,ionMass,neutralMass,()=>draws[index++]);
      initial.forEach((value,axis)=>close(ionMass*result.ionVelocity[axis]+neutralMass*result.neutralVelocity[axis],ionMass*value));
      close(ionMass*speed2(result.ionVelocity)+neutralMass*speed2(result.neutralVelocity),ionMass*speed2(initial));
    }
  }
});

test('equal-mass head-on collision transfers the incoming velocity to the neutral',()=>{
  // Polar cosine 0 and azimuth pi reverse the initial +x relative velocity.
  const result=elasticCollision([1500,0,0],40,40,()=>.5);
  result.ionVelocity.forEach(value=>close(value,0,1e-10));
  result.neutralVelocity.forEach((value,axis)=>close(value,axis===0?1500:0,1e-10));
  assert.deepEqual(elasticCollision([0,0,0],40,84,()=>.5),{ionVelocity:[0,0,0],neutralVelocity:[0,0,0]});
});

test('outgoing relative direction has isotropic first and second angular moments',()=>{
  const polarBins=40,azimuthBins=64,mean=[0,0,0],second=[0,0,0],cross=[0,0,0];
  for(let i=0;i<polarBins;i++)for(let j=0;j<azimuthBins;j++){
    const draws=[(i+.5)/polarBins,(j+.5)/azimuthBins];let index=0;
    const result=elasticCollision([1,0,0],40,84,()=>draws[index++]);
    const direction=result.ionVelocity.map((value,axis)=>value-result.neutralVelocity[axis]);
    direction.forEach((value,axis)=>{mean[axis]+=value;second[axis]+=value**2;});
    cross[0]+=direction[0]*direction[1];cross[1]+=direction[1]*direction[2];cross[2]+=direction[2]*direction[0];
  }
  const count=polarBins*azimuthBins;
  mean.forEach(value=>close(value/count,0,1e-14));
  cross.forEach(value=>close(value/count,0,1e-14));
  // Midpoint quadrature in cos(theta) has a known O(1/polarBins²) second-moment error.
  second.forEach(value=>close(value/count,1/3,1/polarBins**2));
});

test('event probability has correct limits and exact exponential no-collision survival',()=>{
  assert.equal(collisionProbability(0,1,1,1),0);
  assert.equal(collisionProbability(1,0,1,1),0);
  assert.equal(collisionProbability(1,1,0,1),0);
  assert.equal(collisionProbability(1,1,1,0),0);
  assert.equal(collisionProbability(0,1e300,1e300,1),0);
  close(collisionProbability(1,1,1,1e-12)/1e-12,1,1e-12);
  close(collisionProbability(1,1,1,1),1-Math.exp(-1));
  assert.equal(collisionProbability(1,1,1,1000),1);
  for(const steps of [1,10,1000]){
    const probability=collisionProbability(10,3,.1,1/steps);
    close((1-probability)**steps,Math.exp(-3),1e-13);
  }
  // Uniform quadrature of independent event draws gives the expected Bernoulli mean.
  const probability=collisionProbability(10,3,.1,.1),count=10000;
  let events=0;
  for(let i=0;i<count;i++)if((i+.5)/count<probability)events++;
  close(events/count,probability,1/count);
});

test('collision domain rejects nonphysical masses and rates',()=>{
  assert.throws(()=>elasticCollision([1,0,0],0,40,()=>.5));
  assert.throws(()=>elasticCollision([1,0,0],40,-1,()=>.5));
  assert.throws(()=>elasticCollision([NaN,0,0],40,40,()=>.5));
  assert.throws(()=>collisionProbability(-1,1,1,1));
  assert.throws(()=>collisionProbability(1,Infinity,1,1));
});
