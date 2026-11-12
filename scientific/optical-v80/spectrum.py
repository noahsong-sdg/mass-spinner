"""Thin isolated-line LOS spectra; CHERAB's documented Gaussian-bin algorithm.

This executes SciPy normal-CDF integration, not CHERAB or an unmeasured
Fabry-Perot transfer function. Emissivity is photon emission per path length.
"""
import numpy as np
from scipy.special import ndtr

KB = 1.380649e-23
AR_MASS = 39.948 * 1.66053906660e-27


def velocity_grid(case, manifest):
    n = case['refinement']
    a, R = manifest['cathodeRadiusM'], manifest['radiusM']
    edges = np.r_[np.linspace(0, a, 4*n+1)[:-1], np.linspace(a, R, 28*n+1)]
    centers = np.sqrt((edges[:-1]**2+edges[1:]**2)/2)
    if not np.allclose(centers, case['prediction']['radialCentersM'], rtol=1e-12, atol=0):
        raise ValueError('Unexpected sealed velocity grid')
    return edges, np.asarray(case['prediction']['localMidplaneVelocityMS'])/centers


def components(emission_edges, emission, velocity_edges, omega, impact):
    """Exact paths on the common refinement of two constant-annulus fields."""
    e, f, r, w = [np.asarray(x, dtype=float) for x in
                   (emission_edges, emission, velocity_edges, omega)]
    if (len(e) != len(f)+1 or len(r) != len(w)+1 or e[0] != 0 or r[0] != 0
            or e[-1] != r[-1]
            or any(not np.isfinite(x).all() for x in (e, f, r, w))
            or np.any(np.diff(e) <= 0) or np.any(np.diff(r) <= 0)
            or np.any(f < 0) or not np.isfinite(impact) or abs(impact) >= r[-1]):
        raise ValueError('Need matched positive annuli, nonnegative emission and intersecting chord')
    edges = np.unique(np.r_[e, r])
    mid = (edges[:-1]+edges[1:])/2
    ei = np.searchsorted(e, mid, side='right')-1
    vi = np.searchsorted(r, mid, side='right')-1
    roots = np.sqrt(np.maximum(edges**2-impact**2, 0))
    weights = 2*np.diff(roots)*f[ei]
    positive = weights > 0
    if not np.any(positive):
        raise ValueError('No emitted photons on chord')
    return weights[positive], impact*w[vi[positive]], mid[positive]


def projected_moment(emission_edges, velocity_edges, omega, impact):
    """LOS integral of b Ω per unknown emissivity annulus, for brightness-only LP."""
    e = np.asarray(emission_edges)
    path, means, mid = components(e,np.ones(len(e)-1),velocity_edges,omega,impact)
    ei = np.searchsorted(e,mid,side='right')-1
    return np.bincount(ei,weights=path*means,minlength=len(e)-1)


def gaussian_spectrum(weights, means, temperature, bin_edges, instrument_sigma=0.):
    w, u, t, edges = [np.asarray(x, dtype=float) for x in
                      (weights, means, temperature, bin_edges)]
    t = np.broadcast_to(t, u.shape)
    if (w.shape != u.shape or w.ndim != 1 or not len(w) or len(edges) < 4
            or not all(np.isfinite(x).all() for x in (w, u, t, edges))
            or np.any(w < 0) or sum(w) <= 0 or np.any(t <= 0)
            or not np.isfinite(instrument_sigma) or instrument_sigma < 0):
        raise ValueError('Finite positive photon/temperature inputs required')
    widths = np.diff(edges)
    if np.any(widths <= 0) or not np.allclose(widths, widths[0], rtol=1e-10, atol=1e-12):
        raise ValueError('Spectral mode requires uniform increasing bins')
    sigma = np.sqrt(KB*t/AR_MASS+instrument_sigma**2)
    if widths[0] > min(sigma)/8:
        raise ValueError('Spectral bins underresolve the narrowest component')
    fractions = w/sum(w)
    masses = ndtr((edges[1:, None]-u)/sigma)-ndtr((edges[:-1, None]-u)/sigma)
    bins = masses@fractions
    centers = (edges[:-1]+edges[1:])/2
    k = int(np.argmax(bins))
    if k == 0 or k == len(bins)-1:
        raise ValueError('Spectral maximum is clipped by window')
    denominator = bins[k-1]-2*bins[k]+bins[k+1]
    correction = .5*(bins[k-1]-bins[k+1])/denominator if denominator != 0 else 0.
    mode = centers[k]+widths[0]*correction
    centroid = float(fractions@u)
    return dict(centroidMS=centroid, modeMS=float(mode), capturedFlux=float(sum(bins)),
                binCentroidMS=float(centers@bins/sum(bins)),
                varianceM2S2=float(fractions@(KB*t/AR_MASS+(u-centroid)**2)+instrument_sigma**2),
                binCentersMS=centers, photonFractions=bins)
