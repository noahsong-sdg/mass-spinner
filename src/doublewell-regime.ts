import {AMU,E_CHARGE,type Vec} from './physics.js';
import {EPSILON_0,type CoulombIon} from './coulomb.js';
import type {DoublewellConfig} from './doublewell-dynamics.js';

interface ThermalSpecies {massU:number;chargeState:number;fraction:number;temperatureEV:number;meanVelocity:Vec}
export interface RegimeCell {ions:CoulombIon[];densityM3:number}
type Status='within-supported-domain'|'outside-supported-domain'|'unresolved';
const HBAR=1.054571817e-34;

/** Electron Debye screening, total-ion Wigner–Seitz coupling and representative
 * pair encounter estimates. These are model-domain diagnostics, not validation
 * of a non-Maxwellian distribution. The quantum impact cutoff uses ħ/(2μg).
 */
function atState(densityM3:number,te:number,b:number,species:ThermalSpecies[]){
 const ne=densityM3*species.reduce((sum,s)=>sum+s.fraction*s.chargeState,0);
 const debyeM=Math.sqrt(EPSILON_0*te/(ne*E_CHARGE));
 const debyePopulation=4*Math.PI/3*ne*debyeM**3;
 const spacing=Math.cbrt(3/(4*Math.PI*densityM3));
 const reasons:string[]=[];
 let maxCoupling=0,minEstimatedCoulombLog=Infinity,maxEncounterMagnetization=0,undefinedCoupling=false,undefinedEncounter=false;
 for(const s of species){
  if(s.temperatureEV<=0){undefinedCoupling=true;reasons.push('Zero sampled thermal spread: weak-coupling estimate is outside the supported thermal model.');continue;}
  maxCoupling=Math.max(maxCoupling,s.chargeState**2*E_CHARGE/(4*Math.PI*EPSILON_0*spacing*s.temperatureEV));
 }
 for(let i=0;i<species.length;i++)for(let j=i;j<species.length;j++){
  const a=species[i],s=species[j],mu=AMU*a.massU*s.massU/(a.massU+s.massU);
  const drift2=a.meanVelocity.reduce((sum,v,k)=>sum+(v-s.meanVelocity[k])**2,0);
  const g=Math.sqrt(3*E_CHARGE/AMU*(a.temperatureEV/a.massU+s.temperatureEV/s.massU)+drift2);
  if(g===0){undefinedEncounter=true;reasons.push('Zero relative-speed estimate: screened binary encounter diagnostics are undefined.');continue;}
  const b90=a.chargeState*s.chargeState*E_CHARGE**2/(4*Math.PI*EPSILON_0*mu*g*g);
  const quantum=HBAR/(2*mu*g);
  minEstimatedCoulombLog=Math.min(minEstimatedCoulombLog,Math.log(debyeM/Math.max(b90,quantum)));
  const omega=Math.max(a.chargeState/a.massU,s.chargeState/s.massU)*E_CHARGE*Math.abs(b)/AMU;
  maxEncounterMagnetization=Math.max(maxEncounterMagnetization,omega*debyeM/g);
 }
 if(maxCoupling>=.1)reasons.push('Ion coupling parameter reaches the configured weak-coupling limit (0.1).');
 if(debyePopulation<=10)reasons.push('Electron Debye population reaches the configured screening limit (10).');
 if(minEstimatedCoulombLog<=2)reasons.push('Estimated Coulomb logarithm reaches the configured screened-encounter limit (2).');
 if(maxEncounterMagnetization>=.1)reasons.push('Encounter magnetization reaches the configured unmagnetized-encounter limit (0.1).');
 return {debyeM,debyePopulation,maxCoupling:undefinedCoupling?null:maxCoupling,
  minEstimatedCoulombLog:Number.isFinite(minEstimatedCoulombLog)?minEstimatedCoulombLog:null,
  maxEncounterMagnetization:undefinedEncounter?null:maxEncounterMagnetization,reasons};
}

/** Inspect actual occupied collision cells. A present species needs four
 * representatives before its temperature is estimated; otherwise the entire
 * cell is unresolved. Within-cell mean flow is removed separately by species.
 * Velocity shear and sparse sampling still require spatial/particle convergence.
 * An optional analytic initial peak provides a distinct reference-temperature
 * estimate. Passing it never makes unresolved sampled cells "valid".
 */
