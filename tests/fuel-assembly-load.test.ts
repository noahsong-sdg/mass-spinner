import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {loadFuelAssembly} from '../src/fuel-assembly.js';

test('a failed assembly load surfaces its error and allows an explicit retry, while in-flight and successful loads are shared',async t=>{
 const failure=new Error('temporary model download failure'),scene=new Group();
 let rejectFirst!:(error:Error)=>void;
 const firstRequest=new Promise<never>((_,reject)=>{rejectFirst=reject;});
 let attempts=0;
 const load=t.mock.method(GLTFLoader.prototype,'loadAsync',()=>++attempts===1?firstRequest:Promise.resolve({scene}));

 const failed=loadFuelAssembly();
 assert.equal(loadFuelAssembly(),failed,'concurrent callers share one in-flight load');
 assert.equal(load.mock.callCount(),1);
 assert.deepEqual(load.mock.calls[0].arguments,['/models/centrifuge-assembly.glb']);
 const rejected=assert.rejects(failed,error=>error===failure);
 rejectFirst(failure);
 await rejected;
 assert.equal(load.mock.callCount(),1,'failure must not trigger automatic retries');

 const retry=loadFuelAssembly();
 assert.notEqual(retry,failed);
 assert.equal(loadFuelAssembly(),retry);
 assert.equal(load.mock.callCount(),2);
 assert.equal(await retry,scene);
 assert.equal(loadFuelAssembly(),retry,'successful template stays cached');
 assert.equal(await loadFuelAssembly(),scene);
 assert.equal(load.mock.callCount(),2);
});
