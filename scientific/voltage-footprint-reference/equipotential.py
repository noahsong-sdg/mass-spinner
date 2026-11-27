"""Conditional ideal plasma contacts; native independent finite-element solves."""
from pathlib import Path
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/finite-contact-reference'))
from contacts import R,L,A,C,MU,PARALLEL,TRANSVERSE,geometry


def contact_nodes(x,width,half_width):
    eps = 1e-13
    cathode = np.flatnonzero(np.isclose(x[:,1],L,rtol=0,atol=eps)
        &(x[:,0]>=A-eps)&(x[:,0]<=A+width+eps))
    anode = np.flatnonzero(np.isclose(x[:,0],R,rtol=0,atol=eps)
        &(x[:,1]>=C-half_width-eps)&(x[:,1]<=C+half_width+eps))
    wall = np.flatnonzero(np.isclose(x[:,0],R)|np.isclose(x[:,1],L))
    return cathode,anode,wall


def drive_geometry(n,width,half_width,voltage,gauge,magnetic,target_current):
    if (not np.isfinite([voltage,gauge,magnetic]).all() or voltage==0
            or target_current is not None and (not np.isfinite(target_current) or target_current==0)):
        raise ValueError('Finite nonzero drive and finite gauge/field required')
    return geometry(n,width,half_width,1.,magnetic)[:2]


def summarize(phi,omega,x,cathode,anode,wall,reaction,joule,viscous,torque,magnetic):
    current = float(np.sum(reaction[anode]))
    denominator = abs(current)
    if not np.isfinite(current) or current==0:
        raise ArithmeticError('Nonzero finite contact current required')
    free = np.setdiff1d(np.arange(len(phi)),np.r_[cathode,anode])
    electrical = np.r_[cathode,anode]
    power = float(phi[electrical]@reaction[electrical])
    moment = float(reaction[electrical]@x[electrical,0]**2)
    expected = magnetic*moment/2
    port = float(np.mean(phi[anode])-np.mean(phi[cathode]))
    return dict(branchCurrentA=current,portVoltageV=port,jouleW=joule,viscousW=viscous,
        electrodePowerW=power,driveTorqueNm=torque,sourceMomentTorqueNm=expected,
        cathodeMeanRadiusSquaredM2=float(-reaction[cathode]@x[cathode,0]**2/current),
        sourceResidualRelative=abs(np.sum(reaction[electrical]))/denominator,
        chargeResidualRelative=float(np.max(abs(reaction[free])))/denominator,
        contactSpreadRelative=float(max(np.ptp(phi[anode]),np.ptp(phi[cathode])))/abs(port),
        voltageResidualRelative=abs(power/current-port)/abs(port),
        powerResidualRelative=abs(power-joule-viscous)/max(abs(power),abs(joule)+abs(viscous)),
        torqueResidualRelative=abs(torque-expected)/max(abs(expected),1e-30),
        cathodeCoordinatesM=x[cathode,:2].tolist(),cathodeWeakLoadA=reaction[cathode].tolist(),
        anodeCoordinatesM=x[anode,:2].tolist(),anodeWeakLoadA=reaction[anode].tolist())


