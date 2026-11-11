import test from 'node:test';
import assert from 'node:assert/strict';
import {centrifuge} from '../src/centrifuge.js';
import {DEFAULT_CONFIG,simulate} from '../src/physics.js';
import {equilibriumPresentation,rotatingPresentation} from '../src/focused-diagnostics.js';
import {geometry,DEFAULT_GEOMETRY} from '../src/geometries.js';
import {AMU,E_CHARGE} from '../src/physics.js';
import {solveEquilibrium} from '../src/equilibrium-model.js';
const c={radius:.48,rotationRadS:10000,ionTemperatureEV:5,electronTemperatureEV:5,bins:400,
 species:[{massU:40,chargeState:1,axisFraction:.5},{massU:84,chargeState:1,axisFraction:.5}]};

test('equilibrium presentation distinguishes central composition from cylindrical inventory and reacts to cut',()=>{
 const result=centrifuge(c),a=equilibriumPresentation(result,.5),b=equilibriumPresentation(result,.8);
 assert.ok(Math.abs(a.diagnostics.bulkNumberFractions[1]!-.6418458)<2e-6);
 assert.notEqual(a.diagnostics.outer.speciesInventoryFractions[1],b.diagnostics.outer.speciesInventoryFractions[1]);
 assert.ok(a.curves.some(curve=>curve.yLabel.includes('log₁₀')));
 assert.ok(a.curves.some(curve=>curve.yLabel.includes('Effective potential')));
 assert.equal(a.curves.length,9);
});

test('rotating presentation keeps exact cold reference separate from sampled warm orbits',()=>{
 const config={...DEFAULT_CONFIG,particlesPerSpecies:4,duration:1e-5};
 const p=rotatingPresentation(config,simulate(config));
 assert.ok(p.curves.some(c=>c.label==='Absorbing wall'));
 assert.ok(p.curves.some(c=>c.yLabel==='Simulated radial excursion (m)'));
 assert.notEqual(p.diagnostics.exbRotationRadS,p.diagnostics.species[0].slowRotationRadS);
});

test('Gaussian presentation exposes current, laboratory field and validity limits with fixed bulk residual',()=>{
 const result=solveEquilibrium({...c,closure:'gaussian',compositionBoundary:'bulk',bulkFractionA:.5,
  magneticT:.1,densityWidthM:.25,axisDensityM3:1e17});
 const p=equilibriumPresentation(result,.7);
 assert.equal(p.curves.length,16);
 for(const label of ['Required azimuthal current density (A/m²)','Laboratory φ (V)','Omitted electron-inertia force ratio'])
  assert.ok(p.curves.some(c=>c.yLabel===label));
 assert.match(p.metrics,/Requested bulk A 50/);assert.match(p.metrics,/algebra residual/);
 assert.ok(p.curves.every(c=>c.y.every(Number.isFinite)));
});

test('nonzero canonical momentum uses full radial Hamiltonian and has finite plotted axis exclusion',()=>{
 const c={...DEFAULT_GEOMETRY,canonicalMomentum:.12,quadraticShape:1.4};
 const plus=geometry('doublewell',c),minus=geometry('doublewell',{...c,canonicalMomentum:-.12});
 for(const [i,curve] of plus.curves.entries()){
  const mass=[c.massA,c.massB][i]*AMU,q=[c.chargeA,c.chargeB][i]*E_CHARGE,P=.12*q*c.magneticT*c.radius**2;
  assert.equal(curve.x[0],.01*c.radius);assert.ok(curve.y.every(Number.isFinite));
  curve.x.forEach((r,j)=>{
   const exact=((P-q*c.magneticT*r*r/2)**2/(2*mass*r*r)+q*c.voltage*((r/c.radius)**4-1.4*(r/c.radius)**2))/E_CHARGE;
   assert.ok(Math.abs(curve.y[j]-exact)<1e-9);
   const shift=-P*q*c.magneticT/(mass*E_CHARGE);
   assert.ok(Math.abs(curve.y[j]-minus.curves[i].y[j]-shift)<1e-8);
  });
 }
 assert.ok(!plus.metrics.some(m=>m.label.includes('minimum radius')),'Pθ=0 minimum must not leak into nonzero-P diagnostics');
 const cropped=geometry('doublewell',{...c,plotInnerFraction:.2});
 assert.equal(cropped.curves[0].x[0],.2*c.radius);
 assert.equal(cropped.curves[0].y.at(-1),plus.curves[0].y.at(-1),'View crop must not change physical energy');
 assert.throws(()=>geometry('doublewell',{...c,plotInnerFraction:1}));
});
