"""DOLFINx 0.11 API adaptation of the independent assembly of the existing V98 conditional angular model.

Adaptation inspired by RemDelaporteMathurin/plasma-centrifuge (MIT), commit
6ad77b4b3f2d4ba478a8574556e6da8095361132. See NOTICE and PROTOCOL.md.
Fixed synthetic coefficients; no experimental targets read or thermal output.
"""
import hashlib
import json
import math
from pathlib import Path
import sys
import numpy as np
import basix.ufl
import dolfinx
from dolfinx import fem, geometry, mesh
from dolfinx.fem import petsc
from mpi4py import MPI
from petsc4py import PETSc
import ufl

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scientific/nonrigid-v98'))
import fem98

M = dict(branchCurrentA=100., magneticT=.13, radiusM=.06, halfLengthM=.24,
         cathodeRadiusM=.004, anodeCenterM=.07)
FIELDS = dict(viscosity=1.14e-4, conductivity_shape=1., beta_field=3.)


def notebook_cathode_current(current=100., radius=.06, contact=.0042, width=1/300):
    """Exact radius-weighted integral of the public notebook's stated flux."""
    lo, hi = -contact/width, (radius-contact)/width
    moment = contact*(math.erf(hi)-math.erf(lo))/2
    moment += width*(math.exp(-lo*lo)-math.exp(-hi*hi))/(2*math.sqrt(math.pi))
    return current*moment/radius


def solve(n, current=100., magnetic=.13):
    if MPI.COMM_WORLD.size != 1 or n not in (1, 2, 4):
        raise ValueError('Serial execution and declared nested mesh required')
    if not np.isfinite([current, magnetic]).all() or current == 0:
        raise ValueError('Finite drive and nonzero current required')
    R, L, a, c = (M[k] for k in ('radiusM', 'halfLengthM', 'cathodeRadiusM', 'anodeCenterM'))
    r = np.r_[np.linspace(0, a, 2*n, endpoint=False), np.linspace(a, R, 14*n+1)]
    z = np.r_[np.linspace(0, c, 8*n, endpoint=False), np.linspace(c, L, 16*n+1)]
    coords = np.array([[rr, zz] for rr in r for zz in z])
    index = lambda i, j: i*len(z)+j
    cells = np.array([[index(i,j), index(i+1,j), index(i,j+1), index(i+1,j+1)]
                      for i in range(len(r)-1) for j in range(len(z)-1)], dtype=np.int64)
    domain = mesh.create_mesh(MPI.COMM_WORLD, cells,
        ufl.Mesh(basix.ufl.element('Lagrange', 'quadrilateral', 1, shape=(2,))), coords)
    V = fem.functionspace(domain, basix.ufl.element('Lagrange', 'quadrilateral', 2, shape=(2,)))
    if V.dofmap.index_map_bs != 2:
        raise ValueError('Expected two interleaved scalar unknowns')
    phi, omega = ufl.TrialFunctions(V)
    q, w = ufl.TestFunctions(V)
    rr = ufl.SpatialCoordinate(domain)[0]
    mu, parallel = FIELDS['viscosity'], 1070.*FIELDS['conductivity_shape']
    transverse = parallel/(1+FIELDS['beta_field']**2)
    dx = ufl.Measure('dx', domain=domain, metadata={'quadrature_degree': 8})
    electric = transverse*(phi.dx(0)-magnetic*rr*omega)*(q.dx(0)-magnetic*rr*w)
    form = (2*ufl.pi*rr*(electric+parallel*phi.dx(1)*q.dx(1))
            +2*ufl.pi*mu*rr**3*ufl.dot(ufl.grad(omega), ufl.grad(w)))*dx
    nodes = V.tabulate_dof_coordinates()
    def point(r0, z0):
        found = np.flatnonzero(np.isclose(nodes[:,0], r0, rtol=0, atol=1e-13)
                               &np.isclose(nodes[:,1], z0, rtol=0, atol=1e-13))
        if len(found) != 1:
            raise ValueError('Contact/gauge must coincide with one mesh vertex')
        return 2*int(found[0])
    contacts = np.array([point(R,c), point(a,L)], dtype=PETSc.IntType)
    walls = np.flatnonzero(np.isclose(nodes[:,0],R)|np.isclose(nodes[:,1],L))
    bcs = [fem.dirichletbc(PETSc.ScalarType(0), (2*walls+1).astype(np.int32), V.sub(1)),
           fem.dirichletbc(PETSc.ScalarType(0), np.array([point(0,0)],dtype=np.int32), V.sub(0))]
    A = petsc.assemble_matrix(fem.form(form), bcs=bcs)
    A.assemble()
    b = A.createVecRight()
    b.set(0)
    b.setValues(contacts, [current,-current])
    b.assemble()
    petsc.set_bc(b,bcs)
    diagonal = A.getDiagonal()
    diagonal.array[:] = 1/np.sqrt(diagonal.array)
    A.diagonalScale(diagonal,diagonal)
    b.pointwiseMult(diagonal,b)
    x = b.duplicate()
    ksp = PETSc.KSP().create(MPI.COMM_WORLD)
    ksp.setOperators(A)
    ksp.setType('preonly')
    ksp.getPC().setType('lu')
    ksp.solve(b,x)
    if ksp.getConvergedReason() <= 0:
        raise ArithmeticError('PETSc solve failed')
    residual = b.duplicate()
    A.mult(x,residual)
    residual.axpy(-1,b)
    linear_residual = residual.norm()/b.norm()
    x.pointwiseMult(diagonal,x)
    answer = fem.Function(V)
    answer.x.array[:] = x.array
    answer.x.scatter_forward()
    p, o = ufl.split(answer)
    integrate = lambda e: float(fem.assemble_scalar(fem.form(e*dx)))
    joule = integrate(2*ufl.pi*rr*(transverse*(p.dx(0)-magnetic*rr*o)**2+parallel*p.dx(1)**2))
    viscous = integrate(2*ufl.pi*mu*rr**3*ufl.dot(ufl.grad(o),ufl.grad(o)))
    power = float(current*(x.array[contacts[0]]-x.array[contacts[1]]))
    torque = integrate(2*ufl.pi*transverse*magnetic*rr**2*(p.dx(0)-magnetic*rr*o))
    expected = current*magnetic*(R*R-a*a)/2
    metrics = dict(jouleW=joule, viscousW=viscous, electrodePowerW=power,
        driveTorqueNm=torque, sourceMomentTorqueNm=expected, linearResidualRelative=linear_residual,
        powerResidualRelative=abs(power-joule-viscous)/max(abs(power),abs(joule)+abs(viscous)),
        torqueResidualRelative=abs(torque-expected)/max(abs(expected),1e-30))
    field = answer.sub(1).collapse()
    ksp.destroy()
    for obj in (A,b,x,diagonal,residual):
        obj.destroy()
    return field, metrics


