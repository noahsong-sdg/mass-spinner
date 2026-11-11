import test from 'node:test';
import assert from 'node:assert/strict';
import {AMU,E_CHARGE} from '../src/physics.js';
import {circleRectangleArea,DEFAULT_DOUBLEWELL,simulateDoublewell,validateDoublewell,type DoublewellConfig} from '../src/doublewell-dynamics.js';

const base:DoublewellConfig={...DEFAULT_DOUBLEWELL,particlesPerSpecies:64,duration:2e-5};
const close=(actual:number,expected:number,relative=1e-10)=>assert.ok(Math.abs(actual-expected)<=relative*Math.max(Math.abs(expected),Number.MIN_VALUE),`${actual} != ${expected}`);
const weight=(r:ReturnType<typeof simulateDoublewell>)=>r.metrics.find(m=>m.label==='Physical ions per representative')!.value;
function account(r:ReturnType<typeof simulateDoublewell>){
 for(const h of r.history)for(const s of h.species)assert.equal(s.active+s.wall+s.end+s.source,r.config.particlesPerSpecies);
 for(const s of r.species){
  assert.equal(s.active+s.wall+s.end+s.source,s.injected);
  assert.equal(s.impacts.length,s.wall+s.end+s.source);
  for(const d of ['wall','end','source'])assert.equal(s.impacts.filter(h=>h.destination===d).length,s[d as 'wall']);
 }
}
function finalCdf(r:ReturnType<typeof simulateDoublewell>,i:number){
 const curve=r.curves.find(c=>c.yLabel==='Final axially averaged active density (m⁻³)'&&c.label===['A','B'][i])!;
 let cumulative=0;
 return curve.y.map((density,j)=>{
  const volume=Math.PI*r.config.radius**2*((j+1)**2-j*j)/curve.y.length**2*r.config.length;
  cumulative+=density*volume/(weight(r)*r.config.particlesPerSpecies);return cumulative;
 });
}

test('cylinder-cut collision volumes partition exact physical volume, including corner and tangent cells',()=>{
 const a=.37;
 close(circleRectangleArea(-a,a,-a,a,a),Math.PI*a*a);
 close(circleRectangleArea(0,a,0,a,a),Math.PI*a*a/4);
 assert.equal(circleRectangleArea(a,2*a,a,2*a,a),0);
 for(const n of [2,3,4,7,12]){
  let sum=0;const width=2*a/n;
  for(let x=0;x<n;x++)for(let y=0;y<n;y++){
   const area=circleRectangleArea(-a+x*width,-a+(x+1)*width,-a+y*width,-a+(y+1)*width,a);
   assert.ok(area>=0&&area<=width**2*(1+1e-12));sum+=area;
  }
  close(sum,Math.PI*a*a);
 }
});

test('equal representative weights and final cylindrical histograms recover declared physical inventories',()=>{
 for(const initialState of ['pulse','equilibrium'] as const){
  const c={...base,boundary:'closed' as const,rotationMode:'common' as const,beamEV:0,initialState,collisions:false,duration:1e-6};
  const r=simulateDoublewell(c),volume=Math.PI*(initialState==='pulse'?c.sourceRadius:c.radius)**2*c.length*(initialState==='pulse'?c.pulseLengthFraction:1);
  close(weight(r),c.densityM3*volume/(2*c.particlesPerSpecies));account(r);
  for(const i of [0,1])close(finalCdf(r,i).at(-1)!,1);
 }
});

test('closed collisionless coupled engine converges H and canonical momentum without inventing collision torque',()=>{
 const results=[2e-7,1e-7,5e-8].map(dt=>simulateDoublewell({...base,boundary:'closed',particlesPerSpecies:16,collisions:false,dt}));
 for(const r of results){account(r);assert.equal(r.conservation.collisionTorque,0);assert.equal(r.conservation.absolutePairTorque,0);assert.equal(r.conservation.energyOutJ,0);}
 for(const key of ['maxEnergyResidual','maxMomentumResidual'] as const)for(const i of [0,1]){
  const ratio=results[i].conservation[key]/results[i+1].conservation[key];assert.ok(ratio>3.8&&ratio<4.2);
 }
});

test('closed specular walls and axial periodic wrapping preserve H/Ptheta during repeated wall encounters',()=>{
 const r=simulateDoublewell({...base,radius:.01,sourceRadius:.005,length:.1,magneticT:0,voltage:0,
  boundary:'closed',initialState:'equilibrium',rotationMode:'common',rotationRadS:0,beamEV:0,
  particlesPerSpecies:32,collisions:false,dt:1e-6,duration:3e-5});
 account(r);
 assert.ok(r.conservation.maxEnergyResidual<1e-13);assert.ok(r.conservation.maxMomentumResidual<1e-13);
 assert.equal(r.conservation.energyOutJ,0);assert.ok(r.species.every(s=>s.active===32&&s.wall===0&&s.end===0&&s.source===0));
});

test('closed Coulomb coupling preserves species inventory and energy while exposing cell torque rather than hiding it',()=>{
 const c={...base,boundary:'closed' as const,particlesPerSpecies:128,cellsAcross:2,duration:4e-5};
 const r=simulateDoublewell(c),control=simulateDoublewell({...c,collisions:false});account(r);
 assert.ok(r.collisions.pairs>1000);assert.ok(r.conservation.maxEnergyResidual<3e-6);
 assert.ok(r.conservation.maxCorrectedMomentumResidual<3e-6);
 assert.ok(r.conservation.maxMomentumResidual>=r.conservation.maxCorrectedMomentumResidual);
 assert.ok(r.conservation.normalizedAbsoluteCellTorque>=0);
 assert.ok(r.conservation.absolutePairTorque>=r.conservation.absoluteCellTorque*(1-1e-12));
 assert.ok(r.conservation.absoluteCellTorque>=Math.abs(r.conservation.collisionTorque)*(1-1e-12));
 const historyEnd=r.history.at(-1)!;
 for(const h of r.history)assert.ok(Math.abs(h.momentumResidual-h.collisionTorque)<=r.conservation.maxCorrectedMomentumResidual*(1+1e-12));
 for(const i of [0,1])assert.ok(Math.abs(historyEnd.species[i].meanCanonicalMomentum!-control.history.at(-1)!.species[i].meanCanonicalMomentum!)>1e-27,
  'collisions must alter individual species angular budgets; their sum includes explicitly measured numerical cell torque');
});

