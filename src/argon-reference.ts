import {ARGON_REFERENCE_ASSET} from './argon-reference-identity.js';

export interface RecordedArgonCase {
 scenario:string;anodeCenterM:number;refinement:1|2|4;packet:string;packetSHA256:string;
 chordVelocityMS:number[];experimentalQualification:false;contactVoltageExperimental:false;
}
export interface RecordedArgonReference {
 schemaVersion:1;kind:'recorded-argon-reference';
 origin:{archive:string;archiveSha256:string;member:string;memberSha256:string};
 manifest:{radiusM:number;halfLengthM:number;cathodeRadiusM:number;anodeCenterM:number;
  anodeWidthM:number;magneticT:number;branchCurrentA:number;viscosityPaS:number;chordsM:number[]};
 scenarios:{name:string;shape:'linear'|'quadratic';electronTemperatureEV:number;partition:'source';leadingWeakIonization:false}[];
 cases:RecordedArgonCase[];comparisons:({scenario:string;anodeCenterM:number}&Record<string,string|number>)[];
 numericalGates:{conservation:true;refinement:true;independentReference:true};sourceSHA256:Record<string,string>;
 baselineSHA256:string;experimentalQualification:false;livePlaygroundQualified:false;currentFitted:false;scope:string;
}
type ObjectValue=Record<string,unknown>;
const fail=(name:string):never=>{throw new Error(`Invalid recorded argon reference: ${name}.`);};
const object=(v:unknown,name:string):ObjectValue=>v&&typeof v==='object'&&!Array.isArray(v)?v as ObjectValue:fail(name);
const text=(v:unknown,name:string):string=>typeof v==='string'&&v.length>0?v:fail(name);
const hash=(v:unknown,name:string):string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)?v:fail(name);
const finite=(v:unknown,name:string):number=>typeof v==='number'&&Number.isFinite(v)?v:fail(name);
const array=(v:unknown,name:string):unknown[]=>Array.isArray(v)?v:fail(name);
const equal=(a:unknown,b:unknown,name:string)=>{if(a!==b)fail(name);};
const scenarioIds=['linear-finite-te1','linear-finite-te2.5-source','quadratic-finite-te1','quadratic-finite-te2.5-source'];
const comparisonKeys=['chordCoarseChange','chordFineChange','localCoarseChange','localFineChange',
 'viscousCoarseChange','viscousFineChange','fieldCoarseChange','fieldFineChange','independentFVChordDifference'];

/** A fixed recorded experiment in numerical verification, never a live surrogate.
 * Reject obsolete/partial packets and attempts to promote their qualification. */
export function parseRecordedArgonReference(input:unknown):RecordedArgonReference {
 const d=object(input,'packet');equal(d.schemaVersion,1,'schemaVersion');equal(d.kind,'recorded-argon-reference','kind');
 for(const name of ['experimentalQualification','livePlaygroundQualified','currentFitted'])equal(d[name],false,name);
 equal(d.scope,'Conditional angular-only model; uniform-emissivity centroid, not the experimental diagnostic','scope');
 const origin=object(d.origin,'origin');
 equal(origin.archive,'scientific/nonrigid-v98/evidence.tar.gz','archive');
 equal(origin.member,'scientific/nonrigid-v98/apparatus-results/predictions.json','member');
 equal(origin.archiveSha256,ARGON_REFERENCE_ASSET.archiveSha256,'archive hash');
 equal(origin.memberSha256,ARGON_REFERENCE_ASSET.memberSha256,'member hash');hash(d.baselineSHA256,'baseline hash');
 const sources=object(d.sourceSHA256,'source hashes');if(!Object.keys(sources).length)fail('empty source identity');
 for(const [name,value]of Object.entries(sources)){text(name,'source path');hash(value,'source hash');}
 const m=object(d.manifest,'manifest');
 for(const [name,value]of Object.entries({radiusM:.06,halfLengthM:.24,cathodeRadiusM:.004,anodeCenterM:.07,
  anodeWidthM:.02,magneticT:.13,branchCurrentA:100,viscosityPaS:.000114}))equal(m[name],value,name);
 const chords=array(m.chordsM,'chords');equal(chords.length,11,'chord count');
 chords.forEach((v,i)=>equal(v,(i+1)/200,'recorded chord coordinate'));
 const scenarios=array(d.scenarios,'scenarios');equal(scenarios.length,4,'scenario count');
 const ids=new Set<string>();
 for(const item of scenarios){
  const s=object(item,'scenario'),id=text(s.name,'scenario name');
  if(!scenarioIds.includes(id)||ids.has(id))fail('scenario identity');ids.add(id);
  equal(s.shape,id.startsWith('linear')?'linear':'quadratic','shape');
  equal(s.electronTemperatureEV,id.includes('2.5')?2.5:1,'prescribed electron temperature');
  equal(s.partition,'source','partition');equal(s.leadingWeakIonization,false,'ionization conditioning');
 }
 const cases=array(d.cases,'cases');equal(cases.length,24,'complete case count');
 const caseIds=new Set<string>();
 for(const item of cases){
  const c=object(item,'case'),id=text(c.scenario,'case scenario'),a=finite(c.anodeCenterM,'anode location'),n=finite(c.refinement,'refinement');
  if(!ids.has(id)||![.07,.08].includes(a)||![1,2,4].includes(Number(n))||typeof n!=='number')fail('case condition');
  const key=`${id}/${a}/${n}`;if(caseIds.has(key))fail('duplicate case');caseIds.add(key);
  equal(c.packet,`${id}-a${a}-n${n}.npz`,'original packet name');hash(c.packetSHA256,'original packet hash');
  equal(c.experimentalQualification,false,'case qualification');equal(c.contactVoltageExperimental,false,'voltage qualification');
  const velocities=array(c.chordVelocityMS,'chord velocity');equal(velocities.length,chords.length,'sample count');
  velocities.forEach(v=>finite(v,'sample velocity'));
 }
 const comparisons=array(d.comparisons,'comparisons');equal(comparisons.length,8,'comparison count');
 const comparisonIds=new Set<string>();
 for(const item of comparisons){
  const row=object(item,'comparison'),id=text(row.scenario,'comparison scenario'),a=finite(row.anodeCenterM,'comparison anode');
  if(!ids.has(id)||![.07,.08].includes(a))fail('comparison condition');
  const key=`${id}/${a}`;if(comparisonIds.has(key))fail('duplicate comparison');comparisonIds.add(key);
  for(const name of comparisonKeys)if(finite(row[name],name)<0)fail(name);
 }
 const gates=object(d.numericalGates,'numerical gates');
 for(const name of ['conservation','refinement','independentReference'])equal(gates[name],true,name);
 return d as unknown as RecordedArgonReference;
}

/** Fetch only the hash-pinned asset; checking its digest does not rerun its audits. */
export async function loadRecordedArgonReference(fetcher:typeof fetch=fetch,signal?:AbortSignal):Promise<RecordedArgonReference> {
 const response=await fetcher(ARGON_REFERENCE_ASSET.url,{signal});
 if(!response.ok)throw new Error('Recorded argon reference is unavailable.');
 if(Number(response.headers.get('content-length'))>262144)throw new Error('Recorded argon reference exceeds its size limit.');
 const bytes=await response.arrayBuffer();
 if(bytes.byteLength>262144)throw new Error('Recorded argon reference exceeds its size limit.');
 const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 const actual=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(actual!==ARGON_REFERENCE_ASSET.sha256)throw new Error('Recorded argon reference failed its source identity check.');
 if(signal?.aborted)throw new DOMException('Reference loading cancelled.','AbortError');
 return parseRecordedArgonReference(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
}
