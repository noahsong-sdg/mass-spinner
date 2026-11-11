import {producingCode,type ProducingCodeIdentity} from './producing-code.js';
type WorkerFactory=()=>Pick<Worker,'onmessage'|'onerror'|'postMessage'|'terminate'>;
const createSimulationWorker:WorkerFactory=()=>new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});

/** Existing solver consumers keep their result-only contract. */
export function requestSimulation(request:Record<string,unknown>,signal?:AbortSignal,
 createWorker:WorkerFactory=createSimulationWorker):Promise<unknown>{
 return requestSimulationWithIdentity(request,signal,createWorker).then(reply=>reply.result);
}

/** One cancellable computation. Termination also settles the promise, so obsolete
 * UI requests cannot remain pending when live sliders supersede them. */
export function requestSimulationWithIdentity(request:Record<string,unknown>,signal?:AbortSignal,
 createWorker:WorkerFactory=createSimulationWorker):Promise<{result:unknown;producingCode:ProducingCodeIdentity|null}>{
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Superseded','AbortError'));return;}
  const worker=createWorker();
  const cleanup=()=>{worker.terminate();signal?.removeEventListener('abort',abort);};
  const abort=()=>{cleanup();reject(new DOMException('Superseded','AbortError'));};
  signal?.addEventListener('abort',abort,{once:true});
  worker.onmessage=({data})=>{
   cleanup();
   if(['coupled-target','fuel-centrifuge','fuel-operating-map'].includes(String(request.kind))&&(data?.id!==request.id||data?.kind!==request.kind||data?.schemaVersion!==1)){
    reject(new Error(`Unsupported ${request.kind} worker response.`));return;
   }
   data.error?reject(new Error(data.error)):resolve({result:data.result,producingCode:producingCode(data.producingCode)});
  };
  worker.onerror=()=>{cleanup();reject(new Error('Physics worker failed.'));};
  try{worker.postMessage(request);}catch(error){cleanup();reject(error);}
 });
}