test('open pulse keeps source/wall/end/active and exact signed exit energy/angular flux ledgers',()=>{
 const r=simulateDoublewell({...base,densityM3:1e17,dt:2e-7,duration:2e-4});account(r);
 assert.ok(r.species.some(s=>s.end>0)&&r.species.some(s=>s.source>0)&&r.species.some(s=>s.wall>0));
 const impacts=r.species.flatMap(s=>s.impacts);
 close(r.conservation.energyOutJ,weight(r)*impacts.reduce((sum,h)=>sum+h.energyJ,0));
 close(r.conservation.canonicalMomentumOut,weight(r)*impacts.reduce((sum,h)=>sum+h.canonicalMomentum,0));
 assert.ok(r.conservation.maxEnergyResidual<1e-5);assert.ok(r.conservation.maxCorrectedMomentumResidual<1e-5);
 assert.ok(impacts.every(h=>h.time>=0&&h.time<=r.config.duration&&h.radius<=r.config.radius*(1+1e-12)));
});

test('all-exited ballistic pulse returns null survivor observables and balances all physical flux',()=>{
 const r=simulateDoublewell({...base,magneticT:0,voltage:0,ionTemperatureEV:.01,beamEV:100,
  rotationMode:'common',rotationRadS:0,particlesPerSpecies:8,collisions:false,dt:1e-6,duration:7e-5});
 account(r);assert.ok(r.species.every(s=>s.end===8&&s.active===0));
 const last=r.history.at(-1)!;
 assert.ok(last.species.every(s=>s.meanRadius===null&&s.temperatureEV===null&&s.rotationRadS===null&&s.meanCanonicalMomentum===null));
 close(r.conservation.energyOutJ,r.conservation.initialEnergyJ,1e-12);
 close(r.conservation.canonicalMomentumOut,r.conservation.initialCanonicalMomentum,1e-11);
});

test('common-Omega closed equilibrium retains its independently integrated radial CDF across independent seeds',t=>{
 const c:DoublewellConfig={...base,boundary:'closed',initialState:'equilibrium',rotationMode:'common',rotationRadS:-12000,
  beamEV:0,magneticT:.02,voltage:2,ionTemperatureEV:10,particlesPerSpecies:256,cellsAcross:3,duration:2e-5};
 const results=[11,22,33,44].map(seed=>simulateDoublewell({...c,seed}));
 for(const r of results){account(r);assert.ok(r.conservation.maxEnergyResidual<1e-6);}
 for(const [i,s]of c.species.entries()){
  // Direct midpoint quadrature in r² includes the cylindrical Jacobian and
  // common Omega. No production initial-CDF helper is called.
  const n=20000,weights=Array.from({length:n},(_,j)=>{
   const u=(j+.5)/n,r2=c.radius**2*u;
   const electrostatic=s.chargeState*c.voltage*(u*u-c.quadraticShape*u);
   const rotational=(s.massU*AMU*c.rotationRadS**2+s.chargeState*E_CHARGE*c.rotationRadS*c.magneticT)*r2/(2*E_CHARGE);
   return Math.exp((-electrostatic+rotational)/c.ionTemperatureEV);
  });
  const norm=weights.reduce((a,b)=>a+b,0),pooled=results.map(r=>finalCdf(r,i));
  let maxDifference=0;
  for(let bin=0;bin<20;bin++){
   const count=Math.round(n*((bin+1)/20)**2),expected=weights.slice(0,count).reduce((a,b)=>a+b,0)/norm;
   const observed=pooled.reduce((sum,cdf)=>sum+cdf[bin],0)/results.length;
   maxDifference=Math.max(maxDifference,Math.abs(observed-expected));
  }
  assert.ok(maxDifference<.07,`pooled radial CDF differs by ${maxDifference}; collisions introduce correlated sampling, so this is a descriptive stationarity tolerance, not a binomial confidence band`);
  const initialTemperature=results.reduce((sum,r)=>sum+r.history[0].species[i].temperatureEV!,0)/results.length;
  const finalTemperature=results.reduce((sum,r)=>sum+r.history.at(-1)!.species[i].temperatureEV!,0)/results.length;
  assert.ok(Math.abs(finalTemperature-initialTemperature)<.3);
  t.diagnostic(`Species ${['A','B'][i]}: pooled final radial CDF max discrepancy ${maxDifference}; initial/final residual temperature ${initialTemperature}/${finalTemperature} eV.`);
 }
});

test('invalid kinetic settings and unsupported initial collision regimes are rejected explicitly',()=>{
 assert.throws(()=>validateDoublewell({...base,boundary:'open',initialState:'equilibrium'}),/equilibrium/);
 assert.throws(()=>validateDoublewell({...base,particlesPerSpecies:7}),/representatives/);
 assert.throws(()=>simulateDoublewell({...base,densityM3:1e28}),/regime/);
 assert.throws(()=>validateDoublewell({...base,dt:1e-3}),/timestep/);
});
