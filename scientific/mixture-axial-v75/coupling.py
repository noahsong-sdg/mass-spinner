"""Conservative compressible mixture around the sealed v74 FiPy/current solve.

Research only. Natural-Ar transport approximates isotope transport; electrical
conductivity is prescribed. Meridional viscous stress and Soret are omitted.
"""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import numpy as np
from flow import Flow, KB
import diffusion
import magnetic

HERE = Path(__file__).resolve().parent


def load(name, path):
    spec = spec_from_file_location(name, path)
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


v74 = HERE.parent/'coupled-axial-v74'
thermal74 = load('v75_sealed_thermal74', v74/'thermal.py')
coupled74 = load('v75_sealed_coupled74', v74/'coupled.py')
Bridge = load('v75_sealed_bridge74', v74/'bridge.py').Bridge


class MixtureThermal(thermal74.Thermal):
    """Fixed inventories during each source step, refreshed after transport."""
    def set_inventory(self, flow, q):
        p = flow.primitive(q)
        self.rho = p['densityKgM3'].ravel().copy()
        self.mass[self.gas_indices] = q[0].ravel()
        self.gas_cv = (1.5*KB*(q[5]/flow.masses[0]+(q[0]-q[5])/flow.masses[1])).ravel()
        if np.any(self.gas_cv <= 0) or not np.all(np.isfinite(self.gas_cv)):
            raise ValueError('Mixture heat capacity must be finite and positive')

    def energy(self, temperature, props):
        result = super().energy(temperature, props)
        result[self.gas_indices] = self.gas_cv*self.temperatures(temperature)[self.gas_indices]
        return result

    def capacity(self, props):
        result = super().capacity(props)
        result[self.gas_indices] = self.gas_cv
        return result


class Coupled:
    def __init__(self, flow, wall, electrical, initial_q, contact_h=100., cooling_h=100.,
                 bath_k=350., walls=None, thermal_rtol=1e-9, linear_rtol=2e-11):
        if electrical['radialEdgesM'] != flow.r.tolist() or electrical['axialEdgesM'] != flow.z.tolist():
            raise ValueError('Transport/current geometry must match exactly')
        self.flow, self.walls, self.linear_rtol = flow, dict(walls or dict(outer=0., lower=0., upper=0.)), linear_rtol
        initial = self.checked_primitive(initial_q)
        self.sigma = np.asarray(electrical['sigmaPerpSM']).reshape(flow.nz, flow.nr).copy()
        self.magnetic_t = electrical['magneticT']
        self.bridge = Bridge(electrical)
        try:
            self.thermal = MixtureThermal(flow.r, flow.z, wall,
                initial['densityKgM3'].ravel(), self.bridge,
                contact_h=contact_h, cooling_h=cooling_h, bath_k=bath_k, nonlinear_rtol=thermal_rtol)
            self.thermal.set_inventory(flow, initial_q)
            self.stepper = coupled74.Stepper(self.thermal, self.bridge, self.walls)
        except Exception:
            self.bridge.close()
            raise

    def checked_primitive(self, q):
        """Admit physical composite endpoints, not nonlinear source trials."""
        state = self.flow.primitive(q)
        temperature = state['temperatureK']
        if np.any(temperature < 300) or np.any(temperature > 418):
            raise ValueError('Coupled mixture gas requires 300--418 K')
        return state

    def temperature(self, q, solid):
        t = np.empty(self.thermal.count)
        t[self.thermal.gas_indices] = self.flow.primitive(q)['temperatureK'].ravel()
        t[self.thermal.solid_indices] = self.thermal.field(solid, len(self.thermal.solid_indices))
        return t

    def source(self, q, solid, dt):
        old = self.checked_primitive(q)
        m, f = self.thermal, self.flow
        m.set_inventory(f, q)
        # Keep both FiPy's actual transient capacity and its energy ledger fresh.
        model = self.stepper.model
        model.capacity.setValue(m.rho*np.tile(f.mean_r2, f.nz))
        model.inertia = (q[0]*f.mean_r2).ravel().copy()
        old_t = self.temperature(q, solid)
        result = self.stepper.step(old_t, old['omegaRadS'].ravel(), dt, rtol=self.linear_rtol)
        new_t = np.asarray(result['temperatureK'])
        out = q.copy()
        out[3] = (model.inertia*np.asarray(result['mechanical']['omegaRadS'])).reshape(f.nz, f.nr)
        kinetic = .5*(q[1]**2+q[2]**2)/q[0]+out[3]**2/(2*q[0]*f.mean_r2)
        out[4] = (m.gas_cv*new_t[m.gas_indices]).reshape(f.nz, f.nr)+kinetic
        self.checked_primitive(out)
        result.pop('payload')
        return out, new_t[m.solid_indices].copy(), result

    def step(self, q, solid, dt, diffusion_scale=1., audit=None):
        """Lie split; dt refinement includes splitting and source BE errors."""
        self.checked_primitive(q)
        before = q.copy()
        transported, hydro = self.flow.advance_with_receipt(q, dt)
        self.checked_primitive(transported)
        if audit:
            audit('hydro', before, transported, dt)
        diffused, diff = diffusion.advance_with_receipt(self.flow, transported, dt, diffusion_scale)
        self.checked_primitive(diffused)
        if audit:
            audit('diffusion', transported, diffused, dt)
        braked, motional = magnetic.advance(self.flow, diffused, dt, self.sigma, self.magnetic_t)
        self.checked_primitive(braked)
        if audit:
            audit('magnetic', diffused, braked, dt, motional)
        out, wall, source = self.source(braked, solid, dt)
        self.checked_primitive(out)
        if audit:
            audit('source', braked, out, dt, solid, wall, source)
        return out, wall, dict(hydro=hydro, diffusion=diff, magnetic=motional, source=source)

    def close(self):
        self.bridge.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
