/** A fixed-site reference, not measured LiT retention or target lifetime. */
export interface LoadingSource {
 config:{targetColumnM2:number;beamAreaM2:number;exposureS:number};
 siteColumnM2:number;unitLoadingOpticalDepth:number;particleRateS:number;
}
export interface TargetLoadingConfig {
 /** Fraction of non-fusing incident D making a random site-replacement attempt. */
 replacementProbability:number;
 /** Requested plot intervals; these do not select the physical timestep. */
 intervals?:number;
 relativeTolerance?:number;
 absoluteTolerance?:number;
}
export const DEFAULT_TARGET_LOADING:TargetLoadingConfig={replacementProbability:0,intervals:400,
 relativeTolerance:1e-11,absoluteTolerance:1e-13};

/** Exact fusion-only target loss, evaluated without subtracting opaque depths. */
function fusionLoss(tritium:number,sigma:number,fluence:number){
 if(tritium===0||sigma===0||fluence===0)return 0;
 const tau=sigma*tritium,x=sigma*fluence;if(tau===0)return 0;
 const change=-Math.expm1(-tau)*-Math.expm1(-x);
 if(change<.5)return tritium*(-Math.log1p(-change)/tau);
 if(x<=tau)return tritium*((x-Math.log1p(Math.exp(x-tau)*-Math.expm1(-x)))/tau);
 const logY=(tau>50?tau+Math.log1p(-Math.exp(-tau)):Math.log(Math.expm1(tau)))-x;
 const next=logY>0?logY+Math.log1p(Math.exp(-logY)):Math.log1p(Math.exp(logY));
 return tritium*((tau-next)/tau);
}
/** Complementary fusion-only arrivals, avoiding incident-minus-fused cancellation. */
function transmission(tritium:number,sigma:number,fluence:number){
 const a=sigma*tritium,x=sigma*fluence;
 if(x<=a)return Math.log1p(Math.exp(x-a)*-Math.expm1(-x))/sigma;
 const logY=(a>50?a+Math.log1p(-Math.exp(-a)):Math.log(Math.expm1(a)))-x;
 const remaining=(logY>0?logY+Math.log1p(Math.exp(-logY)):Math.log1p(Math.exp(logY)))/sigma;
 return (fluence-tritium)+remaining;
}
const complement=(x:number)=>x<1e-3?x*x*(.5+x*(-1/6+x*(1/24-x/120))):x+Math.expm1(-x);

// Dormand–Prince 5(4) tableau, the standard RK45 pair also used by SciPy.
// Method: Dormand & Prince, J. Comput. Appl. Math. 6 (1980), 19–26.
const A=[[],[1/5],[3/40,9/40],[44/45,-56/15,32/9],
 [19372/6561,-25360/2187,64448/6561,-212/729],
 [9017/3168,-355/33,46732/5247,49/176,-5103/18656]];
const B=[35/384,0,500/1113,125/192,-2187/6784,11/84];
const E=[-71/57600,0,71/16695,-71/1920,17253/339200,-22/525,1/40];

