"""Real WarpX RZ pushing and explicit binary collisions; execute inside safe-dev."""
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys

import numpy as np

AMU, Q, C = 1.66053906660e-27, 1.602176634e-19, 299792458.
MASSES = [40*AMU, 84*AMU]
R, L, RLO, RHI, DENSITY = .06, .04, .015, .035, 5e17


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def config(protocol, name):
    if protocol.get('schemaVersion') != 88 or not protocol.get('frozenBeforeCampaign'):
        raise ValueError('Refuse stale/unfrozen protocol')
    c = protocol['common'] | protocol['cases'][name]
    if c['law'] not in ('off', 'bobylev', 'nanbu') or c['subcycles'] < 1:
        raise ValueError('Explicit supported angular law and subcycling required')
    if c['dt'] <= 0 or c['particles'] < 1 or c['cells'] < 4:
        raise ValueError('Nonpositive timestep or inadequate inventory/grid')
    if not math.isclose(c['end']/c['dt'], round(c['end']/c['dt']), abs_tol=1e-8):
        raise ValueError('Horizon must align with timestep')
    if round(c['end']/c['dt']) % 10:
        raise ValueError('Ten diagnostic checkpoints must align with actual timesteps')
    return c


def deck(c):
    text = f'''max_step = {round(c['end']/c['dt'])}
geometry.dims = RZ
geometry.prob_lo = 0 0
geometry.prob_hi = {R} {L}
amr.n_cell = {c['cells']} {c['cells']}
amr.max_level = 0
amr.blocking_factor = 1
amr.max_grid_size = 64
boundary.field_lo = none periodic
boundary.field_hi = pec periodic
boundary.particle_lo = None Periodic
boundary.particle_hi = Reflecting Periodic
boundary.reflect_all_velocities = 0
algo.maxwell_solver = none
warpx.do_electrostatic = none
warpx.n_rz_azimuthal_modes = 1
warpx.const_dt = {c['dt']:.17g}
warpx.verbose = 0
warpx.use_filter = 0
warpx.random_seed = {c['seed']}
warpx.serialize_initial_conditions = 1
algo.particle_shape = 1
algo.particle_pusher = boris
particles.species_names = ionA ionB
particles.E_ext_particle_init_style = parse_E_ext_function
particles.B_ext_particle_init_style = parse_B_ext_function
particles.Ex_external_particle_function(x,y,z,t) = {c['kappa']}*x
particles.Ey_external_particle_function(x,y,z,t) = {c['kappa']}*y
particles.Ez_external_particle_function(x,y,z,t) = 0
particles.Bx_external_particle_function(x,y,z,t) = 0
particles.By_external_particle_function(x,y,z,t) = 0
particles.Bz_external_particle_function(x,y,z,t) = {c['B']}
'''
    for name, mass in zip(('ionA', 'ionB'), MASSES):
        text += f'''{name}.charge = {Q:.17g}
{name}.mass = {mass:.17g}
{name}.injection_style = none
{name}.do_not_deposit = 1
{name}.do_not_gather = 0
{name}.do_not_push = 0
{name}.initialize_self_fields = 0
'''
    if c['law'] != 'off':
        text += 'collisions.collision_names = cross selfA selfB\ncollisions.correct_energy_momentum = 0\n'
        for name, species in [('cross', 'ionA ionB'), ('selfA', 'ionA'), ('selfB', 'ionB')]:
            text += f'''{name}.type = pairwisecoulomb
{name}.species = {species}
{name}.CoulombLog = 12
{name}.cumulative_scattering_angle_model = {c['law']}
{name}.ndt_subcycle = {c['subcycles']}
'''
    return text