export function inspectDoublewellRegime(c:DoublewellConfig,cells:RegimeCell[],initialPeakDensityM3?:number){
 const density=initialPeakDensityM3??c.densityM3;
 if(!Number.isFinite(density)||density<=0||!Number.isFinite(c.electronTemperatureEV)||c.electronTemperatureEV<=0)
  throw new Error('Regime estimates require positive finite density and electron temperature.');
 const reference=atState(density,c.electronTemperatureEV,c.magneticT,c.species.map(s=>({...s,
  fraction:1/c.species.length,temperatureEV:c.ionTemperatureEV,meanVelocity:[0,0,0] as Vec})));
 const reasons=new Set<string>(reference.reasons.map(r=>`Reference state: ${r}`));
 let occupiedCells=0,resolvedCells=0,totalRepresentatives=0,unresolvedRepresentatives=0;
 let minTemperatureEV=Infinity,maxCoupling=0,minDebyePopulation=Infinity;
 let minEstimatedCoulombLog=Infinity,maxEncounterMagnetization=0,undefinedCoupling=false,undefinedEncounter=false;
 for(const cell of cells){
  if(!cell.ions.length)continue;
  if(!Number.isFinite(cell.densityM3)||cell.densityM3<=0)throw new Error('Occupied regime cells require positive finite density.');
  occupiedCells++;totalRepresentatives+=cell.ions.length;
  // Screening depends on known charge density and imposed Te, even when ion
  // velocity sampling is too sparse to estimate a thermal regime.
  const ne=cell.densityM3*cell.ions.reduce((sum,p)=>sum+p.chargeState,0)/cell.ions.length;
  const debyeM=Math.sqrt(EPSILON_0*c.electronTemperatureEV/(ne*E_CHARGE));
  const debyePopulation=4*Math.PI/3*ne*debyeM**3;
  minDebyePopulation=Math.min(minDebyePopulation,debyePopulation);
  if(debyePopulation<=10)reasons.add('Sampled local state: Electron Debye population reaches the configured screening limit (10).');
  const groups=new Map<string,CoulombIon[]>();
  for(const ion of cell.ions){
   const key=`${ion.massU}/${ion.chargeState}`;
   if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(ion);
  }
  if([...groups.values()].some(group=>group.length<4)){
   unresolvedRepresentatives+=cell.ions.length;continue;
  }
  const species:ThermalSpecies[]=[...groups.values()].map(group=>{
   const n=group.length,s=group[0];
   const meanVelocity=[0,1,2].map(k=>group.reduce((sum,p)=>sum+p.velocity[k],0)/n) as Vec;
   const variance=group.reduce((sum,p)=>sum+p.velocity.reduce((v,x,k)=>v+(x-meanVelocity[k])**2,0),0);
   const temperatureEV=s.massU*AMU*variance/(3*(n-1)*E_CHARGE);
   minTemperatureEV=Math.min(minTemperatureEV,temperatureEV);
   return {...s,fraction:n/cell.ions.length,temperatureEV,meanVelocity};
  });
  const local=atState(cell.densityM3,c.electronTemperatureEV,c.magneticT,species);resolvedCells++;
  for(const reason of local.reasons)reasons.add(`Sampled local state: ${reason}`);
  if(local.maxCoupling===null)undefinedCoupling=true;else maxCoupling=Math.max(maxCoupling,local.maxCoupling);
  minDebyePopulation=Math.min(minDebyePopulation,local.debyePopulation);
  if(local.minEstimatedCoulombLog!==null)minEstimatedCoulombLog=Math.min(minEstimatedCoulombLog,local.minEstimatedCoulombLog);
  if(local.maxEncounterMagnetization===null)undefinedEncounter=true;else maxEncounterMagnetization=Math.max(maxEncounterMagnetization,local.maxEncounterMagnetization);
 }
 let status:Status=reasons.size?'outside-supported-domain':unresolvedRepresentatives||!resolvedCells?'unresolved':'within-supported-domain';
 if(unresolvedRepresentatives)reasons.add('Some occupied cells lack four representatives in a present species; all representatives in those cells are unresolved.');
 if(!occupiedCells)reasons.add('No active occupied cells remain; local kinetic-regime estimates are undefined.');
 const finite=(x:number)=>Number.isFinite(x)?x:null;
 return {status,reasons:[...reasons],reference,referenceDensityM3:density,
  referenceDensityKind:initialPeakDensityM3===undefined?'declared density':'analytic initial peak' as string,
  observed:{occupiedCells,resolvedCells,
   unresolvedRepresentativeFraction:totalRepresentatives?unresolvedRepresentatives/totalRepresentatives:null,
   minTemperatureEV:finite(minTemperatureEV),maxCoupling:resolvedCells&&!undefinedCoupling?maxCoupling:null,
   minDebyePopulation:finite(minDebyePopulation),minEstimatedCoulombLog:finite(minEstimatedCoulombLog),
   maxEncounterMagnetization:resolvedCells&&!undefinedEncounter?maxEncounterMagnetization:null}};
}