export function simulateTargetLoading(source:LoadingSource,config:TargetLoadingConfig){
 const c={...config,intervals:config.intervals??400,
  relativeTolerance:config.relativeTolerance??1e-11,absoluteTolerance:config.absoluteTolerance??1e-13};
 const sites=source.siteColumnM2,initialT=source.config.targetColumnM2,
  {beamAreaM2:area,exposureS:onS}=source.config,
  {unitLoadingOpticalDepth:tau,particleRateS:particleRate}=source,eta=c.replacementProbability;
 if(![sites,initialT,area,onS,tau,particleRate,eta,c.relativeTolerance,c.absoluteTolerance].every(Number.isFinite)
  ||sites<=0||initialT<0||initialT>sites||area<=0||onS<0||tau<0||particleRate<0||eta<0||eta>1
  ||!Number.isInteger(c.intervals)||c.intervals<10||c.intervals>6400
  ||c.relativeTolerance<1e-13||c.relativeTolerance>1e-3||c.absoluteTolerance<1e-15||c.absoluteTolerance>1e-5)
  throw new RangeError('Loading reference needs positive fixed sites/area, T within site capacity, replacement probability 0–1, 10–6400 plot intervals, relative tolerance 1e-13–1e-3 and absolute tolerance 1e-15–1e-5.');
 const flux=particleRate/area,dose=flux*onS/sites,inventory=sites*area,f0=initialT/sites;
 if(![flux,dose,inventory,particleRate*onS].every(Number.isFinite))
  throw new RangeError('Loading inputs exceed the finite numeric domain.');
 let acceptedSteps=0,rejectedSteps=0,maxAcceptedErrorRatio=0,maxScaledConservationResidual=0;
 const history:ReturnType<typeof sample>[]=[];
 // H integrates fusion hazard per target T; Q integrates replacement attempts
 // per site. T=f0 exp(-H-Q), D=1-f0 exp(-Q), V=f0 exp(-Q)(1-exp(-H)).
 // The remaining entries are independently integrated, scaled event channels.
 const q0=tau===0?0:tau*((tau*f0)===0?1:-Math.expm1(-tau*f0)/(tau*f0));
 const r0=q0===0?0:q0/(q0+eta*Math.exp(-tau*f0));
 // Per-site scales resolve the initial loading transient even for enormous
 // total doses; relative control takes over once accumulated arrivals grow.
 const scaleA=Math.min(dose,1),scaleF=f0*r0,scaleL=f0*(eta/(tau+eta||1)),scaleR=eta*scaleA;
 const derivative=(y:number[])=>{
  const [h,q]=y,survival=Math.exp(-h-q),f=f0*survival,x=tau*f,
   phi=x===0?1:-Math.expm1(-x)/x,hazard=tau*phi,nonfusion=Math.exp(-x),
   d=(1-f0)+f0*-Math.expm1(-q);
  return [hazard,eta*nonfusion,survival*(hazard/r0),
   survival*(tau+eta)*nonfusion,nonfusion/scaleA,nonfusion*d/scaleA];
 };
 function sample(u:number,y:number[]){
  const timeS=dose===0?onS*u:u/dose*onS;
  let t:number,d:number,v:number,fused:number,outT:number,nonfused:number,outD:number,logTau:number;
  if(dose===0){t=f0;d=1-f0;v=0;fused=outT=nonfused=outD=0;logTau=tau*f0;}
  else if(eta===0){
   fused=fusionLoss(f0,tau,u);
   // Evaluate the smaller event channel directly; subtraction is used only
   // for the larger complement, where it is well conditioned.
   if(fused>u/2){nonfused=transmission(f0,tau,u);fused=u-nonfused;}else nonfused=u-fused;
   if(fused>f0/2){
    // Remaining optical depth can be O(1) even when T is below the
    // subtraction scale of f0−fused. Subtract dose before multiplying tau.
    const logY=tau*(f0-u)+Math.log(-Math.expm1(-tau*f0));
    logTau=logY>0?logY+Math.log1p(Math.exp(-logY)):Math.log1p(Math.exp(logY));
    t=logTau/tau;
   }else{t=f0-fused;logTau=tau*t;}
   d=1-f0;v=fused;outT=outD=0;
  }
  else if(tau===0||f0===0){
   const q=eta*u,replaced=-Math.expm1(-q);t=f0*Math.exp(-q);d=(1-f0)+f0*replaced;v=fused=0;
   outT=f0*replaced;nonfused=u;outD=(1-f0)*q+f0*complement(q);logTau=0;
  }else{
   const [h,q,zF,zL,zA,zR]=y;
   t=f0*Math.exp(-h-q);d=(1-f0)+f0*-Math.expm1(-q);v=f0*Math.exp(-q)*-Math.expm1(-h);
   fused=scaleF*zF;outT=scaleL*zL;nonfused=scaleA*zA;outD=scaleR*zR;
   logTau=tau*t;
  }
  const retained=eta*nonfused,unretained=(1-eta)*nonfused;
  const residuals=[t+d+v-1,f0-t-fused-outT,retained-outD-(d-(1-f0)),(dose===0?0:u)-fused-nonfused];
  maxScaledConservationResidual=Math.max(maxScaledConservationResidual,...residuals.map((r,i)=>Math.abs(r)/(i<2?1:Math.max(1,u))));
  return {timeS,tritiumColumnM2:t*sites,deuteriumColumnM2:d*sites,vacancyColumnM2:v*sites,
   tritiumFraction:t,deuteriumFraction:d,vacancyFraction:v,
   neutronRateS:particleRate*-Math.expm1(-logTau),cumulativeNeutrons:fused*inventory,fusedT:fused*inventory,
   incidentD:particleRate*timeS,retainedIncomingD:retained*inventory,unretainedD:unretained*inventory,
   releasedT:outT*inventory,releasedD:outD*inventory,siteResidualNuclei:residuals[0]*inventory,
   tritiumResidualNuclei:residuals[1]*inventory,deuteriumResidualNuclei:residuals[2]*inventory,
   incidentResidualNuclei:residuals[3]*inventory};
 }
 let u=0,y=[0,0,0,0,0,0],step=Math.min(dose,.01/(q0+eta*Math.exp(-tau*f0)||1));
 history.push(sample(0,y));
 if(dose>0&&eta>0&&tau>0&&f0>0){
  for(let output=1;output<=c.intervals;output++){
   const target=output===c.intervals?dose:dose*output/c.intervals;
   while(u<target){
    if(acceptedSteps+rejectedSteps>=100000)throw new RangeError('Coupled loading solver exceeded its 100000-step budget.');
    const dt=Math.min(step,target-u);if(u+dt===u)throw new RangeError('Coupled loading requires a step below floating-point dose resolution.');
    const k=[derivative(y)];let valid=true;
    for(let stage=1;stage<6;stage++){
     const s=y.map((value,j)=>value+dt*A[stage].reduce((sum,a,i)=>sum+a*k[i][j],0));
     if(s.some(v=>v<0||!Number.isFinite(v))){valid=false;break;}k.push(derivative(s));
    }
    let next=y,error=Infinity;
    if(valid){
     next=y.map((value,j)=>value+dt*B.reduce((sum,b,i)=>sum+b*k[i][j],0));
     valid=next.every((v,j)=>Number.isFinite(v)&&v>=y[j]);
     if(valid){k.push(derivative(next));error=Math.max(...next.map((v,j)=>Math.abs(dt*E.reduce((sum,e,i)=>sum+e*k[i][j],0))/(c.absoluteTolerance+c.relativeTolerance*Math.max(Math.abs(y[j]),Math.abs(v)))));}
    }
    if(valid&&error<=1){u=dt===target-u?target:u+dt;y=next;acceptedSteps++;maxAcceptedErrorRatio=Math.max(maxAcceptedErrorRatio,error);
     // Keep adaptive endpoints: a high-dose uniform plot grid alone misses the initial transient.
     history.push(sample(u,y));step=dt*(error===0?5:Math.min(5,.9*error**(-.2)));
    }else{rejectedSteps++;step=dt*(Number.isFinite(error)?Math.max(.1,.9*error**(-.2)):.2);}
   }
  }
 }else for(let i=1;i<=c.intervals;i++)
  history.push(sample(dose===0?i/c.intervals:i===c.intervals?dose:dose*i/c.intervals,y));
 if(history.some(s=>Object.values(s).some(v=>!Number.isFinite(v))))throw new RangeError('Loading result exceeds the finite numeric domain.');
 if(maxScaledConservationResidual>100*(c.absoluteTolerance+c.relativeTolerance))
  throw new RangeError(`Coupled loading isotope/projectile residual ${maxScaledConservationResidual} exceeds its numerical budget ${100*(c.absoluteTolerance+c.relativeTolerance)}. Tighten solver tolerance.`);
 const initial=history[0],final=history.at(-1)!;
 return {model:'fixed-site-loading-reference' as const,config:c,onS,siteColumnM2:sites,initialTritiumFraction:f0,
  unitLoadingOpticalDepth:tau,initial,final,history,
  solver:{method:eta===0||tau===0||f0===0||dose===0?'analytic-limit':'coupled-Dormand-Prince-5(4)',
   acceptedSteps,rejectedSteps,maxAcceptedErrorRatio,relativeTolerance:c.relativeTolerance,
   absoluteTolerance:c.absoluteTolerance,maxScaledConservationResidual},
  curves:[...(['tritiumFraction','deuteriumFraction','vacancyFraction'] as const).map((key,i)=>({
   label:['Tritium sites','Deuterium sites','Vacant hydrogen sites'][i],x:history.map(s=>s.timeS),y:history.map(s=>s[key]),
   xLabel:'Beam exposure time (s)',yLabel:'Fraction of fixed hydrogen sites'})),
   {label:'Evolving D–T neutron production',x:history.map(s=>s.timeS),y:history.map(s=>s.neutronRateS),xLabel:'Beam exposure time (s)',yLabel:'D–T neutrons (s⁻¹)'},
   {label:'Integrated D–T neutrons',x:history.map(s=>s.timeS),y:history.map(s=>s.cumulativeNeutrons),xLabel:'Beam exposure time (s)',yLabel:'D–T neutrons'}],
  assumptions:[
   'Well-mixed fixed hydrogen-site capacity and fixed stopping matrix. The source energy trajectory supplies one effective optical depth; D/T/vacancy composition does not change stopping.',
   'Fusion consumes one incident D and one target T, creating one vacancy. Non-fusing D makes a random replacement attempt with an explicitly assumed probability; it can replace T/D or fill a vacancy.',
   'The coupled equations are advanced simultaneously with an adaptive Dormand–Prince 5(4) pair in nonnegative log-survival coordinates. Requested plot intervals do not select the physical timestep. Embedded local-error estimates are not global error certificates.',
   'Independent scaled reaction ledgers preserve small fusion channels. Raw isotope and projectile residuals are reported and checked against a numerical budget; no negative population clipping or ledger projection is used.',
   'Replacement probability is not measured LiT retention. No resolved implantation, diffusion, permeation, sputtering, target renewal, D–D reactions or thermal feedback is solved; this is not a target-lifetime prediction.',
   'Evolving yield remains a separate reference; the initial steady source and constant-heat observer are unchanged.',
  ]};
}
