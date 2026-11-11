import test from 'node:test';
import assert from 'node:assert/strict';
import {geometry,DEFAULT_GEOMETRY as defaults} from '../src/geometries.js';
import {AMU,E_CHARGE} from '../src/physics.js';
const metric=(mode:Parameters<typeof geometry>[0],label:string,c=defaults)=>geometry(mode,c).metrics.find(m=>m.label===label)!.value;
const close=(a:number,b:number,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);

test('exact gyro trajectories have expected radius and mass/charge scaling',()=>{
  const c={...defaults,massA:40,massB:160,chargeA:1,chargeB:2};
  const result=geometry('gyro',c),[a,b]=result.curves;
  close(metric('gyro','A reference gyroradius',c),metric('gyro','B reference gyroradius',c));
  const rho=metric('gyro','A reference gyroradius',c);
  for(const curve of [a,b])curve.x.forEach((x,i)=>close(x*x+(curve.y[i]+rho)**2,rho*rho));
});

test('toroidal drift separation at fixed bend angle is independent of curvature radius and scales as sqrt(m)',()=>{
  const a=geometry('curved',{...defaults,length:Math.PI*2,curvatureRadius:2});
  const b=geometry('curved',{...defaults,length:Math.PI*4,curvatureRadius:4});
  a.curves.forEach((curve,i)=>close(curve.y.at(-1)!,b.curves[i].y.at(-1)!));
  close(a.curves[1].y.at(-1)!/a.curves[0].y.at(-1)!,Math.sqrt(defaults.massB/defaults.massA));
  const m=defaults.massA*AMU,q=defaults.chargeA*E_CHARGE;
  const vpar=Math.sqrt(2*E_CHARGE*defaults.beamEV/m),vperp=Math.sqrt(2*E_CHARGE*defaults.temperatureEV/m);
  close(a.curves[0].y.at(-1)!,Math.PI*m*(vpar*vpar+vperp*vperp/2)/(q*defaults.magneticT*vpar));
});

test('quartic radial Hamiltonian has independent cold threshold and analytic off-axis minimum',()=>{
  const critical=E_CHARGE*defaults.magneticT**2*defaults.radius**2/(8*defaults.massA*AMU);
  assert.equal(metric('doublewell','A minimum radius',{...defaults,voltage:critical*.99}),0);
  const c={...defaults,voltage:critical*2};
  close(metric('doublewell','A minimum radius',c),defaults.radius/2);
  const noElectric=geometry('doublewell',{...defaults,voltage:0});
  noElectric.curves.forEach(curve=>assert.ok(curve.y.every(y=>y>=0)));
});

test('unrotated magnetic mirror has exact loss-cone angle and no mass selectivity at fixed energy',()=>{
  const lossCone=Math.asin(1/Math.sqrt(defaults.mirrorRatio))*180/Math.PI;
  const c={...defaults,rotationRadS:0,pitchDeg:lossCone};
  close(metric('mirror','A margin at selected pitch',c),0);
  close(metric('mirror','B margin at selected pitch',c),0);
  const result=geometry('mirror',c);assert.deepEqual(result.curves[0].y,result.curves[1].y);
});

test('rotation shifts mirror escape boundary toward heavier-ion loss and creates a mass-scaled inward barrier',()=>{
  const result=geometry('mirror',defaults);
  assert.ok(result.curves[1].y.every((value,i)=>value>result.curves[0].y[i]));
  close(metric('mirror','B inward centrifugal barrier')/metric('mirror','A inward centrifugal barrier'),defaults.massB/defaults.massA);
  assert.equal(metric('mirror','A inward centrifugal barrier',{...defaults,endRadiusRatio:1}),0);
});

test('ideal magnetic-core and azimuthal orbit stepping preserves kinetic energy without electric field',()=>{
  for(const mode of ['poms','azimuthal'] as const){
    const result=geometry(mode,{...defaults,voltage:0,beamEV:1000,duration:1e-5});
    for(const label of ['A','B'])assert.ok(result.metrics.find(m=>m.label===`${label} numerical energy residual`)!.value<1e-10);
    result.curves.forEach(curve=>assert.ok(curve.x.every(Number.isFinite)&&curve.y.every(Number.isFinite)));
  }
});

test('equal mass/charge species give identical diagnostics and orbits in every geometry',()=>{
  const c={...defaults,massB:defaults.massA,chargeB:defaults.chargeA,duration:1e-5};
  for(const mode of ['gyro','curved','doublewell','mirror','azimuthal','poms'] as const){
    const result=geometry(mode,c);
    assert.deepEqual(result.curves[0].x,result.curves[1].x);
    assert.deepEqual(result.curves[0].y,result.curves[1].y);
  }
});

test('electrostatic work and magnetic-core/azimuthal orbit energy errors converge at second order',()=>{
  for(const mode of ['poms','azimuthal'] as const){
    const coarse=geometry(mode,{...defaults,duration:6e-5,dt:5e-9});
    const fine=geometry(mode,{...defaults,duration:6e-5,dt:2.5e-9});
    for(const label of ['A','B']){
      const key=`${label} numerical energy residual`;
      const ratio=coarse.metrics.find(m=>m.label===key)!.value/fine.metrics.find(m=>m.label===key)!.value;
      assert.ok(ratio>3.8&&ratio<4.2,`${mode} ${label}: ${ratio}`);
    }
  }
});

test('nonphysical geometry inputs and unresolved browser budgets fail explicitly',()=>{
  assert.throws(()=>geometry('gyro',{...defaults,magneticT:0}));
  assert.throws(()=>geometry('gyro',{...defaults,chargeA:1.5}));
  assert.throws(()=>geometry('mirror',{...defaults,mirrorRatio:.5}));
  assert.throws(()=>geometry('mirror',{...defaults,endRadiusRatio:.5}));
  assert.throws(()=>geometry('poms',{...defaults,temperatureEV:NaN}));
  assert.throws(()=>geometry('azimuthal',{...defaults,dt:0}));
  assert.throws(()=>geometry('azimuthal',{...defaults,duration:10}));
});
