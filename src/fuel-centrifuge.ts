/** Conditional, neutral-gas rotor model; not a calibrated Marathon device. SI throughout. */
const U=1.66053906892e-27,K=1.380649e-23,E=1.602176634e-19;
export const FUEL_PAIRS={
 lithium:{label:'⁶Li / ⁷Li',light:'⁶Li',heavy:'⁷Li',masses:[6.0151228874,7.0160034366],ionEV:[5.3917,5.3917],fraction:.0759},
 dt:{label:'D / T',light:'D',heavy:'T',masses:[2.014101778,3.016049282],ionEV:[13.598,13.598],fraction:.5},
 helium:{label:'³He / ⁴He',light:'³He',heavy:'⁴He',masses:[3.0160293,4.002603254],ionEV:[24.587,24.587],fraction:.5},
 dhe:{label:'D / ⁴He · atomic',light:'D',heavy:'⁴He',masses:[2.014101778,4.002603254],ionEV:[13.598,24.587],fraction:.8},
 the:{label:'T / ⁴He · atomic',light:'T',heavy:'⁴He',masses:[3.016049282,4.002603254],ionEV:[13.598,24.587],fraction:.8},
 molecular:{label:'⁴He / D₂ · molecular',light:'⁴He',heavy:'D₂',masses:[4.002603254,4.028203556],ionEV:[24.587,15.467],fraction:.2},
} as const;
export type FuelConfig={pair:keyof typeof FUEL_PAIRS;application:'enrichment'|'pump';radiusM:number;lengthM:number;
 magneticT:number;currentA:number;gasK:number;pressurePa:number;ionFraction:number;collisionHz:number;dragHz:number;
 conductivitySm:number;driveInnerFraction:number;durationS:number;cutFraction:number;stages:number;feedStage:number;
 pumpSpeedM3S:number;conductanceM3S:number;lightFraction:number;linerK:number;linerConductanceWK:number;
 lithiumSeed:boolean;radialDiffusivityM2S:number;fusionMW:number;burnFraction:number;loopTimeS:number};
export const DEFAULT_FUEL_CENTRIFUGE:FuelConfig={pair:'lithium',application:'enrichment',radiusM:.12,lengthM:.8,
 magneticT:.5,currentA:.03,gasK:500,pressurePa:10,ionFraction:.01,collisionHz:1e4,dragHz:2,conductivitySm:1,
 driveInnerFraction:.3,durationS:1,cutFraction:.65,stages:5,feedStage:3,pumpSpeedM3S:.02,conductanceM3S:.05,
 lightFraction:.0759,linerK:1000,linerConductanceWK:.1,lithiumSeed:false,radialDiffusivityM2S:.02,
 fusionMW:1000,burnFraction:.05,loopTimeS:100};
