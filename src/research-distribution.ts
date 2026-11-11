export interface Marginal {x:number[];density:number[];number:number;moments:number[];quadratureRelativeScaledError:number}
export interface DistributionState {step:number;timeS:number;species:{species:number;variance:number;axes:Marginal[]}[];physicalEntropy:{H:number;sensitivityPerInitialNumber:number;quadratureGate:string}}
export interface DistributionCase {id:string;label:string;states:DistributionState[];gates:Record<string,string>;sourceDirectory:string;auditSource:string}
export interface DistributionPacket {schemaVersion:string;kind:string;cases:DistributionCase[];normalization:{velocityMS:number};sourceSHA256:Record<string,string>;refinements:{study:string;source:string;comparison:{id:string};records:any[]}[]}

export function validateDistributionPacket(data:DistributionPacket){
 if(data?.schemaVersion!=='mass-spinner-distributions-v1'||data.kind!=='recorded-offline-data'||!data.cases?.length||!data.refinements?.length||!Number.isFinite(data.normalization?.velocityMS)||data.normalization.velocityMS<=0)
  throw new Error('Unsupported recorded distribution packet.');
 const ids=new Set<string>();
 for(const c of data.cases){
  if(ids.has(c.id)||!c.states?.length||!data.sourceSHA256?.[c.auditSource]||!data.sourceSHA256?.[c.sourceDirectory+'/history.jsonl'])throw new Error('Missing or duplicated recorded distribution provenance.');
  ids.add(c.id);let lastStep=-1,lastTime=-1;
  for(const s of c.states){
   if(!Number.isSafeInteger(s.step)||s.step<=lastStep||!Number.isFinite(s.timeS)||s.timeS<0||s.timeS<=lastTime||s.species?.length!==2||!Number.isFinite(s.physicalEntropy?.H)||!Number.isFinite(s.physicalEntropy.sensitivityPerInitialNumber)||s.physicalEntropy.sensitivityPerInitialNumber<0)
    throw new Error('Invalid saved distribution state.');
   lastStep=s.step;lastTime=s.timeS;
   for(const [index,p] of s.species.entries()){
    if(p.species!==index+1||!Number.isFinite(p.variance)||p.variance<=0||p.axes.length!==3)throw new Error('Invalid saved mixture species.');
    for(const m of p.axes){
     if(!Number.isFinite(m.number)||m.number<=0||m.x.length<3||m.x.length!==m.density.length||m.moments.length!==3||!m.moments.every(Number.isFinite)||!Number.isFinite(m.quadratureRelativeScaledError)||m.quadratureRelativeScaledError>1e-8||m.quadratureRelativeScaledError<0||m.density.some(n=>!Number.isFinite(n)||n<0)||m.x.some((v,i)=>!Number.isFinite(v)||(i>0&&v<=m.x[i-1])))throw new Error('Invalid or unqualified saved marginal.');
    }
   }
  }
 }
 return data;
}

/** Exact keys only: no nearest-time match, interpolation or moment-based reconstruction. */
export function recordedDistribution(data:DistributionPacket,caseId:string,step:number){
 const c=data.cases.find(c=>c.id===caseId),state=c?.states.find(s=>s.step===step);
 if(!c||!state)throw new Error('This exact case and saved step has no recorded distribution.');
 return {case:c,state};
}

export function distributionCurves(data:DistributionPacket,caseId:string,step:number,axis:number){
 if(!Number.isInteger(axis)||axis<0||axis>2)throw new Error('A recorded x/y/z axis is required.');
 const selected=recordedDistribution(data,caseId,step),name=['x','y','z'][axis];
 const curves=selected.state.species.map((s,i)=>({label:`${i?'84':'40'} u`,x:s.axes[axis].x,y:s.axes[axis].density,
  xLabel:`v${name} / V₀`,yLabel:'Recorded marginal density',color:i?'#d2956b':'#a4c4b1'}));
 const initial=selected.case.states[0],number=initial.species.reduce((n,s)=>n+s.axes[0].number,0),base=initial.physicalEntropy;
 const x=selected.case.states.map(s=>s.timeS*1e6),h=selected.case.states.map(s=>(s.physicalEntropy.H-base.H)/number);
 const error=selected.case.states.map(s=>s.physicalEntropy.sensitivityPerInitialNumber+base.sensitivityPerInitialNumber);
 return {curves:[...curves,...[
  {label:'Physical H estimate',y:h,color:'#c5b8de',dash:''},
  {label:'Integration sensitivity +',y:h.map((v,i)=>v+error[i]),color:'#8f859f',dash:'3 4'},
  {label:'Integration sensitivity −',y:h.map((v,i)=>v-error[i]),color:'#8f859f',dash:'3 4'},
 ].map(c=>({...c,x,xLabel:'Saved time (µs)',yLabel:'Recorded ΔH / initial number',selectedX:selected.state.timeS*1e6}))],...selected};
}
