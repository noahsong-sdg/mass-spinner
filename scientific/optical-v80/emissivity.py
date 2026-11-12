"""Brightness-only conditioning using PyAbel 0.9.1's nonnegative Daun inverse.

Degree-zero basis, including its half-width axial pixel, is matched exactly by
path_matrix. No rotation, spectrum or velocity target enters this module.
"""
import numpy as np
from abel.daun import daun_transform


def optical_grid(radius, n):
    if not np.isfinite(radius) or radius <= 0 or not isinstance(n, int) or n < 2:
        raise ValueError('Positive radius and integer sample count >=2 required')
    dr = radius/(n-.5)
    edges = np.r_[0., (np.arange(n)+.5)*dr]
    edges[-1] = radius
    return np.arange(n)*dr, edges


def path_matrix(impacts, edges):
    """Full, two-sided lengths through positive-radius annuli; signed b allowed."""
    b, r = np.asarray(impacts, dtype=float), np.asarray(edges, dtype=float)
    if (b.ndim != 1 or r.ndim != 1 or len(r) < 2
            or not np.isfinite(b).all() or not np.isfinite(r).all()
            or r[0] != 0 or np.any(np.diff(r) <= 0)):
        raise ValueError('Finite impacts and ordered annular edges starting at zero required')
    roots = np.sqrt(np.maximum(r[None, :]**2-b[:, None]**2, 0.))
    return 2*np.diff(roots, axis=1)


def reconstruct(impacts, brightness, radius, n, edge_closure):
    """Reconstruct relative emissivity; arbitrary brightness scale is preserved.

    Inputs are a nonnegative radial half-profile. Both missing-axis continuation
    and outer-edge closure are declared assumptions, not recovered measurements.
    """
    b, y = np.asarray(impacts, dtype=float), np.asarray(brightness, dtype=float)
    if (b.ndim != 1 or y.shape != b.shape or len(b) < 2
            or not np.isfinite(b).all() or not np.isfinite(y).all()
            or np.any(np.diff(b) <= 0) or b[0] < 0 or b[-1] > radius
            or np.any(y < 0) or max(y) <= 0):
        raise ValueError('Ordered in-vessel impacts and finite nonnegative nonzero brightness required')
    if edge_closure not in ('linear', 'sqrt'):
        raise ValueError('Declare linear or sqrt outer-edge closure')
    centers, edges = optical_grid(radius, n)
    sampled = np.interp(centers, b, y, left=y[0])
    outer = centers > b[-1]
    if np.any(outer):
        if edge_closure == 'linear':
            sampled[outer] = y[-1]*(radius-centers[outer])/(radius-b[-1])
        else:
            sampled[outer] = y[-1]*np.sqrt((radius**2-centers[outer]**2)
                                          /(radius**2-b[-1]**2))
    dr = centers[1]-centers[0]
    emissivity = np.asarray(daun_transform(sampled[None, :], reg='nonneg',
                            degree=0, dr=dr, direction='inverse',
                            basis_dir=None, verbose=False))[0]
    if not np.isfinite(emissivity).all() or np.any(emissivity < 0):
        raise ArithmeticError('Nonnegative Abel inversion returned invalid emissivity')
    original = path_matrix(b, edges)@emissivity
    projected = path_matrix(centers, edges)@emissivity
    scale = float(max(y))
    return {'radialCentersM': centers, 'radialEdgesM': edges,
            'emissivity': emissivity, 'interpolatedBrightness': sampled,
            'originalReprojectedBrightness': original,
            'originalResidualRelative': (original-y)/scale,
            'gridResidualRelative': (projected-sampled)/scale,
            'axisConstantContinuation': bool(b[0] > 0),
            'edgeClosure': edge_closure, 'brightnessScale': scale}
