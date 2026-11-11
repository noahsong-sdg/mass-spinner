import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceState,sampleSurfaceField,type SurfaceRequest} from '../src/surface-state.js';
import {simulate,DEFAULT_CONFIG,fields} from '../src/physics.js';
import {geometry,DEFAULT_GEOMETRY} from '../src/geometries.js';
import {solveEquilibrium} from '../src/equilibrium-model.js';
import {simulateDoublewell,DEFAULT_DOUBLEWELL} from '../src/doublewell-dynamics.js';
import {simulateCoupledTarget,DEFAULT_COUPLED_TARGET} from '../src/coupled-target.js';
import {DEFAULT_FUSION_BEAM} from '../src/fusion-reactor.js';
import {transport,DEFAULT_TRANSPORT} from '../src/transport.js';

const request=(model:string,settings:any,result:any,extra:Partial<SurfaceRequest>={}):SurfaceRequest=>
 ({model,settings,result,acceptedModel:model,acceptedSettings:settings,...extra});
function ready(q:SurfaceRequest){const v=surfaceState(q);assert.equal(v.status,'ready',v.status==='ready'?'':v.reason);if(v.status!=='ready')throw new Error(v.reason);return v.snapshot;}
const close=(a:number,b:number,scale=1)=>assert.ok(Math.abs(a-b)<=1e-10*Math.max(scale,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const orbitConfig={...DEFAULT_CONFIG,length:.02,particlesPerSpecies:4,dt:2e-8,duration:1e-5};

test('accepted orbit data preserve solver xyz, actual impacts and injected denominators',()=>{
 const r=simulate(orbitConfig),s=ready(request('rotating',orbitConfig,r));
 assert.equal(s.domain.radiusM,orbitConfig.radius);assert.equal(s.domain.lengthM,orbitConfig.length);
 assert.equal(s.impacts.length,r.species.reduce((n,p)=>n+p.impacts.length,0));assert.ok(s.impacts.length>0);
 for(const e of s.impacts){assert.equal(e.injected,4);assert.ok(e.positionM);if(e.destination==='end')close(e.positionM![2],orbitConfig.length);}
 assert.equal(s.tracks[0].positionsM,r.species[0].paths[0].positions);
 const electric=s.fields.find(f=>f.id==='electric-radial')!;
 close(electric.values.at(-1)!,fields([orbitConfig.radius,0,0],orbitConfig).electric[0]);
 assert.match(s.unsupported.join(' '),/unweighted/);
});
test('stale, pending, model-mismatched and nonfinite requests cannot publish surfaces',()=>{
 const r=simulate(orbitConfig),q=request('rotating',orbitConfig,r);
 assert.equal(surfaceState({...q,pending:true}).status,'pending');
 for(const bad of [{...q,settings:{...orbitConfig,radius:.3}},{...q,acceptedModel:'icr'},
  {...q,result:{...r,config:{...orbitConfig,voltage:0}}},{...q,settings:{...orbitConfig,voltage:NaN}},
  {...q,acceptedSettings:undefined}])assert.equal(surfaceState(bad).status,'invalid');
 const reordered=Object.fromEntries(Object.entries(orbitConfig).reverse());
 assert.equal(surfaceState({...q,acceptedSettings:reordered}).status,'ready');
});
test('impact population and exact boundary invariants reject corrupt or misplaced events',()=>{
 const r=simulate(orbitConfig);
 for(const mutate of [(x:any)=>x.species[0].injected++,
  (x:any)=>x.species[0].impacts.push({...x.species[0].impacts[0],destination:'coil'}),
  (x:any)=>x.species[0].impacts[0].position[2]=.01]){
  const bad=structuredClone(r);mutate(bad);assert.equal(surfaceState(request('rotating',orbitConfig,bad)).status,'invalid');
 }
});
test('equilibrium normalized densities are not promoted to physical density or laboratory potential',()=>{
 const c={radius:.2,rotationRadS:10000,ionTemperatureEV:5,electronTemperatureEV:5,bins:16,
  species:[{massU:40,chargeState:1,axisFraction:.4},{massU:84,chargeState:1,axisFraction:.6}]};
 const r=solveEquilibrium(c),s=ready(request('centrifuge',c,r));
 assert.equal(s.fields.find(f=>f.id==='density-0')!.unit,'n / n_axis');
 assert.ok(!s.fields.some(f=>f.id==='potential'||f.id==='electric-radial'));
 assert.deepEqual(s.fields.find(f=>f.id==='density-0')!.domain,s.fields.find(f=>f.id==='density-1')!.domain);
 const f=s.fields.find(f=>f.id==='fraction-1')!;
 r.profiles.forEach((p,i)=>close(f.values[i],p.ionDensities[1]/p.ionDensities.reduce((a,b)=>a+b,0)));
 assert.equal(sampleSurfaceField(f,-1e-10),null);assert.equal(sampleSurfaceField(f,.2000001),null);
});
test('Gaussian and coupled magnetic adapters preserve physical density and signed solved E/B',()=>{
 for(const closure of ['gaussian','magnetic-gaussian'] as const){
  const c={radius:.2,rotationRadS:-10000,ionTemperatureEV:5,electronTemperatureEV:5,bins:16,closure,
   densityWidthM:.15,axisDensityM3:1e15,magneticT:-.1,magneticBoundary:'axis' as const,
   species:[{massU:40,chargeState:1,axisFraction:.4},{massU:84,chargeState:1,axisFraction:.6}]};
  const r=solveEquilibrium(c),s=ready(request('centrifuge',c,r));
  assert.ok('gaussianProfiles' in r);
  const p=(r as any).gaussianProfiles;
  for(let j=0;j<p.length;j++){
   close(s.fields.find(f=>f.id==='density-0')!.values[j]+s.fields.find(f=>f.id==='density-1')!.values[j],p[j].totalIonDensityM3);
   close(s.fields.find(f=>f.id==='electric-radial')!.values[j],p[j].electricFieldVM);
   close(s.fields.find(f=>f.id==='magnetic-axial')!.values[j],closure==='gaussian'?c.magneticT:p[j].magneticFieldT);
  }
 }
});
test('each core reduced model carries its actual output without invented particle populations',()=>{
 for(const model of ['gyro','curved','doublewell'] as const){
  const c={...DEFAULT_GEOMETRY,duration:1e-6},r=geometry(model,c),s=ready(request(model,c,r));
  assert.equal(s.impacts.length,0);assert.equal(s.counts.length,0);
  if(model==='gyro'){assert.equal(s.tracks[0].positionsM[4][0],r.curves[0].x[4]);assert.equal(s.tracks[0].positionsM[4][2],0);}
  if(model==='curved'){assert.equal(s.domain.kind,'reference');assert.equal(s.tracks.length,0);assert.match(s.unsupported[0],/scalar/);}
  if(model==='doublewell'){assert.equal(s.fields.find(f=>f.id==='effective-energy-0')!.values,r.curves[0].y);assert.ok(!s.fields.some(f=>f.id.startsWith('density')));}
 }
 const c={...DEFAULT_GEOMETRY,duration:1e-6};assert.equal(surfaceState(request('curved',c,geometry('gyro',c))).status,'invalid');
});
test('doublewell annular density integrates to actual weighted survivor inventory',()=>{
 const c={...DEFAULT_DOUBLEWELL,particlesPerSpecies:8,dt:1e-8,duration:1e-7,collisions:false},r=simulateDoublewell(c),s=ready(request('doublewell-dynamics',c,r));
 const weight=c.densityM3*Math.PI*c.sourceRadius**2*c.length*c.pulseLengthFraction/(2*c.particlesPerSpecies);
 for(let i=0;i<2;i++){
  const f=s.fields.find(f=>f.id===`density-${i}`)!;
  const inventory=f.values.reduce((sum,n,j)=>sum+n*Math.PI*(f.boundsM![j+1]**2-f.boundsM![j]**2)*c.length,0);
  close(inventory,r.species[i].active*weight);
  assert.equal(sampleSurfaceField(f,f.boundsM![1])!.index,1);assert.equal(sampleSurfaceField(f,c.radius)!.index,19);
 }
 const bad=structuredClone(r);bad.curves.find(p=>p.yLabel==='Final axially averaged active density (m⁻³)')!.y[0]*=2;
 // Ensure a populated bin is corrupted, regardless of the sampled distribution.
 const f=bad.curves.find(p=>p.yLabel==='Final axially averaged active density (m⁻³)')!;f.y[f.y.findIndex(v=>v>0)]*=2;
 assert.equal(surfaceState(request('doublewell-dynamics',c,bad)).status,'invalid');
});
test('target preserves all film/backing cell averages and film-only occupancy',()=>{
 const source={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,materialColumnM2:1e22,exposureS:.001};
 const c={...DEFAULT_COUPLED_TARGET,depthCells:4,backingCells:2,samples:10,cooldownS:0,maxStepS:.001};
 const r=simulateCoupledTarget(source,c),selected=r.final;
 const q=request('beam-target',c,r,{source,acceptedSource:source,selectedState:selected}),s=ready(q);
 assert.equal(s.domain.beamAreaM2,source.beamAreaM2);
 const film=s.fields.find(f=>f.id==='temperature-film')!,back=s.fields.find(f=>f.id==='temperature-backing')!;
 assert.deepEqual([...film.values,...back.values],selected.temperatureK);assert.deepEqual(film.domain,back.domain);
 assert.equal(film.boundsM!.at(-1),c.filmThicknessM);assert.equal(back.boundsM![0],c.filmThicknessM);
 assert.equal(sampleSurfaceField(film,c.filmThicknessM+1e-12),null);
 const occupancy=s.fields.filter(f=>f.unit==='fraction');assert.equal(occupancy.length,3);assert.ok(occupancy.every(f=>f.region==='film'&&f.values.length===4));
 assert.equal(s.scalars.find(v=>v.id==='assembly-heat')!.value,selected.assemblyHeatW);
 assert.equal(surfaceState({...q,selectedState:structuredClone(selected)}).status,'invalid');
 assert.equal(surfaceState({...q,source:{...source,beamAreaM2:.1}}).status,'invalid');
 const bad=structuredClone(r);bad.final.temperatureK.pop();assert.equal(surfaceState({...q,result:bad,selectedState:bad.final}).status,'invalid');
});
test('reference and non-spatial diagnostic modes explicitly decline surface predictions',()=>{
 const t=ready(request('diffusion',DEFAULT_TRANSPORT,transport('diffusion',DEFAULT_TRANSPORT)));
 assert.equal(t.domain.kind,'reference');assert.equal(t.fields.length,0);
 for(const model of ['future-blanket','research-replay']){
  const s=ready(request(model,{},{}));assert.equal(s.fields.length,0);assert.equal(s.tracks.length,0);assert.match(s.unsupported[0],/Reference/);
 }
});
