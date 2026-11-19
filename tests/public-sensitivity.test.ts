import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge,type FuelConfig} from '../src/fuel-centrifuge.ts';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation,type FuelOperation} from '../src/fuel-operation.ts';
import {sampleFuelTransport} from '../src/fuel-transport.ts';
import {publicInputCoverage,publicSensitivityPlan,publicSensitivitySample} from '../src/public-sensitivity.ts';

const identity={schemaVersion:1 as const,algorithm:'sha256' as const,sourceHash:'a'.repeat(64),sourceFiles:{'src/worker.ts':'b'.repeat(64)}};
const config={...DEFAULT_FUEL_CENTRIFUGE,durationS:.001};
const operation:FuelOperation={schemaVersion:1,events:[],thermal:{...DEFAULT_FUEL_THERMAL}};
function reply(c:FuelConfig=config,o=operation){
 const rotor=simulateFuelCentrifuge(c,o.events);
 return {result:{...rotor,transport:simulateFuelOperation(rotor,o)},producingCode:identity};
}
const accepted=reply();

test('coverage describes frozen input nodes only and never promotes current-code numerical or experimental qualification',()=>{
 for(const currentA of [.015,.03,.06]){
  const result={config:{...DEFAULT_FUEL_CENTRIFUGE,currentA},transport:{cells:64,steps:512,operation}} as any;
  const coverage=publicInputCoverage(result);
  assert.equal(coverage.historicalInputMatch,true);
  assert.equal(coverage.experimentallyQualified,false);
  assert.equal(coverage.numericalQualification,'not-established-for-this-run');
  assert.match(coverage.text,/does not include independent refinement of the current run/);
  result.config.radialDiffusivityM2S=10**Math.log10(.02);
  assert.equal(publicInputCoverage(result).historicalInputMatch,true,'floating representation changes do not extend physical coverage');
  for(const patch of [{currentA:.030001},{pair:'dt'},{radiusM:.121},{gasK:510},{durationS:.9},{radialDiffusivityM2S:.020001}])
   assert.equal(publicInputCoverage({...result,config:{...result.config,...patch}}).historicalInputMatch,false);
  for(const patch of [{cells:256},{steps:1024},{operation:{...operation,events:[{timeS:.1,currentA:.03}]}},
   {operation:{...operation,thermal:{...DEFAULT_FUEL_THERMAL,enabled:true}}}])
   assert.equal(publicInputCoverage({...result,transport:{...result.transport,...patch}}).historicalInputMatch,false);
 }
 assert.equal(publicInputCoverage({config:DEFAULT_FUEL_CENTRIFUGE}).historicalInputMatch,false,'pre-operation saved result is unqualified');
});

test('plans contain only explicit endpoint/current coefficient samples and preserve accepted setup, thermal model and drive history',()=>{
 const custom=structuredClone(accepted);
 custom.result.transport.operation!.events=[{timeS:.0005,currentA:.02}];
 custom.result.transport.operation!.thermal={...DEFAULT_FUEL_THERMAL,enabled:true};
 const before=structuredClone(custom),plan=publicSensitivityPlan(custom,'dragHz',1,3);
 assert.deepEqual(plan.values,[1,2,3]);assert.equal(plan.configs.length,3);
 assert.deepEqual(plan.operation.events,custom.result.transport.operation!.events);
 assert.deepEqual(plan.operation.thermal,custom.result.transport.operation!.thermal);
 assert.equal(plan.clocks[0],0);assert.equal(plan.clocks.at(-1),config.durationS);
 assert.equal(plan.experimentallyQualified,false);assert.equal(plan.numericallyQualified,false);
 assert.match(plan.interpretation,/User-selected.*not measured uncertainty/);
 for(const c of plan.configs)assert.deepEqual({...c,dragHz:config.dragHz},config);
 plan.operation.events.push({timeS:.0008,currentA:.01});
 assert.deepEqual(custom,before,'planning cannot mutate the accepted history');
 assert.deepEqual(publicSensitivityPlan(accepted,'dragHz',2,2).values,[2]);
});

