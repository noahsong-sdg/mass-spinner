/** Compare the production kernel with every accepted FiPy field and original gates. Safe-dev only. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFuelLiner,initialFuelLinerEnergy,advanceFuelThermal} from '../../src/fuel-thermal.js';

const [input,referencePath,output]=process.argv.slice(2),content=readFileSync(input);
const packet=JSON.parse(content.toString()),reference=JSON.parse(readFileSync(referencePath,'utf8'));
const sha=(value:Buffer)=>createHash('sha256').update(value).digest('hex');
assert.equal(packet.maximumProductionCells,128,'Current browser kernel grid domain');
assert.equal(reference.inputSHA256,sha(content),'Same independent case packet');assert.equal(reference.qualificationPass,true,'External physical, temporal and resolved-tail gates');
assert.equal(reference.refinement.spatial.resolvedTailContracts,true);
assert.equal(reference.allPass,Object.values(reference.refinement).every((family:any)=>family.allPass),'Full-grid claim must retain failed families');
if(!reference.allPass)assert.ok(reference.refinement.spatial.allGridsContract===false&&reference.refinement.spatial.failedComparisons.length>0,'Explicit original coarse-grid negative evidence');
const records=[],externalOnly=[];
for(const c of packet.cases){
 if(c.productionComparison===false){assert.ok(c.config.cells>packet.maximumProductionCells,'Only outside the production grid domain');externalOnly.push(c.name);continue;}
 assert.ok(c.config.cells<=packet.maximumProductionCells,'Production grid boundary');
 assert.equal(reference.physicalChecks[c.name].allPass,true,'Independent physical checks');
 const config=c.config,grid=createFuelLiner(config),oracle=reference.cases[c.name];
 assert.equal(oracle.states.length,c.steps.length);
 let gasK=c.initial.gasK,U=initialFuelLinerEnergy(grid,c.initial.wallK[0]),wallK=[...c.initial.wallK],cooling=0,maximumDifferenceK=0,maximumRelativeEnergyBalance=0;
 const initial=U.reduce((a,b)=>a+b,0)+config.gasCapacityJK*gasK;
 for(let i=0;i<c.steps.length;i++){
  const step=c.steps[i],next=advanceFuelThermal(grid,U,gasK,config.gasCapacityJK,step.dtS,config,
   ()=>({gasEnergyJ:step.gasEnergyJ,dragEnergyJ:step.linerEnergyJ,payload:null}));
  gasK=next.gasK;U=next.cellEnergyJ;wallK=next.temperatureK;cooling+=next.coolingEnergyJ;
  const want=oracle.states[i];assert.equal(want.wallK.length,config.cells);
  const errors=[Math.abs(gasK-want.gasK),...next.temperatureK.map((v,j)=>Math.abs(v-want.wallK[j]))];
  maximumDifferenceK=Math.max(maximumDifferenceK,...errors);
  assert.ok(maximumDifferenceK<=packet.crossCodeTemperatureToleranceK,`FiPy temperature ${c.name}/${i}: ${maximumDifferenceK} K`);
  assert.ok(Math.abs(cooling-want.coolingEnergyJ)<=1e-7+1e-9*Math.abs(cooling),`Signed coolant ledger ${c.name}/${i}`);
  const energy=U.reduce((a,b)=>a+b,0)+config.gasCapacityJK*gasK;
  const residual=Math.abs(energy-initial+cooling)/(1+Math.abs(initial)+Math.abs(cooling));
  maximumRelativeEnergyBalance=Math.max(maximumRelativeEnergyBalance,residual);
  assert.ok(residual<1e-9,`Production cumulative energy ${c.name}/${i}: ${residual}`);
  assert.ok(gasK>=500-1e-8&&gasK<=1000+1e-8&&next.minK>=500-1e-8&&next.maxK<=1000+1e-8,'Passive temperature bounds');
 }
 records.push({name:c.name,steps:c.steps.length,checkedTemperatures:c.steps.length*(config.cells+1),maximumDifferenceK,maximumRelativeEnergyBalance,
  endpoint:{gasK,wallK},allPass:true});
}
const result={solver:'Production browser thermal kernel',cases:records,inputSHA256:sha(content),referenceSHA256:sha(readFileSync(referencePath)),
 sourceSHA256:sha(readFileSync(new URL('../../src/fuel-thermal.ts',import.meta.url))),
 maximumDifferenceK:Math.max(...records.map(r=>r.maximumDifferenceK)),maximumRelativeEnergyBalance:Math.max(...records.map(r=>r.maximumRelativeEnergyBalance)),
 checkedTemperatures:records.reduce((n,r)=>n+r.checkedTemperatures,0),crossCodeTemperatureToleranceK:packet.crossCodeTemperatureToleranceK,
 scope:'Every accepted gas/liner field plus signed coolant ledger for cases inside the production grid domain. The external file contains separate physical and refinement gates.',
 externalOnlyCases:externalOnly,referenceAllGridsPass:reference.allPass,referenceQualificationPass:reference.qualificationPass,allPass:true};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
