"""Conditional full Newtonian viscosity and adiabatic heat on V75 FV states.

Hybrid method: scikit-fem Q1 axisymmetric weak stress/conduction, FV diagonal
mass/inertia/heat capacity at volume-centroid nodes. Zero-capacity boundary
traces are solved naturally; physical wall velocity is zero. This is not a
matched plasma thermal closure. Spatial/time refinement remains required.
"""
import math
import numpy as np
from scipy.sparse import coo_matrix, diags
from scipy.sparse.linalg import spsolve
from skfem import Basis, BilinearForm, ElementQuad1, ElementVector, MeshQuad, asm

KB = 1.380649e-23
M_AR = 39.948*1.66053906660e-27
STRESS_BATCH_ELEMENTS = 1024


def argon_conductivity(mu):
    """Conditional dilute monatomic Eucken relation, Pr=2/3, constant mu."""
    return 15*KB*mu/(4*M_AR)


def strains(value, radius):
    """Six cylindrical strains [rr,zz,tt,rz,rt,zt] for (ur,uz,Omega)."""
    g = value.grad
    return np.array([g[0, 0], g[1, 1], value[0]/radius,
                     .5*(g[0, 1]+g[1, 0]), .5*radius*g[2, 0],
                     .5*radius*g[2, 1]])


def deviatoric_product(a, b):
    da, db = np.sum(a[:3], axis=0)/3, np.sum(b[:3], axis=0)/3
    return (np.sum((a[:3]-da)*(b[:3]-db), axis=0)
            +2*np.sum(a[3:]*b[3:], axis=0))


