import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FUEL_BENCHMARK_SOURCE,fuelBenchmarkObservations,fuelBenchmarkReport,rigidProfileCompatibility,type RigidProfileBox} from '../src/fuel-benchmark.js';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelTransport} from '../src/fuel-transport.js';
import {fuelMotionState} from '../src/fuel-motion.js';

const fixtureBytes=readFileSync(new URL('./fixtures/wijnakker1979-digitization.json',import.meta.url));
const fixture=JSON.parse(fixtureBytes.toString('utf8'));
const close=(actual:number,expected:number,tolerance=2e-12)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);

// Independent endpoint calibration. All admitted pixels remain inside their
// endpoint anchors even after the six-pixel perturbations. The extrema then
// shift both endpoint pixels together, giving exactly twice the pixel range.
function axis(anchors:any[],valueKey:string,pixelKey:string,factor:number){
 const a=anchors[0],b=anchors.at(-1),slope=factor*(b[valueKey]-a[valueKey])/(b[pixelKey]-a[pixelKey]);
 return {at:(pixel:number)=>factor*a[valueKey]+slope*(pixel-a[pixelKey]),halfWidth:2*fixture.coordinateUncertaintyPx*Math.abs(slope)};
}
function independentlyExtracted(){
 const x=axis(fixture.xAnchors,'radiusCm','xPx',.01),y=axis(fixture.yAnchors,'velocityMps','yPx',1);
 return fixture.measuredMarkers.map((m:any)=>{
  const radius=x.at(m.centerPx[0]),speed=y.at(m.centerPx[1]);
  const bars=m.verticalErrorBarY.map(y.at).sort((a:number,b:number)=>a-b);
  return {id:m.id,radius,speed,radiusRange:[radius-x.halfWidth,radius+x.halfWidth],
   extraction:[speed-y.halfWidth,speed+y.halfWidth],bars,combined:[bars[0]-y.halfWidth,bars[1]+y.halfWidth]};
 });
}

test('independent raw-pixel fixture and source identity reproduce every admitted observation and range',()=>{
 assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'),FUEL_BENCHMARK_SOURCE.extractionSha256);
 assert.equal(fixture.sourcePdfSha256,FUEL_BENCHMARK_SOURCE.pdfSha256);
 assert.equal(fixture.imageSha256,FUEL_BENCHMARK_SOURCE.cropSha256);
 const expected=independentlyExtracted(),actual=fuelBenchmarkObservations();
 assert.equal(actual.length,5);assert.equal(actual.length,fixture.measuredMarkers.length);
 for(let i=0;i<expected.length;i++){
  const a=actual[i],e=expected[i];assert.equal(a.id,e.id);close(a.radiusM,e.radius);close(a.velocityMS,e.speed);
  for(let j=0;j<2;j++){close(a.radiusRangeM[j],e.radiusRange[j]);close(a.extractionRangeMS[j],e.extraction[j]);close(a.barRangeMS[j],e.bars[j]);close(a.combinedRangeMS[j],e.combined[j]);}
 }
 assert.ok(actual.some(p=>!p.extractionUnderFivePercent),'low-resolution markers remain admitted and flagged, not dropped');
 assert.ok(fixture.exclusions.some((p:any)=>p.locationPx?.[0]===171),'near-axis exclusions remain explicit source evidence');
});

test('nominal minimax bound is the closed-form obstruction for any nonnegative rigid speed',()=>{
 const rows=independentlyExtracted(),q=rows.map((p:any)=>p.speed/p.radius),highest=Math.max(...q),lowest=Math.min(...q);
 const epsilon=(highest-lowest)/(highest+lowest),omega=2*highest*lowest/(highest+lowest);
 const report=fuelBenchmarkReport();close(report.nominalMinimaxFraction,epsilon);
 close(Math.max(...q.map((v:number)=>Math.abs(omega/v-1))),epsilon);
 const boxes=rows.map((p:any)=>({id:p.id,radiusM:[p.radius,p.radius],velocityMS:[p.speed,p.speed]})) as RigidProfileBox[];
 assert.equal(rigidProfileCompatibility(boxes,epsilon-1e-6).status,'incompatible');
 assert.equal(rigidProfileCompatibility(boxes,epsilon+1e-6).status,'not-excluded');
 assert.ok(epsilon>.2);assert.equal(report.experimentallyQualified,false);assert.equal(report.absolutePrediction,'unavailable');
 assert.match(report.source.independence,/Retrospective/);
});

test('all observation modes agree with independently computed interval-intersection bounds',()=>{
 const rows=independentlyExtracted(),report=fuelBenchmarkReport();
 for(const mode of ['nominal','digitization','bars','combined'] as const){
  const ranges=rows.map((p:any)=>({id:p.id,r:mode==='nominal'?[p.radius,p.radius]:p.radiusRange,
   v:mode==='nominal'?[p.speed,p.speed]:mode==='digitization'?p.extraction:mode==='bars'?p.bars:p.combined}));
  const lower=Math.max(...ranges.map((p:any)=>.8*p.v[0]/p.r[1])),upper=Math.min(...ranges.map((p:any)=>1.2*p.v[1]/p.r[0]));
  close(report.cases[mode].lowerRadS,lower);close(report.cases[mode].upperRadS,upper);
  assert.equal(report.cases[mode].status,lower>upper?'incompatible':'not-excluded');
  assert.ok(ranges.some((p:any)=>p.id===report.cases[mode].lowerWitness));assert.ok(ranges.some((p:any)=>p.id===report.cases[mode].upperWitness));
 }
 assert.equal(report.cases.combined.status,'incompatible','even the independent per-point optimistic ranges must not hide this shape failure');
});