const finite=(v:number,name:string,lo:number,hi=Infinity)=>{if(!Number.isFinite(v)||v<lo||v>hi)throw new RangeError(`${name} outside [${lo}, ${hi}].`);};
function validate(c:FuelConfig){
 if(!Object.hasOwn(FUEL_PAIRS,c.pair)||!['pump','enrichment'].includes(c.application)||typeof c.lithiumSeed!=='boolean')throw new RangeError('Unsupported centrifuge scenario.');
 for(const key of ['radiusM','lengthM','gasK','pressurePa','conductivitySm','dragHz','pumpSpeedM3S','conductanceM3S','radialDiffusivityM2S'] as const)finite(c[key],key,Number.MIN_VALUE);
 for(const key of ['magneticT','currentA','collisionHz','durationS','linerK','linerConductanceWK','fusionMW','loopTimeS'] as const)finite(c[key],key,0);
 finite(c.ionFraction,'ionFraction',1e-6,.5);finite(c.driveInnerFraction,'driveInnerFraction',.01,.99);
 finite(c.lightFraction,'lightFraction',0,1);finite(c.cutFraction,'cutFraction',0,1);finite(c.burnFraction,'burnFraction',.001,1);
 if(!Number.isSafeInteger(c.stages)||c.stages<1||c.stages>12||!Number.isSafeInteger(c.feedStage)||c.feedStage<1||c.feedStage>c.stages)throw new RangeError('Stage feed must lie in the cascade.');
}
/** Current is the only scheduled input; setup remains fixed within a run. */
export function validateFuelCurrentEvents(events:readonly{timeS:number;currentA:number}[],durationS:number){
 finite(durationS,'durationS',0);
 if(!Array.isArray(events)||events.length>128)throw new RangeError('Unsupported operating history.');
 let last=-1;
 for(const event of events){
  if(!event||!Number.isFinite(event.timeS)||event.timeS<0||event.timeS>durationS||event.timeS<=last||!Number.isFinite(event.currentA)||event.currentA<0||event.currentA>.2)
   throw new RangeError('Current events need strictly increasing times in the run and currents from 0 to 0.2 A.');
  last=event.timeS;
 }
}
function phi(rate:number,t:number){return rate===0?t:-Math.expm1(-rate*t)/rate;}
function phiDifference(a:number,b:number,t:number){
 if(b*t>=.001)return phi(a,t)-phi(b,t);
 let sum=0,pa=1,pb=1,factorial=1;
 for(let n=1;n<=10;n++){pa*=-a*t;pb*=-b*t;factorial*=n+1;sum+=(pa-pb)/factorial;}
 return t*sum;
}
/** Exact affine 2×2 solution from rest. Reciprocal friction conserves total angular momentum. */
export function rotorResponse(ii:number,nn:number,gamma:number,drag:number,torque:number,t:number){
 finite(ii,'ion inertia',Number.MIN_VALUE);finite(nn,'neutral inertia',Number.MIN_VALUE);finite(gamma,'friction',0);finite(drag,'drag',0);finite(t,'time',0);finite(torque,'torque',-Number.MAX_VALUE);
 const a=gamma/ii,b=gamma/ii,c=gamma/nn,d=(gamma+drag)/nn;
 const fast=(a+d)/2+Math.hypot((a-d)/2,Math.sqrt(b*c));
 if(fast===0)return {ion:torque*t/ii,neutral:0};
 const slow=gamma*drag/(ii*nn)/fast;
 const gap=fast-slow;
 if(gap===0){return {ion:torque/ii*phi(a,t),neutral:0};}
 const ion=torque/ii*((fast-a)/gap*phi(slow,t)+(a-slow)/gap*phi(fast,t));
 const neutral=torque/ii*c/gap*phiDifference(slow,fast,t);
 return {ion,neutral};
}
/** Integral of Ω from rest, in radians; retain the stiff initial spin-up in playback. */
export function rotorPhase(ii:number,nn:number,gamma:number,drag:number,torque:number,t:number){
 rotorResponse(ii,nn,gamma,drag,torque,t); // Same physical input domain.
 const a=gamma/ii,c=gamma/nn,d=(gamma+drag)/nn;
 const fast=(a+d)/2+Math.hypot((a-d)/2,Math.sqrt(a*c));
 if(fast===0)return {ion:torque*t*t/(2*ii),neutral:0};
 const slow=gamma*drag/(ii*nn)/fast,gap=fast-slow;
 function integral(rate:number){
  const z=rate*t;if(z>=.01)return (t-phi(rate,t))/rate;
  let sum=.5,term=.5;for(let n=1;n<=12;n++){term*=-z/(n+2);sum+=term;}return t*t*sum;
 }
 if(gap===0)return {ion:torque/ii*integral(a),neutral:0};
 let difference=integral(slow)-integral(fast);
 if(fast*t<.01){
  let sum=0,pa=1,pb=1,factorial=2;
  for(let n=1;n<=12;n++){pa*=-slow*t;pb*=-fast*t;factorial*=n+2;sum+=(pa-pb)/factorial;}difference=t*t*sum;
 }
 return {ion:torque/ii*((fast-a)/gap*integral(slow)+(a-slow)/gap*integral(fast)),neutral:torque/ii*c/gap*difference};
}
export function radialPDF(beta:number,y:number){
 return beta<1e-7?1+beta*(y-.5):Math.exp(Math.log(beta)-beta*(1-y)-Math.log(-Math.expm1(-beta)));
}
export function radialCDF(beta:number,y:number){
 if(y===0||y===1)return y;
 return beta<1e-7?y+beta*y*(y-1)/2:Math.exp(-beta*(1-y))*Math.expm1(-beta*y)/Math.expm1(-beta);
}
/** NIST WebBook/Hicks (1963), bar → Pa; withhold outside the published fit interval. */
export function lithiumVaporPressurePa(temperatureK:number){
 return Number.isFinite(temperatureK)&&temperatureK>=298.14&&temperatureK<=1599.99?1e5*10**(4.98831-7918.984/(temperatureK-9.52)):null;
}
/** Ideal countercurrent routing, identical stages: light-inner forward, heavy-outer backward. */
export function idealCascade(probability:number,stages:number,feedStage:number){
 finite(probability,'routing probability',0,1);
 if(!Number.isSafeInteger(stages)||stages<1||stages>12||!Number.isSafeInteger(feedStage)||feedStage<1||feedStage>stages)throw new RangeError('Invalid cascade.');
 const p=probability,q=1-p,diagonal=Array(stages).fill(1),rhs=Array(stages).fill(0);rhs[feedStage-1]=1;
 for(let i=1;i<stages;i++){const multiplier=-p/diagonal[i-1];diagonal[i]-=multiplier*(-q);rhs[i]-=multiplier*rhs[i-1];}
 const visits=Array(stages).fill(0);visits[stages-1]=rhs[stages-1]/diagonal[stages-1];
 for(let i=stages-2;i>=0;i--)visits[i]=(rhs[i]+q*visits[i+1])/diagonal[i];
 return {product:p*visits[stages-1],tails:q*visits[0],visits};
}
const ratio=(a:number,b:number)=>b>0?a/b:null;
function requireFiniteState(value:unknown):void{
 if(typeof value==='number'&&!Number.isFinite(value))throw new RangeError('Nonfinite state: inputs exceed the numerical domain.');
 if(value&&typeof value==='object')for(const child of Object.values(value))requireFiniteState(child);
}
export function simulateFuelCentrifuge(c:FuelConfig,currentEvents:readonly{timeS:number;currentA:number}[]=[]){
 validate(c);validateFuelCurrentEvents(currentEvents,c.durationS);const pair=FUEL_PAIRS[c.pair],masses=pair.masses.map(m=>m*U),x=c.lightFraction;
 const volume=Math.PI*c.radiusM**2*c.lengthM,neutralNumber=c.pressurePa*volume/(K*c.gasK),number=neutralNumber/(1-c.ionFraction),meanMass=x*masses[0]+(1-x)*masses[1];
 // Uniform-density inertias are an explicit lumped mechanical approximation.
 const inertia=.5*number*meanMass*c.radiusM**2,ii=inertia*c.ionFraction,nn=inertia*(1-c.ionFraction),gamma=ii*c.collisionHz,drag=nn*c.dragHz;
 const torquePerAmp=c.magneticT*c.radiusM**2*(1-c.driveInnerFraction**2)/2;
 const torque=c.currentA*c.magneticT*c.radiusM**2*(1-c.driveInnerFraction**2)/2;
 const ohmicW=c.currentA**2*Math.log(1/c.driveInnerFraction)/(2*Math.PI*c.lengthM*c.conductivitySm);
 const civ=c.lithiumSeed?Math.sqrt(2*5.3917*E/(7.0160034366*U)):Math.min(...pair.ionEV.map((v,i)=>Math.sqrt(2*v*E/masses[i])));
 function referenceAt(timeS:number){
  let {ion,neutral}=rotorResponse(ii,nn,gamma,drag,torque,timeS),currentA=c.currentA,previousTorque=torque;
  for(const event of currentEvents){
   if(event.timeS>timeS)break;
   const nextTorque=event.currentA===c.currentA?torque:event.currentA*torquePerAmp;
   const step=rotorResponse(ii,nn,gamma,drag,nextTorque-previousTorque,timeS-event.timeS);
   ion+=step.ion;neutral+=step.neutral;currentA=event.currentA;previousTorque=nextTorque;
  }
  return {ion,neutral,currentA};
 }
 const times=Array.from({length:101},(_,i)=>c.durationS*(i/100)**3);
 if(currentEvents.length){
  times.push(...currentEvents.map(event=>event.timeS));
  // Each constant-input interval has at most one interior ion-speed extremum.
  // Include it so a short overspeed pulse cannot evade the domain guard.
  const a=gamma/ii,b=gamma/nn,d=(gamma+drag)/nn;
  const fast=(a+d)/2+Math.hypot((a-d)/2,Math.sqrt(a*b));
  const slow=fast===0?0:gamma*drag/(ii*nn)/fast,gap=fast-slow;
  const boundaries=[0,...currentEvents.map(event=>event.timeS),c.durationS];
  if(gap>0)for(let i=0;i<boundaries.length-1;i++){
   const start=boundaries[i],span=boundaries[i+1]-start;
   const {ion,neutral,currentA}=referenceAt(start);
   const appliedTorque=currentA===c.currentA?torque:currentA*torquePerAmp;
   const ionRate=(appliedTorque-gamma*(ion-neutral))/ii;
   const neutralRate=(gamma*(ion-neutral)-drag*neutral)/nn;
   const slowRate=(a*(neutralRate-ionRate)+fast*ionRate)/gap,fastRate=ionRate-slowRate;
   if(slowRate*fastRate<0){
    const elapsed=(Math.log(Math.abs(fastRate))-Math.log(Math.abs(slowRate)))/gap;
    if(elapsed>0&&elapsed<span)times.push(start+elapsed);
   }
  }
  times.sort((a,b)=>a-b);
 }
 const sampleTimes=currentEvents.length?times.filter((time,i)=>i===0||time!==times[i-1]):times;
 const samples=sampleTimes.map(timeS=>{
  const {ion,neutral,currentA}=referenceAt(timeS),slip=ion-neutral;
  const appliedTorque=currentA===c.currentA?torque:currentA*torquePerAmp;
  const resistiveW=currentA===c.currentA?ohmicW:currentA**2*Math.log(1/c.driveInnerFraction)/(2*Math.PI*c.lengthM*c.conductivitySm);
  const slipW=gamma*slip**2,dragW=drag*neutral**2,mechanicalW=appliedTorque*ion;
  const ionAcceleration=(appliedTorque-gamma*slip)/ii,neutralAcceleration=(gamma*slip-drag*neutral)/nn;
  return {timeS,ionRadS:ion,neutralRadS:neutral,ionMS:ion*c.radiusM,neutralMS:neutral*c.radiusM,
   slipW,dragW,mechanicalW,ohmicW:resistiveW,totalInputW:mechanicalW+resistiveW,kineticJ:.5*(ii*ion**2+nn*neutral**2),
   ...(currentEvents.length?{currentA,torqueNm:appliedTorque}:{}),
   energyResidualW:mechanicalW-slipW-dragW-ii*ion*ionAcceleration-nn*neutral*neutralAcceleration,
   angularResidualNm:ii*ionAcceleration+nn*neutralAcceleration-appliedTorque+drag*neutral};
 });
 const end=samples.at(-1)!;
 if(samples.some(sample=>Math.abs(sample.ionMS)>=299792458*.01))throw new RangeError('Ion speed exceeds this nonrelativistic rotor model; lower drive or increase drag/pressure.');
 const beta=masses.map(m=>m*end.neutralMS**2/(2*K*c.gasK));
 const profiles=Array.from({length:81},(_,i)=>{
  const radiusM=c.radiusM*i/80,y=(i/80)**2,light=radialPDF(beta[0],y),heavy=radialPDF(beta[1],y),total=x*light+(1-x)*heavy;
  return {radiusM,lightFraction:ratio(x*light,total),lightDensityRatio:light,heavyDensityRatio:heavy};
 });
 const cuts=Array.from({length:81},(_,i)=>{
  const fraction=i/80,l=radialCDF(beta[0],fraction**2),h=radialCDF(beta[1],fraction**2),flow=x*l+(1-x)*h;
  return {radiusFraction:fraction,lightRecovery:l,lightPurity:ratio(x*l,flow),outerHeavyPurity:ratio((1-x)*(1-h),1-flow)};
 });
 const l=radialCDF(beta[0],c.cutFraction**2),h=radialCDF(beta[1],c.cutFraction**2),cut=x*l+(1-x)*h;
 const light=idealCascade(l,c.stages,c.feedStage),heavy=idealCascade(h,c.stages,c.feedStage),product=x*light.product+(1-x)*heavy.product;
 const cascades=Array.from({length:c.stages-c.feedStage+1},(_,i)=>{
  const n=c.feedStage+i,a=idealCascade(l,n,c.feedStage),b=idealCascade(h,n,c.feedStage),p=x*a.product+(1-x)*b.product;
  return {stages:n,feedStage:c.feedStage,purity:ratio(x*a.product,p),recovery:a.product};
 });
 const axis=c.pressurePa*(x*radialPDF(beta[0],0)+(1-x)*radialPDF(beta[1],0));
 const wall=c.pressurePa*(x*radialPDF(beta[0],1)+(1-x)*radialPDF(beta[1],1));
 const gasLoad=c.pumpSpeedM3S*wall,upstream=axis+gasLoad/c.conductanceM3S;
 const pumpSpecies=masses.map((_,i)=>{
  const fraction=i===0?x:1-x,axisPa=c.pressurePa*fraction*radialPDF(beta[i],0),wallPa=c.pressurePa*fraction*radialPDF(beta[i],1);
  const gasLoadPaM3S=c.pumpSpeedM3S*wallPa,upstreamPa=axisPa+gasLoadPaM3S/c.conductanceM3S;
  return {name:i===0?pair.light:pair.heavy,axisPa,wallPa,upstreamPa,gasLoadPaM3S,effectiveSpeedM3S:ratio(gasLoadPaM3S,upstreamPa)};
 });
 const linerHeatW=c.pair==='lithium'?c.linerConductanceWK*(c.linerK-c.gasK):0,wallVapor=c.pair==='lithium'?lithiumVaporPressurePa(c.linerK):null;
 const burnTritonsS=c.fusionMW*1e6/(17.6e6*E),massT=3.016049282*U;
 const result={schemaVersion:1,config:{...c},pair,samples,profiles,cuts,cascades,
  mechanics:{ii,nn,gamma,drag,torque,ohmicW,criticalVelocityMS:civ,slipCIV:Math.abs(end.ionMS-end.neutralMS)/civ,wallCIV:end.neutralMS/civ,
   requiredCoolingW:end.slipW+end.dragW+end.ohmicW+linerHeatW,linerHeatW,radialDiffusionTimeS:c.radiusM**2/c.radialDiffusivityM2S},
  collection:{innerLightPurity:ratio(x*l,cut),lightRecovery:l,innerFraction:cut,outerHeavyPurity:ratio((1-x)*(1-h),1-cut),
   logHeavyLightSeparation:beta[1]-beta[0],lightBalance:l+(1-l)-1,heavyBalance:h+(1-h)-1},
  cascade:{productLightPurity:ratio(x*light.product,product),lightRecovery:light.product,productFraction:product,
   lightBalance:light.product+light.tails-1,heavyBalance:heavy.product+heavy.tails-1,light,heavy,
   circulationPerFeed:x*light.visits.reduce((a,b)=>a+b,0)+(1-x)*heavy.visits.reduce((a,b)=>a+b,0)},
  pumping:{axisPa:axis,wallPa:wall,upstreamPa:upstream,gasLoadPaM3S:gasLoad,effectiveSpeedM3S:ratio(gasLoad,upstream),
   species:pumpSpecies,heavyLightSpeedRatio:pumpSpecies[0].effectiveSpeedM3S===null||pumpSpecies[1].effectiveSpeedM3S===null?null:ratio(pumpSpecies[1].effectiveSpeedM3S,pumpSpecies[0].effectiveSpeedM3S),outerLightFraction:ratio(pumpSpecies[0].gasLoadPaM3S,gasLoad),
   nonrotatingSpeedM3S:1/(1/c.pumpSpeedM3S+1/c.conductanceM3S),pressureRatio:ratio(wall,axis),turnoverS:ratio(neutralNumber,gasLoad/(K*c.gasK))},
  lithium:{wallVaporPressurePa:wallVapor,wallSaturationRatio:wallVapor===null?null:wall/wallVapor,gasVaporPressurePa:c.pair==='lithium'?lithiumVaporPressurePa(c.gasK):null},
  fuelCycle:{burnTritonsS,exhaustTritiumKg:massT*burnTritonsS*(1/c.burnFraction-1)*c.loopTimeS,
   grossTritiumKg:massT*burnTritonsS/c.burnFraction*c.loopTimeS},
  assumptions:['Uniform-density two-rotor mechanics; neutral pressure fixes neutral inventory. Prescribed ion fraction, reciprocal collision rate, neutral drag and conductivity.',
   ...(currentEvents.length?['Uniform-inertia reference follows the scheduled discharge-current steps by exact linear superposition. Radial equilibrium, cascade and pumping references use its final speed at the initial gas temperature; they are not evolving extraction or thermal predictions. Mechanics torque and Ohmic power retain the initial-current reference for setup identity and matched-torque scans.']:[]),
   'Fixed gas temperature: required cooling is a load, not an evolved thermal solution. No ionization or electron energy balance.',
   'Radial profiles are neutral isothermal equilibrium references at the computed speed, not transient separation or solved axial extraction.',
   'Cascade assumes its incoming composition equals the reference vessel bulk composition, and assigns inventory fractions to routing probabilities with equal turnover; identical ideal stages retain both exit streams. Geometry partitions are schematic routing overlays: length and mechanics describe one reference vessel, not a dimensioned cascade envelope.',
   'Pumping uses equilibrium pressure, Q=S p_wall and p_up=p_axis+Q/C with common species-independent S and C; flow back-reaction, thermal/rarefaction corrections and conductance validity are not solved.',
   'CIV is a contextual slip-speed diagnostic, not a hard limit. Geometry, materials and coefficients are illustrative, not an as-built specification.']};
 requireFiniteState(result);return result;
}
