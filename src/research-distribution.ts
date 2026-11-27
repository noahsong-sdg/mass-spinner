export interface Marginal {x:number[];density:number[];number:number;moments:number[];quadratureRelativeScaledError:number}
export interface DistributionState {step:number;timeS:number;species:{species:number;variance:number;axes:Marginal[]}[];physicalEntropy:{H:number;sensitivityPerInitialNumber:number;quadratureGate:string}}
export interface DistributionCase {id:string;label:string;states:DistributionState[];gates:Record<string,string>;sourceDirectory:string;auditSource:string}
export interface RefinementSpecies {
 incrementL1?:number|null;characteristicLowerWitness?:number|null;
 bound?:{upperBound?:number|null}|null;gate?:string;
}
export interface RefinementRecord {left?:string;right?:string;timeS:number;gate:string;species:RefinementSpecies[]}
export interface DistributionPacket {schemaVersion:string;kind:string;cases:DistributionCase[];normalization:{velocityMS:number};sourceSHA256:Record<string,string>;refinements:{study:string;source:string;comparison:{id:string};records:RefinementRecord[]}[]}
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const numbers=(value:unknown):value is number[]=>Array.isArray(value)&&value.every(v=>typeof v==='number');
const optionalNumber=(value:unknown)=>value===undefined||value===null||typeof value==='number';
function refinementSpecies(value:unknown):value is RefinementSpecies {
 return record(value)&&optionalNumber(value.incrementL1)&&optionalNumber(value.characteristicLowerWitness)&&
  (value.gate===undefined||typeof value.gate==='string')&&
  (value.bound==null||record(value.bound)&&optionalNumber(value.bound.upperBound));
}
function marginal(value:unknown):value is Marginal {
 return record(value)&&numbers(value.x)&&numbers(value.density)&&numbers(value.moments)&&typeof value.number==='number'&&typeof value.quadratureRelativeScaledError==='number';
}
function distributionState(value:unknown):value is DistributionState {
 return record(value)&&typeof value.step==='number'&&typeof value.timeS==='number'&&Array.isArray(value.species)&&value.species.every(p=>
  record(p)&&typeof p.species==='number'&&typeof p.variance==='number'&&Array.isArray(p.axes)&&p.axes.every(marginal))&&
  record(value.physicalEntropy)&&typeof value.physicalEntropy.H==='number'&&typeof value.physicalEntropy.sensitivityPerInitialNumber==='number'&&typeof value.physicalEntropy.quadratureGate==='string';
}
function distributionPacket(value:unknown):value is DistributionPacket {
 return record(value)&&typeof value.schemaVersion==='string'&&typeof value.kind==='string'&&
  record(value.normalization)&&typeof value.normalization.velocityMS==='number'&&record(value.sourceSHA256)&&Object.values(value.sourceSHA256).every(v=>typeof v==='string')&&
  Array.isArray(value.cases)&&value.cases.every(c=>record(c)&&typeof c.id==='string'&&typeof c.label==='string'&&typeof c.sourceDirectory==='string'&&typeof c.auditSource==='string'&&
   record(c.gates)&&Object.values(c.gates).every(v=>typeof v==='string')&&Array.isArray(c.states)&&c.states.every(distributionState))&&
  Array.isArray(value.refinements)&&value.refinements.every(g=>record(g)&&typeof g.study==='string'&&typeof g.source==='string'&&record(g.comparison)&&typeof g.comparison.id==='string'&&
   Array.isArray(g.records)&&g.records.every(r=>record(r)&&(r.left===undefined||typeof r.left==='string')&&(r.right===undefined||typeof r.right==='string')&&typeof r.timeS==='number'&&typeof r.gate==='string'&&Array.isArray(r.species)&&r.species.every(refinementSpecies)));
}

export function validateDistributionPacket(data:unknown):DistributionPacket{
 if(!distributionPacket(data))throw new Error('Unsupported recorded distribution packet.');
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
export function recordedDistribution(data:DistributionPacket,caseId:string|undefined,step:number|undefined){
 const c=data.cases.find(c=>c.id===caseId),state=c?.states.find(s=>s.step===step);
 if(!c||!state)throw new Error('This exact case and saved step has no recorded distribution.');
 return {case:c,state};
}

export function distributionCurves(data:DistributionPacket,caseId:string|undefined,step:number|undefined,axis:number){
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
