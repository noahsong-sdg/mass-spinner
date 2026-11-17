import {radialPDF,radialCDF} from './fuel-centrifuge.js';

export const equilibriumModel={version:'neutral-cylinder-equilibrium-v1',atomicMassKg:1.66053906892e-27,boltzmannJK:1.380649e-23,
 scope:'Ideal neutral gas; prescribed rigid rotation and uniform temperature; closed cylindrical inventory. No separation time, extraction throughput, plasma electric field, phase equilibrium or experimental calibration.'};
export type EquilibriumInput={massesU:readonly[number,number];edgeSpeedMS:number;temperatureK:number;radiusM:number;lengthM:number;totalParticles:number;lightFraction:number;cutFraction:number};
const range=(v:number,name:string,lo:number,hi:number)=>{if(!Number.isFinite(v)||v<lo||v>hi)throw new RangeError(`${name} must be in [${lo}, ${hi}].`);};
function validate(c:EquilibriumInput){
 if(!Array.isArray(c.massesU)||c.massesU.length!==2)throw new RangeError('Two ordered neutral masses are required.');
 c.massesU.forEach(m=>range(m,'Mass (u)',1,250));
 if(c.massesU[0]>c.massesU[1])throw new RangeError('Light mass must not exceed heavy mass.');
 range(c.edgeSpeedMS,'Edge speed (m/s)',0,2e5);range(c.temperatureK,'Temperature (K)',100,10000);
 range(c.radiusM,'Radius (m)',.001,10);range(c.lengthM,'Length (m)',.001,100);range(c.totalParticles,'Inventory (particles)',1,1e30);
 range(c.lightFraction,'Light inventory fraction',0,1);range(c.cutFraction,'Cut radius / vessel radius',0,1);
 const beta=c.massesU.map(m=>m*equilibriumModel.atomicMassKg*c.edgeSpeedMS**2/(2*equilibriumModel.boltzmannJK*c.temperatureK));
 if(beta[1]>100)throw new RangeError('Outside the screened numerical domain: heavy-species β must be ≤ 100. Reduce speed or increase temperature.');
 return beta;
}
// log integral_0^1 exp(b y) dy. The series preserves enrichment near zero rotation.
function logZ(b:number){
 if(b<.1){const b2=b*b;return b/2+b2*(1/24+b2*(-1/2880+b2*(1/181440-b2/9676800)));}
 return b+Math.log(-Math.expm1(-b))-Math.log(b);
}
// logZ(a+d)-logZ(a), retaining tiny mass contrasts without subtracting O(β) logs.
function logZDifference(a:number,d:number){
 const b=a+d;
 if(b<.1){const a2=a*a,b2=b*b;return d*(.5+(a+b)*(1/24-(a2+b2)/2880+(a2*a2+a2*b2+b2*b2)/181440-(a2+b2)*(a2*a2+b2*b2)/9676800));}
 if(a===0)return logZ(d);
 return d+Math.log1p(Math.exp(-a)*-Math.expm1(-d)/-Math.expm1(-a))-Math.log1p(d/a);
}
function composition(x:number,logRatio:number){
 if(x===0||x===1)return {fraction:x,gain:0};
 const e=Math.exp(logRatio>=0?-logRatio:logRatio);
 const denominator=logRatio>=0?x+(1-x)*e:1-x+x*e;
 return {fraction:logRatio>=0?x/denominator:x*e/denominator,
  gain:x*(1-x)*(logRatio>=0?-Math.expm1(-logRatio):Math.expm1(logRatio))/denominator};
}
function survival(b:number,volumeFraction:number){return b<1e-7?volumeFraction*(1+b*(1-volumeFraction)/2):-Math.expm1(-b*volumeFraction)/-Math.expm1(-b);}
const ratio=(a:number,b:number)=>b>0?a/b:null;