class Diffusion:
    def __init__(self, flow, mu, conductivity=None):
        self.flow = flow
        if callable(mu) and conductivity is None:
            raise ValueError('Variable viscosity requires explicit conductivity')
        self.mu = mu
        self.conductivity = argon_conductivity(mu) if conductivity is None else conductivity
        self.rnodes = np.r_[flow.r[0], flow.mean_r, flow.r[-1]]
        self.znodes = np.r_[flow.z[0], (flow.z[:-1]+flow.z[1:])/2, flow.z[-1]]
        self.mesh = MeshQuad.init_tensor(self.rnodes, self.znodes)
        # This basis supplies DOF maps only; physical integrals use order 6 below.
        self.velocity = Basis(self.mesh, ElementVector(ElementQuad1(), dim=3), intorder=1)
        self.heat = Basis(self.mesh, ElementQuad1(), intorder=6)
        coordinates = self.mesh.p
        interior = ((coordinates[0] > flow.r[0]) & (coordinates[0] < flow.r[-1])
                    & (coordinates[1] > flow.z[0]) & (coordinates[1] < flow.z[-1]))
        nodes = np.flatnonzero(interior)
        radial = np.searchsorted(flow.r, coordinates[0, nodes])-1
        axial = np.searchsorted(flow.z, coordinates[1, nodes])-1
        order = np.argsort(axial*flow.nr+radial)
        self.nodes = nodes[order]
        if len(self.nodes) != flow.count:
            raise ValueError('Every FV cell must map to one FE centroid node')
        self.vdofs = self.velocity.nodal_dofs[:, self.nodes]
        self.tdofs = self.heat.nodal_dofs[0, self.nodes]
        axis = coordinates[0] == flow.r[0]
        symmetry = coordinates[1] == flow.z[0]
        wall = (coordinates[0] == flow.r[-1]) | (coordinates[1] == flow.z[-1])
        fixed = np.r_[self.velocity.nodal_dofs[:, wall].ravel(),
                      self.velocity.nodal_dofs[0, axis],
                      self.velocity.nodal_dofs[1, symmetry]]
        self.fixed = np.unique(fixed)
        self.free = np.setdiff1d(np.arange(self.velocity.N), self.fixed)
        self.wall_nodes = np.flatnonzero(wall)

        # Split each Q1 integration element at FV faces. Point-binning its old
        # Gauss rule otherwise assigns incorrect fractions of heat to cells.
        split = MeshQuad.init_tensor(np.union1d(self.rnodes, flow.r),
                                     np.union1d(self.znodes, flow.z))
        # Coefficients retain their full-domain evaluation semantics and are
        # shared by stress and heating, including precomputed quadrature arrays.
        self.integration = Basis(split, ElementQuad1(), intorder=6)
        self.quadrature_mu = self.coefficient(mu, np.asarray(self.integration.global_coordinates()))
        integration = Basis(split, ElementVector(ElementQuad1(), dim=3), intorder=6,
                            elements=np.arange(min(STRESS_BATCH_ELEMENTS, split.nelements)))
        points = split.p
        ri = np.clip(np.searchsorted(self.rnodes, points[0], side='right')-1, 0, len(self.rnodes)-2)
        zi = np.clip(np.searchsorted(self.znodes, points[1], side='right')-1, 0, len(self.znodes)-2)
        fr = (points[0]-self.rnodes[ri])/(self.rnodes[ri+1]-self.rnodes[ri])
        fz = (points[1]-self.znodes[zi])/(self.znodes[zi+1]-self.znodes[zi])
        lookup = np.empty((len(self.znodes), len(self.rnodes)), dtype=int)
        lookup[np.searchsorted(self.znodes, coordinates[1]),
               np.searchsorted(self.rnodes, coordinates[0])] = np.arange(self.mesh.nvertices)
        rows, columns, weights = [], [], []
        for dr, dz in ((0, 0), (0, 1), (1, 0), (1, 1)):
            nodes = lookup[zi+dz, ri+dr]
            weight = (fr if dr else 1-fr)*(fz if dz else 1-fz)
            rows.append(integration.nodal_dofs.ravel())
            columns.append(self.velocity.nodal_dofs[:, nodes].ravel())
            weights.append(np.tile(weight, 3))
        self.prolongation = coo_matrix((np.concatenate(weights),
            (np.concatenate(rows), np.concatenate(columns))),
            shape=(integration.N, self.velocity.N)).tocsr()
        self.prolongation.eliminate_zeros()

        @BilinearForm
        def stress(u, v, w):
            return (2*w.viscosity*2*np.pi*w.x[0]
                    *deviatoric_product(strains(u, w.x[0]), strains(v, w.x[0])))

        @BilinearForm
        def conduction(u, v, w):
            return (self.coefficient(self.conductivity, w.x)*2*np.pi*w.x[0]
                    *np.sum(u.grad*v.grad, axis=0))

        component_dofs = integration.nodal_dofs.copy()
        assembled = asm(stress, integration, viscosity=self.quadrature_mu[:integration.nelems])
        del integration
        # Evaluate every element once, retaining only a bounded vector basis.
        # The Gauss rule, global DOFs and bilinear form are unchanged.
        for start in range(STRESS_BATCH_ELEMENTS, split.nelements, STRESS_BATCH_ELEMENTS):
            batch = Basis(split, ElementVector(ElementQuad1(), dim=3), intorder=6,
                elements=np.arange(start, min(start+STRESS_BATCH_ELEMENTS, split.nelements)))
            assembled += asm(stress, batch, viscosity=self.quadrature_mu[start:start+batch.nelems])
            del batch
        self.stiffness = (self.prolongation.T@assembled@self.prolongation).tocsr()
        del assembled
        # Scalar components share the same Gauss rule without interpolating
        # the vector basis's identically zero cross-component arrays.
        self.component_dofs = component_dofs[:, np.argsort(self.integration.nodal_dofs[0])]
        self.thermal_stiffness = asm(conduction, self.heat).tocsr()
        points = np.asarray(self.integration.global_coordinates())
        ri = np.searchsorted(flow.r, points[0], side='right')-1
        zi = np.searchsorted(flow.z, points[1], side='right')-1
        self.quadrature_cells = (zi*flow.nr+ri).ravel()
        self.quadrature_weight = self.integration.dx*2*np.pi*points[0]

    @staticmethod
    def coefficient(value, x):
        raw = value(x[0], x[1]) if callable(value) else value
        a = np.broadcast_to(np.asarray(raw, dtype=float), x.shape[1:])
        if not np.all(np.isfinite(a)) or np.any(a <= 0):
            raise ValueError('Transport coefficients must be finite and positive')
        return a

    def nodal_velocity(self, q):
        p = self.flow.primitive(q)
        x = np.zeros(self.velocity.N)
        for dofs, key in zip(self.vdofs, ('vrMPS', 'vzMPS', 'omegaRadS')):
            x[dofs] = p[key].ravel()
        return x

    def dissipation_cells(self, x):
        projected = self.prolongation@x
        ur, uz, omega = [self.integration.interpolate(projected[dofs])
                         for dofs in self.component_dofs]
        radius = self.integration.global_coordinates()[0]
        e = np.array([ur.grad[0], uz.grad[1], ur/radius,
                      .5*(ur.grad[1]+uz.grad[0]), .5*radius*omega.grad[0],
                      .5*radius*omega.grad[1]])
        density = 2*self.quadrature_mu*deviatoric_product(e, e)
        return np.bincount(self.quadrature_cells,
                           weights=(density*self.quadrature_weight).ravel(),
                           minlength=self.flow.count)

    @staticmethod
    def solve(matrix, rhs, free):
        out = np.zeros(len(rhs))
        # Stress and conduction systems have symmetric sparsity. Minimum degree
        # on A+A.T reduces fill; evolving capacities still get a fresh solve.
        out[free] = spsolve(matrix[free][:, free].tocsc(), rhs[free],
                            permc_spec='MMD_AT_PLUS_A')
        if not np.all(np.isfinite(out)):
            raise ArithmeticError('Nonfinite implicit diffusion solution')
        return out

    def conduct(self, thermal, heat_capacity, dt):
        """Return cell temperatures and the legacy finite-element trace."""
        tc = np.zeros(self.heat.N)
        tc[self.tdofs] = heat_capacity
        rhs = np.zeros(self.heat.N)
        rhs[self.tdofs] = thermal
        temperature = self.solve(diags(tc)+dt*self.thermal_stiffness,
                                 rhs, np.arange(self.heat.N))
        return temperature[self.tdofs], temperature

    def advance(self, q, dt):
        if isinstance(dt, (bool, np.bool_)) or not np.isscalar(dt) or not math.isfinite(dt) or dt <= 0:
            raise ValueError('Diffusion timestep must be finite and positive')
        before = self.flow.primitive(q)
        out = np.array(q, dtype=float, copy=True)
        mass = q[0].ravel()
        inertia = mass*np.tile(self.flow.mean_r2, self.flow.nz)
        capacity = np.zeros(self.velocity.N)
        capacity[self.vdofs[0]] = capacity[self.vdofs[1]] = mass
        capacity[self.vdofs[2]] = inertia
        old = self.nodal_velocity(q)
        new = self.solve(diags(capacity)+dt*self.stiffness, capacity*old, self.free)
        out[1] = (mass*new[self.vdofs[0]]).reshape(q.shape[1:])
        out[2] = (mass*new[self.vdofs[1]]).reshape(q.shape[1:])
        out[3] = (inertia*new[self.vdofs[2]]).reshape(q.shape[1:])
        delta = new-old
        damping = (.5*capacity*delta**2)[self.vdofs].sum(axis=0)
        viscous_heat = dt*self.dissipation_cells(new)
        after_kinetic = (.5*mass*(new[self.vdofs[0]]**2+new[self.vdofs[1]]**2)
                         +.5*inertia*new[self.vdofs[2]]**2)
        kinetic_change = after_kinetic-before['kineticJ'].ravel()
        heat = viscous_heat+damping
        # Local stress work transfers energy between FV cells. Only its sum is
        # zero; keeping each cell's old total energy would lose this transport.
        redistribution = kinetic_change+heat
        out[4] += redistribution.reshape(q.shape[1:])
        mid = self.flow.primitive(out)
        heat_capacity = (1.5*KB*(q[5]/self.flow.masses[0]
                                +(q[0]-q[5])/self.flow.masses[1])).ravel()
        cell_temperature, temperature = self.conduct(mid['thermalJ'].ravel(), heat_capacity, dt)
        thermal_change = heat_capacity*cell_temperature-mid['thermalJ'].ravel()
        out[4] += thermal_change.reshape(q.shape[1:])
        final = self.flow.primitive(out)
        work = -dt*new*(self.stiffness@new)
        return out, dict(method='scikit-fem axisymmetric Q1 stress/heat with FV capacities',
            dtS=float(dt), viscousHeatJ=viscous_heat.reshape(q.shape[1:]),
            numericalHeatJ=damping.reshape(q.shape[1:]),
            stressRedistributionJ=redistribution.reshape(q.shape[1:]),
            mechanicalCellWorkJ=work[self.vdofs].sum(axis=0).reshape(q.shape[1:]),
            thermalRedistributionJ=thermal_change.reshape(q.shape[1:]),
            kineticLossJ=float(np.sum(before['kineticJ']-final['kineticJ'])),
            energyResidualJ=float(np.sum(out[4]-q[4])),
            velocityTrace=new, temperatureTrace=temperature)