def sample(field, radius, axial):
    r,z = np.broadcast_arrays(radius,axial)
    points = np.c_[r.ravel(), z.ravel(), np.zeros(r.size)]
    tree = geometry.bb_tree(field.function_space.mesh, 2)
    candidates = geometry.compute_collisions_points(tree,points)
    hits = geometry.compute_colliding_cells(field.function_space.mesh,candidates,points)
    if any(len(hits.links(i)) == 0 for i in range(len(points))):
        raise ValueError('A comparison point lies outside the declared mesh')
    cells = np.array([hits.links(i)[0] for i in range(len(points))],dtype=np.int32)
    return field.eval(points,cells).reshape(r.shape)


def main(output):
    if output.exists():
        raise FileExistsError('Fresh output path required')
    paths = [Path(__file__),ROOT/'scientific/nonrigid-v98/fem98.py',Path(__file__).with_name('PROTOCOL.md'),ROOT/'ci/Dockerfile.fenicsx']
    source = {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    result = dict(schemaVersion=1,kind='independent-matched-angular-reference',sourceSHA256=source,
        runtime=dict(dolfinx=dolfinx.__version__,numpy=np.__version__,
                     petsc=PETSc.Sys.getVersion(),skfem=__import__('skfem').__version__),
        manifest=M,fields=FIELDS,parametersRefitted=False,experimentalQualification=False,
        livePlaygroundQualified=False,temperaturePredictionAvailable=False,cases=[])
    r,z = np.meshgrid(np.linspace(0,M['radiusM'],41),np.linspace(0,M['halfLengthM'],31))
    previous = []
    for n in (1,2,4):
        field,metrics = solve(n)
        old = fem98.solve(M,n,FIELDS)
        value,reference = sample(field,r,z),fem98.sample(old,r,z)
        difference = float(np.max(abs(value-reference))/np.max(abs(reference)))
        row = dict(refinement=n,**metrics,independentFieldDifference=difference,
                   omegaRadS=value.tolist())
        row['pass'] = difference < .05 and all(metrics[k] < 1e-8 for k in
            ('linearResidualRelative','powerResidualRelative','torqueResidualRelative'))
        previous.append(value)
        result['cases'].append(row)
        print(json.dumps({k:v for k,v in row.items() if k!='omegaRadS'}),flush=True)
    changes = [float(np.max(abs(a-b))/np.max(abs(b))) for a,b in zip(previous,previous[1:])]
    result.update(radialM=r[0].tolist(),axialM=z[:,0].tolist(),fieldRefinementChanges=changes,
        numericalScreen=all(c['pass'] for c in result['cases']) and changes[1] < .05 and changes[1] < changes[0])
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    if not result['numericalScreen']:
        raise SystemExit('Original 5% field/refinement or 1e-8 budget screen failed')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
