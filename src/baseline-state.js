/** Exact accepted snapshots. Baselines compare observables, never arbitrary plot axes. */
import {validateScenario} from './scenario-state.js';
const limit=100000;
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function clone(value){return JSON.parse(JSON.stringify(value));}
function validate(value){
 if(!value||typeof value!=='object'||!value.scenario||!value.identity||!Array.isArray(value.curves)||value.curves.length>32)throw new Error('A baseline needs a scenario, observable identity and curves.');
 validateScenario(value.scenario);
 for(const key of ['model','observable','xUnit','yUnit'])if(typeof value.identity[key]!=='string'||value.identity[key].length>160)throw new Error(`Missing baseline identity: ${key}`);
 if(!['string','number'].includes(typeof value.identity.version)||typeof value.identity.version==='number'&&!Number.isFinite(value.identity.version))throw new Error('Missing baseline model version.');
 let samples=0;
 for(const curve of value.curves){
  if(!Array.isArray(curve.x)||!Array.isArray(curve.y)||curve.x.length!==curve.y.length||typeof curve.label!=='string'||typeof curve.xLabel!=='string'||typeof curve.yLabel!=='string')throw new Error('Invalid baseline curve.');
  samples+=curve.x.length;if(samples>limit||Array.from(curve.x).some(x=>!Number.isFinite(x))||Array.from(curve.y).some(y=>y!==null&&!Number.isFinite(y)))throw new Error('Unsupported baseline samples.');
 }
 if(JSON.stringify(value).length>4e6)throw new Error('Baseline exceeds the supported size.');
}
function sameIdentity(a,b){return ['model','observable','xUnit','yUnit','version'].every(key=>a[key]===b[key]);}
export function createBaselineStore(){
 let pinned=null;
 return {
  pin(value){validate(value);pinned=freeze(clone(value));return pinned;},
  read(){return pinned;},
  clear(){pinned=null;},
  scenario(){return pinned?clone(pinned.scenario):null;},
  compare(candidate){
   validate(candidate);
   if(!pinned)return {compatible:false,reason:'No baseline pinned.',curves:[]};
   if(!sameIdentity(pinned.identity,candidate.identity))return {compatible:false,reason:'Different model, observable or units.',curves:[]};
   const axes=new Set(candidate.curves.map(c=>JSON.stringify([c.xLabel,c.yLabel,!!c.equalAspect])));
   const curves=pinned.curves.filter(c=>axes.has(JSON.stringify([c.xLabel,c.yLabel,!!c.equalAspect])));
   return curves.length?{compatible:true,reason:'',curves:curves.map(c=>({...clone(c),label:`Baseline · ${c.label}`,dash:'6 4'}))}:{compatible:false,reason:'Different plot axes.',curves:[]};
  },
 };
}
