import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFuelGasMass,fuelGasFaceTemperature,fuelGasState} from '../src/fuel-gas.js';
import {advanceFuelRadialMass} from '../src/fuel-transport.js';
const K=1.380649e-23,M=7*1.66053906892e-27;
const sum=(a:number[])=>a.reduce((s,x)=>s+x,0);
const close=(a:number,b:number,tolerance=2e-12)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} versus ${b}`);

test('SG retains sub-inventory-resolution transfers and exactly stationary uniform gas',()=>{
 const radius=.01,dt=.01,D=1e-30,p=[.75,.25],a=dt*8*D/radius**2;
 const moved=advanceFuelGasMass(p,[1000,1000],M,0,radius,D,dt),expected=a*(p[0]-p[1])/(1+2*a);
 assert.ok(Math.abs(moved.faceTransfers[0]/expected-1)<2e-12,
  `Resolved transfer ${moved.faceTransfers[0]} must retain ${expected} even when stored inventories cannot change.`);
 assert.deepEqual(moved.mass,p);
 for(const cells of [2,8,32])for(const step of [.007,1,100]){
  const uniform=Array(cells).fill(1/cells),equilibrium=advanceFuelGasMass(uniform,Array(cells).fill(1000),M,0,radius,.001,step);
  assert.ok(equilibrium.faceTransfers.every(v=>v===0),'Uniform pressure without rotation has exactly zero driving force.');
 }
});

test('direct SG transfer matches independent two-cell BE balance over signed and stiff cases',()=>{
 const radius=.01,temperature=1000;
 for(const p of [[1,0],[0,1],[.75,.25]])for(const dt of [1e-20,.01,1e8])for(const omega of [0,3e5]){
  const D=.001,z=M*omega**2*radius**2/(4*K*temperature),b=z===0?1:z/Math.expm1(z);
  const scale=dt*8*D/radius**2,a=scale*(b+z),c=scale*b;
  const expected=(a*p[0]-c*p[1])/(1+a+c),actual=advanceFuelGasMass(p,[temperature,temperature],M,omega,radius,D,dt);
  assert.ok(Math.abs(actual.faceTransfers[0]-expected)<2e-12*Math.abs(expected));
  assert.ok(actual.mass.every(v=>v>=0));
  actual.mass.forEach((v,i)=>close(v-p[i]-(i?actual.faceTransfers[0]:-actual.faceTransfers[0]),actual.storageDefect[i]));
 }
});

test('bounded offline gas refinement supports 4096 cells without changing positivity or inventory gates',()=>{
 const n=4096,p=Array(n).fill(1/n),temperature=Array.from({length:n},(_,i)=>1000+1e-5*(i+.5)/n);
 const moved=advanceFuelGasMass(p,temperature,M,0,.01,.001,1e-6/256);
 assert.equal(moved.mass.length,n);assert.ok(moved.mass.every(v=>Number.isFinite(v)&&v>0));
 close(sum(moved.mass),1,2e-12);
 assert.throws(()=>advanceFuelGasMass(Array(n+1).fill(1/(n+1)),Array(n+1).fill(1000),M,0,.01,.001,0),/2–4096/);
});

test('uniform-temperature gas transport retains the isothermal SG reference',()=>{
 const n=32,m=Array.from({length:n},(_,i)=>i+1),p=m.map(v=>v/sum(m)),temperature=500,omega=1800,radius=.12,D=.02,dt=.03;
 const actual=advanceFuelGasMass(p,Array(n).fill(temperature),M,omega,radius,D,dt);
 const expected=advanceFuelRadialMass(p,M*omega**2*radius**2/(2*K*temperature),4*D/radius**2,dt);
 actual.mass.forEach((v,i)=>close(v,expected[i]));
 for(let i=0;i<n;i++)close(actual.mass[i]-p[i],(i?actual.faceTransfers[i-1]:0)-(i<n-1?actual.faceTransfers[i]:0));
});

test('nonisothermal zero-rotation equilibrium has uniform partial pressure',()=>{
 const temperatures=[300,400,700,1000,1600],inverse=temperatures.map(t=>1/t),p=inverse.map(v=>v/sum(inverse));
 const actual=advanceFuelGasMass(p,temperatures,M,0,.12,.02,10);
 actual.mass.forEach((v,i)=>close(v,p[i]));
 actual.faceTransfers.forEach(v=>close(v,0));
});

test('nonisothermal rotating equilibrium and face entropy force agree',()=>{
 const temperatures=[350,450,650,850,1050,1250],omega=800,radius=.12,n=temperatures.length,w=[1];
 for(let i=0;i<n-1;i++)w.push(w[i]*Math.exp(M*omega**2*radius**2/(2*K*n)*(.5/temperatures[i]+.5/temperatures[i+1])));
 const raw=w.map((v,i)=>v/temperatures[i]),p=raw.map(v=>v/sum(raw));
 const actual=advanceFuelGasMass(p,temperatures,M,omega,radius,.02,2);
 actual.mass.forEach((v,i)=>close(v,p[i]));
 const perturbed=p.map((v,i)=>v*(i<3?1.4:.6)),initial=perturbed.map(v=>v/sum(perturbed));
 const next=advanceFuelGasMass(initial,temperatures,M,omega,radius,.02,.1);
 for(let i=0;i<n-1;i++){
  const z=M*omega**2*radius**2/(2*K*n)*(.5/temperatures[i]+.5/temperatures[i+1]);
  const force=Math.log(next.mass[i]*temperatures[i]/(next.mass[i+1]*temperatures[i+1]))+z;
  assert.ok(next.faceTransfers[i]*force>=-1e-14,'SG transfer must follow its entropy force');
 }
});

test('face temperature is symmetric and satisfies the enthalpy entropy identity',()=>{
 for(const [a,b] of [[300,1900],[500,500.0000001],[500,500],[1900,300]]){
  const t=fuelGasFaceTemperature(a,b);assert.ok(t>=Math.min(a,b)&&t<=Math.max(a,b));
  close(t,fuelGasFaceTemperature(b,a),2e-11);
  const logarithm=Math.log(b/a),bound=8*Number.EPSILON*(Math.abs(t/b)+Math.abs(t/a)+Math.abs(logarithm));
  close(t*(1/b-1/a),-logarithm,bound);
 }
 const a=300,b=1900,incorrect=(a+b)/2;
 assert.ok(Math.abs(incorrect*(1/b-1/a)+Math.log(b/a))>1e-3,'Arithmetic mean must fail the entropy identity');
 const extreme=fuelGasFaceTemperature(1e-200,1e200);
 assert.ok(Number.isFinite(extreme)&&extreme>=1e-200&&extreme<=1e200);
 assert.equal(extreme,fuelGasFaceTemperature(1e200,1e-200));
});

test('gas state reconstructs inventory, local pressure and species energy',()=>{
 const light=[.1,.2,.3,.4],heavy=[.4,.3,.2,.1],x=.2,N=1e20,temperatures=[400,500,600,700];
 const energies=temperatures.map((t,i)=>1.5*K*N*(x*light[i]+(1-x)*heavy[i])*t);
 const gas=fuelGasState(light,heavy,energies,{number:N,radiusM:.12,lengthM:.8,lightFraction:x});
 gas.temperatureK.forEach((t,i)=>close(t,temperatures[i]));
 for(let i=0;i<4;i++){
  close(gas.speciesEnergyJ[0][i]+gas.speciesEnergyJ[1][i],energies[i]);
  close(gas.pressurePa[i]*(Math.PI*.12**2*.8/4),2/3*energies[i]);
 }
 close(gas.meanK,energies.reduce((a,b)=>a+b,0)/(1.5*K*N));
 close(gas.minK,400);close(gas.maxK,700);
});

test('pure endpoint species has zero absent-species energy and undefined empty cells fail',()=>{
 const gas=fuelGasState([.5,.5],[.5,.5],[1,2],{number:1e20,radiusM:.12,lengthM:.8,lightFraction:0});
 assert.deepEqual(gas.speciesEnergyJ[0],[0,0]);
 assert.throws(()=>fuelGasState([1,0],[1,0],[1,1],{number:1e20,radiusM:.12,lengthM:.8,lightFraction:.5}),/Cell particle/);
 assert.throws(()=>advanceFuelGasMass([.5,.5],[500,0],M,0,.12,.02,.1),/temperature/);
});

test('large-step transport remains positive and conservative without clipping',()=>{
 const n=128,p=Array(n).fill(0);p[0]=1;
 const next=advanceFuelGasMass(p,Array.from({length:n},(_,i)=>300+1200*i/(n-1)),M,1e4,.12,.2,100);
 assert.ok(next.mass.every(v=>v>=0&&Number.isFinite(v)));close(sum(next.mass),1,2e-11);
 const unchanged=advanceFuelGasMass(p,Array(n).fill(500),M,0,.12,0,100);
 assert.deepEqual(unchanged.mass,p);assert.ok(unchanged.faceTransfers.every(v=>v===0));
});

test('prescribed spatial-temperature transport converges under timestep refinement',()=>{
 const n=12,temperatures=Array.from({length:n},(_,i)=>400+40*i),initial=Array(n).fill(1/n),duration=.08;
 function evolve(steps:number){
  let p=[...initial];for(let j=0;j<steps;j++)p=advanceFuelGasMass(p,temperatures,M,900,.12,.02,duration/steps).mass;
  return p;
 }
 const reference=evolve(512),errors=[4,8,16,32].map(steps=>sum(evolve(steps).map((v,i)=>Math.abs(v-reference[i]))));
 for(let i=1;i<errors.length;i++)assert.ok(errors[i]<errors[i-1]*.7,`${errors}`);
});
