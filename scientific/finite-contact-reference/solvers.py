"""Independent finite-boundary Q2 assemblies of conditional charge/torsional flow.

Equations follow public-fenicsx-reference and nonrigid-v98/fem98.py. Only
geometry/coefficients are shared between implementations; loads and operators
are assembled by their respective maintained finite-element libraries.
"""
import numpy as np
from contacts import R, L, A, C, MU, PARALLEL, TRANSVERSE, geometry


def dolfinx_solve(n, width, half_width, current=100., magnetic=.13):
    import basix.ufl
    import ufl
    from dolfinx import fem, mesh
    from dolfinx.fem import petsc
    from mpi4py import MPI
    from petsc4py import PETSc
    if MPI.COMM_WORLD.size != 1:
        raise ValueError('Serial reference required')
    r,z,ca,aa,expected = geometry(n,width,half_width,current,magnetic)
    coordinates = np.array([[rr,zz] for rr in r for zz in z])
    index = lambda i,j: i*len(z)+j
    cells = np.array([[index(i,j),index(i+1,j),index(i,j+1),index(i+1,j+1)]
                      for i in range(len(r)-1) for j in range(len(z)-1)],dtype=np.int64)
    domain = mesh.create_mesh(MPI.COMM_WORLD,cells,coordinates,
        ufl.Mesh(basix.ufl.element('Lagrange','quadrilateral',1,shape=(2,))))
    V = fem.functionspace(domain,basix.ufl.element('Lagrange','quadrilateral',2,shape=(2,)))
    if V.dofmap.index_map_bs != 2:
        raise ValueError('Expected two interleaved unknowns')
    phi,omega = ufl.TrialFunctions(V)
    q,w = ufl.TestFunctions(V)
    rr = ufl.SpatialCoordinate(domain)[0]
    dx = ufl.Measure('dx',domain=domain,metadata={'quadrature_degree':8})
    form = (2*ufl.pi*rr*(TRANSVERSE*(phi.dx(0)-magnetic*rr*omega)
             *(q.dx(0)-magnetic*rr*w)+PARALLEL*phi.dx(1)*q.dx(1))
            +2*ufl.pi*MU*rr**3*ufl.dot(ufl.grad(omega),ufl.grad(w)))*dx
    # locate_entities_boundary requires all facet vertices inside each support.
    eps = 1e-13
    cathode = mesh.locate_entities_boundary(domain,1,lambda x:
        np.isclose(x[1],L,rtol=0,atol=eps)&(x[0]>=A-eps)&(x[0]<=A+width+eps))
    anode = mesh.locate_entities_boundary(domain,1,lambda x:
        np.isclose(x[0],R,rtol=0,atol=eps)&(x[1]>=C-half_width-eps)&(x[1]<=C+half_width+eps))
    facets = np.r_[cathode,anode]
    order = np.argsort(facets)
    tags = mesh.meshtags(domain,1,facets[order],
        np.r_[np.ones(len(cathode)),np.full(len(anode),2)].astype(np.int32)[order])
    ds = ufl.Measure('ds',domain=domain,subdomain_data=tags,metadata={'quadrature_degree':8})
    source_form = current*2*ufl.pi*rr*q/aa*ds(2)-current*2*ufl.pi*rr*q/ca*ds(1)
    nodes = V.tabulate_dof_coordinates()
    walls = np.flatnonzero(np.isclose(nodes[:,0],R)|np.isclose(nodes[:,1],L))
    gauge = np.flatnonzero(np.isclose(nodes[:,0],0)&np.isclose(nodes[:,1],0))
    bcs = [fem.dirichletbc(PETSc.ScalarType(0),(2*walls+1).astype(np.int32),V.sub(1)),
           fem.dirichletbc(PETSc.ScalarType(0),(2*gauge).astype(np.int32),V.sub(0))]
    matrix = petsc.assemble_matrix(fem.form(form),bcs=bcs)
    matrix.assemble()
    load = petsc.assemble_vector(fem.form(source_form))
    load.ghostUpdate(addv=PETSc.InsertMode.ADD_VALUES,mode=PETSc.ScatterMode.REVERSE)
    physical_load = load.copy()
    petsc.set_bc(load,bcs)
    scale = matrix.getDiagonal()
    scale.array[:] = 1/np.sqrt(scale.array)
    matrix.diagonalScale(scale,scale)
    load.pointwiseMult(scale,load)
    answer = load.duplicate()
    ksp = PETSc.KSP().create(MPI.COMM_WORLD)
    ksp.setOperators(matrix)
    ksp.setType('preonly')
    ksp.getPC().setType('lu')
    ksp.solve(load,answer)
    if ksp.getConvergedReason() <= 0:
        raise ArithmeticError('PETSc solve failed')
    residual = load.duplicate()
    matrix.mult(answer,residual)
    residual.axpy(-1,load)
    linear = residual.norm()/load.norm()
    answer.pointwiseMult(scale,answer)
    solution = fem.Function(V)
    solution.x.array[:] = answer.array
    solution.x.scatter_forward()
    p,o = ufl.split(solution)
    integrate = lambda e: float(fem.assemble_scalar(fem.form(e)))
    joule = integrate(2*ufl.pi*rr*(TRANSVERSE*(p.dx(0)-magnetic*rr*o)**2+PARALLEL*p.dx(1)**2)*dx)
    viscous = integrate(2*ufl.pi*MU*rr**3*ufl.dot(ufl.grad(o),ufl.grad(o))*dx)
    torque = integrate(2*ufl.pi*TRANSVERSE*magnetic*rr**2*(p.dx(0)-magnetic*rr*o)*dx)
    ac = integrate(current*2*ufl.pi*rr/aa*ds(2))
    cc = integrate(-current*2*ufl.pi*rr/ca*ds(1))
    av = integrate(2*ufl.pi*rr*p/aa*ds(2))
    cv = integrate(2*ufl.pi*rr*p/ca*ds(1))
    power = physical_load.dot(answer)
    metrics = budgets(joule,viscous,power,torque,expected,current,ac,cc,av,cv,linear)
    source_moment = integrate(current*2*ufl.pi*rr**3/aa*ds(2)-current*2*ufl.pi*rr**3/ca*ds(1))
    exact_moment = current*(R*R-(A*A+(A+width)**2)/2)
    metrics['sourceMomentResidualRelative'] = abs(source_moment-exact_moment)/abs(exact_moment)
    # Boundary angular reactions require the unconstrained variational operator.
    raw = petsc.assemble_matrix(fem.form(form))
    raw.assemble()
    reaction = answer.duplicate()
    raw.mult(answer,reaction)
    wall_torque = float(np.sum(reaction.array[2*walls+1]))
    metrics['wallTorqueResidualRelative'] = abs(wall_torque+torque)/max(abs(expected),1e-30)
    angular = solution.sub(1).collapse()
    potential = solution.sub(0).collapse()
    ksp.destroy()
    for obj in (matrix,load,physical_load,scale,answer,residual,raw,reaction):
        obj.destroy()
    return angular,potential,metrics


