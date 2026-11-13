/** Read-only derived-source instrumentation of the exact failed browser case. */
import {readFileSync,writeFileSync} from 'node:fs';
const here=new URL('./',import.meta.url),source=new URL('../../../src/coupled-target.ts',here);
const packet=JSON.parse(readFileSync(new URL('./results/browser.json',here),'utf8'));
const failed=packet.rows.find((r:any)=>!r.completed);if(!failed)throw new Error('No failed case');
let text=readFileSync(source,'utf8').replaceAll("from './",`from '${new URL('../../../src/',here).pathname}`);
text=text.replace("throw new RangeError('Raw target packing exceeds the numerical roundoff admission bound.');",
 "throw new RangeError('Packing diagnosis '+JSON.stringify({i,t:state.t[i],d:state.d[i],v:state.v[i],total,residual,threshold:64*Number.EPSILON*n,n}));");
text=text.replace('const plan=on?beamAt(s):',`const checked=()=>{try{return beamAt(s);}catch(error){console.error(JSON.stringify({acceptedSteps,rejectedSteps,dt,on,state:s}));throw error;}};const plan=on?checked():`);
const derived=new URL('./results/diagnostic-source.ts',here);writeFileSync(derived,text);
const {simulateCoupledTarget}=await import(derived.href);
try{simulateCoupledTarget(failed.beam,failed.config);throw new Error('Failure did not reproduce');}
catch(error){console.log(JSON.stringify({id:failed.id,stepS:failed.stepS,error:String(error)}));}
