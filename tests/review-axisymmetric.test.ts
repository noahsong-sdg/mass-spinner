import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE,type Vec} from '../src/physics.js';
import {axisymmetricCollisionCells,collideAxisymmetricCell,cylindricalVelocity} from '../src/axisymmetric-collisions.js';
import {DEFAULT_DOUBLEWELL,simulateDoublewell} from '../src/doublewell-dynamics.js';

const rng=(seed:number)=>()=>{seed=(seed+0x6d2b79f5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
const normal=(r:()=>number)=>Math.sqrt(-2*Math.log1p(-r()))*Math.cos(2*Math.PI*r());
const close=(a:number,b:number,tol=3e-11)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const ring=(r:number,phi:number,local:Vec,massU=40,z=.2)=>({position:[r*Math.cos(phi),r*Math.sin(phi),z] as Vec,
 velocity:[Math.cos(phi)*local[0]-Math.sin(phi)*local[1],Math.sin(phi)*local[0]+Math.cos(phi)*local[1],local[2]] as Vec,massU,chargeState:1});
const angular=(p:ReturnType<typeof ring>)=>p.massU*(p.position[0]*p.velocity[1]-p.position[1]*p.velocity[0]);

test('independent azimuth relabels preserve the axisymmetric collision operator and raw torque',()=>{
 const original=Array.from({length:17},(_,i)=>ring(.051+.001*i,.37*i,[1500-290*i,2000+83*i,-3000+650*i],i%2?84:40));
 const relabeled=original.map((p,i)=>ring(Math.hypot(p.position[0],p.position[1]),2.1-1.73*i,cylindricalVelocity(p.position,p.velocity),p.massU));
 const before=original.reduce((s,p)=>s+angular(p),0),beforeRelabeled=relabeled.reduce((s,p)=>s+angular(p),0);
 const a=collideAxisymmetricCell(original,1e18,10,2e-7,rng(17));
 const b=collideAxisymmetricCell(relabeled,1e18,10,2e-7,rng(17));
 close(a.meanVariance,b.meanVariance);assert.equal(a.pairs,b.pairs);
 original.forEach((p,i)=>cylindricalVelocity(p.position,p.velocity).forEach((v,k)=>close(v,cylindricalVelocity(relabeled[i].position,relabeled[i].velocity)[k])));
 close(original.reduce((s,p)=>s+angular(p),0)-before,relabeled.reduce((s,p)=>s+angular(p),0)-beforeRelabeled);
});

test('finite ring gaps produce real uncorrected angular error that refines quadratically in an antithetic rigid-flow probe',t=>{
 const omega=20000,losses:number[]=[];
 for(const gap of [.01,.005,.0025]){
  let meanTorque=0;
  for(const azimuth of [.3,.8]){
   const a=ring(.1-gap/2,.1,[0,omega*(.1-gap/2),-10000]);
   const b=ring(.1+gap/2,2.8,[0,omega*(.1+gap/2),10000],84);
   const before=angular(a)+angular(b),draws=[.8,.4,.1,azimuth];let n=0,observed=0;
   collideAxisymmetricCell([a,b],1e18,10,1e-7,()=>draws[n++],(first,second,impulse)=>{
    observed=(Math.hypot(first.position[0],first.position[1])-Math.hypot(second.position[0],second.position[1]))*impulse[1]/AMU;
   });
   const change=angular(a)+angular(b)-before;close(change,observed);
   meanTorque+=change/2;
  }
  assert.ok(meanTorque<0,'finite radial separation damps rigid rotation; no projection may conceal it');
  losses.push(-meanTorque);t.diagnostic(JSON.stringify({gapM:gap,meanAngularChangePerAMU:meanTorque}));
 }
 for(let i=1;i<losses.length;i++)assert.ok(losses[i]/losses[i-1]>.24&&losses[i]/losses[i-1]<.26,'fixed nonzero axial relative speed makes leading finite-gap drag O(dr²)');
});

test('ring density integrates the physical cylindrical measure, independently of azimuth sampling',()=>{
 const settings={radius:.2,length:.6,weight:3e12,radialCells:8,axialCells:6};
 const ions=Array.from({length:48},(_,i)=>ring((i%8+.5)*settings.radius/8,i*2.7,[0,0,0],40,(Math.floor(i/8)+.5)*.1));
 const cells=axisymmetricCollisionCells(ions,settings);
 close(cells.reduce((s,c)=>s+c.volumeM3,0),Math.PI*.2**2*.6);
 close(cells.reduce((s,c)=>s+c.densityM3*c.volumeM3,0),48*settings.weight);
 for(const cell of cells){
  const independentVolume=2*Math.PI*(cell.radialHighM+cell.radialLowM)/2*(cell.radialHighM-cell.radialLowM)*(cell.axialHighM-cell.axialLowM);
  close(cell.volumeM3,independentVolume);
 }
});

test('source fitting preserves physical domain endpoints when a distinct interface lies within roundoff tolerance',()=>{
 const settings={radius:.2,length:.6,weight:1,radialCells:4,axialCells:6};
 for(const [radiusBreakM,axialBreakM,r,z] of [[1e-16,1e-16,5e-17,5e-17],[.2-1e-16,.6-1e-16,.2,.6]]){
  const p=ring(r,0,[1,2,3],40,z),[cell]=axisymmetricCollisionCells([p],{...settings,radiusBreakM,axialBreakM});
  assert.ok(cell.radialLowM<=r&&r<=cell.radialHighM,'every ion lies within its declared radial cell');
  assert.ok(cell.axialLowM<=z&&z<=cell.axialHighM,'every ion lies within its declared axial cell');
  assert.ok(cell.volumeM3>0&&Number.isFinite(cell.densityM3));
  if(r===.2){assert.equal(cell.radialHighM,.2);assert.equal(cell.axialHighM,.6);}
  else {assert.equal(cell.radialLowM,0);assert.equal(cell.axialLowM,0);}
 }
});

test('mixed-mass homogeneous Maxwellians remain stationary in the reduced velocity distribution',t=>{
 const changes:number[][]=[],cdfChanges:number[][]=[];
 for(const seed of [713,1427,2857,5717]){
  const random=rng(seed),ions=Array.from({length:8192},(_,i)=>{
   const mass=i%2?84:40,sigma=Math.sqrt(5*E_CHARGE/(mass*AMU));
   return ring(.1,2*Math.PI*random(),[sigma*normal(random),sigma*normal(random),sigma*normal(random)],mass);
  });
  const moments=()=>[40,84].map(mass=>{
   const group=ions.filter(p=>p.massU===mass).map(p=>cylindricalVelocity(p.position,p.velocity));
   return group.reduce((s,v)=>s+v.reduce((a,x)=>a+x*x,0),0)/group.length*mass*AMU/(3*E_CHARGE);
  });
  const cdf=()=>[-2,-1,0,1,2].map(z=>ions.filter(p=>cylindricalVelocity(p.position,p.velocity)[0]/Math.sqrt(5*E_CHARGE/(p.massU*AMU))<=z).length/ions.length);
  const before=moments(),beforeCdf=cdf();
  for(let i=0;i<32;i++)collideAxisymmetricCell(ions,1e18,10,1e-6,random);
  changes.push(moments().map((v,i)=>v-before[i]));cdfChanges.push(cdf().map((v,i)=>v-beforeCdf[i]));
 }
 const mean=(values:number[])=>values.reduce((a,b)=>a+b,0)/values.length;
 const temperatures=[0,1].map(i=>mean(changes.map(v=>v[i]))),cdf=[0,1,2,3,4].map(i=>mean(cdfChanges.map(v=>v[i])));
 t.diagnostic(JSON.stringify({wholeRunTemperatureChangesEV:changes,meanTemperatureChangesEV:temperatures,meanRadialComponentCdfChanges:cdf}));
 for(const value of temperatures)assert.ok(Math.abs(value)<.08,'no resolved species heat exchange at common T within this sampling allowance');
 for(const value of cdf)assert.ok(Math.abs(value)<.012,'component CDF should remain stationary within the declared sampling allowance');
});

test('actual engine local-regime temperature uses cylindrical flow rather than azimuthal point-sample mixing',t=>{
 const sourceRadius=.005,omega=2e6;
 const c={...DEFAULT_DOUBLEWELL,collisionMethod:'axisymmetric' as const,rotationMode:'common' as const,
  sourceRadius,rotationRadS:omega,ionTemperatureEV:1,particlesPerSpecies:4096,cellsAcross:8,
  duration:1e-8,dt:1e-8,collisions:false,seed:6623};
 const result=simulateDoublewell(c),observed=result.regimeHistory[0].assessment.observed.minTemperatureEV;
 // All source particles lie in one radial ring. Uniform-disk Var(r)=R²/18.
 // Removing the cylindrical mean leaves Ω²Var(r), so the lower-mass species
 // has T + mΩ²R²/(54e). Cartesian mean subtraction instead leaves Ω²E[r²]
 // and overstates this rotation contribution by a factor of nine.
 const expected=1+40*AMU*omega**2*sourceRadius**2/(54*E_CHARGE);
 assert.ok(observed!==null);assert.ok(Math.abs(observed-expected)<.5,`${observed} vs expected ~${expected} eV`);
 t.diagnostic(JSON.stringify({observedMinimumLocalTemperatureEV:observed,continuumLowerMassTemperatureEV:expected}));
 assert.equal(result.spatialCollision.separationCoordinates,'r-z');
});

test('equilibrium ring physics remains independent of inactive pulse-fit controls',()=>{
 const c={...DEFAULT_DOUBLEWELL,collisionMethod:'axisymmetric' as const,collisionSourceAligned:true,
  initialState:'equilibrium' as const,boundary:'closed' as const,rotationMode:'common' as const,
  rotationRadS:0,voltage:0,beamEV:0,densityM3:1e17,particlesPerSpecies:256,cellsAcross:4,duration:1e-8,dt:1e-8};
 const a=simulateDoublewell({...c,sourceRadius:.02,pulseLengthFraction:.1});
 const b=simulateDoublewell({...c,sourceRadius:.18,pulseLengthFraction:.9});
 assert.deepEqual(a.history,b.history);assert.deepEqual(a.regimeHistory,b.regimeHistory);
 assert.deepEqual(a.collisions,b.collisions);assert.deepEqual(a.spatialCollision,b.spatialCollision);
});
