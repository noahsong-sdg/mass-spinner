/** Run only in safe-dev: exercise the emitted worker, not a substitute solver. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {DEFAULT_FUEL_CENTRIFUGE,FUEL_PAIRS,rotorResponse} from '../src/fuel-centrifuge.ts';
const files=readdirSync('release/assets').filter(name=>/^worker-.*\.js$/.test(name));assert.equal(files.length,1);
// Dispatch is synchronous here; each assertion consumes only the latest reply.
const bytes=readFileSync(`release/assets/${files[0]}`),replies=[],surface={postMessage:value=>{replies.length=0;replies.push(value);},onmessage:null};
new Function('self',bytes.toString())(surface);
const hash=value=>createHash('sha256').update(value).digest('hex');
let id=4400,cases=0;
for(const pair of Object.keys(FUEL_PAIRS))for(const application of ['enrichment','pump'])for(const currentA of [0,.03])for(const cutFraction of [0,.65,1])for(const stages of [1,12]){
 const config={...DEFAULT_FUEL_CENTRIFUGE,pair,application,currentA,cutFraction,stages,feedStage:stages};
 surface.onmessage({data:{kind:'fuel-centrifuge',schemaVersion:1,id:++id,config,includeTransport:true}});
 const reply=replies.at(-1);assert.equal(reply.id,id);assert.equal(reply.kind,'fuel-centrifuge');assert.equal(reply.schemaVersion,1);assert.equal(reply.error,undefined,JSON.stringify(config));
 assert.deepEqual(reply.result.config,config);assert.equal(reply.result.samples.length,101);
 const identity=reply.producingCode;assert.equal(identity.sourceHash,hash(JSON.stringify(identity.sourceFiles)));
 assert.ok(identity.sourceFiles['src/fuel-centrifuge.ts']);
 for(const [path,digest]of Object.entries(identity.sourceFiles)){assert.ok(!path.startsWith('/')&&!path.split('/').includes('..'));assert.equal(hash(readFileSync(path)),digest,path);}
 const result=reply.result;assert.ok(Math.abs(result.cascade.lightBalance)<1e-12);assert.ok(Math.abs(result.cascade.heavyBalance)<1e-12);
 assert.equal(result.transport.cells,64);assert.equal(result.transport.steps,512);assert.ok(result.transport.maxBalanceError<2e-8);
 assert.equal(result.transport.coupling,'angular-momentum-conserving');assert.ok(result.transport.maxAngularMomentumRelativeError<2e-10);assert.ok(result.transport.maxEnergyRelativeError<2e-10);
 for(const s of result.transport.snapshots){assert.ok(s.balances.minimumMass>=0);assert.ok(Math.abs(s.balances.light-1)<2e-8);assert.ok(Math.abs(s.balances.heavy-1)<2e-8);
  assert.ok(Math.abs(s.neutralRadS*s.neutralInertiaKgM2-s.neutralAngularMomentumKgM2S)<1e-12*Math.max(result.mechanics.torque*config.durationS,1e-30));
 }
 for(const s of result.pumping.species)assert.ok(s.effectiveSpeedM3S===null||s.effectiveSpeedM3S<=config.conductanceM3S*(1+1e-12));
 if(currentA===0){assert.equal(result.samples.at(-1).neutralMS,0);assert.equal(result.collection.logHeavyLightSeparation,0);}
 cases++;
}
let operationCases=0;
for(const pair of Object.keys(FUEL_PAIRS).filter(p=>p!=='molecular'))for(const enabled of [false,true]){
 const config={...DEFAULT_FUEL_CENTRIFUGE,pair},operation={schemaVersion:1,events:[{timeS:.4,currentA:0},{timeS:.8,currentA:.02}],thermal:{enabled,wallCapacityJK:10,gasWallWK:.1,coolingWK:1,coolantK:500}};
 surface.onmessage({data:{kind:'fuel-centrifuge',schemaVersion:1,id:++id,config,includeTransport:true,operation}});
 const reply=replies.at(-1);assert.equal(reply.error,undefined,JSON.stringify({pair,enabled}));assert.ok(reply.producingCode.sourceFiles['src/fuel-operation.ts']);
 const past=reply.result.transport;
 assert.equal(past.snapshots.find(s=>s.timeS===.4).currentA,0);assert.equal(past.snapshots.at(-1).currentA,.02);
 assert.ok(past.maxAngularMomentumRelativeError<2e-10);assert.ok(past.maxEnergyRelativeError<2e-10);
 if(enabled)assert.ok(past.snapshots.every(s=>s.thermal.gasK>0&&s.thermal.linerK>0&&s.thermal.relativeResidual<2e-8));
 surface.onmessage({data:{kind:'fuel-centrifuge',schemaVersion:1,id:++id,config,includeTransport:true,operation:{...operation,events:[{timeS:.4,currentA:0},{timeS:.6,currentA:.025}]},resume:{transport:past,timeS:.6}}});
 assert.equal(replies.at(-1).error,undefined);assert.equal(replies.at(-1).result.transport.snapshots.find(s=>s.timeS===.6).currentA,.025);operationCases+=2;
}
let spatialCases=0;
for(const currentA of [0,.03])for(const gasWallWK of [.1,1e6]){
 const config={...DEFAULT_FUEL_CENTRIFUGE,currentA},operation={schemaVersion:1,events:[{timeS:.4,currentA:0}],thermal:{enabled:true,wallCapacityJK:10,gasWallWK,coolingWK:1,coolantK:500,spatial:{material:'tungsten',thicknessM:.001,cells:16}}};
 surface.onmessage({data:{kind:'fuel-centrifuge',schemaVersion:1,id:++id,config,includeTransport:true,operation}});
 const reply=replies.at(-1);assert.equal(reply.error,undefined,JSON.stringify({currentA,gasWallWK}));
 assert.ok(reply.producingCode.sourceFiles['src/fuel-thermal.ts']);
 for(const state of reply.result.transport.checkpoints){
  const t=state.thermal;assert.equal(t.spatial.temperatureK.length,16);assert.ok(t.spatial.temperatureK.every(k=>k>=300&&k<=1900));
  assert.ok(t.relativeResidual<2e-8);assert.equal(t.linerEnergyJ,t.spatial.energyJ);
 }
 spatialCases++;
}
let mixtureCases=0;
for(const pair of Object.keys(FUEL_PAIRS).filter(p=>p!=='molecular'))for(const currentA of [0,.03]){
 const config={...DEFAULT_FUEL_CENTRIFUGE,pair,currentA,durationS:.2,gasK:600,linerK:500},operation={schemaVersion:1,events:[{timeS:.1,currentA:0}],thermal:{enabled:true,wallCapacityJK:10,gasWallWK:.1,coolingWK:1,coolantK:500,spatial:{material:'tungsten',thicknessM:.001,cells:16},gas:{conductivityWMK:.1}}};
 surface.onmessage({data:{kind:'fuel-centrifuge',schemaVersion:1,id:++id,config,includeTransport:true,operation}});
 const reply=replies.at(-1);assert.equal(reply.error,undefined,JSON.stringify({pair,currentA}));
 for(const path of ['src/fuel-gas.ts','src/fuel-gas-thermal.ts'])assert.ok(reply.producingCode.sourceFiles[path]);
 for(const s of reply.result.transport.checkpoints){assert.equal(s.thermal.gas.temperatureK.length,64);assert.ok(s.thermal.gas.minK>0);assert.ok(s.thermal.relativeResidual<2e-8);assert.equal(s.energy.freeEnergyJ,null);}
 if(pair==='lithium'&&currentA>0){
  const timeS=.06433;surface.onmessage({data:{kind:'fuel-centrifuge',schemaVersion:1,id:++id,config,includeTransport:true,
   operation:{...operation,events:[{timeS,currentA:0}]},resume:{transport:reply.result.transport,timeS}}});
  const branch=replies.at(-1);assert.equal(branch.error,undefined);const state=branch.result.transport.snapshots.find(s=>s.timeS===timeS);
  assert.equal(state.currentA,0);assert.ok(state.thermal.gas.temperatureK.every(Number.isFinite));
  assert.ok(branch.result.transport.snapshots.at(-1).thermal.relativeResidual<2e-8);
 }
 mixtureCases++;
}
let hotwallCases=0;
for(const switched of [false,true]){
 const config={...DEFAULT_FUEL_CENTRIFUGE,currentA:switched?0:.03,radialDiffusivityM2S:1e-30};
 const operation={schemaVersion:1,events:switched?[{timeS:.650137,currentA:.03}]:[],thermal:{enabled:true,
  wallCapacityJK:10,gasWallWK:.1,coolingWK:1,coolantK:500,
  spatial:{material:'tungsten',thicknessM:.001,cells:16},gas:{conductivityWMK:.1}}};
 surface.onmessage({data:{kind:'fuel-centrifuge',schemaVersion:1,id:++id,config,includeTransport:true,operation}});
 const reply=replies.at(-1);assert.equal(reply.error,undefined);const transport=reply.result.transport,at=switched ? .650137 : 0;
 assert.equal(transport.steps,512);assert.ok(transport.checkpoints.length>513);
 const torque=.03*config.magneticT*config.radiusM**2*(1-config.driveInnerFraction**2)/2,m=transport.mechanics;
 for(const state of transport.checkpoints.filter(s=>s.timeS>at&&s.timeS<=at+.02)){
  const exact=rotorResponse(m.ii,m.nn,m.gamma,m.drag,torque,state.timeS-at);
  assert.ok(Math.abs(state.ionRadS-exact.ion)<.03*Math.max(1,Math.abs(exact.ion)));
  assert.ok(Math.abs(state.neutralRadS-exact.neutral)<.03*Math.max(1,Math.abs(exact.neutral)));
 }
 for(const state of transport.checkpoints)assert.ok(state.thermal.relativeResidual<2e-8);
 hotwallCases++;
}
const adaptiveConfig={...DEFAULT_FUEL_CENTRIFUGE,durationS:.002};
const adaptiveOperation={schemaVersion:1,events:[],thermal:{enabled:true,wallCapacityJK:10,gasWallWK:.1,coolingWK:1,coolantK:500,
 spatial:{material:'tungsten',thicknessM:.001,cells:16},gas:{conductivityWMK:.1,accuracy:{relativeTolerance:6.25e-7,temperatureToleranceK:1e-7}}}};
surface.onmessage({data:{kind:'fuel-centrifuge',schemaVersion:1,id:++id,config:adaptiveConfig,includeTransport:true,operation:adaptiveOperation}});
const adaptive=replies.at(-1);assert.equal(adaptive.error,undefined);
assert.ok(adaptive.producingCode.sourceFiles['src/fuel-time-control.ts']);
assert.equal(adaptive.result.transport.cells,256);assert.equal(adaptive.result.transport.steps,512);
const timeControl=adaptive.result.transport.timeControl;
assert.equal(timeControl.relativeTolerance,6.25e-7);assert.equal(timeControl.temperatureToleranceK,1e-7);
assert.ok(timeControl.maxErrorRatio<=1&&timeControl.acceptedPairs>0&&timeControl.rejectedSteps>0);
assert.equal(adaptive.result.transport.checkpoints.length,2*timeControl.acceptedPairs+1);
const branchTime=.0005137;
surface.onmessage({data:{kind:'fuel-centrifuge',schemaVersion:1,id:++id,config:adaptiveConfig,includeTransport:true,
 operation:{...adaptiveOperation,events:[{timeS:branchTime,currentA:0}]},resume:{transport:adaptive.result.transport,timeS:branchTime}}});
const adaptiveBranch=replies.at(-1);assert.equal(adaptiveBranch.error,undefined);
assert.equal(adaptiveBranch.result.transport.timeControl.startTimeS,branchTime);
assert.deepEqual(adaptiveBranch.result.transport.checkpoints.filter(s=>s.timeS<branchTime),adaptive.result.transport.checkpoints.filter(s=>s.timeS<branchTime));
assert.equal(adaptiveBranch.result.transport.checkpoints.find(s=>s.timeS===branchTime).currentA,0);
for(const state of adaptiveBranch.result.transport.checkpoints)assert.ok(state.thermal.relativeResidual<2e-8);
for(const request of [{kind:'fuel-centrifuge',id:++id,config:DEFAULT_FUEL_CENTRIFUGE},{kind:'fuel-centrifuge',schemaVersion:1,id:++id,config:{...DEFAULT_FUEL_CENTRIFUGE,feedStage:13}}]){
 surface.onmessage({data:request});const reply=replies.at(-1);assert.equal(reply.id,request.id);assert.equal(reply.kind,'fuel-centrifuge');assert.equal(reply.schemaVersion,1);assert.equal(typeof reply.error,'string');assert.equal(reply.result,undefined);
}
surface.onmessage({data:{kind:'fuel-operating-map',schemaVersion:1,id:++id,config:DEFAULT_FUEL_CENTRIFUGE,options:{size:7}}});
assert.equal(replies.at(-1).error,undefined);assert.equal(replies.at(-1).kind,'fuel-operating-map');assert.equal(replies.at(-1).result.points.length,49);
console.log(JSON.stringify({worker:files[0],workerSHA256:hash(bytes),actualBundledCentrifugeCases:cases,transportCases:cases,operationCases,spatialCases,mixtureCases,hotwallCases,adaptiveCases:2,mapCells:49,invalidProtocolAndDomain:'rejected',sourceDigestsVerified:true}));
