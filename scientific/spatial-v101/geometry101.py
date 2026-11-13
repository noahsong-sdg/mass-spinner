"""Independent fixed-geometry expectation; no producer mesh helper or SciPy."""
import numpy as np


def hermite_edges(cuts, counts, refinement):
    cuts, widths = np.asarray(cuts, dtype=float), np.asarray(counts, dtype=float)
    knots = np.r_[0., np.cumsum(widths)]
    secants = np.diff(cuts)/widths
    # Fritsch-Butland weighted harmonic slopes; fixed positive secants here.
    w1, w2 = 2*widths[1:]+widths[:-1], widths[1:]+2*widths[:-1]
    slope = np.r_[secants[0], (w1+w2)/(w1/secants[:-1]+w2/secants[1:]), secants[-1]]
    parameter = np.arange(int(knots[-1])*refinement+1)/refinement
    cell = np.clip(np.searchsorted(knots, parameter, side='right')-1, 0, len(widths)-1)
    t = (parameter-knots[cell])/widths[cell]
    return ((2*t**3-3*t**2+1)*cuts[cell]+(t**3-2*t**2+t)*widths[cell]*slope[cell]
            +(-2*t**3+3*t**2)*cuts[cell+1]+(t**3-t**2)*widths[cell]*slope[cell+1])


def expected_edges(refinement):
    """Frozen source/contact cuts and cell counts for the V101 candidate."""
    if type(refinement) is not int or refinement not in (1, 2, 4):
        raise ValueError('Declared refinement is 1, 2 or 4')
    return (hermite_edges([0., .004, .05, .056, .06], [4, 8, 4, 4], refinement),
            hermite_edges([0., .06, .08, .232, .24], [4, 4, 12, 4], refinement))