test('unsupported coefficients, unbounded rates, ranges excluding current and old unidentified histories are rejected',()=>{
 for(const [key,lo,hi]of [['dragHz',0,3],['conductivitySm',0,2],['collisionHz',-1,2e4],['dragHz',3,4],
  ['dragHz',1,1.5],['dragHz',NaN,3],['dragHz',1,Infinity],['currentA',0,.1]] as const)
  assert.throws(()=>publicSensitivityPlan(accepted,key as any,lo,hi),RangeError);
 assert.deepEqual(publicSensitivityPlan(accepted,'collisionHz',0,2e4).values,[0,1e4,2e4]);
 assert.throws(()=>publicSensitivityPlan({...accepted,producingCode:null},'dragHz',1,3),/identified/);
 assert.throws(()=>publicSensitivityPlan({result:simulateFuelCentrifuge(config),producingCode:identity},'dragHz',1,3),/history/);
});

test('samples use the actual coupled trajectory at common physical clocks and retain no analytical substitute',()=>{
 const clocks=[0,.0001,.001],sample=publicSensitivitySample(accepted,accepted,config,clocks);
 for(const [i,time]of clocks.entries()){
  const actual=sampleFuelTransport(accepted.result.transport,time);
  assert.equal(sample.rows[i].speedMS,actual.neutralRadS*config.radiusM);
  assert.equal(sample.rows[i].purity,actual.collection.innerLightPurity);
  assert.equal(sample.rows[i].gasK,config.gasK);
 }
 assert.equal(sample.experimentallyQualified,false);assert.equal(sample.numericallyQualified,false);
 assert.equal(Object.hasOwn(sample,'transport'),false,'sample records do not retain full solver histories');
});

test('thermal and switched-drive samples preserve the accepted closure and full event history',()=>{
 const c={...config,linerK:500},o:FuelOperation={schemaVersion:1,events:[{timeS:.0005,currentA:0}],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true}};
 const base=reply(c,o),plan=publicSensitivityPlan(base,'conductivitySm',.5,2);
 assert.deepEqual(plan.operation,o);assert.equal(Object.hasOwn(plan,'resume'),false);
 const variant=reply(plan.configs[0],plan.operation),sample=publicSensitivitySample(variant,base,plan.configs[0],[0,.0005,.001]);
 for(const [i,time]of [0,.0005,.001].entries()){
  const actual=sampleFuelTransport(variant.result.transport,time);
  assert.equal(sample.rows[i].gasK,actual.thermal!.gasK);
  assert.equal(sample.rows[i].speedMS,actual.neutralRadS*c.radiusM);
 }
 assert.equal(variant.result.transport.operation!.events[0].currentA,0);
 assert.ok(sample.rows.at(-1)!.gasK>500,'thermal sensitivity uses evolved temperature rather than the configured bath');
});

test('mismatched settings, code, history, truncated states and invalid clocks cannot produce sensitivity plots',()=>{
 for(const change of [
  (r:any)=>r.producingCode=null,
  (r:any)=>r.producingCode.sourceHash='c'.repeat(64),
  (r:any)=>r.result.schemaVersion=0,
  (r:any)=>r.result.transport.schemaVersion=0,
  (r:any)=>r.result.transport.operation.initialCurrentA=.04,
  (r:any)=>r.result.config.gasK++,
  (r:any)=>r.result.transport.durationS=0,
  (r:any)=>r.result.transport.operation.events.push({timeS:.0005,currentA:.02}),
  (r:any)=>r.result.transport.operation.thermal.enabled=true,
  (r:any)=>r.result.transport.checkpoints.pop(),
  (r:any)=>r.result.transport.checkpoints[1].timeS=0,
  (r:any)=>r.result.transport.checkpoints[0].neutralAngularMomentumKgM2S=Infinity,
 ]){
  const altered=structuredClone(accepted);change(altered);
  assert.throws(()=>publicSensitivitySample(altered,accepted,config,[0,.001]));
 }
 for(const clocks of [[.0001,.001],[0,.0001],[0,0,.001],[0,NaN,.001],[]])
  assert.throws(()=>publicSensitivitySample(accepted,accepted,config,clocks),/clocks/);
});
