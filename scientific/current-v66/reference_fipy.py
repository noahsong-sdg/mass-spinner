"""Independent actual-FiPy axisymmetric prescribed-conductivity current oracle.

Run only in the parent's offline safe-dev guest:
    python reference_fipy.py CASES.json NEW_OUTPUT.json

Cell arrays are radial-fast, j*nr+i. Boundary voltage arrays are inner/outer
length nz and lower/upper length nr; null means total normal current is zero.
This solves charge continuity, not electron kinetics or a conductivity closure.
The standard FiPy face-gradient/harmonic-face discretization intentionally
differs from the production exact-log radial resistance and PWC motional emf.
"""
import argparse
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path

import numpy as np
from fipy import CellVariable, CylindricalGrid2D, DiffusionTerm, FaceVariable
from fipy.solvers.scipy import LinearLUSolver


def solve_case(spec):
    radial = np.asarray(spec['radialEdgesM'], dtype=float)
    axial = np.asarray(spec['axialEdgesM'], dtype=float)
    for edges in (radial, axial):
        if edges.ndim != 1 or len(edges) < 2 or not np.isfinite(edges).all() or np.any(np.diff(edges) <= 0):
            raise ValueError('Need finite strictly ordered one-dimensional edges')
    if radial[0] < 0:
        raise ValueError('Radial edges must be nonnegative')
    nr, nz = len(radial)-1, len(axial)-1
    count = nr*nz

    def field(key, positive=False):
        value = np.asarray(spec[key], dtype=float)
        if value.shape != (count,) or not np.isfinite(value).all() or (positive and np.any(value <= 0)):
            raise ValueError(key+' needs one '+('positive ' if positive else '')+'finite value per cell')
        return value

    sigma_r = field('sigmaPerpSM', True)
    sigma_z = field('sigmaParallelSM', True)
    omega_values = field('omegaRadS')
    magnetic = spec['magneticT']
    if isinstance(magnetic, bool) or not isinstance(magnetic, (int, float)) or not math.isfinite(magnetic):
        raise ValueError('magneticT must be finite')
    mesh = CylindricalGrid2D(dr=np.diff(radial), dz=np.diff(axial),
                             origin=((float(radial[0]),), (float(axial[0]),)))
    r, z = np.asarray(mesh.faceCenters.value)
    normals = np.asarray(mesh.faceNormals)
    radial_face = np.abs(normals[0]) > .5
    ri = np.clip(np.searchsorted(radial, r, side='right')-1, 0, nr-1)
    zi = np.clip(np.searchsorted(axial, z, side='right')-1, 0, nz-1)

    phi = CellVariable(mesh=mesh, name='electric potential', value=0.)
    omega = CellVariable(mesh=mesh, value=omega_values)
    sr = np.asarray(CellVariable(mesh=mesh, value=sigma_r).harmonicFaceValue.value)
    sz = np.asarray(CellVariable(mesh=mesh, value=sigma_z).harmonicFaceValue.value)
    tensor_values = np.zeros((2, 2, mesh.numberOfFaces))
    tensor_values[0, 0], tensor_values[1, 1] = sr, sz
    tensor = FaceVariable(mesh=mesh, rank=2, value=tensor_values)

    # u_theta e_theta cross B_z e_z = B*r*Omega e_r.
    emf_r = magnetic*r*np.asarray(omega.arithmeticFaceValue.value)
    motional_flux = FaceVariable(mesh=mesh, rank=1, value=np.array([sr*emf_r, np.zeros_like(r)]))
    electrode = np.zeros(mesh.numberOfFaces, dtype=bool)
    voltage = np.zeros(mesh.numberOfFaces)
    sides = [('innerVoltageV', mesh.facesLeft, zi, nz),
             ('outerVoltageV', mesh.facesRight, zi, nz),
             ('lowerVoltageV', mesh.facesBottom, ri, nr),
             ('upperVoltageV', mesh.facesTop, ri, nr)]
    for key, surface, indices, expected in sides:
        values = spec[key]
        if not isinstance(values, list) or len(values) != expected:
            raise ValueError(key+' boundary array has the wrong length')
        for value in values:
            if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value)):
                raise ValueError('Electrode potentials must be finite or null for insulation')
        if key == 'innerVoltageV' and radial[0] == 0 and any(v is not None for v in values):
            raise ValueError('A zero-area symmetry axis is not an electrode')
        present = np.array([v is not None for v in values])
        numeric = np.array([0 if v is None else v for v in values])
        selected = np.asarray(surface.value, dtype=bool) & present[indices]
        electrode |= selected
        voltage[selected] = numeric[indices[selected]]
    if not electrode.any():
        raise ValueError('At least one prescribed electrode potential is needed to fix the voltage gauge')
    # Arbitrary absolute voltage must not set solver/error/power scales.
    voltage_reference = float(voltage[np.flatnonzero(electrode)[0]])
    voltage[electrode] -= voltage_reference
    phi.constrain(voltage, where=electrode)
    insulating = np.asarray(mesh.exteriorFaces.value, dtype=bool) & ~electrode
    # Insulation constrains TOTAL current: n·grad(phi)=n·(u cross B).
    # A zero potential gradient here would let motional current leak out.
    emf_normal = normals[0]*emf_r
    phi.faceGrad.constrain(normals*emf_normal, where=insulating)
    equation = DiffusionTerm(coeff=tensor) == motional_flux.divergence
    equation.solve(var=phi, solver=LinearLUSolver(tolerance=1e-12, iterations=2000))

    grad_normal = np.sum(normals*np.asarray(phi.faceGrad.value), axis=0)
    sigma_normal = sr*normals[0]**2+sz*normals[1]**2
    density_normal = sigma_normal*(-grad_normal+emf_normal)
    face_flux = FaceVariable(mesh=mesh, rank=1, value=normals*density_normal)
    # Exact physical surface areas, with 2*pi restored to FiPy's r-weighted mesh.
    area = np.where(radial_face, 2*math.pi*r*np.diff(axial)[zi],
                    math.pi*(radial[ri+1]**2-radial[ri]**2))
    face_current = density_normal*area
    ids = np.asarray(mesh.faceCellIDs.filled(-1), dtype=int)
    centers = np.asarray(mesh.cellCenters.value)
    separation = np.zeros_like(r)
    for face in range(mesh.numberOfFaces):
        first, second = ids[:, face]
        other = centers[:, second] if second >= 0 else np.array([r[face], z[face]])
        separation[face] = abs(np.dot(other-centers[:, first], normals[:, face]))
    if np.any(separation <= 0):
        raise ValueError('A face has zero normal cell separation')
    # Equivalent to I^2 R on finite-area faces; Jn^2*A*d/sigma also gives the
    # exact zero-area axis limit without the undefined numerical product0^2*inf.
    joule = float(np.sum(density_normal**2*area*separation/sigma_normal))
    mechanical = float(-np.sum(face_current*emf_normal*separation))
    electrical = float(-np.sum(voltage[electrode]*face_current[electrode]))
    exterior = np.asarray(mesh.exteriorFaces.value, dtype=bool)
    residual = np.asarray(face_flux.divergence.value)*np.asarray(mesh.cellVolumes)*2*math.pi
    radial_current = np.zeros(nz*(nr+1))
    axial_current = np.zeros((nz+1)*nr)
    for face in range(mesh.numberOfFaces):
        if radial_face[face]:
            edge = int(np.argmin(abs(radial-r[face])))
            radial_current[zi[face]*(nr+1)+edge] = face_current[face]*normals[0, face]
        else:
            edge = int(np.argmin(abs(axial-z[face])))
            axial_current[edge*nr+ri[face]] = face_current[face]*normals[1, face]
    result = {'id': spec['id'], 'potentialV': (np.asarray(phi.value)+voltage_reference).tolist(),
              'relativePotentialV': np.asarray(phi.value).tolist(), 'voltageReferenceV': voltage_reference,
              'jouleW': joule, 'mechanicalW': mechanical, 'electrodePowerW': electrical,
              'netBoundaryCurrentA': float(np.sum(face_current[exterior])),
              'maxCellCurrentResidualA': float(np.max(abs(residual))),
              'powerResidualW': electrical-joule-mechanical,
              'maxInsulatingCurrentA': float(np.max(abs(face_current[insulating]))) if insulating.any() else 0.,
              'radialCurrentA': radial_current.tolist(), 'axialCurrentA': axial_current.tolist(),
              'powerDefinition': 'FiPy face-dual Joule and Lorentz work; total electrical work closes by charge continuity',
              'conductivityPredicted': False, 'experimentalValidation': False}
    if not all(np.isfinite(result[key]).all() for key in ('potentialV', 'jouleW', 'mechanicalW', 'electrodePowerW')):
        raise ArithmeticError('Nonfinite FiPy current reference result')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('cases', type=Path); parser.add_argument('output', type=Path)
    args = parser.parse_args()
    raw = args.cases.read_bytes(); packet = json.loads(raw)
    result = {'sourceSHA256': hashlib.sha256(raw).hexdigest(),
              'method': 'Actual NIST FiPy CylindricalGrid2D, diagonal anisotropic DiffusionTerm, motional face flux, SciPy LU',
              'versions': {p: importlib.metadata.version(p) for p in ('fipy', 'numpy', 'scipy')},
              'cases': [solve_case(spec) for spec in packet['cases']]}
    with args.output.open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
