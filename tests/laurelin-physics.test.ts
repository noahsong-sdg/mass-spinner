import test from 'node:test';
import assert from 'node:assert/strict';
import {LAURELIN_DEFAULTS,ddReactivity,simulateLaurelin} from '../src/laurelin-physics.js';
const close=(actual:number,expected:number,relative=1e-11)=>assert.ok(Math.abs(actual-expected)<=relative*Math.max(Math.abs(expected),1e-30),`${actual} != ${expected}`);

test('D–D fit stays in its declared thermal window; branches differ and SI scale is correct',()=>{
 assert.equal(ddReactivity(.199,'neutron'),null);assert.equal(ddReactivity(100.001,'proton'),null);
 assert.equal(ddReactivity(NaN,'proton'),null);assert.throws(()=>ddReactivity(10,'unknown'),RangeError);
 // Rounded 10 keV Bosch–Hale values, independently evaluable with PlasmaPy.
 close(ddReactivity(10,'neutron'),6.02e-25,.005);close(ddReactivity(10,'proton'),5.78e-25,.005);
 assert.ok(ddReactivity(.2,'neutron')>0);assert.ok(ddReactivity(100,'proton')>0);
});
test('closed thermal/work ledger, no compression means no mechanical recovery',()=>{
 const r=simulateLaurelin();assert.ok(Math.abs(r.energyResidualJ)<1e-10*r.initialJ);
 close(r.initialJ+r.mergeJ+r.compressionJ,r.remainingJ+r.lossJ+r.expansionJ);
 const flat=simulateLaurelin({compression:1});assert.equal(flat.compressionJ,0);assert.equal(flat.expansionJ,0);assert.equal(flat.recoveredJ,0);
 assert.equal(r.fusionElectricityJ,null);assert.ok(r.netNonfusionJ<0);
});
test('constant-volume, zero-merge solution is the exact confinement exponential',()=>{
 const r=simulateLaurelin({compression:1,speedKmS:0});
 for(const s of r.samples){close(s.temperatureKeV,LAURELIN_DEFAULTS.temperatureKeV*Math.exp(-s.timeUs/LAURELIN_DEFAULTS.confinementUs));close(s.densityM3,LAURELIN_DEFAULTS.densityM3);}
 close(r.lossJ,r.initialJ-r.remainingJ);
});
test('compression follows monatomic adiabatic heating at fixed length and conserved D inventory',()=>{
 const a=simulateLaurelin({speedKmS:0}),b=simulateLaurelin({speedKmS:0,compression:1});
 for(let i=0;i<a.samples.length;i++){
  const s=a.samples[i],ref=b.samples[i],ratio=s.volumeM3/ref.volumeM3;
  close(s.densityM3*s.volumeM3,ref.densityM3*ref.volumeM3);
  close(s.temperatureKeV/ref.temperatureKeV,ratio**(-2/3));
  close(s.radiusM/ref.radiusM,Math.sqrt(ratio));
 }
 close(a.samples.at(-1).volumeM3,a.samples[0].volumeM3);
 close(a.samples.at(-1).temperatureKeV,b.samples.at(-1).temperatureKeV);
});
test('merge energy uses each plasmoid speed, not relative collision speed',()=>{
 const a=simulateLaurelin(),b=simulateLaurelin({speedKmS:2*LAURELIN_DEFAULTS.speedKmS});close(b.mergeJ,4*a.mergeJ);
 const count=a.samples[0].densityM3*a.samples[0].volumeM3;
 close(a.mergeJ,.5*count*3.3435837724e-27*(LAURELIN_DEFAULTS.speedKmS*1000)**2);
});
test('density, apparatus volume, efficiencies and cadence obey distinct physical scalings',()=>{
 const a=simulateLaurelin(),n=simulateLaurelin({densityM3:2e22}),v=simulateLaurelin({lengthM:2.8});
 close(n.driverJ,2*a.driverJ);close(n.neutrons,4*a.neutrons);close(v.driverJ,2*a.driverJ);close(v.neutrons,2*a.neutrons);
 const e=simulateLaurelin({driverEfficiency:.4,recoveryEfficiency:.4,frequencyHz:2});
 assert.deepEqual(e.samples,a.samples);close(e.driverJ,2*a.driverJ);close(e.recoveredJ,a.recoveredJ/2);close(e.parasiticJ,a.parasiticJ/2);
 close(a.chargedJ+a.neutronJ,(a.protons*4.03+a.neutrons*3.27)*1.602176634e-13);
});
test('out-of-window segments do not silently become zero fusion yield',()=>{
 const r=simulateLaurelin({temperatureKeV:.2,compression:1,speedKmS:0,confinementUs:50});
 assert.ok(r.unsupportedSteps>0);assert.equal(r.neutrons,null);assert.equal(r.chargedJ,null);assert.equal(r.diagnosticValid,false);
 assert.ok(r.samples.every(s=>Number.isFinite(s.temperatureKeV)&&s.temperatureKeV>0));
});
test('a fit-domain crossing after the final midpoint withholds the full-pulse yield',()=>{
 const r=simulateLaurelin({temperatureKeV:.5,compression:1,speedKmS:0,confinementUs:600,durationUs:550});
 assert.ok(.5*Math.exp(-549.45/600)>.2);assert.ok(r.samples.at(-1).temperatureKeV<.2);
 assert.ok(r.unsupportedSteps>0);assert.equal(r.neutrons,null);assert.equal(r.diagnosticValid,false);
});
test('yield quadrature converges independently of exact thermal segment evolution',()=>{
 const a=simulateLaurelin({},200),b=simulateLaurelin({},400),c=simulateLaurelin({},800);
 close(a.remainingJ,c.remainingJ);close(a.compressionJ,c.compressionJ);
 const coarse=Math.abs(a.neutrons-b.neutrons),fine=Math.abs(b.neutrons-c.neutrons);
 assert.ok(fine<coarse/3);assert.ok(fine/c.neutrons<1e-4);
});
test('invalid physical parameters and unaligned phase grids are rejected',()=>{
 for(const input of [{compression:0},{densityM3:-1},{durationUs:Infinity},{driverEfficiency:0},{recoveryEfficiency:1.01}])assert.throws(()=>simulateLaurelin(input),RangeError);
 for(const n of [99,101,5000])assert.throws(()=>simulateLaurelin({},n),RangeError);
});