/** Number composition, not mass fraction. y=r²/R² includes the cylindrical volume Jacobian. */
export function equilibriumPoint(c:EquilibriumInput,radiusFraction:number){
 const beta=validate(c);range(radiusFraction,'Probe radius / vessel radius',0,1);
 const y=radiusFraction**2,x=c.lightFraction,[bl]=beta;
 const delta=(c.massesU[1]-c.massesU[0])*equilibriumModel.atomicMassKg*c.edgeSpeedMS**2/(2*equilibriumModel.boltzmannJK*c.temperatureK);
 const densityRelativeMean=beta.map(b=>radialPDF(b,y));
 const local=composition(x,-delta*y+logZDifference(bl,delta));
 const inner=beta.map(b=>radialCDF(b,y)),outer=beta.map(b=>survival(b,(1-radiusFraction)*(1+radiusFraction)));
 const meanDensity=c.totalParticles/(Math.PI*c.radiusM**2*c.lengthM);
 const innerFraction=x*inner[0]+(1-x)*inner[1],outerFraction=x*outer[0]+(1-x)*outer[1];
 const innerComposition=composition(x,logZDifference(bl,delta)-logZDifference(bl*y,delta*y));
 const speciesInner=[c.totalParticles*x*inner[0],c.totalParticles*(1-x)*inner[1]];
 const speciesOuter=[c.totalParticles*x*outer[0],c.totalParticles*(1-x)*outer[1]];
 return {radiusFraction,radiusM:radiusFraction*c.radiusM,beta,densityRelativeMean,
  densityM3:[meanDensity*x*densityRelativeMean[0],meanDensity*(1-x)*densityRelativeMean[1]],
  lightFraction:local.fraction,lightGain:local.gain,
  inner:{speciesFractions:inner,speciesParticles:speciesInner,totalParticles:c.totalParticles*innerFraction,
   lightPurity:innerFraction>0?innerComposition.fraction:null,lightGain:innerFraction>0?innerComposition.gain:null,
   lightRecovery:x>0?inner[0]:null,inventoryFraction:innerFraction},
  outer:{speciesFractions:outer,speciesParticles:speciesOuter,totalParticles:c.totalParticles*outerFraction,
   heavyPurity:ratio((1-x)*outer[1],outerFraction),heavyRecovery:x<1?outer[1]:null,inventoryFraction:outerFraction}};
}

/** Independent prescribed-state calculation. Sampling resolves β≤100 wall layers; integrals are analytic. */
export function calculateEquilibrium(c:EquilibriumInput){
 const beta=validate(c),ys=new Set<number>([0,1,c.cutFraction**2]);
 for(let i=0;i<=200;i++){ys.add(i/200);ys.add(1-(i/200)**3);}
 const profiles=[...ys].sort((a,b)=>a-b).map(y=>equilibriumPoint(c,Math.sqrt(y)));
 return {model:equilibriumModel,inputs:{...c,massesU:[...c.massesU]},omegaRadS:c.edgeSpeedMS/c.radiusM,
  volumeM3:Math.PI*c.radiusM**2*c.lengthM,beta,logAxisWallSeparation:(c.massesU[1]-c.massesU[0])*equilibriumModel.atomicMassKg*c.edgeSpeedMS**2/(2*equilibriumModel.boltzmannJK*c.temperatureK),
  profiles,selected:equilibriumPoint(c,c.cutFraction)};
}

/** Explicit endpoint combinations, not confidence intervals or guaranteed extrema. */
export function equilibriumScenarios(c:EquilibriumInput,speedPercent:number,temperaturePercent:number){
 range(speedPercent,'Speed scenario ± (%)',0,50);range(temperaturePercent,'Temperature scenario ± (%)',0,50);
 return [...new Set([1-speedPercent/100,1+speedPercent/100])].flatMap(v=>
  [...new Set([1-temperaturePercent/100,1+temperaturePercent/100])].map(t=>calculateEquilibrium({...c,edgeSpeedMS:c.edgeSpeedMS*v,temperatureK:c.temperatureK*t})));
}
