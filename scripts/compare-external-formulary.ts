import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {AMU,E_CHARGE,sourceVelocity,step} from '../src/physics.js';
import {coulombVariance,EPSILON_0} from '../src/coulomb.js';
import {DEFAULT_DOUBLEWELL,doublewellRegime} from '../src/doublewell-dynamics.js';

interface Formulary {
 schemaVersion:1;referenceKind:string;versions:{plasmapy:string};sourceHashes:Record<string,string>;
 constants:{massUnitKg:number;elementaryChargeC:number;epsilon0ProductionFm:number};
 cases:{id:string;inputs:{electronTemperatureEV:number;magneticT:number;coulombLog:number;totalIonDensityM3:number};
  electronDebyeM:number;particlesPerDebyeSphere:number;
  species:{massU:number;chargeState:number;temperatureEV:number;sigma1dMS:number;gyroAngularRadS:number}[]}[];
 coldBeamCases:{massAU:number;massBU:number;densityM3:number;coulombLog:number;speedMS:number;expectedTaVarianceRateS1:number}[];
}

export function compareFormulary(value:unknown){
 const r=value as Formulary;
 if(!r||r.schemaVersion!==1||r.referenceKind!=='external-formulary-only'||r.versions?.plasmapy!=='2026.2.0'
  ||r.constants?.massUnitKg!==AMU||r.constants?.elementaryChargeC!==E_CHARGE||r.constants?.epsilon0ProductionFm!==EPSILON_0
  ||!r.sourceHashes||!Object.values(r.sourceHashes).length||!Object.values(r.sourceHashes).every(h=>/^[a-f0-9]{64}$/.test(h))
  ||!Array.isArray(r.cases)||r.cases.length!==2||!Array.isArray(r.coldBeamCases)||r.coldBeamCases.length!==4)
  throw new Error('Unsupported or incomplete PlasmaPy fixture.');
 const checks:{name:string;actual:number;reference:number;relativeDifference:number;relativeTolerance:number;passed:boolean}[]=[];
 const check=(name:string,actual:number,reference:number,relativeTolerance:number)=>{
  if(!Number.isFinite(actual)||!Number.isFinite(reference)||reference<=0)throw new Error(`Invalid positive reference quantity: ${name}`);
  const relativeDifference=Math.abs(actual/reference-1);
  checks.push({name,actual,reference,relativeDifference,relativeTolerance,passed:relativeDifference<=relativeTolerance});
 };
 for(const c of r.cases){
  const i=c.inputs;
  if(!i||![i.electronTemperatureEV,i.magneticT,i.coulombLog,i.totalIonDensityM3].every(x=>Number.isFinite(x)&&x>0)
   ||!Array.isArray(c.species)||c.species.length!==2)throw new Error('Invalid formulary state.');
  const config={...DEFAULT_DOUBLEWELL,densityM3:i.totalIonDensityM3,electronTemperatureEV:i.electronTemperatureEV,
   magneticT:i.magneticT,coulombLog:i.coulombLog,species:c.species.map(s=>({massU:s.massU,chargeState:s.chargeState}))};
  const regime=doublewellRegime(config);
  // PlasmaPy's Astropy epsilon0 differs from production's older CODATA constant.
  // This declared bound covers that known constant convention, not fitted physics.
  check(`${c.id}: electron Debye length (m)`,regime.debyeM,c.electronDebyeM,3e-8);
  check(`${c.id}: electron Debye population`,regime.particlesPerDebyeSphere,c.particlesPerDebyeSphere,3e-8);
  for(const s of c.species){
   if(![s.massU,s.temperatureEV].every(x=>Number.isFinite(x)&&x>0)||!Number.isSafeInteger(s.chargeState)||s.chargeState<1)
    throw new Error('Invalid abstract species.');
   let draw=0;
   const velocity=sourceVelocity(s.massU,s.temperatureEV,0,s.temperatureEV,0,'thermal',()=>draw++%2===0?1-Math.exp(-.5):0);
   velocity.forEach((v,j)=>check(`${c.id}: ${s.massU}u source sigma component ${j} (m/s)`,v,s.sigma1dMS,1e-12));
   const dt=1e-10,moved=step({position:[0,0,0],velocity:[1,0,0]},s.chargeState*E_CHARGE/(s.massU*AMU),dt,
    ()=>({electric:[0,0,0],magnetic:[0,0,i.magneticT]}));
   check(`${c.id}: ${s.massU}u gyro angular rate from production step (rad/s)`,Math.abs(Math.atan2(moved.velocity[1],moved.velocity[0]))/dt,s.gyroAngularRadS,3e-8);
  }
 }
 for(const c of r.coldBeamCases){
  const actual=coulombVariance({massU:c.massAU,chargeState:1,velocity:[0,0,c.speedMS]},
   {massU:c.massBU,chargeState:1,velocity:[0,0,0]},c.densityM3,c.coulombLog,1);
  check(`cold ${c.massAU}u on ${c.massBU}u: infinitesimal TA variance rate (1/s)`,actual,c.expectedTaVarianceRateS1,3e-8);
 }
 return {schemaVersion:1,createdUTC:new Date().toISOString(),referencePackage:r.versions.plasmapy,
  verdict:checks.every(c=>c.passed)?'PASS':'FAIL',checks,finiteTimeCollisionValidated:false,separatorTransportValidated:false,
  limitations:['Cold-beam relation checks the infinitesimal coefficient against a fixed Maxwellian background limit.',
   'This does not validate finite-step scattering, empirical pairing, velocity distributions, spatial locality or collectors.']};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw new Error('Usage: compare-external-formulary.ts INPUT.json OUTPUT.json');
 const bytes=readFileSync(input),r=compareFormulary(JSON.parse(bytes.toString()));
 const files=['src/physics.ts','src/collisions.ts','src/coulomb.ts','src/doublewell-dynamics.ts','src/doublewell-regime.ts',
  'src/doublewell-orbits.ts','src/collision-locality.ts','src/axisymmetric-collisions.ts','scripts/compare-external-formulary.ts'];
 const sourceHashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
 writeFileSync(output,JSON.stringify({...r,referenceSHA256:createHash('sha256').update(bytes).digest('hex'),sourceHashes},null,2)+'\n');
 console.log(JSON.stringify({verdict:r.verdict,checks:r.checks.length,maxRelativeDifference:Math.max(...r.checks.map(c=>c.relativeDifference))}));
}
