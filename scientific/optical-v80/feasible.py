"""Brightness-only optical bounds using SciPy/HiGHS; no measured-speed input.

Charnes--Cooper: y=epsilon*t, t=1/(target_path@epsilon). The target
normalization is target_path@y=1. Bounds refer to all globally nonnegative
annular profiles satisfying EVERY supplied brightness constraint. Different
target extrema need not share the same maximizing profile.
"""
import numpy as np
from scipy.optimize import linprog


def centroid_bounds(A, lower, upper, target_path, target_velocity_moment):
    A, lower, upper, path, moment = [np.asarray(x, dtype=float) for x in
        (A, lower, upper, target_path, target_velocity_moment)]
    if (A.ndim != 2 or min(A.shape) < 1 or lower.shape != (A.shape[0],)
            or upper.shape != lower.shape or path.shape != (A.shape[1],)
            or moment.shape != path.shape):
        raise ValueError('Need matched brightness matrix, bounds and target vectors')
    if not all(np.isfinite(x).all() for x in (A, lower, upper, path, moment)):
        raise ValueError('Optical constraints must be finite')
    if (np.any(A < 0) or np.any(path < 0) or not np.any(path > 0)
            or np.any(lower < 0) or np.any(upper < lower)):
        raise ValueError('Need nonnegative paths, ordered brightness and emitting target')
    if np.any(moment[path == 0] != 0):
        raise ValueError('A nonintersected annulus cannot contribute target moment')
    # Scaling brightness preserves the feasible physical profiles and avoids
    # making the numerical conditioning depend on a photometric unit choice.
    scale = float(max(np.max(upper), np.finfo(float).tiny))
    low, high = lower/scale, upper/scale
    inequalities = np.vstack((np.column_stack((A, -high)),
                              np.column_stack((-A, low))))
    equality = np.r_[path, 0.][None, :]
    certificates = []
    for sign in (1., -1.):
        objective = np.r_[sign*moment, 0.]
        solution = linprog(objective, A_ub=inequalities,
                           b_ub=np.zeros(2*len(lower)), A_eq=equality, b_eq=[1.],
                           bounds=(0., None), method='highs',
                           options={'primal_feasibility_tolerance': 1e-9,
                                    'dual_feasibility_tolerance': 1e-9})
        if not solution.success:
            return dict(status='unavailable', reason='brightness/target LP failed',
                        solverStatus=int(solution.status), message=solution.message)
        y, t = solution.x[:-1], solution.x[-1]
        if not np.isfinite(solution.x).all() or t <= 0:
            return dict(status='unavailable', reason='No finite emissivity certificate')
        epsilon = np.maximum(y, 0.)/t*scale
        predicted_brightness = A@epsilon
        target_brightness = float(path@epsilon)
        if not np.isfinite(epsilon).all() or not np.isfinite(target_brightness) or target_brightness <= 0:
            return dict(status='unavailable', reason='Nonfinite or nonemitting certificate')
        centroid = float(moment@epsilon/target_brightness)
        residuals = dict(
            brightnessRelative=float(max(np.max(lower-predicted_brightness),
                                         np.max(predicted_brightness-upper), 0.)/scale),
            normalization=float(abs(path@np.maximum(y, 0.)-1)),
            homogeneous=float(max(np.max(inequalities@solution.x), 0.)),
            positivity=float(max(-np.min(solution.x), 0.)),
            objectiveRelative=abs(centroid-sign*solution.fun)/max(abs(centroid), 1.))
        if not all(np.isfinite(v) and v <= 1e-7 for v in residuals.values()):
            return dict(status='unavailable', reason='Recovered certificate fails residual gate',
                        residuals=residuals)
        certificates.append(dict(centroidMS=centroid, epsilon=epsilon.tolist(),
                                 brightness=predicted_brightness.tolist(),
                                 targetBrightness=target_brightness, residuals=residuals))
    if certificates[0]['centroidMS'] > certificates[1]['centroidMS']+1e-7:
        return dict(status='unavailable', reason='Reversed optical bounds')
    return dict(status='available', minMS=certificates[0]['centroidMS'],
                maxMS=certificates[1]['centroidMS'],
                minimumCertificate=certificates[0], maximumCertificate=certificates[1])
