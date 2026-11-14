"""Research-only source quadrature matching V103's limited radial profiles."""
from functools import lru_cache
from pathlib import Path
import sys

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'mixture-axial-v75'))
from flow import Flow


@lru_cache(maxsize=7)
def rule(order):
    return np.polynomial.legendre.leggauss(order)


class SourceFlow(Flow):
    """Keep V103 fluxes and integrate departures in its radial body source."""

    def _radial_source_correction(self, p):
        left, right = self._face_states(p, 2)
        lower, upper = right[:, :, :-1], left[:, :, 1:]
        coefficient, low, high = self._radial_equilibrium(p)
        width = np.diff(self.r)
        middle = (self.r[:-1]+self.r[1:])/2
        rho, pressure, omega = (p[k] for k in
            ('densityKgM3', 'pressurePa', 'omegaRadS'))
        density_slope = ((upper[0]-rho*high)-(lower[0]-rho*low))/width
        pressure_slope = ((upper[1]-pressure*high)-(lower[1]-pressure*low))/width
        omega_slope = (upper[4]-lower[4])/width
        pressure_integral = -pressure_slope*width**3/(12*middle)
        if not np.any(omega_slope):
            # With constant reconstructed Omega the reference cancels, leaving
            # only the exact polynomial density-departure integral.
            integral = density_slope*omega**2*(middle*width**3/12
                -width**5/(144*middle))
        else:
            def quadrature(order):
                nodes, weights = rule(order)
                radius = middle[:, None]+width[:, None]*nodes/2
                offset = radius-self.mean_r[:, None]
                density_eq = (rho*high)[..., None]*np.exp(coefficient[..., None]
                    *(radius**2-self.r[1:, None]**2))
                density_delta = density_slope[..., None]*offset
                omega_delta = omega_slope[..., None]*offset
                linear = 2*omega[..., None]*omega_delta
                quadratic = omega_delta**2
                density_term = density_delta*(omega[..., None]+omega_delta)**2
                values = radius**2*(density_eq*(linear+quadratic)+density_term)
                absolute = radius**2*(density_eq*(abs(linear)+quadratic)
                                      +abs(density_term))
                if not np.isfinite(values).all() or not np.isfinite(absolute).all():
                    raise ArithmeticError('Unrepresentable radial source integrand')
                return (np.sum(values*weights, axis=-1)*width/2,
                        np.sum(absolute*weights, axis=-1)*width/2)

            integral, scale = quadrature(8)
            for order in (16, 32, 64, 128, 256, 512):
                refined, refined_scale = quadrature(order)
                resolved = np.all(abs(refined-integral) <=
                    256*np.finfo(float).eps*np.maximum(scale, refined_scale))
                integral, scale = refined, refined_scale
                if resolved:
                    break
            else:
                raise ArithmeticError('Radial source quadrature is unresolved at order 512')
        correction = 2*np.pi*np.diff(self.z)[:, None]*(pressure_integral+integral)
        if not np.isfinite(correction).all():
            raise ArithmeticError('Unrepresentable radial source correction')
        return correction

    def rate(self, q):
        out = super().rate(q)
        out[1] += self._radial_source_correction(self.primitive(q))
        if not np.isfinite(out).all():
            raise ArithmeticError('Nonfinite source-corrected flow rate')
        return out