def initial(c, species):
    rng = np.random.default_rng(np.random.SeedSequence([c['seed'], species, 88]))
    n = c['particles']
    r = np.sqrt(rng.uniform(RLO**2, RHI**2, n))
    theta = rng.uniform(0, 2*np.pi, n)
    x, y = r*np.cos(theta), r*np.sin(theta)
    v = rng.normal(size=(n, 3))*math.sqrt(c['initialTemperatureEV'][species]*Q/MASSES[species])
    v[:, 0] += 1e4*y
    v[:, 1] -= 1e4*x
    u = v/np.sqrt(1-(v*v).sum(axis=1)/C**2)[:, None]
    return x, y, rng.uniform(0, L, n), u, DENSITY*np.pi*(RHI**2-RLO**2)*L/n


def snapshot(pc, mass, c):
    def flat(getter):
        return np.concatenate(getter(copy_to_host=True))
    ids = flat(pc.get_particle_id)
    order = np.argsort(ids)
    r, theta = flat(pc.get_particle_r)[order], flat(pc.get_particle_theta)[order]
    w = flat(pc.get_particle_weight)[order]
    u = np.column_stack([flat(getter)[order] for getter in
                         (pc.get_particle_ux, pc.get_particle_uy, pc.get_particle_uz)])
    x, y = r*np.cos(theta), r*np.sin(theta)
    gamma = np.sqrt(1+(u*u).sum(axis=1)/C**2)
    v = u/gamma[:, None]
    kinetic = mass*(u*u).sum(axis=1)/(gamma+1)
    potential = -.5*Q*c['kappa']*r*r
    angular = mass*(x*u[:, 1]-y*u[:, 0])
    canonical = angular+.5*Q*c['B']*r*r
    edges = np.linspace(0, R, 13)
    bins = np.digitize(r, edges)-1
    profile = [float(np.mean((x*v[:, 1]-y*v[:, 0])[bins == j]/r[bins == j]))
               if np.any(bins == j) else None for j in range(12)]
    return dict(count=len(w), number=float(w.sum()), mechanicalAngularKGMS2=float(w@angular),
                canonicalAngularKGMS2=float(w@canonical), energyJ=float(w@(kinetic+potential)),
                energyScaleJ=float(w@(kinetic+np.abs(potential))),
                angularScaleKGMS2=float(w@np.abs(canonical)), kineticEnergyJ=float(w@kinetic),
                radialMeanM=float(w@r/w.sum()), radialVthetaMS=profile), dict(
                    ids=ids[order], x=x, y=y, z=flat(pc.get_particle_z)[order], r=r, u=u, w=w, v=v)


def exact_xy(raw, mass, c):
    omega, a, t = Q*c['B']/mass, Q*c['kappa']/mass, c['end']
    z0, v0 = raw['x']+1j*raw['y'], raw['v'][:, 0]+1j*raw['v'][:, 1]
    if omega == 0 and a == 0:
        return z0+t*v0, v0
    root = np.lib.scimath.sqrt(4*a-omega*omega)
    lam1, lam2 = (-1j*omega+root)/2, (-1j*omega-root)/2
    one = (v0-lam2*z0)/(lam1-lam2)
    two = z0-one
    return one*np.exp(lam1*t)+two*np.exp(lam2*t), lam1*one*np.exp(lam1*t)+lam2*two*np.exp(lam2*t)


