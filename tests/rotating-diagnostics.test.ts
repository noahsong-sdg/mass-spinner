import test from 'node:test';
import assert from 'node:assert/strict';
import { AMU, E_CHARGE, DEFAULT_CONFIG, fields, step } from '../src/physics.js';
import { coldRadialModes, coldRadialGain, coldWallTime, coldOrbitDiagnostics } from '../src/rotating-diagnostics.js';

const model = { radius: .48, length: 2.8, magneticT: .1, voltage: 400 };
const relative = (actual: number, expected: number, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test('signed branches satisfy radial force balance and reverse with B', () => {
  for (const magneticT of [.1, -.1]) {
    const modes = coldRadialModes({ ...model, magneticT }, { massU: 40, chargeState: 1 });
    assert.equal(modes.stability, 'bounded');
    for (const omega of [modes.slowRotationRadS!, modes.fastRotationRadS!])
      relative(omega ** 2 + modes.cyclotronRadS * omega + modes.electricRateSquared, 0, 2e-5);
    assert.equal(Math.sign(modes.slowRotationRadS!), -Math.sign(magneticT));
  }
});

test('cutoff is marginal, with secular growth rather than a bounded generic orbit', () => {
  const massU = E_CHARGE * model.magneticT ** 2 * model.radius ** 2 / (8 * model.voltage * AMU);
  const modes = coldRadialModes(model, { massU, chargeState: 1 });
  assert.equal(modes.stability, 'marginal');
  relative(coldRadialGain(modes, 2 / modes.cyclotronRadS), Math.SQRT2);
});

test('zero E has a stationary cold orbit; zero B gives the hyperbolic electrostatic solution', () => {
  const noE = coldRadialModes({ ...model, voltage: 0 }, { massU: 40, chargeState: 1 });
  relative(coldRadialGain(noE, .01), 1);
  assert.equal(coldWallTime(noE, .04, .48), null);
  const noB = coldRadialModes({ ...model, magneticT: 0 }, { massU: 40, chargeState: 1 });
  const time = 2e-6;
  relative(coldRadialGain(noB, time), Math.cosh(Math.sqrt(noB.electricRateSquared) * time));
});

test('first wall time matches exact bounded, marginal and growing references', () => {
  for (const magneticT of [0, .1, -.1]) {
    const critical = E_CHARGE * magneticT ** 2 * model.radius ** 2 / (8 * model.voltage * AMU);
    for (const massU of [40, critical || 70, 200]) {
      const modes = coldRadialModes({ ...model, magneticT }, { massU, chargeState: 1 });
      const time = coldWallTime(modes, .2, .48);
      if (time !== null) {
        relative(.2 * coldRadialGain(modes, time), .48);
        assert.ok(.2 * coldRadialGain(modes, .999 * time) < .48);
      }
    }
  }
});

test('a bounded orbit can still strike a finite wall near the mass cutoff', () => {
  const modes = coldRadialModes(model, { massU: 68, chargeState: 1 });
  assert.equal(modes.stability, 'bounded');
  assert.ok(coldWallTime(modes, .2, .48)! > 0);
});

test('a tangent bounded orbit counts as wall contact despite floating-point roundoff', () => {
  const modes = coldRadialModes(model, { massU: 40, chargeState: 1 });
  const source = model.radius * Math.sqrt(modes.discriminantRadS2) / Math.abs(modes.cyclotronRadS);
  relative(coldWallTime(modes, source, model.radius)!, Math.PI / Math.sqrt(modes.discriminantRadS2));
});

test('exact envelopes agree with independent Boris integration for both stability branches', () => {
  for (const massU of [40, 200]) {
    const modes = coldRadialModes(model, { massU, chargeState: 1 });
    let particle = { position: [.04, 0, 0] as [number, number, number], velocity: [0, 0, 0] as [number, number, number] };
    const dt = 2e-9, count = 10000;
    for (let i = 0; i < count; i++) particle = step(particle, E_CHARGE / (massU * AMU), dt, x => fields(x, model));
    relative(Math.hypot(particle.position[0], particle.position[1]), .04 * coldRadialGain(modes, count * dt), 2e-7);
  }
});

test('reference curves terminate at wall, exit or duration and retain source-energy bookkeeping', () => {
  const result = coldOrbitDiagnostics(DEFAULT_CONFIG);
  assert.equal(result.species.length, 2);
  for (const species of result.species) {
    relative(species.samples[0].radiusM, DEFAULT_CONFIG.sourceRadius);
    const last = species.samples.at(-1)!;
    assert.ok(last.radiusM <= DEFAULT_CONFIG.radius * (1 + 1e-12));
    assert.ok(last.timeS <= species.transitTimeS && last.timeS <= DEFAULT_CONFIG.duration);
    relative(species.edgePotentialEnergyEV, 400 * (1 - (.04 / .48) ** 2));
  }
});

test('physical domain boundaries reject RF models and invalid source radii', () => {
  assert.throws(() => coldOrbitDiagnostics({ ...DEFAULT_CONFIG, mode: 'icr' }));
  assert.throws(() => coldOrbitDiagnostics({ ...DEFAULT_CONFIG, sourceRadius: 0 }));
  assert.throws(() => coldRadialModes({ ...model, voltage: -1 }, { massU: 40, chargeState: 1 }));
});
