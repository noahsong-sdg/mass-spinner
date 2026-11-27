/** Exact accepted snapshots. Baselines compare observables, never arbitrary plot axes. */
import {validateScenario, type Scenario} from './scenario-state.js';

export type BaselineIdentity = {
 model: string;
 observable: string;
 xUnit: string;
 yUnit: string;
 version: string | number;
};
export type BaselineCurve = {
 label: string;
 x: number[];
 y: (number | null)[];
 xLabel: string;
 yLabel: string;
 [metadata: string]: unknown;
};
export type BaselineSnapshot = {
 scenario: Scenario;
 identity: BaselineIdentity;
 curves: BaselineCurve[];
 [metadata: string]: unknown;
};
export type DeepReadonly<T> = T extends object ? {readonly [K in keyof T]: DeepReadonly<T[K]>} : T;
export type PinnedBaseline = DeepReadonly<BaselineSnapshot>;
export type BaselineComparison = {compatible: boolean; reason: string; curves: BaselineCurve[]};
export type BaselineStore = {
 pin(value: unknown): PinnedBaseline;
 read(): PinnedBaseline | null;
 clear(): void;
 scenario(): Scenario | null;
 compare(candidate: unknown): BaselineComparison;
};
function isRecord(value: unknown): value is Record<string, unknown> {
 return !!value && typeof value === 'object' && !Array.isArray(value);
}
const identityKeys = ['model','observable','xUnit','yUnit','version'] as const;
const limit=100000;
function freeze(value: unknown): void {if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}}
// Only validated JSON-shaped core fields cross this clone boundary; optional metadata retains JSON semantics.
function clone<T extends BaselineSnapshot | BaselineCurve | Scenario>(value: T | DeepReadonly<T>): T {
 return JSON.parse(JSON.stringify(value)) as T;
}
function validate(value: unknown): asserts value is BaselineSnapshot {
 if(!isRecord(value)||!value.scenario||!isRecord(value.identity)||!Array.isArray(value.curves)||value.curves.length>32)throw new Error('A baseline needs a scenario, observable identity and curves.');
 validateScenario(value.scenario);
 for(const key of ['model','observable','xUnit','yUnit'] as const)if(typeof value.identity[key]!=='string'||value.identity[key].length>160)throw new Error(`Missing baseline identity: ${key}`);
 if((typeof value.identity.version!=='string'&&typeof value.identity.version!=='number')||typeof value.identity.version==='number'&&!Number.isFinite(value.identity.version))throw new Error('Missing baseline model version.');
 let samples=0;
 const curves: unknown[]=value.curves;
 for(const curve of curves){
  if(!isRecord(curve)||!Array.isArray(curve.x)||!Array.isArray(curve.y)||curve.x.length!==curve.y.length||typeof curve.label!=='string'||typeof curve.xLabel!=='string'||typeof curve.yLabel!=='string')throw new Error('Invalid baseline curve.');
  const x: unknown[]=curve.x,y: unknown[]=curve.y;
  samples+=x.length;if(samples>limit||Array.from(x).some(x=>!Number.isFinite(x))||Array.from(y).some(y=>y!==null&&!Number.isFinite(y)))throw new Error('Unsupported baseline samples.');
 }
 if(JSON.stringify(value).length>4e6)throw new Error('Baseline exceeds the supported size.');
}
function sameIdentity(a: BaselineIdentity,b: BaselineIdentity){return identityKeys.every(key=>a[key]===b[key]);}
export function createBaselineStore(): BaselineStore {
 let pinned: PinnedBaseline | null=null;
 return {
  pin(value){validate(value);const snapshot=clone<BaselineSnapshot>(value);freeze(snapshot);pinned=snapshot;return pinned;},
  read(){return pinned;},
  clear(){pinned=null;},
  scenario(){return pinned?clone<Scenario>(pinned.scenario):null;},
  compare(candidate){
   validate(candidate);
   if(!pinned)return {compatible:false,reason:'No baseline pinned.',curves:[]};
   if(!sameIdentity(pinned.identity,candidate.identity))return {compatible:false,reason:'Different model, observable or units.',curves:[]};
   const axes=new Set(candidate.curves.map(c=>JSON.stringify([c.xLabel,c.yLabel,!!c.equalAspect])));
   const curves=pinned.curves.filter(c=>axes.has(JSON.stringify([c.xLabel,c.yLabel,!!c.equalAspect])));
   return curves.length?{compatible:true,reason:'',curves:curves.map(c=>({...clone<BaselineCurve>(c),label:`Baseline · ${c.label}`,dash:'6 4'}))}:{compatible:false,reason:'Different plot axes.',curves:[]};
  },
 };
}
