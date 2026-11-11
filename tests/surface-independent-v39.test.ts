import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {JSDOM} from 'jsdom';
import {surfaceState,sampleSurfaceField,type SurfaceSnapshot,type SurfaceField} from '../src/surface-state.js';
import {buildEngineeringGeometry,solverToScene,sceneToSolver} from '../src/engineering-geometry.js';
import {simulate,DEFAULT_CONFIG} from '../src/physics.js';
import {simulateDoublewell,DEFAULT_DOUBLEWELL} from '../src/doublewell-dynamics.js';
import {solveEquilibrium} from '../src/equilibrium-model.js';
import {simulateCoupledTarget,DEFAULT_COUPLED_TARGET} from '../src/coupled-target.js';
import {DEFAULT_FUSION_BEAM} from '../src/fusion-reactor.js';
import {geometry,DEFAULT_GEOMETRY} from '../src/geometries.js';
import {createSurfaceLayer} from '../src/surface-layer.js';

const close=(actual:number,expected:number,tolerance=1e-10,scale=Math.abs(expected)||1)=>
 assert.ok(Math.abs(actual-expected)<=tolerance*scale,`${actual} != ${expected}`);
function snapshot(model:string,settings:any,result:any,extra:any={}):SurfaceSnapshot{
 const state=surfaceState({model,settings,result,acceptedModel:model,acceptedSettings:structuredClone(settings),...extra});
 assert.equal(state.status,'ready',state.status==='ready'?'':state.reason);
 return (state as {snapshot:SurfaceSnapshot}).snapshot;
}
const named=(s:SurfaceSnapshot,id:string)=>{const f=s.fields.find(f=>f.id===id);assert.ok(f,id);return f;};
const inventory=(f:SurfaceField,L:number)=>f.values.reduce((total,n,i)=>
 total+n*Math.PI*(f.boundsM![i+1]**2-f.boundsM![i]**2)*L,0);

test('independent coordinate oracle: SI rotation preserves distance, orientation, axial planes and inverse',()=>{
 const L=2.8,p:[number,number,number]=[.12,-.23,1.7],q=solverToScene(p,L);
 q.forEach((v:number,i:number)=>close(v,[.3,-.23,-.12][i]));
 sceneToSolver(q,L).forEach((v:number,i:number)=>close(v,p[i]));
 const origin=new THREE.Vector3(...solverToScene([0,0,0],L));
 const basis=[[1,0,0],[0,1,0],[0,0,1]].map(p=>new THREE.Vector3(...solverToScene(p,L)).sub(origin));
 close(basis[0].clone().cross(basis[1]).dot(basis[2]),1);
 close(new THREE.Vector3(...q).distanceTo(origin),Math.hypot(...p));
 close(solverToScene([0,0,L],L)[0]-solverToScene([0,0,0],L)[0],L);
});

test('real orbit events retain exact positions and incident denominators without making a density or heat map',()=>{
 const c={...DEFAULT_CONFIG,radius:.08,length:.04,sourceRadius:.01,particlesPerSpecies:8,dt:2e-8,duration:2e-5,voltage:20};
 const r=simulate(c),s=snapshot('rotating',c,r);
 assert.ok(s.impacts.length>0);
 for(const [i,p]of r.species.entries()){
  const events=s.impacts.filter(e=>e.speciesIndex===i);
  assert.equal(events.length,p.wall+p.end+p.source);
  for(const [j,e]of events.entries()){
   assert.deepEqual(e.positionM,p.impacts[j].position);assert.equal(e.injected,p.injected);
   const [x,y,z]=e.positionM!;
   if(e.destination==='wall')close(Math.hypot(x,y),c.radius,1e-8);
   else close(z,e.destination==='end'?c.length:0,1e-8,c.length);
  }
  assert.equal(p.wall+p.end+p.source+p.remaining,p.injected);
 }
 const potential=named(s,'potential'),electric=named(s,'electric-radial');
 potential.positionsM.forEach((r,i)=>{
  close(potential.values[i],c.voltage*(1-r*r/c.radius**2),1e-10,c.voltage);
  close(electric.values[i],2*c.voltage*r/c.radius**2,1e-10,2*c.voltage/c.radius);
 });
 assert.ok(!s.fields.some(f=>/density|heat|temperature|coil/i.test(f.id)));
 const invalid=structuredClone(r);invalid.species[0].impacts.push({...invalid.species[0].impacts[0],destination:'invented'} as any);
 assert.equal(surfaceState({model:'rotating',settings:c,acceptedModel:'rotating',acceptedSettings:c,result:invalid}).status,'invalid');
});

