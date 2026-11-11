/** Execute the browser kernel on the same graded histories as actual FiPy. Safe-dev only. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {createFuelLiner,initialFuelLinerEnergy,advanceFuelThermal} from '../../src/fuel-thermal.js';

const [input,directory,output]=process.argv.slice(2),bytes=readFileSync(input),packet=JSON.parse(bytes.toString());
const sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const records=[];
for(const c of packet.cases){
 if(!c.study.productionComparison)continue;
 assert.ok(c.config.cells<=128&&!c.config.material,'Public tungsten kernel domain');
 assert.ok(c.initial.wallK.length===c.config.cells&&c.initial.wallK.every((t:number)=>t===c.initial.wallK[0]),'This campaign initializes a uniform solid');
 const record=JSON.parse(readFileSync(join(directory,c.name+'.json'),'utf8'));
 assert.equal(record.inputSHA256,sha(bytes));assert.equal(record.allPass,true);
 const compressed=readFileSync(join(directory,record.statesFile));
 assert.equal(sha(compressed),record.statesSHA256);
 const oracle=JSON.parse(gunzipSync(compressed).toString());
 assert.equal(oracle.states.length,c.steps.length);
 const grid=createFuelLiner(c.config);
 let U=initialFuelLinerEnergy(grid,c.initial.wallK[0]),gasK=c.initial.gasK,cooling=0,exchange=0;
 let maximumDifferenceK=0,maximumPowerDifferenceW=0,maximumSurfaceDifferenceK=0,maximumExchangeDifferenceJ=0;
 let maximumRelativeEnergyBalance=0;
 const initial=U.reduce((a,b)=>a+b,0)+c.config.gasCapacityJK*gasK;
 let wantExchange=0;
 for(let i=0;i<c.steps.length;i++){
  const step=c.steps[i],want=oracle.states[i];
  const next=advanceFuelThermal(grid,U,gasK,c.config.gasCapacityJK,step.dtS,c.config,
   ()=>({gasEnergyJ:step.gasEnergyJ,dragEnergyJ:step.linerEnergyJ,payload:null}));
  U=next.cellEnergyJ;gasK=next.gasK;cooling+=next.coolingEnergyJ;exchange+=next.gasExchangeJ;wantExchange+=want.gasExchangeJ;
  const difference=Math.max(Math.abs(gasK-want.gasK),...next.temperatureK.map((v,j)=>Math.abs(v-want.wallK[j])));
  maximumDifferenceK=Math.max(maximumDifferenceK,difference);
  assert.ok(difference<=5e-6,`FiPy field ${c.name}/${i}: ${difference} K`);
  assert.ok(Math.abs(cooling-want.coolingEnergyJ)<=1e-7+1e-9*Math.abs(cooling),'Signed coolant ledger');
  const power=next.gasExchangeJ/step.dtS,wantPower=want.gasExchangeJ/step.dtS;
  const surface=gasK-power/c.config.gasWallWK,wantSurface=want.gasK-wantPower/c.config.gasWallWK;
  maximumPowerDifferenceW=Math.max(maximumPowerDifferenceW,Math.abs(power-wantPower));
  maximumSurfaceDifferenceK=Math.max(maximumSurfaceDifferenceK,Math.abs(surface-wantSurface));
  maximumExchangeDifferenceJ=Math.max(maximumExchangeDifferenceJ,Math.abs(exchange-wantExchange));
  assert.ok(Math.abs(surface-wantSurface)<=5e-6,'Reconstructed interface temperature');
  assert.ok(Math.abs(power-wantPower)<=.01,'Instantaneous interface heat flow');
  assert.ok(Math.abs(exchange-wantExchange)<=1e-7,'Cumulative gas exchange');
  const balance=Math.abs(U.reduce((a,b)=>a+b,0)+c.config.gasCapacityJK*gasK-initial+cooling)/(1+Math.abs(initial));
  maximumRelativeEnergyBalance=Math.max(maximumRelativeEnergyBalance,balance);
  assert.ok(balance<1e-9&&gasK>=500-1e-8&&gasK<=1000+1e-8&&next.minK>=500-1e-8&&next.maxK<=1000+1e-8,'Energy and passive bounds');
 }
 records.push({name:c.name,steps:c.steps.length,checkedTemperatures:c.steps.length*(c.config.cells+1),maximumDifferenceK,
  maximumSurfaceDifferenceK,maximumPowerDifferenceW,maximumExchangeDifferenceJ,maximumRelativeEnergyBalance,
  referenceSHA256:sha(readFileSync(join(directory,c.name+'.json'))),allPass:true});
}
const result={allPass:true,cases:records,checkedTemperatures:records.reduce((n,r)=>n+r.checkedTemperatures,0),
 maximumDifferenceK:Math.max(...records.map(r=>r.maximumDifferenceK)),
 inputSHA256:sha(bytes),sourceSHA256:sha(readFileSync(new URL('../../src/fuel-thermal.ts',import.meta.url))),
 scope:'All accepted fields and interface observables for the supported graded and uniform cases; external-only and constant-property cases excluded.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,cases:records.map(({name,maximumDifferenceK})=>({name,maximumDifferenceK}))},null,2));