test('synthetic rigid, peaked, zero and enlarged profiles provide separate positive and negative controls',()=>{
 const exact=[.01,.02,.04].map((r,i)=>({id:`rigid-${i}`,radiusM:[r,r],velocityMS:[200*r,200*r]})) as RigidProfileBox[];
 const a=rigidProfileCompatibility(exact,0);assert.equal(a.status,'not-excluded');close(a.lowerRadS,200);close(a.upperRadS,200);
 const peak=[{id:'inner',radiusM:[.01,.01],velocityMS:[300,300]},{id:'outer',radiusM:[.05,.05],velocityMS:[400,400]}] as RigidProfileBox[];
 assert.equal(rigidProfileCompatibility(peak).status,'incompatible');
 assert.equal(rigidProfileCompatibility([{id:'stationary',radiusM:[.01,.02],velocityMS:[0,0]}]).status,'not-excluded');
 const broad=peak.map(p=>({...p,velocityMS:[0,1000] as const}));
 assert.equal(rigidProfileCompatibility(broad).status,'not-excluded','large ranges mean non-exclusion, not experimental qualification');
 assert.equal(rigidProfileCompatibility([...peak].reverse()).status,'incompatible');
});

test('empty, unresolved-axis, reversed, negative and nonfinite observations cannot be scored as compatible',()=>{
 const valid={id:'point',radiusM:[.01,.02],velocityMS:[100,200]} as RigidProfileBox;
 for(const box of [{...valid,id:''},{...valid,radiusM:[0,.01]},{...valid,radiusM:[.02,.01]},
  {...valid,velocityMS:[-1,1]},{...valid,velocityMS:[200,100]},{...valid,velocityMS:[0,Infinity]},
  {...valid,radiusM:[NaN,.02]}])assert.throws(()=>rigidProfileCompatibility([box as RigidProfileBox]),RangeError);
 assert.throws(()=>rigidProfileCompatibility([]),RangeError);
 for(const epsilon of [-.1,1,NaN,Infinity])assert.throws(()=>rigidProfileCompatibility([valid],epsilon),RangeError);
 assert.throws(()=>rigidProfileCompatibility([{id:'overflow',radiusM:[Number.MIN_VALUE,Number.MIN_VALUE],velocityMS:[1e300,1e300]}]),RangeError);
});

test('positive emissivity and different thermal widths preserve the rigid Doppler centroid',()=>{
 for(const omega of [0,12345])for(const impact of [.009,.031,.05]){
  const weights=[.001,4,100,.02],along=[-.07,-.02,.013,.07];let first=0,total=0;
  for(let i=0;i<along.length;i++){
   const x=impact,y=along[i],vx=-omega*y,vy=omega*x;
   // Dot actual Cartesian rigid velocity with the sightline, not Ω*r.
   assert.ok(Number.isFinite(vx));first+=weights[i]*vy;total+=weights[i];
  }
  close(first/total,omega*impact);
  let spectralFirst=0,spectralTotal=0;
  for(let j=-1000;j<=1000;j++){
   const offset=5*j;let intensity=0;
   for(let i=0;i<weights.length;i++){const width=[70,150,280,500][i];intensity+=weights[i]/width*Math.exp(-.5*(offset/width)**2);}
   spectralFirst+=(omega*impact+offset)*intensity;spectralTotal+=intensity;
  }
  close(spectralFirst/spectralTotal,omega*impact);
 }
});

test('actual live accepted transport and animation use one common angular speed, independently of benchmark data',()=>{
 const config={...DEFAULT_FUEL_CENTRIFUGE,durationS:.2,currentA:.06};
 const rotor=simulateFuelCentrifuge(config),transport=simulateFuelTransport(rotor,{cells:32,steps:128}),result={...rotor,transport};
 const accepted=transport.snapshots[Math.floor(transport.snapshots.length/2)];
 for(const mode of ['spin','transport']){
  const state=fuelMotionState(result,accepted.timeS,mode);close(state.speeds.neutral,accepted.neutralRadS);close(state.speeds.ion,accepted.ionRadS);
  for(const p of fuelBenchmarkObservations()){
   const tangential=state.speeds.neutral*p.radiusM;close(tangential/p.radiusM,accepted.neutralRadS);
  }
 }
 const altered=fuelBenchmarkObservations().map(p=>({id:p.id,radiusM:p.radiusRangeM,velocityMS:[p.velocityMS*100,p.velocityMS*100] as const}));
 rigidProfileCompatibility(altered);
 assert.deepEqual(simulateFuelCentrifuge(config),rotor,'measurement scoring must never alter the physical drive prediction');
 assert.equal(fuelBenchmarkReport().experimentallyQualified,false);
});
