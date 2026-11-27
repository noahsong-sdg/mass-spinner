import type {simulateDoublewell} from './doublewell-dynamics.js';

type Result=ReturnType<typeof simulateDoublewell>;
export type CollisionObservable='outlet-fraction'|'radial-density'|'temperature'|'angular-transfer'|'impact-time';
export interface CollisionObservableEvidence {
 observable:CollisionObservable;
 status:'ideal-orbit'|'preview'|'outside-domain'|'budget-exceeded'|'unresolved';
 sampledDomain:'not-applicable'|'within-sampled-domain'|'outside-domain'|'unresolved';
 rawAngularMomentum:'within-budget'|'budget-exceeded'|'unresolved'|'not-applicable';
 continuum:'not-applicable'|'unqualified';
 unresolvedExposure:number|null;
 reasons:string[];
 settings:{particlesPerSpecies:number;dt:number;duration:number;seed:number};
}

/** Current-run diagnostics only. Archived research resolutions, passing numerical
 * comparisons, and a plausible image cannot qualify a live single realization.
 * Thresholds are the unchanged v34 predeclared diagnostic budgets. */
export function assessCollisionObservableEvidence(result:Result,observable:CollisionObservable):CollisionObservableEvidence {
 const {config:c}=result;
 const settings={particlesPerSpecies:c.particlesPerSpecies,dt:c.dt,duration:c.duration,seed:c.seed};
 if(!c.collisions)return {observable,status:'ideal-orbit',sampledDomain:'not-applicable',
  rawAngularMomentum:'not-applicable',continuum:'not-applicable',unresolvedExposure:null,settings,
  reasons:['The orbit model uses prescribed fields without collisions. Collision transport is disabled.']};
 let exposure=0,unresolved=0,complete=result.history.length===result.regimeHistory.length&&result.history.length>1
  &&result.history[0]?.time===0&&result.history.at(-1)?.time===c.duration;
 for(let i=1;i<result.regimeHistory.length;i++){
  const dt=result.regimeHistory[i].time-result.regimeHistory[i-1].time;
  if(!Number.isFinite(dt)||dt<=0){complete=false;continue;}
  for(const j of [i-1,i]){
   const frame=result.history[j],assessment=result.regimeHistory[j].assessment;
   if(!frame||frame.time!==result.regimeHistory[j].time){complete=false;continue;}
   const active=frame.species.reduce((sum,s)=>sum+s.active,0);
   if(!Number.isFinite(active)||active<0){complete=false;continue;}
   if(!active)continue;
   const fraction=assessment.observed.unresolvedRepresentativeFraction;
   if(fraction===null||!Number.isFinite(fraction)||fraction<0||fraction>1){complete=false;continue;}
   exposure+=active*dt/2;unresolved+=fraction*active*dt/2;
  }
 }
 const unresolvedExposure=complete&&exposure>0?unresolved/exposure:null;
 const outside=result.regimeHistory.some(frame=>frame.assessment.status==='outside-supported-domain')
  ||result.regimeSummary.status==='outside-supported-domain';
 const sampledDomain=outside?'outside-domain':unresolvedExposure===null||unresolvedExposure>.01?'unresolved':'within-sampled-domain';
 const residual=result.conservation.maxMomentumResidual;
 const rawAngularMomentum=!Number.isFinite(residual)||residual<0?'unresolved':residual>.001?'budget-exceeded':'within-budget';
 const status=outside?'outside-domain':rawAngularMomentum==='budget-exceeded'?'budget-exceeded':
  sampledDomain==='unresolved'||rawAngularMomentum==='unresolved'?'unresolved':'preview';
 const reasons=[outside?'A sampled local state is outside the domain of the binary collision model.':
  sampledDomain==='unresolved'?'The local collision assessment is unresolved, or unresolved exposure is more than 1%.':
  'The sampled local collision diagnostics are within the 1% exposure limit. States between saved frames have no check.'];
 if(rawAngularMomentum==='budget-exceeded')reasons.push('The raw angular-momentum error is more than 0.1%. The model applies no torque correction.');
 if(rawAngularMomentum==='unresolved')reasons.push('The raw angular-momentum error is not available.');
 reasons.push('This preview uses one random realization. No continuum-bias bound gives an accuracy limit for this quantity at these settings.');
 return {observable,status,sampledDomain,rawAngularMomentum,continuum:'unqualified',unresolvedExposure,settings,reasons};
}