def skfem_solve(n,width,half_width,current=100.,magnetic=.13):
    from scipy.sparse import bmat,diags
    from scipy.sparse.linalg import spsolve
    from skfem import Basis,FacetBasis,BilinearForm,LinearForm,ElementQuad2,MeshQuad,asm
    r,z,ca,aa,expected = geometry(n,width,half_width,current,magnetic)
    grid = MeshQuad.init_tensor(r,z)
    basis = Basis(grid,ElementQuad2(),intorder=8)
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
    @LinearForm
    def area(v,w):
        return 2*np.pi*w.x[0]*v
    eps = 1e-13
    # facets_satisfying uses facet midpoints; conforming physical edges make this exact.
    cathode = grid.facets_satisfying(lambda x: np.isclose(x[1],L,rtol=0,atol=eps)
        &(x[0]>A)&(x[0]<A+width),boundaries_only=True)
    anode = grid.facets_satisfying(lambda x: np.isclose(x[0],R,rtol=0,atol=eps)
        &(x[1]>C-half_width)&(x[1]<C+half_width),boundaries_only=True)
    cathode_load = -current/ca*asm(area,FacetBasis(grid,ElementQuad2(),facets=cathode,intorder=8))
    anode_load = current/aa*asm(area,FacetBasis(grid,ElementQuad2(),facets=anode,intorder=8))
    load = cathode_load+anode_load
    N = basis.N
    rhs = np.r_[load,np.zeros(N)]
    wall = basis.get_dofs(lambda x: np.isclose(x[0],R)|np.isclose(x[1],L)).all()
    keep = np.setdiff1d(np.arange(2*N),np.r_[0,N+wall])
    reduced = matrix[keep][:,keep]
    scale = diags(1/np.sqrt(reduced.diagonal()))
    state = np.zeros(2*N)
    state[keep] = scale@spsolve((scale@reduced@scale).tocsc(),scale@rhs[keep])
    if not np.isfinite(state).all():
        raise ArithmeticError('Nonfinite finite-element solution')
    phi,omega = state[:N],state[N:]
    joule = float(phi@E@phi+2*phi@K@omega+omega@D@omega)
    viscous = float(omega@S@omega)
    torque = float(-np.sum(K.T@phi+D@omega))
    residual = matrix@state-rhs
    metrics = budgets(joule,viscous,float(load@phi),torque,expected,current,
        float(np.sum(anode_load)),float(np.sum(cathode_load)),
        float(anode_load@phi/current),float(-cathode_load@phi/current),
        float(np.linalg.norm(residual[keep])/np.linalg.norm(rhs[keep])))
    moment = float(load@basis.doflocs[0]**2)
    exact_moment = current*(R*R-(A*A+(A+width)**2)/2)
    metrics['sourceMomentResidualRelative'] = abs(moment-exact_moment)/abs(exact_moment)
    metrics['wallTorqueResidualRelative'] = abs(float(np.sum(residual[N+wall]))+torque)/max(abs(expected),1e-30)
    return dict(basis=basis,omega=omega,potential=phi),metrics


def budgets(joule,viscous,power,torque,expected,current,ac,cc,av,cv,linear):
    return dict(jouleW=joule,viscousW=viscous,electrodePowerW=float(power),
        portVoltageV=float(power/current),anodeMeanPotentialV=av,cathodeMeanPotentialV=cv,
        driveTorqueNm=torque,sourceMomentTorqueNm=expected,
        anodeSourceA=ac,cathodeSourceA=cc,linearResidualRelative=linear,
        sourceResidualRelative=max(abs(ac-current),abs(cc+current),abs(ac+cc))/abs(current),
        voltageResidualRelative=abs(power/current-(av-cv))/max(abs(power/current),1e-30),
        powerResidualRelative=abs(power-joule-viscous)/max(abs(power),abs(joule)+abs(viscous)),
        torqueResidualRelative=abs(torque-expected)/max(abs(expected),1e-30))