test('real double-well annular densities integrate to surviving physical inventory for pulse and equilibrium support',()=>{
 for(const equilibrium of [false,true]){
  const c={...DEFAULT_DOUBLEWELL,particlesPerSpecies:8,collisions:false,duration:2e-8,dt:1e-8,
   boundary:equilibrium?'closed' as const:'open' as const,initialState:equilibrium?'equilibrium' as const:'pulse' as const,
   rotationMode:'common' as const,rotationRadS:0,beamEV:equilibrium?0:5};
  const r=simulateDoublewell(c),s=snapshot('doublewell-dynamics',c,r);
  const support=Math.PI*(equilibrium?c.radius:c.sourceRadius)**2*c.length*(equilibrium?1:c.pulseLengthFraction);
  const weight=c.densityM3*support/(2*c.particlesPerSpecies);
  r.species.forEach((p,i)=>{
   const f=named(s,`density-${i}`);assert.equal(f.measure,'cell-average');assert.equal(f.unit,'m⁻³');
   close(inventory(f,c.length),p.active*weight,3e-14);
   assert.equal(f.boundsM![0],0);close(f.boundsM!.at(-1)!,c.radius);
  });
  close(s.fields.filter(f=>f.id.startsWith('density-')).reduce((n,f)=>n+inventory(f,c.length),0),r.spatialCollision.final.representedInventory,3e-14);
  assert.ok(s.impacts.every(e=>e.scope==='radial-event-only'&&!e.positionM));
  if(equilibrium){
   const dom=new JSDOM('<main></main>'),layer=createSurfaceLayer(dom.window.document.querySelector('main')!);
   layer.update({status:'ready',snapshot:s},c);
   const body=layer.group.getObjectByName('Source body')!;
   close(body.userData.sourceOpeningRadiusM,c.radius*.12);
   layer.dispose();
  }
 }
});

test('negative total Hamiltonian is a valid double-well exit, and cannot be called deposited kinetic heat',()=>{
 const c={...DEFAULT_DOUBLEWELL,length:.0001,voltage:1000,quadraticShape:2,sourceRadius:.18,
  particlesPerSpecies:8,collisions:false,ionTemperatureEV:.01,beamEV:20,dt:1e-9,duration:1e-7};
 const r=simulateDoublewell(c);assert.ok(r.species.some(p=>p.impacts.some(e=>e.energyJ<0)));
 const s=snapshot('doublewell-dynamics',c,r);
 assert.ok(s.impacts.some(e=>e.hamiltonianJ!<0));assert.ok(s.impacts.every(e=>e.kineticEV===undefined));
});

test('zero-rotation equilibrium has analytic uniform fractions; only the Gaussian closure supplies absolute density',()=>{
 const c={radius:.2,rotationRadS:0,ionTemperatureEV:5,electronTemperatureEV:7,bins:8,
  species:[{massU:40,chargeState:1,axisFraction:.3},{massU:84,chargeState:1,axisFraction:.7}]};
 const relative=snapshot('centrifuge',c,solveEquilibrium(c));
 for(const [i,f]of [.3,.7].entries()){
  const density=named(relative,`density-${i}`);assert.equal(density.unit,'n / n_axis');
  density.values.forEach(v=>close(v,f));named(relative,`fraction-${i}`).values.forEach(v=>close(v,f));
 }
 assert.ok(!relative.fields.some(f=>['potential','electric-radial','magnetic-axial','current-azimuthal'].includes(f.id)));
 const g={...c,closure:'gaussian' as const,magneticT:.2,densityWidthM:.12,axisDensityM3:2e18};
 const absolute=snapshot('centrifuge',g,solveEquilibrium(g));
 const a=named(absolute,'density-0'),b=named(absolute,'density-1');assert.equal(a.unit,'m⁻³');
 a.positionsM.forEach((r,i)=>close(a.values[i]+b.values[i],g.axisDensityM3*Math.exp(-((r/g.densityWidthM)**2)),3e-14));
 assert.equal(relative.impacts.length,0);assert.equal(absolute.counts.length,0);
});

