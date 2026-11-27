// Execute only inside the isolated scientific/test environment, never on the host.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {rotorResponse} from '../src/fuel-centrifuge.ts';
import {advanceFuelRadialMass} from '../src/fuel-transport.ts';
import {solveFuelCurrent} from '../src/fuel-current.ts';
import {createFuelLiner,initialFuelLinerEnergy} from '../src/fuel-thermal.ts';
import {advanceFuelMixtureThermal} from '../src/fuel-gas-thermal.ts';

/** @typedef {{id:string,gate:string,actual:number,expected:number,error:number,limit:number,pass:boolean}} Metric */
/** @typedef {{schemaVersion:number,kind:string,experimentallyQualified:boolean,numericallyVerified:boolean,rows:Metric[],sourceFiles:Record<string,string>,sourceHash:string}} ComponentReceipt */
/** @param {number[]} a */
const sum=a=>a.reduce((s,v)=>s+v,0);
/** @param {string|Uint8Array} b */
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources=['scripts/qualify-public-components.mjs','src/fuel-centrifuge.ts','src/fuel-transport.ts',
 'src/fuel-current.ts','src/fuel-thermal.ts','src/fuel-gas-thermal.ts','src/fuel-gas.ts',
 'src/fuel-momentum.ts','package-lock.json'];
/** @type {Record<string,readonly [number,number]>} */
const gates={rotor:[1e-12,1e-9],inventory:[3e-11,0],distribution:[3e-11,0],current:[0,1e-9],charge:[1e-8,0],
 power:[1e-7,0],heat:[2e-12,2e-10],temperature:[2e-8,2e-10]};
const expectedIds=[
 ...[0,1e-9,.3,8].flatMap(t=>['ion','neutral','momentum'].map(key=>`rotor/${t}/${key}`)),
 ...[0,1e-8,.5,8,50,300].flatMap(beta=>['distribution','inventory'].map(key=>`equilibrium/${beta}/${key}`)),
 ...[0,2,-2].flatMap(omega=>['current','mechanical','charge','energy'].map(key=>`current/${omega}/${key}`)),
 ...[400,1000,1700].flatMap(t=>[-.001,.001].flatMap(q=>['face','left','right','energy'].map(key=>`heat/${t}/${q}/${key}`))),
];

/** Recompute numeric gates; neither a producer flag nor NaN is acceptance evidence.
 * @param {ComponentReceipt} report
 */
export function auditPublicComponents(report){
 if(report?.schemaVersion!==1||report.kind!=='public-component-verification'||report.experimentallyQualified!==false||
  report.rows?.length!==expectedIds.length)throw new Error('Wrong component receipt identity, scope or case count.');
 const actualIds=report.rows.map(r=>r.id);
 if(new Set(actualIds).size!==expectedIds.length||expectedIds.some(id=>!actualIds.includes(id)))throw new Error('Missing or duplicate component case.');
 if(!report.sourceFiles||Object.keys(report.sourceFiles).length!==sources.length||
  sources.some(path=>!/^[a-f0-9]{64}$/.test(report.sourceFiles[path]??''))||report.sourceHash!==hash(JSON.stringify(report.sourceFiles)))
  throw new Error('Incomplete or corrupted source identity.');
 for(const row of report.rows){
  const component=row.id.split('/')[0],key=row.id.split('/').at(-1);
  const required=component==='rotor'?'rotor':component==='equilibrium'?key:component==='current'?
   (key==='charge'?'charge':key==='current'?'current':'power'):(key==='left'||key==='right'?'temperature':'heat');
  const gate=row.gate===required?gates[row.gate]:null;
  if(!gate||![row.actual,row.expected,row.error,row.limit].every(Number.isFinite))throw new Error(`Invalid metric: ${row.id}`);
  const error=Math.abs(row.actual-row.expected),limit=gate[0]+gate[1]*Math.abs(row.expected),pass=error<=limit;
  if(row.error!==error||row.limit!==limit||row.pass!==pass)throw new Error(`Corrupted metric: ${row.id}`);
 }
 const passed=report.rows.every(row=>row.pass);
 if(report.numericallyVerified!==passed)throw new Error('Incorrect aggregate component status.');
 return {rows:report.rows.length,passed,experimentallyQualified:false};
}

