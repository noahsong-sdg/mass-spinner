/** Actual accepted simulator states and separately labelled static screens. Safe-dev only. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DEFAULT_FUEL_CENTRIFUGE,FUEL_PAIRS,simulateFuelCentrifuge} from '../../src/fuel-centrifuge.ts';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../../src/fuel-operation.ts';
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const cases:unknown[]=[],failures:unknown[]=[];
function config(pair:keyof typeof FUEL_PAIRS,changes={}){
 return {...DEFAULT_FUEL_CENTRIFUGE,pair,lightFraction:FUEL_PAIRS[pair].fraction,...changes,speciesMassU:[...FUEL_PAIRS[pair].masses]};
}
function uniform(name:string,family:string,c:ReturnType<typeof config>,g:number){
 return {name,family,config:c,gasWallWK:g,state:{gasK:c.gasK,neutralRadS:0,lightMass:[.5,.5],heavyMass:[.5,.5],timeS:0},
  scope:'Static uniform initial-condition screen; not a simulated trajectory'};
}
for(const pair of Object.keys(FUEL_PAIRS) as (keyof typeof FUEL_PAIRS)[]){
 cases.push(uniform(`initial-${pair}`,'initial-pair-reference',config(pair),DEFAULT_FUEL_THERMAL.gasWallWK));
 for(const pressurePa of [1,10,100])for(const gasK of [300,500,1000,2000])
 for(const radiusM of [.05,.12,.3])for(const lengthM of [.2,.8,2])for(const g of [0,.001,.1,1,1000,1e6])
  cases.push(uniform(`screen-${pair}-${pressurePa}-${gasK}-${radiusM}-${lengthM}-${g}`,'static-slider-grid',config(pair,{pressurePa,gasK,radiusM,lengthM}),g));
 if(pair==='molecular')continue;
 const c=config(pair),rotor=simulateFuelCentrifuge(c);
 const operation={schemaVersion:1 as const,events:[],thermal:{...DEFAULT_FUEL_THERMAL,enabled:true,spatial:{material:'tungsten' as const,thicknessM:.001,cells:16}}};
 try{
  const trajectory=simulateFuelOperation(rotor,operation,{cells:64,steps:512});
  const knots=trajectory.checkpoints!;
  const selected=knots.filter((_,i)=>i%32===0||i===knots.length-1);
  for(const s of selected)cases.push({name:`thermal-${pair}-${s.timeS}`,
   family:'sampled-accepted-thermal',config:c,gasWallWK:operation.thermal.gasWallWK,
   state:{gasK:s.thermal!.gasK,neutralRadS:s.neutralRadS,lightMass:s.lightMass,heavyMass:s.heavyMass,timeS:s.timeS},
   gasGrid:{coordinate:'r²/a²',radiusEdgesM:trajectory.radiusEdgesM,cells:trajectory.cells},
   scope:'Opted-in spatial liner thermal run; sampled accepted gas inventories,64gas cells/512steps; wall density is last gas-cell mean'});
 }catch(error){failures.push({pair,family:'sampled-accepted-thermal',error:String(error)});}
 // Isothermal refinement checks whether a rarefaction classification is sensitive
 // to the existing finite-volume gas resolution. No equilibrium substitution.
 if(pair==='lithium')for(const cells of [32,64,128]){
  const r=simulateFuelOperation(rotor,{schemaVersion:1,events:[]},{cells,steps:1024});
  const s=r.checkpoints!.at(-1)!;
  cases.push({name:`isothermal-refinement-${cells}`,family:'gas-profile-refinement',config:c,gasWallWK:.1,
   state:{gasK:c.gasK,neutralRadS:s.neutralRadS,lightMass:s.lightMass,heavyMass:s.heavyMass,timeS:s.timeS},
   gasGrid:{coordinate:'r²/a²',radiusEdgesM:r.radiusEdgesM,cells:r.cells},
   scope:'Accepted isothermal finite-time gas profile; diagnostic film imposed only for screening; not an evolved thermal trajectory'});
 }
}
// v55 sets capacity from10Pa/500K but supplies no species. Test conditional
// identities separately, never silently assign the original benchmark a gas.
for(const pair of Object.keys(FUEL_PAIRS).filter(p=>p!=='molecular') as (keyof typeof FUEL_PAIRS)[])
 cases.push({...uniform(`fast55-conditional-${pair}`,'fast55-conditional-species',config(pair,{lengthM:.5}),1000),
  scope:'Conditional species assignment for capacity-only v55 benchmark, not its original composition'});
const sources=Object.fromEntries(['src/fuel-centrifuge.ts','src/fuel-operation.ts','src/fuel-transport.ts','src/fuel-centrifuge-ui.js','scientific/gas-regime-v56/export-cases.ts'].map(p=>[p,sha(p)]));
const output={schemaVersion:1,cases,failures,sources,
 screeningThresholds:{kn:.01,diffusionToFilmTime:.1,scope:'Heuristics, not physical validation gates'},
 scope:'Static UI-grid probes, conditional benchmark identities and sampled actual accepted trajectories are distinct. No claims of exhaustive UI or gas closure validation.'};
writeFileSync(process.argv[2],JSON.stringify(output)+'\n');
console.log(JSON.stringify({cases:cases.length,failures,sources}));
