import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative} from 'node:path';
import {cpus,platform,arch,totalmem} from 'node:os';
import {DEFAULT_DOUBLEWELL} from '../src/doublewell-dynamics.js';
import {executeSeed,summarizeConvergence,validateConvergencePlan,type ConvergencePlan} from '../src/convergence.js';

const root=resolve(import.meta.dirname,'..');
const seeds=[101,202,303,404,505,606];
const customIndex=process.argv.indexOf('--plan'),outIndex=process.argv.indexOf('--output'),methodIndex=process.argv.indexOf('--method');
const method=methodIndex<0?'fixed':process.argv[methodIndex+1];
const sourceAligned=process.argv.includes('--source-aligned');
if(!['fixed','axisymmetric'].includes(method))throw new Error('Use --method fixed or --method axisymmetric.');
if(customIndex>=0&&(outIndex<0||methodIndex>=0))throw new Error('Custom plans require --output and cannot be combined with --method.');
if(sourceAligned&&(method!=='axisymmetric'||customIndex>=0))throw new Error('--source-aligned requires --method axisymmetric without a custom plan.');
const methodLabel=method+(sourceAligned?'-source-aligned':'');
const base={...structuredClone(DEFAULT_DOUBLEWELL),collisionMethod:method as 'fixed'|'axisymmetric',
 ...(sourceAligned?{collisionSourceAligned:true}:{})};
const plan:ConvergencePlan={id:`default-pulse-200us-${methodLabel}-v10`,description:`Actual 200µs pulse; ${methodLabel} dt/N/h studies and collision-off control. No physical settings or tolerances retuned to obtain a pass.`,seeds,
 levels:[{id:'default',config:base},
  {id:'dt50ns',config:{...base,dt:5e-8}},{id:'dt25ns',config:{...base,dt:2.5e-8}},
  {id:'N512',config:{...base,particlesPerSpecies:512}},{id:'N1024',config:{...base,particlesPerSpecies:1024}},
  {id:'h4-N304',config:{...base,cellsAcross:4,particlesPerSpecies:304}},
  {id:'h6-N1024',config:{...base,cellsAcross:6,particlesPerSpecies:1024}},
  {id:'collision-off',config:{...base,collisions:false}}],
 comparisons:[{kind:'timestep',coarse:'default',fine:'dt50ns'},{kind:'timestep',coarse:'dt50ns',fine:'dt25ns'},
  {kind:'particle',coarse:'default',fine:'N512'},{kind:'particle',coarse:'N512',fine:'N1024'},
  {kind:'spatial',coarse:'default',fine:'h4-N304'},{kind:'spatial',coarse:'h4-N304',fine:'h6-N1024'}],
 physicalEffect:{control:'collision-off',collisional:'default'},
 tolerances:{fraction:.01,radiusFraction:.01,temperatureEV:.1,timeFraction:.02,normalizedAngularMomentum:.001,
  maxRawMomentumResidual:.001,maxUnresolvedExposure:.01,minimumSeeds:6}};
const selected=customIndex<0?plan:JSON.parse(readFileSync(resolve(process.argv[customIndex+1]),'utf8')) as ConvergencePlan;
const output=resolve(outIndex<0?`assets/convergence-default-200us-${methodLabel}-v10.json`:process.argv[outIndex+1]);
if(!output.endsWith('.json'))throw new Error('Use a .json output filename.');
if([output,output.replace(/\.json$/,'.summary.json'),output.replace(/\.json$/,'.md')].some(existsSync))
 throw new Error('Refusing to overwrite existing convergence evidence; choose a new output path.');
validateConvergencePlan(selected);

