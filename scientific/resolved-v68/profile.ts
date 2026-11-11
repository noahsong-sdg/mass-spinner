/** Baseline timings and exact outputs, executed only inside offline safe-dev. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {solveFuelCurrent,type FuelCurrentInput} from '../../src/fuel-current.js';
import {advanceFuelSpatialOperation} from '../../src/fuel-spatial-operation.js';
const packet=JSON.parse(readFileSync(process.argv[2],'utf8'));
const base=packet.cases.find((c:{id:string})=>c.id==='r32-z4-g128-t256-q');
if(!base||base.failure||base.steps.length!==256)throw new Error('Need complete retained graded finest source.');
const sourceSHA256=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('v43-last-manifest.json','utf8'))).sort(([a],[b])=>a<b?-1:a>b?1:0)))).digest('hex');
const cases=[];
for(const nz of [4,16,32,64]){
 const n=base.initialState.omegaRadS.length,e=base.setup.electrical;
 const spec:FuelCurrentInput={...e,axialEdgesM:Array.from({length:nz+1},(_,j)=>.1*j/nz),
  sigmaPerpSM:Array(n*nz).fill(.01),sigmaParallelSM:Array(n*nz).fill(.1),
  innerVoltageV:Array(nz).fill(null),outerVoltageV:Array(nz).fill(.01),
  omegaRadS:Array.from({length:n*nz},(_,i)=>base.initialState.omegaRadS[i%n])};
 const started=performance.now();let result=solveFuelCurrent(spec);
 for(let i=0;i<2;i++)result=solveFuelCurrent(spec);
 cases.push({nz,spec,result,meanSeconds:(performance.now()-started)/3000});
 console.log(JSON.stringify({nz,meanSeconds:cases.at(-1)!.meanSeconds,iterations:result.iterations}));
}
const selected=cases.find(row=>row.nz===32)!;
const {omegaRadS:_,...electrical}=selected.spec;
const setup={...base.setup,electrical},dtS=1e-5,started=performance.now();
const result=advanceFuelSpatialOperation(setup,base.initialState,dtS);
const coupled={setup,state:base.initialState,dtS,result,seconds:(performance.now()-started)/1000};
writeFileSync(process.argv[3],JSON.stringify({sourceSHA256,sourcePacketSHA256:createHash('sha256').update(readFileSync(process.argv[2])).digest('hex'),cases,coupled})+'\n',{flag:'wx'});
console.log(JSON.stringify({coupledSeconds:coupled.seconds,thermalIterations:result.thermal.iterations,currentIterations:result.electrical.iterations}));
