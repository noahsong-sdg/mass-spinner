"""Independent scikit-fem Q2 charge/torsional-flow reference; no velocity input.

The weak form is the derivative of Joule plus viscous dissipation. Contact
point loads approximate the source's ideal rings, not finite real electrodes.
"""
import numpy as np
from scipy.sparse import bmat, diags
from scipy.sparse.linalg import spsolve
from skfem import Basis, BilinearForm, ElementQuad2, MeshQuad, asm


def solve(m, refinement, fields, *, current=None, magnetic=None, gauge=0.):
    I = m['branchCurrentA'] if current is None else current
    B = m['magneticT'] if magnetic is None else magnetic
    R, L, a, c = (m[k] for k in ('radiusM', 'halfLengthM', 'cathodeRadiusM', 'anodeCenterM'))
    if (type(refinement) is not int or refinement not in (1, 2, 4) or
        not np.isfinite([I, B, gauge, R, L, a, c]).all() or I == 0 or
        not 0 < a < R or not 0 < c < L):
        raise ValueError('Declared refinement, finite drive and ordered geometry required')
    n = refinement
    r = np.r_[np.linspace(0, a, 2*n, endpoint=False), np.linspace(a, R, 14*n+1)]
    z = np.r_[np.linspace(0, c, 8*n, endpoint=False), np.linspace(c, L, 16*n+1)]
    basis = Basis(MeshQuad.init_tensor(r, z), ElementQuad2(), intorder=6)
    x = basis.global_coordinates()
    def coefficient(key, factor=1., nonnegative=False):
        value = fields[key]
        q = np.asarray(value(x[0], x[1]) if callable(value) else value, dtype=float)
        q = np.broadcast_to(q, x[0].shape) * factor
        if not np.isfinite(q).all() or np.any(q < 0 if nonnegative else q <= 0):
            raise ValueError('Invalid coefficient: ' + key)
        return q
    mu = coefficient('viscosity')
    parallel = coefficient('conductivity_shape', 1070.)
    beta = coefficient('beta_field', nonnegative=True)
    transverse = parallel/(1 + beta**2)

    @BilinearForm
    def electric(u, v, w):
        return 2*np.pi*w.x[0]*(transverse*u.grad[0]*v.grad[0] + parallel*u.grad[1]*v.grad[1])
    @BilinearForm
    def coupling(u, v, w):
        return -2*np.pi*B*transverse*w.x[0]**2*u*v.grad[0]
    @BilinearForm
    def motional(u, v, w):
        return 2*np.pi*B**2*transverse*w.x[0]**3*u*v
    @BilinearForm
    def shear(u, v, w):
        return 2*np.pi*mu*w.x[0]**3*(u.grad[0]*v.grad[0]+u.grad[1]*v.grad[1])
    A, C, D, S = (asm(form, basis).tocsr() for form in (electric, coupling, motional, shear))
    K = bmat([[A, C], [C.T, S+D]], format='csc')
    N = basis.N
    load = I * np.asarray(basis.probes(np.array([[R, a], [c, L]])).T @ np.array([1., -1.])).ravel()
    rhs = np.r_[load, np.zeros(N)]
    # One electric gauge; stationary outer/end walls, symmetry/axis are natural.
    wall = basis.get_dofs(lambda x: np.isclose(x[0], R, rtol=0, atol=1e-14) |
                                    np.isclose(x[1], L, rtol=0, atol=1e-14)).all()
    constrained = np.r_[0, N+wall]
    keep = np.setdiff1d(np.arange(2*N), constrained)
    reduced = K[keep][:, keep]
    scale = diags(1/np.sqrt(reduced.diagonal()))
    answer = np.zeros(2*N)
    answer[keep] = scale @ spsolve((scale @ reduced @ scale).tocsc(), scale @ rhs[keep])
    if not np.isfinite(answer).all():
        raise ArithmeticError('Nonfinite finite-element solution')
    phi, omega = answer[:N], answer[N:]
    electrical = float(phi@A@phi + 2*phi@C@omega + omega@D@omega)
    viscous = float(omega@S@omega)
    power = float(load@phi)
    torque = float(-np.sum(C.T@phi+D@omega))
    expected = I*B*(R*R-a*a)/2
    residual = K@answer-rhs
    angular_force = C.T@phi+D@omega
    reaction_torque = float(np.sum((S@omega+angular_force)[wall]))
    state = dict(basis=basis, potential=phi+gauge, omega=omega,
        operators=dict(electric=A, coupling=C, motional=D, shear=S),
        currentA=float(I), magneticT=float(B), refinement=refinement,
        jouleW=electrical, viscousW=viscous, electrodePowerW=power,
        driveTorqueNm=torque, wallReactionTorqueNm=reaction_torque,
        sourceMomentTorqueNm=float(expected),
        chargeResidualRelative=float(np.max(abs(residual[:N]))/abs(I)),
        momentumResidualRelative=float(np.max(abs(residual[N+np.setdiff1d(np.arange(N), wall)])) /
                                       max(float(np.max(abs(angular_force))), 1e-30)),
        linearResidualRelative=float(np.linalg.norm(residual[keep])/np.linalg.norm(rhs[keep])),
        powerResidualRelative=abs(power-electrical-viscous)/max(abs(power), abs(electrical)+abs(viscous)),
        torqueResidualRelative=abs(torque-expected)/max(abs(expected), 1e-30),
        wallTorqueResidualRelative=abs(torque+reaction_torque)/max(abs(expected), 1e-30),
        experimentalQualification=False, contactVoltageExperimental=False)
    return state


def sample(state, radius, axial):
    r, z = np.broadcast_arrays(np.asarray(radius, dtype=float), np.asarray(axial, dtype=float))
    # Mesh element-finding broadcasts over points and cells. Bound that temporary
    # array independently of the output grid and finite-element refinement.
    points = np.vstack((r.ravel(), z.ravel()))
    values = np.empty(r.size)
    for start in range(0, r.size, 128):
        end = min(start+128, r.size)
        values[start:end] = state['basis'].probes(points[:, start:end]) @ state['omega']
    return values.reshape(r.shape)


def chords(state, offsets, radius):
    """Optically thin, uniform-emissivity midplane centroid ONLY, not fitted optics."""
    from numpy.polynomial.legendre import leggauss
    b = np.asarray(offsets, dtype=float)
    if not np.isfinite(b).all() or np.any((b < 0) | (b >= radius)):
        raise ValueError('Chords must intersect the chamber')
    x, w = leggauss(256)
    lengths = np.sqrt(radius**2-b*b)
    q = lengths[:, None]*(x[None, :]+1)/2
    r = np.sqrt(b[:, None]**2+q*q)
    return b*np.sum(sample(state, r, np.zeros_like(r))*w[None, :]/2, axis=1)
