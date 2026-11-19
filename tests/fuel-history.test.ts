import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelTransport,sampleFuelTransport} from '../src/fuel-transport.js';
import {fuelHistoryCurve} from '../src/fuel-history.js';
import {renderPlots} from '../src/laboratory.js';

test('revealed energy and speed reconstruct conserved state between knots, including changing inertia',t=>{
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA:.06,lightFraction:.5});
 const model=simulateFuelTransport(rotor,{cells:16,steps:32});
 // Deliberately coarse retained history makes a derived-value interpolation error observable.
 model.checkpoints=[model.snapshots[0],model.snapshots.at(-1)!];
 const [a,b]=model.checkpoints,time=b.timeS*.37,sample=sampleFuelTransport(model,time);
 const li=a.ionAngularMomentumKgM2S*.63+b.ionAngularMomentumKgM2S*.37;
 const ln=a.neutralAngularMomentumKgM2S*.63+b.neutralAngularMomentumKgM2S*.37;
 const expected=.5*(li*li/model.mechanics.ii+ln*ln/sample.neutralInertiaKgM2);
 assert.ok(Math.abs(a.neutralInertiaKgM2/b.neutralInertiaKgM2-1)>1e-5);
 assert.ok(Math.abs(expected-b.energy.kineticJ*.37)>1e-8*expected);
 const curve=fuelHistoryCurve(model,model.checkpoints,'Kinetic energy','Energy (J)',s=>s.energy.kineticJ);
 assert.ok(Math.abs(curve.sampleAt!(time)!-expected)<=4*Number.EPSILON*expected);
 const speed=fuelHistoryCurve(model,model.checkpoints,'Neutrals','Speed (m/s)',s=>s.neutralRadS*model.radiusM);
 assert.ok(Math.abs(speed.sampleAt!(time)!-ln/sample.neutralInertiaKgM2*model.radiusM)<=4*Number.EPSILON*Math.abs(speed.sampleAt!(time)!));
 const dom=new JSDOM('<div id="plots"></div>'),previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 t.after(()=>{dom.window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 const host=dom.window.document.getElementById('plots')!,controller=renderPlots(host,[curve],{revealUntil:time});
 const points=()=>[...host.querySelector('path[stroke-width="2"]')!.getAttribute('d')!.matchAll(/[ML]([\d.e+-]+) ([\d.e+-]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
 const endpoint=points().at(-1)!;
 // With one legend row, 800 px plot coordinates are x=[75,750], y=[250,45].
 assert.ok(Math.abs(endpoint[1]-(250-205*expected/b.energy.kineticJ))<1e-9);
 const formatted=expected.toLocaleString(undefined,{maximumSignificantDigits:4});
 assert.ok(host.querySelector('.plot-readout')!.textContent!.includes(formatted));
 controller.setCursor(0);assert.equal(points().length,1);
 controller.setCursor(time);assert.deepEqual(points().at(-1),endpoint);
 assert.deepEqual(curve.y,[a.energy.kineticJ,b.energy.kineticJ]);
});

test('each pinned/current curve owns its canonical sampler and undefined ordinates stay undefined',()=>{
 const run=(currentA:number)=>simulateFuelTransport(simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA}),{cells:8,steps:8});
 const a=run(.02),b=run(.06),time=.037;
 const ca=fuelHistoryCurve(a,a.snapshots,'A','Energy (J)',s=>s.energy.kineticJ);
 const cb=fuelHistoryCurve(b,b.snapshots,'B','Energy (J)',s=>s.energy.kineticJ);
 assert.equal(ca.sampleAt!(time),sampleFuelTransport(a,time).energy.kineticJ);
 assert.equal(cb.sampleAt!(time),sampleFuelTransport(b,time).energy.kineticJ);
 assert.notEqual(ca.sampleAt!(time),cb.sampleAt!(time));
 const undefinedCurve=fuelHistoryCurve(a,a.snapshots,'Empty cut','Purity',()=>null);
 assert.ok(undefinedCurve.y.every(value=>value===null));assert.equal(undefinedCurve.sampleAt!(time),null);
});
