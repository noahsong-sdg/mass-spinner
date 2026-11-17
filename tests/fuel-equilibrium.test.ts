import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {calculateEquilibrium,equilibriumPoint,equilibriumScenarios,equilibriumModel,type EquilibriumInput} from '../src/fuel-equilibrium.ts';
import {FUEL_PAIRS} from '../src/fuel-centrifuge.ts';

const base:EquilibriumInput={massesU:[6.0151228874,7.0160034366],edgeSpeedMS:1000,temperatureK:500,radiusM:.12,lengthM:.8,totalParticles:5e19,lightFraction:.0759,cutFraction:.65};
const gates={absolute:2e-12,relative:2e-11,conservation:2e-13,gainAbsolute:2e-14,gainRelative:1e-7,gainRoundingFactor:32};
const close=(a:number,b:number,tolerance=2e-12)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b}, limit ${tolerance}`);

test('independent 80-digit direct-integral screen: density, composition, gains and both inventory cuts',()=>{
 const pairs=[...Object.values(FUEL_PAIRS).map(p=>p.masses),[7,7],[7,7.00000000001],[249.999999,250],[1,250]];
 const cases:any[]=[];
 for(const massesU of pairs)for(const bh of [0,1e-300,1e-12,1e-8,9.9e-8,1e-7,1.0000001e-7,.001,.099,.0999999999,.1,.1000000001,.101,1,10,100])
  for(const lightFraction of [0,1e-6,.0759,.5,1-1e-6,1])for(const radiusFraction of [0,1e-100,1e-6,.1,.5,.99,1-1e-8,1-1e-16,1]){
   const edgeSpeedMS=Math.sqrt(bh*2*equilibriumModel.boltzmannJK*500/(massesU[1]*equilibriumModel.atomicMassKg))*(1-4*Number.EPSILON);
   cases.push({massesU,edgeSpeedMS,temperatureK:500,lightFraction,radiusFraction});
  }
 const oracle=spawnSync('python3',['scientific/equilibrium-composition/oracle.py'],{input:JSON.stringify(cases),encoding:'utf8',maxBuffer:40*1024*1024});
 assert.equal(oracle.status,0,oracle.stderr);const references=JSON.parse(oracle.stdout);assert.equal(references.length,cases.length);
 let maxAbsolute=0,maxRelative=0,maxGainAbsolute=0,maxConservation=0;
 function compare(actual:number,expected:string,relative=false){
  const ref=Number(expected),error=Math.abs(actual-ref);maxAbsolute=Math.max(maxAbsolute,error);close(actual,ref,gates.absolute);
  if(relative&&ref!==0){const e=error/Math.abs(ref);maxRelative=Math.max(maxRelative,e);assert.ok(e<=gates.relative,`relative ${e}: ${actual} vs ${expected}`);}
 }
 for(let i=0;i<cases.length;i++){
  const c=cases[i],ref=references[i],p=equilibriumPoint({...base,...c},c.radiusFraction),x=c.lightFraction;
  try{
   compare(p.lightFraction,ref.lightFraction);p.densityRelativeMean.forEach((v,j)=>compare(v,ref.densityRelativeMean[j],true));
   for(const side of ['inner','outer'] as const){
    p[side].speciesFractions.forEach((v,j)=>compare(v,ref[side].speciesFractions[j],true));
    compare(p[side].inventoryFraction,ref[side].inventoryFraction);
    const purity=side==='inner'?p.inner.lightPurity:p.outer.heavyPurity,recovery=side==='inner'?p.inner.lightRecovery:p.outer.heavyRecovery;
    if(ref[side].purity===null)assert.equal(purity,null);else compare(purity!,ref[side].purity);
    const r=ref[side].recoveries[side==='inner'?0:1];if(r===null)assert.equal(recovery,null);else compare(recovery!,r,true);
   }
   for(const [actual,expected]of [[p.lightGain,ref.gain],[p.inner.lightGain,ref.inner.gain]]){
    if(expected===null){assert.equal(actual,null);continue;}
    const expectedGain=Number(expected),error=Math.abs(actual-expectedGain);maxGainAbsolute=Math.max(maxGainAbsolute,error);close(actual,expectedGain,gates.gainAbsolute);
    const delta=(c.massesU[1]-c.massesU[0])*equilibriumModel.atomicMassKg*c.edgeSpeedMS**2/(2*equilibriumModel.boltzmannJK*c.temperatureK);
    if(Math.abs(expectedGain)>=1e-12)assert.ok(error<=gates.gainRelative*Math.abs(expectedGain)+32*Number.EPSILON*x*(1-x)*delta,`gain ${actual} vs ${expected}`);
   }
   for(let j=0;j<2;j++){const error=Math.abs(p.inner.speciesFractions[j]+p.outer.speciesFractions[j]-1);maxConservation=Math.max(maxConservation,error);assert.ok(error<=gates.conservation);}
   assert.ok(p.inner.speciesFractions[0]+gates.absolute>=p.inner.speciesFractions[1]);
   if(p.inner.lightPurity!==null)assert.ok(p.inner.lightPurity+gates.absolute>=x);
   if(p.outer.heavyPurity!==null)assert.ok(p.outer.heavyPurity+gates.absolute>=1-x);
  }catch(error){throw new Error(`Case ${i}: ${JSON.stringify(c)}; ${String(error)}`);}
 }
 const files=['src/fuel-equilibrium.ts','src/fuel-centrifuge.ts','scientific/equilibrium-composition/oracle.py','tests/fuel-equilibrium.test.ts'];
 mkdirSync('output',{recursive:true});writeFileSync('output/equilibrium-qualification.json',JSON.stringify({schemaVersion:1,status:'pass',scope:'Finite numerical screen, not experimental validation or plot-interpolation qualification',cases:cases.length,gates,
  maxima:{absolute:maxAbsolute,relative:maxRelative,gainAbsolute:maxGainAbsolute,conservation:maxConservation},sourceFiles:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))},null,2));
});

test('positive microscopic cuts retain conditional purity and independently scaled particle counts',()=>{
 const cases=[];
 for(const edgeSpeedMS of [0,1,1000,10000])for(const radiusFraction of [0,1e-200,1e-170,2.3e-162,1e-160,1e-150,1e-100])for(const lightFraction of [0,.0759,.5,1])
  cases.push({...base,edgeSpeedMS,totalParticles:1e30,lightFraction,radiusFraction});
 cases.push({...base,massesU:[7,7],edgeSpeedMS:Math.sqrt(99*2*equilibriumModel.boltzmannJK*500/(7*equilibriumModel.atomicMassKg)),radiusM:1,lengthM:10,totalParticles:1,lightFraction:Number.MIN_VALUE,radiusFraction:1});
 const oracle=spawnSync('python3',['scientific/equilibrium-composition/oracle.py'],{input:JSON.stringify(cases),encoding:'utf8',maxBuffer:40*1024*1024});
 assert.equal(oracle.status,0,oracle.stderr);const references=JSON.parse(oracle.stdout);
 const rounded=(actual:number,expected:string)=>{const ref=Number(expected);assert.ok(Math.abs(actual-ref)<=gates.relative*Math.abs(ref)+2*Number.MIN_VALUE,`${actual} vs ${expected}`);};
 cases.forEach((c,i)=>{
  const p=equilibriumPoint(c,c.radiusFraction),ref=references[i];
  if(c.radiusFraction===0)assert.equal(p.inner.lightPurity,null);else{assert.notEqual(p.inner.lightPurity,null);close(p.inner.lightPurity!,Number(ref.inner.purity));}
  for(const side of ['inner','outer'] as const){
   p[side].speciesParticles.forEach((v,j)=>rounded(v,ref[side].speciesParticles[j]));rounded(p[side].totalParticles,ref[side].totalParticles);
   close(p[side].totalParticles,p[side].speciesParticles[0]+p[side].speciesParticles[1],gates.conservation*Math.max(p[side].totalParticles,Number.MIN_VALUE));
  }
  p.densityM3.forEach((v,j)=>rounded(v,ref.densityM3[j]));
  if(c.lightFraction===Number.MIN_VALUE)assert.ok(p.densityM3[0]>0,'a representable trace-species density must survive scaling');
 });
});

test('absolute zero-rotation SI densities and inventory splits preserve geometry and species accounting',()=>{
 for(const radiusM of [.001,10])for(const lengthM of [.001,100])for(const totalParticles of [1,1e30])for(const lightFraction of [0,.0759,.5,1])for(const cut of [0,.333,1]){
  const c={...base,edgeSpeedMS:0,radiusM,lengthM,totalParticles,lightFraction},p=equilibriumPoint(c,cut),volume=Math.PI*radiusM*radiusM*lengthM;
  for(const [j,weight]of [lightFraction,1-lightFraction].entries()){
   const inventory=totalParticles*weight,inside=inventory*cut*cut,outside=inventory*(1-cut)*(1+cut),density=inventory/volume;
   close(p.densityM3[j],density,gates.relative*Math.max(density,Number.MIN_VALUE));
   close(p.inner.speciesParticles[j],inside,gates.relative*Math.max(inside,Number.MIN_VALUE));
   close(p.outer.speciesParticles[j],outside,gates.relative*Math.max(outside,Number.MIN_VALUE));
   close(p.inner.speciesParticles[j]+p.outer.speciesParticles[j],inventory,gates.conservation*Math.max(inventory,Number.MIN_VALUE));
  }
  close(p.inner.totalParticles+p.outer.totalParticles,totalParticles,gates.conservation*totalParticles);
 }
});

test('missing mass entries cannot bypass the two finite ordered masses invariant',()=>{
 for(const slot of [0,1]){const massesU=Array<number>(2);massesU[slot]=7;assert.throws(()=>equilibriumPoint({...base,massesU:massesU as any},.5),RangeError);}
});

test('zero rotation, equal masses, pure feeds and empty cuts retain distinct domain meanings',()=>{
 for(const x of [0,.0759,.5,1])for(const cut of [0,.3,1]){
  const p=equilibriumPoint({...base,edgeSpeedMS:0,lightFraction:x},cut);close(p.lightFraction,x);close(p.inner.speciesFractions[0],cut**2);
  if(cut===0)assert.equal(p.inner.lightPurity,null);else close(p.inner.lightPurity!,x);
  if(cut===1)assert.equal(p.outer.heavyPurity,null);else close(p.outer.heavyPurity!,1-x);
  if(x===0)assert.equal(p.inner.lightRecovery,null);else close(p.inner.lightRecovery!,cut**2);
  if(x===1)assert.equal(p.outer.heavyRecovery,null);else close(p.outer.heavyRecovery!,1-cut**2);
 }
 const p=equilibriumPoint({...base,massesU:[7,7]},.5);close(p.lightFraction,base.lightFraction);assert.equal(p.lightGain,0);
 close(p.inner.lightPurity!,base.lightFraction);assert.notEqual(p.inner.lightRecovery,.25,'equal masses do not imply uniform density');
});

test('independent composite Simpson integration refines toward analytic species inventories and cut counts',()=>{
 for(const bh of [0,.1,10,100]){
  const c={...base,edgeSpeedMS:Math.sqrt(bh*2*equilibriumModel.boltzmannJK*500/(base.massesU[1]*equilibriumModel.atomicMassKg))*(1-4*Number.EPSILON)};
  function integral(n:number,end:number,j:number){
   const b=c.massesU[j]*equilibriumModel.atomicMassKg*c.edgeSpeedMS**2/(2*equilibriumModel.boltzmannJK*c.temperatureK),z=b===0?1:Math.expm1(b)/b;
   let sum=0;for(let i=0;i<=n;i++){const y=end*i/n,q=Math.exp(b*y)/z;sum+=q*(i===0||i===n?1:i%2?4:2);}return sum*end/(3*n);
  }
  for(const end of [.4225,1])for(const j of [0,1]){
   const exact=end===1?1:equilibriumPoint(c,Math.sqrt(end)).inner.speciesFractions[j];
   const errors=[1024,4096,16384].map(n=>Math.abs(integral(n,end,j)-exact));
   if(errors[0]>1e-12)assert.ok(errors[2]<errors[0]/100,JSON.stringify({bh,end,j,errors}));
   assert.ok(errors[2]/exact<2e-11,JSON.stringify({bh,end,j,errors}));
  }
 }
});

test('profiles, geometry scaling, explicit scenarios and invalid inputs preserve the prescribed state',()=>{
 const c=Object.freeze({...base,massesU:Object.freeze([...base.massesU]) as any}),r=calculateEquilibrium(c);
 assert.ok(r.profiles.length>=201);assert.equal(r.profiles[0].radiusFraction,0);assert.equal(r.profiles.at(-1)!.radiusFraction,1);
 for(let i=1;i<r.profiles.length;i++)assert.ok(r.profiles[i].lightFraction<=r.profiles[i-1].lightFraction+2e-12);
 const p=equilibriumPoint(c,.65),scaled=equilibriumPoint({...c,radiusM:c.radiusM*2,lengthM:c.lengthM*3},.65);close(p.lightFraction,scaled.lightFraction);close(p.densityM3[0]/12,scaled.densityM3[0],1e-12*scaled.densityM3[0]);
 assert.equal(equilibriumScenarios(c,10,10).length,4);assert.equal(equilibriumScenarios(c,0,0).length,1);
 for(const patch of [{edgeSpeedMS:NaN},{edgeSpeedMS:-1},{edgeSpeedMS:2e5},{massesU:[8,7]},{temperatureK:0},{lightFraction:1.1},{cutFraction:-.1},{radiusM:0},{lengthM:Infinity},{totalParticles:0}])assert.throws(()=>calculateEquilibrium({...base,...patch} as any),RangeError);
 assert.throws(()=>equilibriumScenarios(base,51,0),RangeError);
});