def dolfinx_solve(n,width,half_width,*,voltage=1.,gauge=0.,magnetic=.13,target_current=None):
    import basix.ufl
    import ufl
    from dolfinx import fem,mesh
    from dolfinx.fem import petsc
    from mpi4py import MPI
    from petsc4py import PETSc
    if MPI.COMM_WORLD.size!=1:
        raise ValueError('Serial reference required')
    r,z = drive_geometry(n,width,half_width,voltage,gauge,magnetic,target_current)
    x = np.array([[rr,zz] for rr in r for zz in z])
    index = lambda i,j: i*len(z)+j
    cells = np.array([[index(i,j),index(i+1,j),index(i,j+1),index(i+1,j+1)]
        for i in range(len(r)-1) for j in range(len(z)-1)],dtype=np.int64)
    domain = mesh.create_mesh(MPI.COMM_WORLD,cells,x,
        ufl.Mesh(basix.ufl.element('Lagrange','quadrilateral',1,shape=(2,))))
    V = fem.functionspace(domain,basix.ufl.element('Lagrange','quadrilateral',2,shape=(2,)))
    phi,omega = ufl.TrialFunctions(V)
    q,w = ufl.TestFunctions(V)
    rr = ufl.SpatialCoordinate(domain)[0]
    dx = ufl.Measure('dx',domain=domain,metadata={'quadrature_degree':8})
    form = (2*ufl.pi*rr*(TRANSVERSE*(phi.dx(0)-magnetic*rr*omega)
        *(q.dx(0)-magnetic*rr*w)+PARALLEL*phi.dx(1)*q.dx(1))
        +2*ufl.pi*MU*rr**3*ufl.dot(ufl.grad(omega),ufl.grad(w)))*dx
    x = V.tabulate_dof_coordinates()
    cathode,anode,wall = contact_nodes(x,width,half_width)
    bcs = [fem.dirichletbc(PETSc.ScalarType(gauge),(2*cathode).astype(np.int32),V.sub(0)),
        fem.dirichletbc(PETSc.ScalarType(gauge+voltage),(2*anode).astype(np.int32),V.sub(0)),
        fem.dirichletbc(PETSc.ScalarType(0),(2*wall+1).astype(np.int32),V.sub(1))]
    problem = petsc.LinearProblem(form,fem.Constant(domain,PETSc.ScalarType(0))*q*dx,
        bcs=bcs,petsc_options={'ksp_type':'preonly','pc_type':'lu',
                             'ksp_diagonal_scale':True,'ksp_diagonal_scale_fix':True})
    state = problem.solve()
    if problem.solver.getConvergedReason()<=0:
        raise ArithmeticError(f'PETSc solve failed: KSP reason {problem.solver.getConvergedReason()}')
    raw = petsc.assemble_matrix(fem.form(form))
    raw.assemble()
    vector = raw.createVecRight()
    reaction = vector.duplicate()
    vector.array[:] = state.x.array
    raw.mult(vector,reaction)
    unit_current = float(np.sum(reaction.array[2*anode]))
    if not np.isfinite(unit_current) or unit_current==0:
        raise ArithmeticError('Nonzero finite contact current required')
    if target_current is not None:
        factor = target_current/unit_current
        state.x.array[0::2] = gauge+factor*(state.x.array[0::2]-gauge)
        state.x.array[1::2] *= factor
    state.x.scatter_forward()
    vector.array[:] = state.x.array
    raw.mult(vector,reaction)
    p,o = ufl.split(state)
    integrate = lambda e: float(fem.assemble_scalar(fem.form(e*dx)))
    joule = integrate(2*ufl.pi*rr*(TRANSVERSE*(p.dx(0)-magnetic*rr*o)**2+PARALLEL*p.dx(1)**2))
    viscous = integrate(2*ufl.pi*MU*rr**3*ufl.dot(ufl.grad(o),ufl.grad(o)))
    torque = integrate(2*ufl.pi*TRANSVERSE*magnetic*rr**2*(p.dx(0)-magnetic*rr*o))
    metrics = summarize(state.x.array[::2],state.x.array[1::2],x,cathode,anode,wall,
        reaction.array[::2],joule,viscous,torque,magnetic)
    free = np.setdiff1d(np.arange(len(state.x.array)),np.r_[2*cathode,2*anode,2*wall+1])
    metrics['linearResidualRelative'] = float(np.linalg.norm(reaction.array[free])/np.linalg.norm(reaction.array))
    metrics['wallTorqueResidualRelative'] = abs(float(np.sum(reaction.array[2*wall+1]))+torque)/max(abs(torque),1e-30)
    angular,potential = state.sub(1).collapse(),state.sub(0).collapse()
    for obj in (raw,vector,reaction):
        obj.destroy()
    return angular,potential,metrics


def skfem_solve(n,width,half_width,*,voltage=1.,gauge=0.,magnetic=.13,target_current=None):
    from scipy.sparse import bmat,diags
    from scipy.sparse.linalg import spsolve
    from skfem import Basis,BilinearForm,ElementQuad2,MeshQuad,asm
    r,z = drive_geometry(n,width,half_width,voltage,gauge,magnetic,target_current)
    basis = Basis(MeshQuad.init_tensor(r,z),ElementQuad2(),intorder=8)
    @BilinearForm
    def electric(u,v,w):
        return 2*np.pi*w.x[0]*(TRANSVERSE*u.grad[0]*v.grad[0]+PARALLEL*u.grad[1]*v.grad[1])
    @BilinearForm
    def coupling(u,v,w):
        return -2*np.pi*magnetic*TRANSVERSE*w.x[0]**2*u*v.grad[0]
    @BilinearForm
    def motional(u,v,w):
        return 2*np.pi*magnetic**2*TRANSVERSE*w.x[0]**3*u*v
    @BilinearForm
    def shear(u,v,w):
        return 2*np.pi*MU*w.x[0]**3*(u.grad[0]*v.grad[0]+u.grad[1]*v.grad[1])
    E,K,D,S = [asm(f,basis).tocsr() for f in (electric,coupling,motional,shear)]
    matrix = bmat([[E,K],[K.T,S+D]],format='csc')
    x = basis.doflocs.T
    cathode,anode,wall = contact_nodes(x,width,half_width)
    N = basis.N
    state = np.zeros(2*N)
    state[cathode],state[anode] = gauge,gauge+voltage
    constrained = np.r_[cathode,anode,N+wall]
    free = np.setdiff1d(np.arange(2*N),constrained)
    rhs = -(matrix@state)[free]
    reduced = matrix[free][:,free]
    scale = diags(1/np.sqrt(reduced.diagonal()))
    state[free] = scale@spsolve((scale@reduced@scale).tocsc(),scale@rhs)
    reaction = matrix@state
    unit_current = float(np.sum(reaction[anode]))
    if not np.isfinite(unit_current) or unit_current==0:
        raise ArithmeticError('Nonzero finite contact current required')
    if target_current is not None:
        factor = target_current/unit_current
        state[:N] = gauge+factor*(state[:N]-gauge)
        state[N:] *= factor
    phi,omega = state[:N],state[N:]
    reaction = matrix@state
    joule = float(phi@E@phi+2*phi@K@omega+omega@D@omega)
    viscous = float(omega@S@omega)
    torque = float(-np.sum(K.T@phi+D@omega))
    metrics = summarize(phi,omega,x,cathode,anode,wall,reaction[:N],joule,viscous,torque,magnetic)
    metrics['linearResidualRelative'] = float(np.linalg.norm(reaction[free])/np.linalg.norm(reaction))
    metrics['wallTorqueResidualRelative'] = abs(float(np.sum(reaction[N+wall]))+torque)/max(abs(torque),1e-30)
    return dict(basis=basis,omega=omega,potential=phi),metrics
