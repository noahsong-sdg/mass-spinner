import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWorkspaceLayout,readWorkspaceLayout,workspaceGeometry,workspaceLayoutKey} from '../src/workspace-layout.js';

test('layout accepts only the current finite bounded geometry schema',()=>{
 const saved={version:1,left:.3,right:.4,split:.65,beamEnergy:400};
 const storage={getItem(key:string){assert.equal(key,workspaceLayoutKey);return JSON.stringify(saved);}};
 assert.deepEqual(readWorkspaceLayout(storage),{version:1,left:.3,right:.4,split:.65});
});

test('stale, pre-migration, corrupt and inaccessible layout storage restores default geometry',()=>{
 for(const value of [null,'not json','{}','{"version":0,"left":0.3,"right":0.4,"split":0.5}',JSON.stringify({...defaultWorkspaceLayout,left:200}),JSON.stringify({...defaultWorkspaceLayout,split:null}),JSON.stringify({...defaultWorkspaceLayout,right:"0.3"}),JSON.stringify({...defaultWorkspaceLayout,split:.99})]){
  assert.deepEqual(readWorkspaceLayout({getItem:()=>value}),defaultWorkspaceLayout,String(value));
 }
 assert.deepEqual(readWorkspaceLayout({getItem(){throw new Error('Storage denied');}}),defaultWorkspaceLayout);
 assert.deepEqual(readWorkspaceLayout(null),defaultWorkspaceLayout);
});

test('maximal stored side widths cannot squeeze the scene below its viewport reservation',()=>{
 for(const width of [741,800,1024,1440,2560]){
  const geometry=workspaceGeometry({...defaultWorkspaceLayout,left:.5,right:.5},width,true,true);
  assert.ok(geometry.left>0&&geometry.right>0);
  assert.ok(geometry.left+geometry.right+64<=width*.68+1,`${width}px viewport`);
  assert.ok(geometry.left<=440&&geometry.right<=660);
 }
 const closed=workspaceGeometry(defaultWorkspaceLayout,1024,false,false);
 assert.ok(closed.left>0&&closed.right>0,'closing rails does not destroy their configured widths');
});