test('actual target samples preserve film/backing contact, unequal thermal cell measures and film-only occupancies',()=>{
 const source={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,beamCurrentA:0,beamAreaM2:.001,
  materialColumnM2:1e22,targetColumnM2:3e21,exposureS:.1};
 const c={...DEFAULT_COUPLED_TARGET,depthCells:2,backingCells:3,samples:10,cooldownS:0,maxStepS:.02,initialK:400};
 const r=simulateCoupledTarget(source,c),selected=r.final;
 const extra={source,acceptedSource:structuredClone(source),selectedState:selected};
 const s=snapshot('marathon',c,r,extra),film=named(s,'temperature-film'),back=named(s,'temperature-backing');
 assert.deepEqual(film.values,selected.temperatureK.slice(0,2));assert.deepEqual(back.values,selected.temperatureK.slice(2));
 assert.equal(film.boundsM!.at(-1),c.filmThicknessM);assert.equal(back.boundsM![0],c.filmThicknessM);
 close(back.boundsM!.at(-1)!,c.filmThicknessM+c.backingThicknessM);
 assert.ok(Math.abs(selected.temperatureK[0]-selected.temperatureK.at(-1)!)>0);
 for(const f of s.fields.filter(f=>f.unit==='fraction'))assert.equal(f.region,'film');
 assert.equal(s.scalars.find(v=>v.id==='neutron-rate')!.value,0);
 assert.equal(surfaceState({model:'marathon',settings:c,acceptedModel:'marathon',acceptedSettings:c,result:r,
  ...extra,selectedState:structuredClone(selected)}).status,'invalid');
 assert.equal(surfaceState({model:'marathon',settings:c,acceptedModel:'marathon',acceptedSettings:c,result:r,
  ...extra,source:{...source,beamAreaM2:.002}}).status,'invalid');
});

test('sampling exposes raw cell averages without extrapolation, blended interfaces or invented axis values',()=>{
 const f:SurfaceField={id:'test',label:'test',unit:'K',coordinate:'depth',measure:'cell-average',region:'film',
  positionsM:[.1,.6],boundsM:[0,.2,1],values:[300,500],domain:[300,500],scope:'independent oracle'};
 assert.equal(sampleSurfaceField(f,-Number.EPSILON),null);assert.equal(sampleSurfaceField(f,1+Number.EPSILON),null);
 assert.equal(sampleSurfaceField(f,.199999)!.value,300);assert.equal(sampleSurfaceField(f,.2)!.value,500);
 assert.equal(sampleSurfaceField(f,1)!.value,500);
 const p={...f,measure:'point' as const,positionsM:[.1,.5],values:[1,9],boundsM:undefined};
 assert.equal(sampleSurfaceField(p,0),null);assert.equal(sampleSurfaceField(p,.3)!.value,1);
 assert.equal(sampleSurfaceField(p,NaN),null);
});

test('gyro loci stay in their actual transverse plane; reduced landscapes do not become densities',()=>{
 const c={...DEFAULT_GEOMETRY};
 const gyro=snapshot('gyro',c,geometry('gyro',c));
 assert.equal(gyro.fields.length,0);assert.equal(gyro.impacts.length,0);
 for(const track of gyro.tracks){assert.ok(track.positionsM.every(p=>p[2]===0));assert.deepEqual(track.positionsM[0],[0,0,0]);}
 const landscape=snapshot('doublewell',{...c,canonicalMomentum:.1},geometry('doublewell',{...c,canonicalMomentum:.1}));
 const energy=named(landscape,'effective-energy-0');assert.ok(energy.positionsM[0]>0);
 assert.equal(sampleSurfaceField(energy,0),null);assert.ok(!landscape.fields.some(f=>f.id.startsWith('density')));
});