// Follow the actual local import graph. UI/report edits in another workstream
// do not invalidate a physics run, but any executed solver/statistics edit does.
const sources=new Map<string,string>();
function collect(file:string){
 file=resolve(file);if(sources.has(file))return;
 const text=readFileSync(file,'utf8');sources.set(file,text);
 for(const match of text.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
  if(!match[1].startsWith('.'))continue;
  const path=resolve(dirname(file),match[1]),ts=path.replace(/\.js$/,'.ts');
  collect(existsSync(ts)?ts:path);
 }
}
collect(resolve(root,'src/convergence.ts'));collect(resolve(root,'scripts/run-convergence.ts'));
collect(resolve(root,'package.json'));collect(resolve(root,'package-lock.json'));
const hashes=Object.fromEntries([...sources].map(([file,text])=>[relative(root,file),createHash('sha256').update(text).digest('hex')]).sort(([a],[b])=>a.localeCompare(b)));
const sourceHash=createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
const modelVersion=10; // SourceHash identifies the exact executed model, including the selected collision method.
const startedAt=new Date().toISOString(),start=performance.now(),runs=[];
for(const level of selected.levels)for(const seed of selected.seeds){
 const run=executeSeed(level,seed,sourceHash,selected.executionMode);runs.push(run);
 console.log(`${level.id} seed ${seed}: ${run.status}, ${run.durationMs.toFixed(0)}ms`);
}
for(const [file,text]of sources)if(readFileSync(file,'utf8')!==text)throw new Error(`Executed source changed during matrix: ${relative(root,file)}. No mixed-snapshot artifact written.`);
const summary=summarizeConvergence(selected,runs,sourceHash);
const artifact={schemaVersion:1,modelVersion,sourceHash,sourceFiles:hashes,startedAt,completedAt:new Date().toISOString(),
 environment:{node:process.version,platform:platform(),architecture:arch(),cpu:cpus()[0]?.model,
  logicalCpus:cpus().length,totalMemoryBytes:totalmem(),runner:'sequential CPU; no deployment credentials or remote compute'},
 durationMs:performance.now()-start,plan:selected,summary,runs};
writeFileSync(output,JSON.stringify(artifact,null,2)+'\n');
const compact=output.replace(/\.json$/,'.summary.json');
writeFileSync(compact,JSON.stringify({...artifact,runs:runs.map(({raw,...run})=>run)},null,2)+'\n');
const format=(value:number|null)=>value===null?'undefined':value.toPrecision(5);
const markdown=[`# Convergence case: ${selected.id}`,'',selected.description,'',
 `**Gate: ${summary.status.toUpperCase()}.** This is numerical evidence, not experimental validation.`,
 `Model version ${modelVersion}; source hash \`${sourceHash}\`; ${runs.length} whole runs; ${(artifact.durationMs/1000).toFixed(1)} seconds.`,
 '',`Predeclared seeds: ${selected.seeds.join(', ')}. Observable fraction budget ${selected.tolerances.fraction}; survivor radius/a budget ${selected.tolerances.radiusFraction}; raw P-scale budget ${selected.tolerances.maxRawMomentumResidual}.`,
 '',summary.inference,'','| Level | End A, mean ± 95% half-width | End B | Max raw P residual | Max sampled unresolved exposure |',
 '| --- | --- | --- | --- | --- |',...selected.levels.map(level=>{
  const a=summary.summaries[level.id]['A.fraction.end'],b=summary.summaries[level.id]['B.fraction.end'];
  const batch=runs.filter(r=>r.level===level.id&&r.diagnostics);
  return `| ${level.id} | ${format(a?.mean??null)} ± ${format(a?.halfWidth95??null)} | ${format(b?.mean??null)} ± ${format(b?.halfWidth95??null)} | ${format(batch.length?Math.max(...batch.map(r=>r.diagnostics!.maxRawMomentumResidual)):null)} | ${format(batch.length?Math.max(...batch.map(r=>r.diagnostics!.unresolvedExposure??1)):null)} |`;
 }),'', '| Check | Status | Reason |','| --- | --- | --- |',
 ...summary.checks.map(check=>`| ${check.name} | ${check.status} | ${check.reason} |`),'',
 'Missing alignment/orientation experiments remain unknown: this solver does not implement those controls. Their omission cannot be converted into a passing numerical gate. Torque-corrected bookkeeping never repairs trajectories.',
 '',`Full raw history, impacts, SI conservation scales and sampled regime records: \`${relative(root,output)}\`. Compact machine-readable summary: \`${relative(root,compact)}\`.`,
 '', 'Exact executable import graph plus package/lock hashes are recorded; the runner refuses to publish an artifact if these files change during execution. Source identity does not imply hardware-independent bitwise reproducibility.',''];
writeFileSync(output.replace(/\.json$/,'.md'),markdown.join('\n'));
console.log(`Wrote ${relative(root,output)} and ${relative(root,compact)}: ${summary.status}`);
