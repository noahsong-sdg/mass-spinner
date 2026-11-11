import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupResearchViewer} from '../src/research-ui.js';
import {renderConvergenceEvidence} from '../src/convergence-evidence.js';
import {arrivalCurves} from '../src/ensemble.js';
import {DEFAULT_CONFIG,simulate} from '../src/physics.js';

function page(t:any){
 const page=new JSDOM(readFileSync('index.html','utf8'));
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:page.window.document});
 t.after(()=>{page.window.close();if(prior)Object.defineProperty(globalThis,'document',prior);else Reflect.deleteProperty(globalThis,'document');});
 return page;
}

test('research UI displays every saved tensor without turning the replay into a live solver',async t=>{
 const p=page(t),data=JSON.parse(readFileSync('web-assets/research-recordings.json','utf8'));
 let calls=0;
 const viewer=await setupResearchViewer(async()=>{calls++;return {ok:true,json:async()=>data};});
 assert.ok(viewer);
 const select=p.window.document.getElementById('replay-case') as HTMLSelectElement;
 const time=p.window.document.getElementById('replay-time') as HTMLInputElement;
 let checked=0;
 for(const c of data.cases){
  select.value=c.id;select.dispatchEvent(new p.window.Event('change'));
  for(let i=0;i<c.states.length;i++){
   time.value=String(i);time.dispatchEvent(new p.window.Event('input'));
   const tensors=p.window.document.querySelectorAll('#replay-tensors pre');
   for(let s=0;s<2;s++)assert.equal(tensors[s].textContent,c.states[i].temperatureTensorEV[s].map((row:number[])=>row.map(v=>v.toPrecision(5).padStart(11)).join(' ')).join('\n'));
   assert.match(p.window.document.getElementById('replay-status')!.textContent!,/qualification WITHHELD.*No solver runs/);
   assert.equal(p.window.document.querySelectorAll('#replay-plots figure').length,3);
   checked++;
  }
 }
 assert.equal(checked,63);assert.equal(calls,1,'scrubbing never fetches or computes new trajectories');
});

test('frozen convergence display identifies its source and does not claim a live-slider matrix',t=>{
 const p=page(t),evidence=JSON.parse(readFileSync('web-assets/convergence/display.json','utf8'));
 renderConvergenceEvidence(evidence);
 const status=p.window.document.getElementById('convergence-status')!.textContent!;
 assert.match(status,/Static audit evidence; changing sliders does not rerun this matrix/);
 assert.ok(status.includes(evidence.status.toUpperCase()));
 assert.ok(p.window.document.getElementById('convergence-identity')!.textContent!.includes(evidence.sourceHash));
 assert.equal(p.window.document.querySelectorAll('#convergence-rows tr').length,evidence.levels.length);
 for(const [i,check]of evidence.checks.entries())assert.ok(p.window.document.querySelectorAll('#convergence-checks li')[i].textContent!.startsWith(check.status.toUpperCase()));
});

test('actual thermal-source outcome curves conserve injected probability through every competing event',()=>{
 const result=simulate({...DEFAULT_CONFIG,particlesPerSpecies:24,distribution:'thermal',parallelEV:.01,
  axialTemperatureEV:2,duration:5e-5,seed:714});
 assert.ok(result.species.every(s=>s.source>0),'exercise immediate competing source returns');
 const curves=arrivalCurves(result);
 for(const label of ['A','B']){
  const incidence=curves.filter(c=>c.yLabel===`Fraction of injected ${label} ions`);
  assert.equal(incidence.length,4);
  for(let i=0;i<incidence[0].x.length;i++)assert.ok(Math.abs(incidence.reduce((sum,c)=>sum+c.y[i],0)-1)<1e-14);
  const s=result.species[label==='A'?0:1];
  for(const d of ['end','wall','source'] as const){
   const c=incidence.find(c=>c.label===`${label} ${d}`)!;
   assert.equal(c.y.at(-1),s[d]/s.injected);
   for(let i=1;i<c.y.length;i++)assert.ok(c.y[i]>=c.y[i-1]);
  }
 }
});