test('native numerical surfaces use SI dimensions and true film contact while construction remains explicitly illustrative',()=>{
 for(const [a,L]of [[.05,.1],[.48,2.8],[1,10]]){
  const model=buildEngineeringGeometry({mode:'rotating',radiusM:a,lengthM:L,sourceRadiusM:a*.8});
  const wall=model.surfaces.get('wall')!;wall.updateWorldMatrix(true,true);
  const positions=wall.geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
   const p=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(wall.matrixWorld);
   close(Math.hypot(p.x,p.y),a,1e-7);assert.ok(p.z>=-L*1e-7&&p.z<=L*(1+1e-7));
  }
  for(const [id,z]of [['source',0],['end',L]] as const){
   const surface=model.surfaces.get(id)!;surface.updateWorldMatrix(true,true);
   const b=new THREE.Box3().setFromObject(surface);close(b.min.z,z,1e-12,L);close(b.max.z,z,1e-12,L);
   assert.equal(surface.visible,false);assert.equal(surface.userData.quantitativeOnly,true);
  }
  const inlet=model.group.getObjectByName('Source body') as THREE.Mesh;
  const bore=inlet.geometry.getAttribute('position');
  close(Math.hypot(bore.getX(0),bore.getY(0)),a*.8,1e-7);
  model.dispose();
 }
 for(const film of [5e-9,1e-6,.0001]){
  const backing=.001,model=buildEngineeringGeometry({mode:'beam-target',beamAreaM2:.001,filmThicknessM:film,backingThicknessM:backing,lengthM:.5});
  const nativeFilm=model.group.getObjectByName('LiT film')!,nativeBack=model.group.getObjectByName('Target backing')!;
  const fb=new THREE.Box3().setFromObject(nativeFilm),bb=new THREE.Box3().setFromObject(nativeBack);
  close(fb.min.z,0,1e-7,film);close(fb.max.z,film,1e-7,film);close(bb.min.z,film,1e-7,backing);
  close(bb.max.z,film+backing,1e-7,backing);
  assert.equal(model.domain.layerScale,1);
  model.group.traverse((node:any)=>{if(node.isMesh)assert.ok(node.userData.geometryBasis&&node.userData.materialBasis);});
  model.dispose();
 }
 for(const mode of ['centrifuge','doublewell','gyro']){
  const model=buildEngineeringGeometry({mode,radiusM:.2,lengthM:.6});
  assert.equal(model.domain.absorbingBoundaries,false,mode);assert.equal(model.surfaces.has('end'),false,mode);model.dispose();
 }
 assert.throws(()=>buildEngineeringGeometry({mode:'curved',radiusM:.05,lengthM:10,curvatureRadiusM:.2}),RangeError);
});

test('full public beam-area range keeps acceleration upstream and the enclosed beam tube positively oriented',()=>{
 for(const area of [1e-5,.01,.1]){
  const model=buildEngineeringGeometry({mode:'beam-target',beamAreaM2:area,filmThicknessM:1e-6,backingThicknessM:.001,lengthM:.45});
  model.group.traverse((node:any)=>{
   if(!node.isMesh||!['rf-source','accelerator'].includes(node.userData.componentId))return;
   const bounds=new THREE.Box3().setFromObject(node);
   assert.ok(bounds.max.z<0,`${area} m²: ${node.name} must precede target face, got z=${bounds.max.z}`);
  });
  const tube=model.group.getObjectByName('Evacuated beam tube') as THREE.Mesh;
  const positions=tube.geometry.getAttribute('position'),indices=tube.geometry.getIndex()!;let volume6=0;
  for(let i=0;i<indices.count;i+=3){
   const points=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(positions,indices.getX(i+j)));
   volume6+=points[0].dot(points[1].cross(points[2]));
  }
  assert.ok(volume6>0,`positive oriented volume is required at ${area} m²`);model.dispose();
 }
});

test('actual surface layer recovers after unsupported geometry and withholds stale quantitative controls while pending',()=>{
 const dom=new JSDOM('<main></main>'),frame=dom.window.document.querySelector('main')!;
 const layer=createSurfaceLayer(frame);
 const c={...DEFAULT_CONFIG,particlesPerSpecies:8,dt:1e-8,duration:1e-8};
 const packet=surfaceState({model:'rotating',settings:c,result:simulate(c),acceptedModel:'rotating',acceptedSettings:c});
 layer.update(packet,c);assert.ok(layer.group.getObjectByName('engineering-rotating'));
 const curved={...DEFAULT_GEOMETRY,length:10,curvatureRadius:.2};
 const invalidGeometry=surfaceState({model:'curved',settings:curved,result:geometry('curved',curved),acceptedModel:'curved',acceptedSettings:curved});
 layer.update(invalidGeometry,curved);assert.match(layer.panel.textContent!,/outside display domain/);
 layer.update(packet,c);assert.ok(layer.group.getObjectByName('engineering-rotating'),'same accepted geometry must rebuild after failed construction');
 layer.update({status:'pending',reason:'independent pending witness'},c);
 assert.equal(layer.group.children.length,0);
 for(const select of layer.panel.querySelectorAll('select') as NodeListOf<HTMLSelectElement>)
  assert.ok(select.hidden||select.disabled||select.closest('[hidden]'),'pending sample controls must not expose prior values');
 layer.dispose();assert.equal(frame.children.length,0);
});
