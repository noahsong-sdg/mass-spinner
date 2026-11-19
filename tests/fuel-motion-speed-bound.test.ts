import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelTransport} from '../src/fuel-transport.js';
import {createFuelMotion,fuelMotionState,type FuelMotion} from '../src/fuel-motion.js';
import {releaseSurfaceGroup} from '../src/surface-layer.js';

function fixture(){
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:.06});
 return {...rotor,transport:simulateFuelTransport(rotor,{cells:8,steps:256})};
}
function dispose(motion:FuelMotion){
 const textures=new Set<THREE.Texture>();
 motion.group.traverse(node=>{if(node instanceof THREE.InstancedMesh)node.dispose();if(node instanceof THREE.Points&&node.material instanceof THREE.PointsMaterial&&node.material.map)textures.add(node.material.map);});
 for(const texture of textures)texture.dispose();releaseSurfaceGroup(motion.group);
}

test('accepted motion scans history once, rather than once per playback/trail sample',t=>{
 const result=fixture(),history=result.transport.snapshots;let historyScans=0,historyReads=0;
 result.transport.snapshots=new Proxy(history,{get(target,key,receiver){
  if(key===Symbol.iterator)return function*(){historyScans++;for(const sample of target){historyReads++;yield sample;}};
  return Reflect.get(target,key,receiver);
 }});
 const motion=createFuelMotion(result);t.after(()=>dispose(motion));
 assert.equal(historyScans,1);assert.equal(historyReads,history.length);
 for(const mode of ['spin','equilibrium','transport','flow'] as const)for(const timeS of [0,.137,.5]){
  const scans:number=historyScans,reads:number=historyReads;
  const actual=motion.update(timeS,mode);
  assert.equal(historyScans,scans,'playback and its trail samples must not scan accepted history');
  assert.equal(historyReads,reads);
  const expected=fuelMotionState(result,timeS,mode);
  assert.deepEqual(actual,expected,'cached playback must retain all public numerical behavior');
 }
});

test('new motion instances refresh the bound while standalone mutable-input calls remain uncached',t=>{
 const result=fixture(),oldMotion=createFuelMotion(result);t.after(()=>dispose(oldMotion));
 const before=oldMotion.update(0,'spin'),end=result.samples.at(-1)!;
 const peak=result.transport.snapshots.at(-1)!;
 peak.ionRadS=Math.max(Math.abs(end.ionRadS),Math.abs(end.neutralRadS),2*Math.PI*before.turnoverHz,1.8)*10;
 const expectedScale=1.8/peak.ionRadS;
 assert.equal(fuelMotionState(result,0,'spin').secondsPerScreenSecond,expectedScale,'standalone calls must observe changed input history');
 const newMotion=createFuelMotion(result);t.after(()=>dispose(newMotion));
 assert.equal(newMotion.update(0,'spin').secondsPerScreenSecond,expectedScale,'a new accepted renderer must use the new speed bound');
 assert.equal(oldMotion.update(0,'spin').secondsPerScreenSecond,before.secondsPerScreenSecond,'accepted bounds belong to one renderer lifetime');
 for(const mode of ['equilibrium','flow'] as const)assert.deepEqual(newMotion.update(0,mode),fuelMotionState(result,0,mode),'reference clocks must not inherit the coupled-history bound');
});

test('checkpoint history takes precedence over display snapshots for the motion speed bound',t=>{
 const result=fixture(),checkpoints=result.transport.snapshots.map(snapshot=>({...snapshot}));
 const peak=checkpoints.at(-1)!,end=result.samples.at(-1)!;
 peak.neutralRadS=Math.max(Math.abs(end.ionRadS),Math.abs(end.neutralRadS),1.8)*100;
 const accepted={...result,transport:{...result.transport,checkpoints}},motion=createFuelMotion(accepted);t.after(()=>dispose(motion));
 assert.equal(motion.update(0,'spin').secondsPerScreenSecond,1.8/peak.neutralRadS);
 assert.deepEqual(motion.update(0,'spin'),fuelMotionState(accepted,0,'spin'));
});
