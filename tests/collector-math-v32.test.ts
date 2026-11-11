import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceOrbit, type Model, type Particle} from '../src/physics.js';

const model:Model={radius:1,length:1,magneticT:1,voltage:0};
const witness:Particle={position:[.99999,0,.5],velocity:[.003,-.5,0]};

// Independent uniform-B geometry: the synchronized Boris path traverses the
// physical circle with theta=2atan(tau/2). No production root helper is used.
function circleFirstTime(p:Particle,radius=1):number|null {
 const [x,y]=p.position,[vx,vy]=p.velocity,cx=x+vy,cy=y-vx;
 const A=2*(-cx*vy+cy*vx),B=2*(cx*vx+cy*vy);
 const C=cx*cx+cy*cy+vx*vx+vy*vy-radius*radius,R=Math.hypot(A,B);
 if(R===0||Math.abs(C)>R)return null;
 const angle=Math.acos(-C/R),phase=Math.atan2(B,A),turn=2*Math.PI;
 const candidates=[phase-angle,phase+angle].map(t=>((t%turn)+turn)%turn).filter(t=>t>1e-12);
 return candidates.length?2*Math.tan(Math.min(...candidates)/2):null;
}

test('independent circle oracle resolves the retained grazing leave/reenter witness',()=>{
 const result=advanceOrbit(witness,1,.03,model),ref=circleFirstTime(witness)!;
 assert.equal(result.hit?.destination,'wall');
 assert.ok(Math.abs(result.elapsedS-ref)<2e-11,`${result.elapsedS} versus ${ref}`);
 assert.ok(Math.abs(Math.hypot(...result.particle.position.slice(0,2))-1)<2e-15);
});

test('pure-B earliest events agree with independent circle geometry over randomized cases',()=>{
 let seed=723253,checked=0;
 const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
 for(let n=0;n<10000;n++){
  const angle=2*Math.PI*random(),r=.99+.009999*random();
  const p:Particle={position:[r*Math.cos(angle),r*Math.sin(angle),.5],velocity:[20*random()-10,20*random()-10,0]};
  const ref=circleFirstTime(p);
  const result=advanceOrbit(p,1,.03,model);
  if(ref!==null&&ref>0&&ref<.03){
   checked++;assert.equal(result.hit?.destination,'wall');
   assert.ok(Math.abs(result.elapsedS-ref)<2e-10,`${result.elapsedS} versus ${ref}`);
  }else assert.equal(result.hit,null);
 }
 assert.ok(checked>1000);
});

test('finite axial surfaces compete against the curved wall event',()=>{
 const earlier=advanceOrbit({...witness,position:[.99999,0,.999],velocity:[.003,-.5,1]},1,.03,model);
 assert.equal(earlier.hit?.destination,'end');assert.ok(Math.abs(earlier.elapsedS-.001)<1e-15);
 const later=advanceOrbit({...witness,position:[.99999,0,.99],velocity:[.003,-.5,1]},1,.03,model);
 assert.equal(later.hit?.destination,'wall');
 const source=advanceOrbit({...witness,position:[.99999,0,.001],velocity:[.003,-.5,-1]},1,.03,model);
 assert.equal(source.hit?.destination,'source');assert.ok(Math.abs(source.elapsedS-.001)<1e-15);
});

test('an inward surface launch does not collect immediately',()=>{
 const result=advanceOrbit({position:[1,0,.5],velocity:[-.1,0,0]},1,.03,model);
 assert.equal(result.hit,null);
});

test('an outward surface launch collects immediately',()=>{
 const result=advanceOrbit({position:[1,0,.5],velocity:[.1,0,0]},1,.03,model);
 assert.equal(result.hit?.destination,'wall');assert.equal(result.elapsedS,0);
});

test('constant RF is treated as constant electric acceleration, independent ballistic oracle',()=>{
 const m={...model,magneticT:0},p:Particle={position:[.9,0,.5],velocity:[.1,0,0]};
 const result=advanceOrbit(p,1,.03,m,{timeS:3,amplitudeVM:100,frequencyHz:0,handedness:-1});
 // Guard-admissible impulse is not required for exact degree-zero RF.
 const expected=(-.1+Math.sqrt(.01+20))/100;
 assert.equal(result.hit,null);assert.ok(expected>.03);
 const p2:Particle={position:[.999,0,.5],velocity:[.1,0,0]};
 const hit=advanceOrbit(p2,1,.03,m,{timeS:3,amplitudeVM:1,frequencyHz:0,handedness:1});
 const ref=(-.1+Math.sqrt(.01+.002));
 assert.equal(hit.hit?.destination,'wall');assert.ok(Math.abs(hit.elapsedS-ref)<1e-13);
});

test('time-dependent RF events agree with independent matrix-position bisection',()=>{
 let checked=0,leaveReenter=0;
 for(const B of [-1,1])for(const handedness of [-1,1] as const)for(const phase of [0,.123,10,500,3000]){
  const h=.03,frequencyHz=1/(2*Math.PI),drive={timeS:phase,amplitudeVM:.01,frequencyHz,handedness};
  const m={...model,magneticT:B};
  const p:Particle={position:[.99999,0,.5],velocity:[.003,-.5*B,0]};
  // Independent rational matrix reduction of the trajectory; no production
  // step, rfField, wall polynomial or polynomialRoots is used as an oracle.
  const residual=(tau:number)=>{
   const t=B*tau/2,D=1+t*t,phi=2*Math.PI*frequencyHz*(drive.timeS+tau/2);
   const Ex=drive.amplitudeVM*Math.cos(phi),Ey=handedness*drive.amplitudeVM*Math.sin(phi);
   const x=p.position[0]+(tau*p.velocity[0]+tau*t*p.velocity[1]+tau*tau/2*(Ex+t*Ey))/D;
   const y=p.position[1]+(tau*p.velocity[1]-tau*t*p.velocity[0]+tau*tau/2*(Ey-t*Ex))/D;
   return Math.hypot(x,y)-1;
  };
  let lower=0,upper:number|null=null;
  for(let i=1;i<=2000;i++){
   const tau=h*i/2000;if(residual(tau)>=0){upper=tau;break;}lower=tau;
  }
  assert.notEqual(upper,null,'RF witness must contain a comfortably resolved outward excursion');
  for(let i=0;i<70;i++){const middle=(lower+upper!)/2;if(residual(middle)>=0)upper=middle;else lower=middle;}
  const ref=(lower+upper!)/2,result=advanceOrbit(p,1,h,m,drive);
  assert.equal(result.hit?.destination,'wall');assert.ok(Math.abs(result.elapsedS-ref)<2e-10,`${result.elapsedS} vs ${ref}`);
  checked++;if(residual(h)<0)leaveReenter++;
 }
 assert.equal(checked,20);assert.ok(leaveReenter>=12);
});

test('interior tangency absorbs and a resolved near miss does not enlarge the detector',()=>{
 const theta=.01,R=.5,p:Particle={position:[.5+R*Math.cos(theta),R*Math.sin(theta),.5],
  velocity:[R*Math.sin(theta),-R*Math.cos(theta),0]};
 const tangent=advanceOrbit(p,1,.03,model);
 assert.equal(tangent.hit?.destination,'wall');
 assert.ok(Math.abs(tangent.elapsedS-2*Math.tan(theta/2))<1e-8);
 const Rinside=.5-1e-12,miss:Particle={position:[.5+Rinside*Math.cos(theta),Rinside*Math.sin(theta),.5],
  velocity:[Rinside*Math.sin(theta),-Rinside*Math.cos(theta),0]};
 assert.equal(advanceOrbit(miss,1,.03,model).hit,null);
});
