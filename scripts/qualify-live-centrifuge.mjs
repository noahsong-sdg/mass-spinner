// Run only inside safe-dev: node --import tsx scripts/qualify-live-centrifuge.mjs NEW_OUTPUT.json
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../src/fuel-operation.ts';
import {sampleFuelTransport} from '../src/fuel-transport.ts';
import {fuelBenchmarkReport} from '../src/fuel-benchmark.ts';

if(process.argv.length!==3)throw new Error('Supply one new output JSON path.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourcePaths=(root)=>readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sourcePaths(`${root}/${e.name}`):[`${root}/${e.name}`]);
const sourceFiles=Object.fromEntries([...sourcePaths('src'),'scripts/qualify-live-centrifuge.mjs','docs/reviews/live-numerical-protocol.md',
 'docs/reviews/live-benchmark-protocol.md','package.json','package-lock.json'].sort().map(path=>[path,hash(readFileSync(path))]));
const clocks=[0,1e-5,3e-5,1e-4,3e-4,1e-3,.01,.1,.5,1];
const aggregate=(mass,n)=>{if(mass.length%n)throw new Error('Non-nested inventory grids.');const stride=mass.length/n;
 return Array.from({length:n},(_,i)=>mass.slice(i*stride,(i+1)*stride).reduce((a,b)=>a+b,0));};
const l1=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0);
const scalar=s=>({ionMS:s.ionRadS*DEFAULT_FUEL_CENTRIFUGE.radiusM,neutralMS:s.neutralRadS*DEFAULT_FUEL_CENTRIFUGE.radiusM,
 ionPhaseRad:s.ionPhaseRad,neutralPhaseRad:s.neutralPhaseRad,purity:s.collection.innerLightPurity,recovery:s.collection.lightRecovery});
const tolerance=(key,value)=>key.endsWith('MS')?.01+.01*Math.abs(value):key.endsWith('Rad')?.001+.01*Math.abs(value):1e-4+.01*Math.abs(value);
function compare(a,b,label,required){
 const rows=clocks.map((timeS,i)=>{
  const aa=a.samples[i],bb=b.samples[i],av=scalar(aa),bv=scalar(bb),metrics={};
  for(const key of Object.keys(av)){
   if(!Number.isFinite(av[key])||!Number.isFinite(bv[key]))throw new Error(`Nonfinite observable ${key}`);
   const difference=Math.abs(av[key]-bv[key]),limit=tolerance(key,bv[key]);metrics[key]={coarse:av[key],fine:bv[key],difference,limit,pass:difference<=limit};
  }
  for(const key of ['lightMass','heavyMass']){
   const difference=l1(aa[key],aggregate(bb[key],aa[key].length));metrics[key]={difference,limit:.01,pass:difference<=.01};
  }
  return {timeS,metrics,pass:Object.values(metrics).every(m=>m.pass)};
 });
 return {label,required,coarse:{cells:a.cells,steps:a.steps},fine:{cells:b.cells,steps:b.steps},rows,pass:rows.every(r=>r.pass)};
}
const cases=[];
for(const currentA of [.015,.03,.06]){
 const config={...DEFAULT_FUEL_CENTRIFUGE,currentA},operation={schemaVersion:1,events:[],thermal:{...DEFAULT_FUEL_THERMAL}},runs=[],comparisons=[];
 const lookup=(n,t)=>runs.find(r=>r.cells===n&&r.steps===t);
 for(const cells of [64,128,256])for(const steps of [512,1024,2048]){
  const before=performance.now();
  try{
   const model=simulateFuelOperation(simulateFuelCentrifuge(config),operation,{cells,steps});
   const samples=clocks.map(t=>sampleFuelTransport(model,t)),budgets={inventory:model.maxBalanceError,
    angularMomentum:model.maxAngularMomentumRelativeError,energy:model.maxEnergyRelativeError};
   const rows=model.checkpoints;
   const finite=rows.every(s=>[s.timeS,s.ionRadS,s.neutralRadS,s.ionPhaseRad,s.neutralPhaseRad,
    s.ionAngularMomentumKgM2S,s.neutralAngularMomentumKgM2S,s.neutralInertiaKgM2,
    ...s.lightMass,...s.heavyMass,...Object.values(s.energy),...Object.values(s.angularMomentum)]
    .every(v=>v===null||Number.isFinite(v)));
   const minAcceptedMass=rows.reduce((minimum,s)=>Math.min(minimum,...s.lightMass,...s.heavyMass),Infinity);
   const positive=minAcceptedMass>=0,ordered=rows.every((s,i)=>i===0||s.timeS>rows[i-1].timeS);
   const worst=metric=>rows.reduce((a,b)=>metric(b)>metric(a)?b:a);
   const budgetWitnesses={inventory:worst(s=>Math.max(Math.abs(s.balances.light-1),Math.abs(s.balances.heavy-1))),
    angularMomentum:worst(s=>s.angularMomentum.relativeResidual),energy:worst(s=>s.energy.relativeResidual),
    minimumMass:worst(s=>-Math.min(...s.lightMass,...s.heavyMass))};
   const pass=finite&&positive&&ordered&&Object.values(budgets).every(x=>Number.isFinite(x)&&x<2e-8)&&rows.at(-1).timeS===config.durationS;
   runs.push({cells,steps,samples,budgets,budgetWitnesses,finite,positive,minAcceptedMass,ordered,pass,acceptedKnots:rows.length,elapsedMS:performance.now()-before});
  }catch(error){runs.push({cells,steps,pass:false,error:String(error)});}
 }
 for(const [label,a,b,required]of [
  ['joint coarse',lookup(64,512),lookup(128,1024),false],['joint fine',lookup(128,1024),lookup(256,2048),true],
  ['interactive to reference',lookup(64,512),lookup(256,2048),true],
  ['spatial coarse',lookup(64,2048),lookup(128,2048),false],['spatial fine',lookup(128,2048),lookup(256,2048),true],
  ['temporal coarse',lookup(256,512),lookup(256,1024),false],['temporal fine',lookup(256,1024),lookup(256,2048),true],
 ])comparisons.push(a.samples&&b.samples?compare(a,b,label,required):{label,required,pass:false,unavailable:'One trajectory failed.'});
 const pass=runs.every(r=>r.pass)&&comparisons.filter(r=>r.required).every(r=>r.pass);
 cases.push({config,operation,runs,comparisons,pass});
 console.log(JSON.stringify({currentA,numericalScreen:pass?'pass':'fail',failedComparisons:comparisons.filter(c=>!c.pass).map(c=>c.label)}));
}
const output={schemaVersion:1,kind:'bounded-live-numerical-screen',sourceFiles,sourceHash:hash(JSON.stringify(sourceFiles)),clocks,
 numericalScreen:cases.every(c=>c.pass)?'pass':'fail',experimentallyQualified:false,
 interpretation:'Three discrete isothermal cases only. Refinement differences are not certified error bounds or a continuous slider qualification. Fraction screens do not bound relative error in a small enrichment gain; phases are unwrapped integrated angles. Experimental structure and missing inputs are scored separately.',
 cases,experimentalBenchmark:fuelBenchmarkReport()};
writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:process.argv[2],numericalScreen:output.numericalScreen,experimentallyQualified:false}));
