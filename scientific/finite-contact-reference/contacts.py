"""Declared finite injection supports; no experiment or fit is read here."""
import math
import numpy as np

R, L, A, C = .06, .24, .004, .07
MU, PARALLEL, TRANSVERSE = 1.14e-4, 1070., 107.
CASES = {'narrow': (.001, .005), 'middle': (.002, .010), 'broad': (.004, .020)}


def geometry(n, width, half_width, current, magnetic):
    if (type(n) is not int or n not in (1, 2, 4)
            or not np.isfinite([width, half_width, current, magnetic]).all()
            or not 0 < width < R-A or not 0 < half_width < min(C, L-C)
            or current == 0):
        raise ValueError('Declared mesh, finite nonzero current and interior contact supports required')
    # Insert physical support edges before subdivision: identical supports at every n.
    def refined(base):
        edges = np.unique(base)
        return np.r_[np.concatenate([np.linspace(a, b, n, endpoint=False)
                                     for a, b in zip(edges, edges[1:])]), edges[-1]]
    r = refined(np.r_[np.linspace(0,A,3), np.linspace(A,R,15), A+width])
    z = refined(np.r_[np.linspace(0,C,9), np.linspace(C,L,17), C-half_width, C+half_width])
    cathode_area = math.pi*((A+width)**2-A*A)
    anode_area = 4*math.pi*R*half_width
    expected_torque = current*magnetic/2*(R*R-(A*A+(A+width)**2)/2)
    return r, z, cathode_area, anode_area, expected_torque