def run(name):
    protocol = json.loads(Path('protocol.json').read_text())
    c = config(protocol, name)
    out = Path('results')/name
    out.mkdir(parents=True, exist_ok=False)
    from pywarpx import geometry, libwarpx, particle_containers
    geometry.dims = 'RZ'
    (out/'warpx.inputs').write_text(deck(c))
    libwarpx.initialize(['python', str(out/'warpx.inputs')])
    pcs = [particle_containers.ParticleContainerWrapper(n) for n in ('ionA', 'ionB')]
    for s, pc in enumerate(pcs):
        x, y, z, u, w = initial(c, s)
        pc.add_particles(x=x, y=y, z=z, ux=u[:, 0], uy=u[:, 1], uz=u[:, 2], w=w)
    before = [snapshot(pc, m, c) for pc, m in zip(pcs, MASSES)]
    series = []
    for _ in range(10):
        libwarpx.warpx.evolve(round(c['end']/c['dt']/10))
        after = [snapshot(pc, m, c) for pc, m in zip(pcs, MASSES)]
        series.append([pair[0] for pair in after])
    actual = float(libwarpx.warpx.gett_new(0))
    libwarpx.finalize()
    if not math.isclose(actual, c['end'], rel_tol=1e-10):
        raise AssertionError('Checkpoint mismatch')
    if any(not np.array_equal(a[1]['ids'], b[1]['ids']) for a, b in zip(after, before)):
        raise AssertionError('Closed boundaries must preserve particle IDs')
    metrics = {}
    for quantity, scale in [('energyJ', 'energyScaleJ'), ('canonicalAngularKGMS2', 'angularScaleKGMS2'),
                            ('number', 'number')]:
        metrics[quantity+'RelativeChange'] = max(abs(sum(a[quantity]-b[0][quantity] for a, b in zip(state, before)))
            /sum(b[0][scale] for b in before) for state in series)
    delta_r2 = sum(a[1]['w']@(a[1]['r']**2-b[1]['r']**2) for a, b in zip(after, before))
    ledgers = dict(mechanicalAngularChangeKGM2PerS=sum(a[0]['mechanicalAngularKGMS2']-b[0]['mechanicalAngularKGMS2'] for a, b in zip(after, before)),
                   expectedLorentzAngularImpulseKGM2PerS=-.5*Q*c['B']*delta_r2,
                   kineticEnergyChangeJ=sum(a[0]['kineticEnergyJ']-b[0]['kineticEnergyJ'] for a, b in zip(after, before)),
                   expectedElectrostaticWorkJ=.5*Q*c['kappa']*delta_r2)
    if c['law'] == 'off':
        errors = []
        for mass, b, a in zip(MASSES, before, after):
            expected, velocity = exact_xy(b[1], mass, c)
            errors.append([float(np.sqrt(np.mean(abs(a[1]['x']+1j*a[1]['y']-expected)**2))/RHI),
                           float(np.sqrt(np.mean(abs(a[1]['v'][:, 0]+1j*a[1]['v'][:, 1]-velocity)**2))/np.sqrt(np.mean(abs(velocity)**2)))])
        metrics['orbitPositionRelative'], metrics['orbitVelocityRelative'] = np.max(errors, axis=0).tolist()
    np.savez_compressed(out/'raw.npz', **{f'{stage}-{s}-{k}': v for stage, data in [('initial', before), ('final', after)]
                                       for s, pair in enumerate(data) for k, v in pair[1].items()})
    record = dict(schemaVersion=88, case=name, config=c, protocolSHA256=digest('protocol.json'),
                  runnerSHA256=digest(__file__), deckSHA256=digest(out/'warpx.inputs'),
                  rawSHA256=digest(out/'raw.npz'),
                  initial=[p[0] for p in before], final=[p[0] for p in after], history=series,
                  historyIntervalS=c['end']/10, metrics=metrics, ledgers=ledgers,
                  exitLedger={'boundary': 'closed radial specular / axial periodic', 'expectedPhysicalExitNumber': 0,
                              'measuredInventoryLoss': sum(b[0]['number']-a[0]['number'] for a, b in zip(after, before))})
    (out/'result.json').write_text(json.dumps(record, indent=2, allow_nan=False)+'\n')


if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == 'campaign':
        protocol = json.loads(Path('protocol.json').read_text())
        Path('campaign-protocol.sha256').write_text(digest('protocol.json')+'\n')
        for name in protocol['cases']:
            with Path(name+'.log').open('x') as log:
                subprocess.run([sys.executable, __file__, name], stdout=log, stderr=subprocess.STDOUT,
                               env=os.environ | {'OMP_NUM_THREADS': '1'}, check=True)
    elif len(sys.argv) == 2:
        run(sys.argv[1])
    else:
        raise SystemExit('reference.py campaign | CASE')