export function qualifyPublicComponents(){
 /** @type {Metric[]} */
 const rows=[];
 /** @param {string} id @param {string} gate @param {number} actual @param {number} expected */
 const metric=(id,gate,actual,expected)=>{
  const [absolute,relative]=gates[gate],error=Math.abs(actual-expected),limit=absolute+relative*Math.abs(expected);
  rows.push({id,gate,actual,expected,error,limit,pass:Number.isFinite(error)&&error<=limit});
 };
 // Undamped two-rotor continuum solution: weighted common mode + exponential slip.
 const ii=.2,nn=5,gamma=.7,torque=.9,lambda=gamma*(1/ii+1/nn);
 for(const t of [0,1e-9,.3,8]){
  const slip=torque/ii*(-Math.expm1(-lambda*t))/lambda,mean=torque*t/(ii+nn);
  const expected=[mean+nn/(ii+nn)*slip,mean-ii/(ii+nn)*slip],actual=rotorResponse(ii,nn,gamma,0,torque,t);
  metric(`rotor/${t}/ion`,'rotor',actual.ion,expected[0]);metric(`rotor/${t}/neutral`,'rotor',actual.neutral,expected[1]);
  metric(`rotor/${t}/momentum`,'rotor',ii*actual.ion+nn*actual.neutral,torque*t);
 }
 // Exact integrals of exp(beta*y) on equal-volume y=r²/R² bins, not production CDF.
 for(const beta of [0,1e-8,.5,8,50,300]){
  const n=64,initial=Array.from({length:n},(_,i)=>beta===0?1/n:
   Math.exp(-beta*(1-(i+1)/n))*(-Math.expm1(-beta/n))/(-Math.expm1(-beta)));
  const actual=advanceFuelRadialMass(initial,beta,1.3,.7);
  metric(`equilibrium/${beta}/distribution`,'distribution',sum(actual.map((v,i)=>Math.abs(v-initial[i]))),0);
  metric(`equilibrium/${beta}/inventory`,'inventory',sum(actual),1);
 }
 // Annular Ohm law with independently integrated motional EMF, r=[1,2],L=1.
 for(const omega of [0,2,-2]){
  const nr=16,nz=4,n=nr*nz,B=3,resistance=Math.log(2)/(4*Math.PI),expected=(10+B*omega*1.5)/resistance;
  const actual=solveFuelCurrent({radialEdgesM:Array.from({length:nr+1},(_,i)=>1+i/nr),axialEdgesM:[0,.25,.5,.75,1],
   sigmaPerpSM:Array(n).fill(2),sigmaParallelSM:Array(n).fill(7),omegaRadS:Array(n).fill(omega),magneticT:B,
   innerVoltageV:Array(nz).fill(10),outerVoltageV:Array(nz).fill(0),lowerVoltageV:Array(nr).fill(null),upperVoltageV:Array(nr).fill(null)});
  metric(`current/${omega}/current`,'current',sum(actual.boundaryCurrentsA.filter(v=>v>0)),expected);
  metric(`current/${omega}/mechanical`,'power',actual.mechanicalW,-expected*B*omega*1.5);
  metric(`current/${omega}/charge`,'charge',actual.netBoundaryCurrentA,0);
  metric(`current/${omega}/energy`,'power',actual.electrodePowerW-actual.jouleW-actual.mechanicalW,0);
 }
 // Exact two-cell backward-Euler Fourier solution, not a continuum transient.
 const K=1.380649e-23,N=1e18,R=.01,L=.1,dt=.01,k=.2,C=1.5*K*N/2,link=dt*4*Math.PI*L*k;
 const grid=createFuelLiner({radiusM:R,lengthM:L,thicknessM:.001,cells:3}),mass=[.5,.5];
 for(const background of [400,1000,1700])for(const q of [-.001,.001]){
  const old=[C*background,C*background],face=q*link/(C+2*link);
  const actual=advanceFuelMixtureThermal(grid,initialFuelLinerEnergy(grid,background),old,N,.5,R,L,dt,
   {gasWallWK:0,coolingWK:0,coolantK:background},{conductivityWMK:k,lightMass:mass,heavyMass:mass},()=>({
    lightMass:mass,heavyMass:mass,faceTransfers:[[0],[0]],gasSourceJ:[q,0],dragEnergyJ:0,payload:null}));
  metric(`heat/${background}/${q}/face`,'heat',actual.gasFaceEnergyJ[0],face);
  metric(`heat/${background}/${q}/left`,'temperature',actual.gasTemperatureK[0],background+(q-face)/C);
  metric(`heat/${background}/${q}/right`,'temperature',actual.gasTemperatureK[1],background+face/C);
  metric(`heat/${background}/${q}/energy`,'heat',sum(actual.gasEnergyJ)-sum(old),q);
 }
 const sourceFiles=Object.fromEntries(sources.map(path=>[path,hash(readFileSync(path))]));
 const report={schemaVersion:1,kind:'public-component-verification',sourceFiles,sourceHash:hash(JSON.stringify(sourceFiles)),
  controls:{rotor:{iiKgM2:ii,nnKgM2:nn,couplingKgM2S:gamma,dragKgM2S:0,torqueNm:torque},
   equilibrium:{cells:64,diffusionRateS:1.3,stepS:.7,coordinate:'y=r²/R²',boundary:'closed'},
   current:{innerRadiusM:1,outerRadiusM:2,lengthM:1,radialCells:16,axialCells:4,sigmaPerpSM:2,sigmaParallelSM:7,magneticT:3,voltageV:10},
   heat:{cells:2,number:N,radiusM:R,lengthM:L,stepS:dt,conductivityWMK:k,gasWallWK:0,coolingWK:0,cellCapacityJK:C}},
  numericallyVerified:rows.every(r=>r.pass),experimentallyQualified:false,rows,
  interpretation:'Analytical limiting cases for production kernels, not full live-model qualification, experimental measurements, or device validation. Thermal comparison verifies a discrete BE system; it does not qualify continuum heat-flow accuracy.',
  existingContinuumCoverage:['tests/fuel-transport-independent-v47.test.ts','tests/fuel-operation-independent-v51.test.ts',
   'tests/fuel-mixture-audit-v58.test.ts','docs/LIVE-MODEL-QUALIFICATION.md']};
 auditPublicComponents(report);return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3)throw new Error('Supply one NEW output JSON path.');
 const report=qualifyPublicComponents();writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(auditPublicComponents(report)));if(!report.numericallyVerified)process.exitCode=1;
}
