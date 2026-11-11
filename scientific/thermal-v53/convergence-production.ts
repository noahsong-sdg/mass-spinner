/** Production-kernel refinement on the same case as convergence-fipy.py. Safe-dev only. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFuelLiner,initialFuelLinerEnergy,advanceFuelThermal} from '../../src/fuel-thermal.js';

const output=process.argv[2]??'scientific/thermal-v53/production-convergence.json';
const reference=process.argv[3]?JSON.parse(readFileSync(process.argv[3],'utf8')):undefined;
const runs=new Map<string,{gasK:number;wallK:number[];maxRelativeEnergyBalance:number}>();
for(const [cells,steps]of [[8,256],[16,256],[32,256],[64,256],[64,16],[64,32],[64,64],[64,128]]){
 const config={radiusM:.12,lengthM:.5,thicknessM:.03,cells,gasCapacityJK:30,gasWallWK:400,coolingWK:10000,coolantK:400};
 const grid=createFuelLiner(config),dt=2/steps;
 let U=initialFuelLinerEnergy(grid,1400),gasK=700,cooling=0,maxRelativeEnergyBalance=0;
 const initial=U.reduce((a,b)=>a+b,0)+30*gasK;
 for(let i=0;i<steps;i++){
  const next=advanceFuelThermal(grid,U,gasK,30,dt,config,()=>({gasEnergyJ:dt*2500,dragEnergyJ:dt*10000,payload:null}));
  U=next.cellEnergyJ;gasK=next.gasK;cooling+=next.coolingEnergyJ;
  const energy=U.reduce((a,b)=>a+b,0)+30*gasK,input=(i+1)*dt*12500;
  const relative=Math.abs(energy-initial-input+cooling)/(1+Math.abs(initial)+input+Math.abs(cooling));
  maxRelativeEnergyBalance=Math.max(maxRelativeEnergyBalance,relative);
  assert.ok(relative<=1e-8,`Global energy balance ${cells}/${steps}/${i}: ${relative}`);
  assert.ok(gasK>0&&next.minK>=300&&next.maxK<=1900,'Finite positive gas / solid material domain');
  if(i===steps-1)runs.set(`${cells}/${steps}`,{gasK,wallK:next.temperatureK,maxRelativeEnergyBalance});
 }
}
function centers(n:number){return Array.from({length:n},(_,i)=>Math.sqrt((.12+.03*i/n)*(.12+.03*(i+1)/n)));}
function interpolate(x:number[],y:number[],at:number){
 let i=0;while(i<x.length-2&&x[i+1]<at)i++;
 assert.ok(at>=x[0]&&at<=x.at(-1)!,'No extrapolation in spatial comparison');
 return y[i]+(at-x[i])/(x[i+1]-x[i])*(y[i+1]-y[i]);
}
const spatial=[8,16,32].map(cells=>{
 const a=runs.get(`${cells}/256`)!,b=runs.get(`${2*cells}/256`)!,x=centers(cells),fine=centers(2*cells);
 return {cells,fineCells:2*cells,fixedSteps:256,maximumEndpointDifferenceK:Math.max(Math.abs(a.gasK-b.gasK),...a.wallK.map((v,i)=>Math.abs(v-interpolate(fine,b.wallK,x[i]))))};
});
const temporal=[16,32,64,128].map(steps=>{
 const a=runs.get(`64/${steps}`)!,b=runs.get(`64/${2*steps}`)!;
 return {steps,fineSteps:2*steps,fixedCells:64,maximumEndpointDifferenceK:Math.max(Math.abs(a.gasK-b.gasK),...a.wallK.map((v,i)=>Math.abs(v-b.wallK[i])))};
});
const ratios=(rows:typeof spatial|typeof temporal)=>rows.slice(1).map((r,i)=>r.maximumEndpointDifferenceK/rows[i].maximumEndpointDifferenceK);
for(const row of [...spatial,...temporal])assert.ok(row.maximumEndpointDifferenceK>1e-8,'Refinement signal above roundoff');
for(const ratio of [...ratios(spatial),...ratios(temporal)])assert.ok(ratio<.85,`Refinement did not contract: ${ratio}`);
const finest=runs.get('64/256')!,finestEndpoint={gasK:finest.gasK,linerInnerCellK:finest.wallK[0],linerOuterCellK:finest.wallK.at(-1)!,wallK:finest.wallK};
assert.ok(Math.max(...finest.wallK)-Math.min(...finest.wallK)>5,'Study must resolve a nontrivial spatial gradient');
let independentComparison:unknown=null;
if(reference){
 assert.equal(reference.allPass,true,'External FiPy campaign must pass');
 const expected=reference.finestEndpoint;
 assert.ok(Array.isArray(expected.wallK),'External FiPy report must contain its complete finest wall profile');
 assert.equal(expected.wallK.length,finest.wallK.length);
 const errors=[Math.abs(finest.gasK-expected.gasK),...finest.wallK.map((v,i)=>Math.abs(v-expected.wallK[i]))];
 const maximumDifferenceK=Math.max(...errors);
 assert.ok(maximumDifferenceK<=2e-5,`Production/FiPy finest difference ${maximumDifferenceK} K`);
 independentComparison={referencePath:process.argv[3],referenceSHA256:createHash('sha256').update(readFileSync(process.argv[3])).digest('hex'),maximumDifferenceK,checkedScalars:errors.length,scope:'Gas and complete wall profile'};
}
const result={solver:'Production browser fuel-thermal kernel',scope:'One nonlinear gas/liner cooling/deposition case; independent space/time refinement, not global qualification',spatial,temporal,spatialDifferenceRatios:ratios(spatial),temporalDifferenceRatios:ratios(temporal),finestEndpoint,maxRelativeEnergyBalance:Math.max(...[...runs.values()].map(r=>r.maxRelativeEnergyBalance)),independentComparison,allPass:true,sourceSHA256:createHash('sha256').update(readFileSync(new URL('../../src/fuel-thermal.ts',import.meta.url))).digest('hex')};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
