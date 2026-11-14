"""Candidate radial pressure parabola; not a qualified third-order flow solver."""
from pathlib import Path
import sys

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'mixture-axial-v75'))
from flow import Flow


class PressureFlow(Flow):
    """V103 density/velocities with a monotone cylindrical pressure departure."""

    def _pressure_faces(self, p):
        coefficient, low, high = self._radial_equilibrium(p)
        pressure = p['pressurePa']
        width = np.diff(self.r)
        middle = (self.r[:-1]+self.r[1:])/2
        center = middle+width**2/(12*middle)
        variance = width**2/12-width**4/(144*middle**2)
        xl, xr = self.r[:-1]-center, self.r[1:]-center
        el, er = xl*xl-variance, xr*xr-variance
        left, right = np.zeros_like(pressure), np.zeros_like(pressure)
        if self.nr > 2:
            # Owner-local equilibrium averages over the two neighboring cells.
            a, peak = coefficient[:, 1:-1], pressure[:, 1:-1]*high[:, 1:-1]
            span = np.diff(self.r**2)
            with np.errstate(over='ignore', invalid='ignore'):
                previous = peak*np.exp(a*(self.r[1:-2]**2-self.r[2:-1]**2))*self._exponential_average(a*span[:-2])
                following = peak*np.exp(a*(self.r[3:]**2-self.r[2:-1]**2))*self._exponential_average(a*span[2:])
            dl, dr = pressure[:, :-2]-previous, pressure[:, 2:]-following
            if not np.all(np.isfinite(dl)) or not np.all(np.isfinite(dr)):
                raise ValueError('Unrepresentable neighboring pressure equilibrium')
            dxl, dxr = center[:-2]-center[1:-1], center[2:]-center[1:-1]
            dvl = dxl*dxl+variance[:-2]-variance[1:-1]
            dvr = dxr*dxr+variance[2:]-variance[1:-1]
            determinant = dxl*dvr-dxr*dvl
            slope = (dl*dvr-dr*dvl)/determinant
            curve = (dxl*dr-dxr*dl)/determinant
            left[:, 1:-1] = slope*xl[1:-1]+curve*el[1:-1]
            right[:, 1:-1] = slope*xr[1:-1]+curve*er[1:-1]
            # Mignone (2014), eqs.45-48, applied to zero-average departures.
            left[:, 1:-1] = np.clip(left[:, 1:-1], np.minimum(0., dl), np.maximum(0., dl))
            right[:, 1:-1] = np.clip(right[:, 1:-1], np.minimum(0., dr), np.maximum(0., dr))
        # Boundary departures remain zero: V103's reflecting-wall stencil.
        same_side = ((left >= 0) == (right >= 0)) | (left == 0) | (right == 0)
        left, right = np.where(same_side, 0., left), np.where(same_side, 0., right)
        hminus, hplus = 3-width/(2*middle), 3+width/(2*middle)
        cap_left, cap_right = (hplus+1)/(hminus-1), (hminus+1)/(hplus-1)
        old_left, old_right = left, right
        left = np.where(abs(old_left) >= cap_left*abs(old_right), -cap_left*old_right, old_left)
        right = np.where(abs(old_right) >= cap_right*abs(old_left), -cap_right*old_left, old_right)
        determinant = xl*er-xr*el
        slope = (left*er-right*el)/determinant
        curve = (xl*right-xr*left)/determinant
        # Scale the zero-average polynomial using a bound valid at EVERY r.
        vertex = np.zeros_like(slope)
        np.divide(-slope, 2*curve, out=vertex, where=curve != 0)
        vertex = np.clip(vertex, xl, xr)
        minimum = np.minimum(np.minimum(slope*xl+curve*el, slope*xr+curve*er),
                             slope*vertex+curve*(vertex*vertex-variance))
        theta = np.ones_like(pressure)
        np.divide((1-64*np.finfo(float).eps)*pressure*low, -minimum,
                  out=theta, where=minimum < 0)
        theta = np.minimum(1., theta)
        slope, curve = slope*theta, curve*theta
        lower = pressure*low+slope*xl+curve*el
        upper = pressure*high+slope*xr+curve*er
        if (not np.all(np.isfinite(lower)) or not np.all(np.isfinite(upper))
                or np.any(lower <= 0) or np.any(upper <= 0)):
            raise ValueError('Pressure parabola left the positive representable domain')
        return lower, upper, slope, curve

    def _face_states(self, p, axis):
        left, right = super()._face_states(p, axis)
        if axis == 2:
            lower, upper, _, _ = self._pressure_faces(p)
            left[1] = np.concatenate((lower[:, :1], upper), axis=1)
            right[1] = np.concatenate((lower, upper[:, -1:]), axis=1)
        return left, right

    def rate(self, q):
        out = super().rate(q)
        _, _, slope, curve = self._pressure_faces(self.primitive(q))
        width, middle = np.diff(self.r), (self.r[:-1]+self.r[1:])/2
        # Exact unweighted integral of the final zero-cylindrical-mean δp.
        integral = -slope*width**3/(12*middle)+curve*width**5/(72*middle**2)
        out[1] += 2*np.pi*np.diff(self.z)[:, None]*integral
        if not np.all(np.isfinite(out)):
            raise ArithmeticError('Nonfinite candidate pressure-reconstruction rate')
        return out
