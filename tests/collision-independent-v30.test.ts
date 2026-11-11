import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {AMU,E_CHARGE,type Vec} from '../src/physics.js';
import {coulombVariance,scatterCoulombPair,sampleNanbuCosine,collideCoulombCell} from '../src/coulomb.js';
import {collideAxisymmetricCell} from '../src/axisymmetric-collisions.js';
import {seedInterval,equivalence} from '../src/convergence.js';

// Independent references: no production inverse-Langevin helper, scattering
// formula or thermodynamic-moment helper is used to form expected values.
const epsilon=8.8541878128e-12;
const norm2=(v:Vec)=>v.reduce((sum,x)=>sum+x*x,0);
const evidence:Record<string,unknown>={scope:'Bounded independent reduced-operator checks, not full transport qualification'};
test.after(()=>{if(process.env.COLLISION_INDEPENDENT_EVIDENCE)writeFileSync(process.env.COLLISION_INDEPENDENT_EVIDENCE,JSON.stringify(evidence,null,2)+'\n');});
const close=(a:number,b:number,scale:number,tolerance=3e-12)=>assert.ok(Math.abs(a-b)<=tolerance*scale,`${a} != ${b}; scale ${scale}`);
const rng=(seed:number)=>()=>{seed=(seed+0x6d2b79f5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
const normal=(r:()=>number)=>Math.sqrt(-2*Math.log1p(-r()))*Math.cos(2*Math.PI*r());

function referenceA(s:number){
 const target=Math.exp(-s);if(target===0)return 0;
 const langevin=(a:number)=>a<.05?a/3-a**3/45+2*a**5/945-a**7/4725+2*a**9/93555:
  1+2/Math.expm1(2*a)-1/a;
 let lo=0,hi=2/(-Math.expm1(-s));
 for(let i=0;i<100;i++){const mid=(lo+hi)/2;if(langevin(mid)<target)lo=mid;else hi=mid;}
 return (lo+hi)/2;
}

test('independent SI coefficient and Nanbu normalized time use the same unequal-mass generator',()=>{
 const records=[];
 for(const massA of [1,40,200])for(const massB of [2,84])for(const chargeA of [1,3]){
  const a={massU:massA,chargeState:chargeA,velocity:[1700,-2000,1000] as Vec};
  const b={massU:massB,chargeState:2,velocity:[-700,200,4000] as Vec};
  const mu=AMU/(1/massA+1/massB),g=Math.sqrt(2400**2+2200**2+3000**2),density=1e18,log=10;
  const rutherford=chargeA*2*E_CHARGE**2/(4*Math.PI*epsilon*mu*g*g);
  // s=4*pi*b_90^2*n*g*lnLambda*dt; TA half-angle variance=s/2.
  const rate=4*Math.PI*rutherford**2*density*g*log;
  const variance=coulombVariance(a,b,density,log,1e-7);
  close(2*variance,rate*1e-7,rate*1e-7);
  records.push({massA,massB,chargeA,sPerSecond:rate});
 }
 evidence.siCoefficient=records;
});

test('Nanbu actual sampler has its declared l1 and l2 moments without a large-s backscatter artifact',()=>{
 const records=[];const n=65536;
 for(const s of [.001,.03,.1,.2,.5,1,2,6,20,1000]){
  let first=0,second=0;
  for(let i=0;i<n;i++){
   const mu=sampleNanbuCosine(s,()=>(i+.5)/n);
   assert.ok(Number.isFinite(mu)&&mu>=-1&&mu<=1);
   first+=mu/n;second+=(3*mu*mu-1)/(2*n);
  }
  const a=referenceA(s),l1=Math.exp(-s),l2=a===0?0:1-3*l1/a;
  close(first,l1,1,1.2e-5);close(second,l2,1,4e-5);
  records.push({s,meanCosine:first,expectedCosine:l1,meanP2:second,expectedNanbuP2:l2,
   diffusionP2:Math.exp(-3*s),diffusionP2Bias:second-Math.exp(-3*s)});
 }
 // Nanbu's exponential-family law is not the exact spherical heat kernel.
 assert.ok(Math.abs(records.find(r=>r.s===1)!.diffusionP2Bias)>.02);
 evidence.angularMoments=records;
});

test('actual unlike-pair drift and anisotropic second moments agree with independently derived conditional moments',()=>{
 const a={massU:40,chargeState:2,velocity:[3100,-1700,800] as Vec},b={massU:84,chargeState:1,velocity:[-1300,500,-2400] as Vec};
 const total=a.massU+b.massU,beta=b.massU/total,center=a.velocity.map((v,i)=>(a.massU*v+b.massU*b.velocity[i])/total);
 const relative=a.velocity.map((v,i)=>v-b.velocity[i]),g2=relative.reduce((sum,v)=>sum+v*v,0);
 const rate=2*coulombVariance(a,b,1e18,10,1),records=[];
 for(const s of [.01,.2,1,10]){
  const first=[0,0,0],second=Array.from({length:3},()=>[0,0,0]);let worstEnergy=0,worstMomentum=0;
  const l1=Math.exp(-s),refA=referenceA(s),l2=1-3*l1/refA,n=8192;
  for(let i=0;i<n;i++)for(let phi=0;phi<4;phi++){
   const draws=[(i+.5)/n,phi/4];let draw=0;
   const out=scatterCoulombPair(a,b,1e18,10,s/rate,()=>draws[draw++],'nanbu');
   assert.equal(draw,2);
   for(let j=0;j<3;j++){
    first[j]+=out.velocityA[j]/(4*n);
    for(let k=0;k<3;k++)second[j][k]+=out.velocityA[j]*out.velocityA[k]/(4*n);
    const momentumScale=Math.sqrt((a.massU+b.massU)*(a.massU*norm2(a.velocity)+b.massU*norm2(b.velocity)));
    worstMomentum=Math.max(worstMomentum,Math.abs(a.massU*out.velocityA[j]+b.massU*out.velocityB[j]-a.massU*a.velocity[j]-b.massU*b.velocity[j])/momentumScale);
   }
   const e0=a.massU*norm2(a.velocity)+b.massU*norm2(b.velocity);
   worstEnergy=Math.max(worstEnergy,Math.abs((a.massU*norm2(out.velocityA)+b.massU*norm2(out.velocityB))/e0-1));
  }
  let firstError=0,secondError=0;
  for(let j=0;j<3;j++){
   const expected=center[j]+beta*l1*relative[j];
   firstError=Math.max(firstError,Math.abs(first[j]-expected)/Math.sqrt(g2));
   for(let k=0;k<3;k++){
    const expected=center[j]*center[k]+beta*l1*(center[j]*relative[k]+center[k]*relative[j])+
     beta*beta*(g2*(1-l2)/3*(j===k?1:0)+l2*relative[j]*relative[k]);
    secondError=Math.max(secondError,Math.abs(second[j][k]-expected)/g2);
   }
  }
  assert.ok(firstError<4e-5&&secondError<4e-5);assert.ok(worstEnergy<3e-12&&worstMomentum<3e-12);
  records.push({s,firstError,secondError,worstEnergy,worstMomentum});
 }
 evidence.conditionalMoments=records;
});

test('Nanbu zero-time/zero-relative-speed and uniform endpoints respect the physical domain',()=>{
 const never=()=>{throw new Error('zero collision must not consume a random draw');};
 assert.equal(sampleNanbuCosine(0,never),1);
 for(const s of [Number.MIN_VALUE,1e-15,.001,.05,.1,1,6,20,1000]){
  assert.equal(sampleNanbuCosine(s,()=>0),1);
  const mu=sampleNanbuCosine(s,()=>1-Number.EPSILON);
  assert.ok(Number.isFinite(mu)&&mu>=-1&&mu<=1);
 }
 for(const invalid of [-1,NaN])assert.throws(()=>sampleNanbuCosine(invalid,()=>.5));
 // Positive infinity is the intentional isotropic limit when 2 times a
 // finite TA variance overflows; it is not a fitted/capped physical rate.
 assert.equal(sampleNanbuCosine(Infinity,()=>.25),.5);
 const a={massU:40,chargeState:1,velocity:[1,2,3] as Vec},b={massU:84,chargeState:1,velocity:[1,2,3] as Vec};
 assert.deepEqual(scatterCoulombPair(a,b,1e18,10,1,never,'nanbu').velocityA,a.velocity);
});

test('Nanbu branch boundaries and broad log-grid quantiles remain finite, ordered and continuous',()=>{
 const quantiles=[0,Number.MIN_VALUE,.01,.1,.5,.9,.99,1-Number.EPSILON];
 const points=[Number.MIN_VALUE,...Array.from({length:10001},(_,i)=>10**(-320+i*323/10000)),
  ...Array.from({length:10001},(_,i)=>.05+15*i/10000),
  ...[.05,Math.log(1e4),Math.log(1e6),744,746].flatMap(s=>[s*(1-1e-12),s,s*(1+1e-12)])].sort((a,b)=>a-b);
 let previous=quantiles.map(()=>1),largestIncrease=0;
 for(const s of points){
  const current=quantiles.map(u=>sampleNanbuCosine(s,()=>u));
  current.forEach((mu,j)=>{
   assert.ok(Number.isFinite(mu)&&mu>=-1&&mu<=1,`s=${s},u=${quantiles[j]},mu=${mu}`);
   if(j)assert.ok(mu<=current[j-1],`quantile order at s=${s}`);
   largestIncrease=Math.max(largestIncrease,mu-previous[j]);
   assert.ok(mu<=previous[j]+2e-12,`stochastic order at s=${s},u=${quantiles[j]}`);
  });
  previous=current;
 }
 evidence.quantileGrid={points:points.length,quantiles:quantiles.length,largestIncrease};
});

test('Nanbu rare backward-tail quantiles match independent 80-digit arithmetic',()=>{
 // Independent Decimal(80) bisection of coth(A)-1/A=exp(-s), then the
 // logarithm of the sum of its two strictly positive survival terms.
 const references=[[.062,-.996364843924595341357],[.0635,-.998235136407114652288]];
 const records=references.map(([s,expected])=>{
  const actual=sampleNanbuCosine(s,()=>1-Number.EPSILON);
  close(actual,expected,1,2e-12);return{s,expected,actual};
 });
 evidence.backwardTail=records;
});

test('finite radial lever arms remain an explicit torque source with the new angular law',()=>{
 const a={massU:40,chargeState:1,position:[.05,0,.2] as Vec,velocity:[1000,2000,3000] as Vec};
 const b={massU:84,chargeState:2,position:[0,.08,.2] as Vec,velocity:[-700,-3000,1000] as Vec};
 const angular=()=>a.massU*(a.position[0]*a.velocity[1]-a.position[1]*a.velocity[0])+b.massU*(b.position[0]*b.velocity[1]-b.position[1]*b.velocity[0]);
 const before=angular();let predicted=0;
 collideAxisymmetricCell([a,b],1e18,10,1e-7,rng(128),(p,q,dp)=>{
  predicted+=(Math.hypot(p.position[0],p.position[1])-Math.hypot(q.position[0],q.position[1]))*dp[1]/AMU;
 },'nanbu');
 close(angular()-before,predicted,Math.max(Math.abs(before),Math.abs(predicted)));
 assert.ok(Math.abs(predicted)>0,'a changed angular sampler cannot silently remove spatial nonlocality');
 evidence.finiteGapTorque={measured:angular()-before,predicted};
});

test('six independent common-temperature ensembles retain stationary moments within unchanged observable budgets',t=>{
 const runs=[];
 for(const seed of [101,202,303,404,505,606]){
  const random=rng(seed),ions=Array.from({length:8192},(_,i)=>{
   const massU=i%2?84:40,sigma=Math.sqrt(5*E_CHARGE/(massU*AMU));
   return {massU,chargeState:1,velocity:[sigma*normal(random),sigma*normal(random),sigma*normal(random)] as Vec};
  });
  const observe=()=>[40,84].map(m=>{
   const group=ions.filter(p=>p.massU===m),sigma=Math.sqrt(5*E_CHARGE/(m*AMU));
   return {temperature:group.reduce((sum,p)=>sum+norm2(p.velocity),0)*m*AMU/(3*E_CHARGE*group.length),
    cdf:group.filter(p=>p.velocity[0]/sigma<=1).length/group.length};
  });
  const before=observe();
  for(let i=0;i<16;i++)collideCoulombCell(ions,1e18,10,1e-6,random,undefined,'nanbu');
  const after=observe();runs.push({seed,delta:after.map((v,i)=>({temperature:v.temperature-before[i].temperature,cdf:v.cdf-before[i].cdf}))});
 }
 const checks=[0,1].flatMap(species=>[['temperature',.1],['cdf',.01]].map(([key,budget])=>{
  const interval=seedInterval(runs.map(r=>r.delta[species][key as 'temperature'|'cdf']));
  return {species,key,interval,budget,status:equivalence(interval,budget as number,6)};
 }));
 evidence.stationarity={runs,checks};t.diagnostic(JSON.stringify(checks));
 for(const check of checks)assert.notEqual(check.status,'fail','a resolved stationarity failure is not hidden by conservation');
});

test('Nanbu initial unequal-temperature heat exchange meets the unchanged two-percent Landau rate gate',t=>{
 const ma=40*AMU,mb=84*AMU,ta=2,tb=10,density=5e17,log=12;
 const coupling=E_CHARGE**2/(4*Math.PI*epsilon),gVariance=E_CHARGE*(ta/ma+tb/mb);
 const exact=8*Math.sqrt(2*Math.PI)/3*density*coupling**2*log/(ma*mb*gVariance**1.5)*(tb-ta);
 // Maxwellian conditional mean E[U|g]. Independent CM residuals have zero
 // mean contribution to the energy-change expectation, so integrate them
 // analytically rather than introduce avoidable stochastic variance.
 const regression=E_CHARGE*(ta-tb)/((ma+mb)*gVariance),records=[];
 for(const dt of [1e-7,2.5e-8]){
  const rates=[];
  for(const seed of [101,202,303,404,505,606]){
   const random=rng(seed),samples=16384;let change=0;
   for(let i=0;i<samples;i++){
    const g=Array.from({length:3},()=>Math.sqrt(gVariance)*normal(random)),center=g.map(v=>regression*v);
    const a={massU:40,chargeState:1,velocity:g.map((v,j)=>center[j]+mb/(ma+mb)*v) as Vec};
    const b={massU:84,chargeState:1,velocity:g.map((v,j)=>center[j]-ma/(ma+mb)*v) as Vec};
    const u=random();
    for(const phi of [0,.5]){
     const draws=[u,phi];let draw=0;
     const out=scatterCoulombPair(a,b,density,log,dt,()=>draws[draw++],'nanbu');
     change+=(norm2(out.velocityA)-norm2(a.velocity))/2;
    }
   }
   rates.push(ma*change/(3*E_CHARGE*samples*dt));
  }
  const interval=seedInterval(rates),mean=interval.mean!,relativeError=(mean-exact)/exact;
  records.push({dtS:dt,rates,interval,exactEVPerS:exact,relativeError});
  assert.ok(Math.abs(mean-exact)<4*interval.standardError!+.04*exact);
 }
 assert.ok(Math.abs(records.at(-1)!.relativeError)<.02);
 evidence.heatExchange=records;t.diagnostic(JSON.stringify(records));
});
