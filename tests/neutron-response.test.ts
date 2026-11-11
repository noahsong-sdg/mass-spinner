import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateNeutronResponse,type NeutronResponsePacket} from '../src/neutron-response.ts';
// Artificial linear fixture tests interpolation/validation only; never a transport reference.
const fixture=():NeutronResponsePacket=>({schemaVersion:1,family:'h1-cylinder-ce-v38-r1',qualified:true,openmcVersion:'0.16.0',
 historiesPerCase:1000000,batches:100,photonTransport:false,processing:{code:'NJOY2016',version:'2016.78',relativeTolerance:.001},
 source:{energyMeV:14.1,normalization:'per emitted isotropic source neutron'},geometry:{radiusM:.1,frontM:.1,outerRadiusM:1},
 material:{nuclide:'H1',atomDensityM3:6e28,temperatureK:293.6,rawSHA256:'3024d8f0db604b074e33ed8b05027eb9f5a738614041ba44c83f048e0d0bc1af',processedSHA256:'a'.repeat(64)},
 nodes:[.02,.04,.06,.1,.14,.18].map((x,i)=>({thicknessM:x,seed:i+1,scores:{absorption:{mean:x/100,stdError:.000001},total:{mean:x,stdError:.0001}}})),
 holdouts:[.03,.05,.08,.12,.16].map((x,i)=>({thicknessM:x,seed:i+11,scores:{absorption:{mean:x/100,stdError:.000001},total:{mean:x,stdError:.0001}}})),
 qualification:{controlsPassed:true,scatterFloorCmInv:1e-10,absoluteTolerance:{absorption:.000005,total:.0005},sigmaMultiplier:4}});
test('response interpolation keeps MC and holdout residual distinct with exact source normalization',()=>{
 const r=evaluateNeutronResponse(fixture(),.03,14.1,2e10),s=r.scores as Record<string,{mean:number;stdError:number;rateS:number;maxObservedHoldoutResidual:number}>;
 assert.ok(Math.abs(s.total.mean-.03)<1e-15);assert.equal(s.total.rateS,s.total.mean*2e10);
 assert.ok(Math.abs(s.total.stdError-Math.SQRT1_2*.0001)<1e-18);assert.ok(s.total.maxObservedHoldoutResidual<1e-15);
 assert.match(r.limitations,/separate/);assert.equal((evaluateNeutronResponse(fixture(),.02,14.1,0).scores as any).total.rateS,0);
});
test('stale identity, unsupported energy/geometry and out-of-grid results are withheld',()=>{
 for(const x of [.019,.181,NaN])assert.throws(()=>evaluateNeutronResponse(fixture(),x,14.1,1));
 assert.throws(()=>evaluateNeutronResponse(fixture(),.04,14.2,1));assert.throws(()=>evaluateNeutronResponse(fixture(),.04,14.1,-1));
 const stale=fixture();stale.family='v35-three-reference-cases';assert.throws(()=>evaluateNeutronResponse(stale,.04,14.1,1),/stale/);
 const geometry=fixture();geometry.geometry.radiusM=.2;assert.throws(()=>evaluateNeutronResponse(geometry,.04,14.1,1),/identity/);
 const data=fixture();data.material.processedSHA256='g'.repeat(64);assert.throws(()=>evaluateNeutronResponse(data,.04,14.1,1));
 const overflow=fixture();for(const n of [...overflow.nodes,...overflow.holdouts])n.scores.total.mean*=1000;
 assert.throws(()=>evaluateNeutronResponse(overflow,.04,14.1,Number.MAX_VALUE),/finite numerical domain/);
});
test('qualification flag cannot hide failed, missing or correlated holdouts',()=>{
 const failed=fixture();failed.holdouts[0].scores.total.mean=.2;assert.throws(()=>evaluateNeutronResponse(failed,.04,14.1,1),/gate failed/);
 const missing=fixture();missing.holdouts.pop();assert.throws(()=>evaluateNeutronResponse(missing,.04,14.1,1),/incomplete/);
 const correlated=fixture();correlated.holdouts[0].seed=correlated.nodes[0].seed;assert.throws(()=>evaluateNeutronResponse(correlated,.04,14.1,1),/reused/);
 const control=fixture();control.qualification.controlsPassed=false;assert.throws(()=>evaluateNeutronResponse(control,.04,14.1,1),/incomplete/);
});
