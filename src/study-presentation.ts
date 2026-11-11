import type {runOrbitStudy} from './experiments.js';
export function studyCurves(result:Awaited<ReturnType<typeof runOrbitStudy>>){
 const x=result.points.map(p=>p.value);
 const xLabel=result.study.kind==='ensemble'?'Destination (0=end, 1=wall, 2=source, 3=remaining)':
  ({voltage:'Bulk potential coefficient (V)',magneticT:'Axial B (T)',massB:'Species B mass (u)'})[result.study.parameter];
 if(result.study.kind==='ensemble'){
  return result.points[0].summary.species.map((s,i)=>{
   const outcomes=(['end','wall','source','remaining'] as const).map(d=>s.outcomes[d]);
   return {label:['A','B'][i],x:[0,1,2,3],y:outcomes.map(p=>p.fraction),low:outcomes.map(p=>p.low),high:outcomes.map(p=>p.high),xLabel,yLabel:'Injected-ion fraction · Wilson 95% interval'};
  });
 }
 const curves=[];
 for(const i of [0,1])for(const destination of ['wall','end'] as const){
  const intervals=result.points.map(p=>p.summary.species[i].outcomes[destination]);
  curves.push({label:`${['A','B'][i]} ${destination}`,x,y:intervals.map(p=>p.fraction),low:intervals.map(p=>p.low),high:intervals.map(p=>p.high),xLabel,yLabel:'Injected-ion fraction · Wilson 95% interval'});
 }
 for(const stream of ['endA','wallB'] as const){
  const values=result.points.map(p=>p.summary.purity[stream]);
  curves.push({label:stream==='endA'?'End A purity':'Wall B purity',x,y:values.map(p=>p.fraction??NaN),low:values.map(p=>p.low??NaN),high:values.map(p=>p.high??NaN),xLabel,yLabel:'Number purity · paired-batch bootstrap 95% interval'});
 }
 if(result.points.every(p=>p.coldReference)){
  const yLabel='Cold stability ratio 4α / Ωc² (threshold = 1)';
  for(const i of [0,1])curves.push({label:`${['A','B'][i]} ideal cold reference`,x,
   y:result.points.map(p=>{const s=p.coldReference!.species[i];return 4*s.electricRateSquared/s.cyclotronRadS**2;}),xLabel,yLabel});
  curves.push({label:'Marginal cold stability',x,y:x.map(()=>1),xLabel,yLabel});
 }
 return curves;
}
