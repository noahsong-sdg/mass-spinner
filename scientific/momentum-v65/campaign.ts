import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createFuelMomentumGrid,advanceFuelMomentum,fuelMomentumState,fuelDopplerCentroid,type FuelMomentumEnergy} from '../../src/fuel-momentum.js';
const input=readFileSync(process.argv[2]),packet=JSON.parse(input.toString());
const markers=JSON.parse(readFileSync('scientific/experimental-v64/data/markers-corrected.json','utf8'));
const cases=packet.cases.map((spec:any)=>{
 const grid=createFuelMomentumGrid(spec);let omega=[...spec.initialOmegaRadS];
 const cumulative:FuelMomentumEnergy={driveWorkJ:0,wallWorkJ:0,shearHeatJ:0,numericalLossJ:0,driveImpulseKgM2S:0,wallImpulseKgM2S:0};
 const states=[{timeS:0,omegaRadS:omega,...fuelMomentumState(grid,omega),cumulative:{...cumulative}}];
 let maximumAngularResidual=0,maximumEnergyResidual=0;
 for(let step=0;step<spec.steps;step++){
  const next=advanceFuelMomentum(grid,omega,spec.torqueNm,spec.dtS);omega=next.omegaRadS;
  for(const key of Object.keys(cumulative) as (keyof FuelMomentumEnergy)[])cumulative[key]+=next.increment[key];
  maximumAngularResidual=Math.max(maximumAngularResidual,Math.abs(next.angularResidualKgM2S));
  maximumEnergyResidual=Math.max(maximumEnergyResidual,Math.abs(next.energyResidualJ));
  states.push({timeS:(step+1)*spec.dtS,omegaRadS:omega,...fuelMomentumState(grid,omega),cumulative:{...cumulative}});
 }
 const chordsM=spec.kind==='core-annulus'?markers.profile.map((p:{rCm:number})=>p.rCm*.01):[];
 return {spec,states,maximumAngularResidual,maximumEnergyResidual,
  diagnostic:{chordsM,apparentVelocityMS:chordsM.map((x:number)=>fuelDopplerCentroid(grid,omega,x))}};
});
writeFileSync(process.argv[3],JSON.stringify({schemaVersion:1,inputSHA256:createHash('sha256').update(input).digest('hex'),
 method:'Conservative cell angular momentum; integrated cylindrical resistance; backward Euler',cases},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({cases:cases.length,states:cases.reduce((n:number,c:any)=>n+c.states.length,0)},null,2));
