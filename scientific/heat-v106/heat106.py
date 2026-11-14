"""Research-only FiPy conduction on the actual conserved finite volumes."""
import os
from pathlib import Path
import sys

os.environ['FIPY_SOLVERS'] = 'scipy'
import numpy as np
from fipy import CellVariable, DiffusionTerm, TransientTerm
from fipy.meshes.cylindricalNonUniformGrid2D import CylindricalNonUniformGrid2D
from fipy.solvers.scipy import LinearLUSolver

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'meridional-v86'))
from diffusion86 import Diffusion


class FVDiffusion(Diffusion):
    """Keep Q1 mechanics; replace only heat conduction with cell-centered FV."""

    def __init__(self, flow, mu, conductivity=None):
        super().__init__(flow, mu, conductivity)
        coefficient = np.asarray(self.conductivity)
        if (coefficient.ndim != 0 or coefficient.dtype.kind not in 'fiu'
                or not np.isfinite(coefficient) or coefficient <= 0):
            raise ValueError('The V106 candidate requires constant positive scalar conductivity')
        self.heat_mesh = CylindricalNonUniformGrid2D(dx=np.diff(flow.r), dy=np.diff(flow.z),
            origin=((flow.r[0],), (flow.z[0],)))
        center = np.meshgrid((flow.r[:-1]+flow.r[1:])/2, (flow.z[:-1]+flow.z[1:])/2)
        for actual, expected in zip(self.heat_mesh.cellCenters, center):
            if not np.allclose(actual, expected.ravel(), rtol=2e-12, atol=1e-15):
                raise ValueError('FiPy and conserved-cell ordering differ')
        if not np.allclose(2*np.pi*self.heat_mesh.cellVolumes, flow.volume.ravel(),
                           rtol=2e-12, atol=0.):
            raise ValueError('FiPy and conserved cylindrical volumes differ')
        self.cell_temperature = CellVariable(mesh=self.heat_mesh, value=1., hasOld=True)
        # No old capacity: one split heat solve holds its incoming mass fixed.
        self.cell_capacity = CellVariable(mesh=self.heat_mesh, value=1.)
        self.heat_equation = (TransientTerm(coeff=self.cell_capacity)
                              == DiffusionTerm(coeff=float(coefficient)))
        self.heat_equation.cacheMatrix()
        self.heat_equation.cacheRHSvector()
        self.heat_solver = LinearLUSolver(tolerance=1e-13, iterations=1000)
        # thermal_stiffness remains the inherited, inactive FE diagnostic;
        # heat_equation is the active heat operator and has no boundary DOFs.

    def conduct(self, thermal, heat_capacity, dt):
        self.cell_capacity.setValue(heat_capacity/self.flow.volume.ravel())
        self.cell_temperature.setValue(thermal/heat_capacity)
        self.cell_temperature.updateOld()
        self.heat_equation.solve(var=self.cell_temperature, dt=dt, solver=self.heat_solver)
        temperature = np.asarray(self.cell_temperature.value).copy()
        if not np.isfinite(temperature).all() or np.any(temperature <= 0):
            raise ArithmeticError('FiPy conduction left the positive finite-temperature domain')
        return temperature, temperature.copy()

    def advance(self, q, dt):
        out, receipt = super().advance(q, dt)
        residual = (self.heat_equation.matrix*np.asarray(self.cell_temperature.value)
                    -np.asarray(self.heat_equation.RHSvector))
        receipt.update(method='scikit-fem Q1 stress; FiPy cylindrical finite-volume heat',
            temperatureTraceLocation='finite-volume-cells',
            thermalLinearResidualJ=float(2*np.pi*dt*np.max(abs(residual))),
            thermalEnergyResidualJ=float(np.sum(receipt['thermalRedistributionJ'])))
        return out, receipt
