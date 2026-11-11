import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport} from '../src/fuel-transport.js';
import {createFuelViewTools} from '../src/fuel-view-ui.js';

test('legacy histories without checkpoints retain samples and conservative continuation diagnostics',()=>{
 const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,durationS:.1});
 const options={cells:8,steps:256},history=simulateFuelOperation(r,{schemaVersion:1,events:[]},options);
 delete history.checkpoints;
 for(const s of history.snapshots)delete s.resolution;
 const cursor=history.snapshots[2].timeS,old=sampleFuelTransport(history,cursor);
 const resumed=simulateFuelOperation(r,{schemaVersion:1,events:[{timeS:cursor,currentA:0}]},options,{transport:history,timeS:cursor});
 assert.deepEqual(sampleFuelTransport(resumed,cursor).lightMass,old.lightMass);
 assert.ok(resumed.maxCellExponent>=history.maxCellExponent);
 assert.ok(resumed.maxCouplingIterations>=history.maxCouplingIterations);
});

test('branch diagnostics exclude the discarded future when checkpoints are available',()=>{
 const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,durationS:.1});
 const options={cells:8,steps:256},history=simulateFuelOperation(r,{schemaVersion:1,events:[]},options);
 const cursor=.1/256,at=sampleFuelTransport(history,cursor);
 assert.ok(history.maxCellExponent>at.resolution!.maxCellExponent);
 const ended=simulateFuelCentrifuge({...r.config,durationS:cursor});
 const resumed=simulateFuelOperation(ended,{schemaVersion:1,events:[{timeS:cursor,currentA:0}]},options,{transport:history,timeS:cursor});
 assert.equal(resumed.maxCellExponent,at.resolution!.maxCellExponent);
 assert.equal(resumed.maxCouplingIterations,at.resolution!.maxCouplingIterations);
 assert.ok(resumed.checkpoints!.every(s=>!('profiles' in s)&&!('lightCDF' in s)&&!('heavyCDF' in s)));
});

test('continuation rejects corrupted checkpoint resolution instead of losing qualification warnings',()=>{
 const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,durationS:.1});
 const options={cells:8,steps:16},history=simulateFuelOperation(r,{schemaVersion:1,events:[]},options);
 history.checkpoints!.at(-1)!.resolution!.maxCellExponent=NaN;
 assert.throws(()=>simulateFuelOperation(r,{schemaVersion:1,events:[]},options,{transport:history,timeS:.1}),RangeError);
});

test('unchanged legends avoid redundant text mutations while drive changes remain visible',async()=>{
 const dom=new JSDOM('<main></main>'),doc=dom.window.document,host=doc.querySelector('main')!;
 try{
  const view=createFuelViewTools({document:doc,host});
  const tools={legend:{label:'Composition',domain:[0,1],unit:'',colors:['#000','#fff']},drive:{state:{fieldT:.5,currentA:.03,torqueNm:1e-5}}};
  view.updateLegend(tools);let writes=0;
  const observer=new dom.window.MutationObserver(records=>{writes+=records.filter(r=>r.type==='childList').length;});
  observer.observe(host,{childList:true,subtree:true});
  view.updateLegend(tools);await Promise.resolve();assert.equal(writes,0);
  tools.drive.state.currentA=0;view.updateLegend(tools);await Promise.resolve();
  assert.equal(writes,1);assert.match(host.querySelector('.fuel-drive-legend')!.textContent!,/I 0\.00 A/);observer.disconnect();
 }finally{dom.window.close();}
});
