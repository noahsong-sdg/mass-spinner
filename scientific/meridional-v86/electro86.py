"""Finite-contact, current-conditioned Hall source; positive Hall magnitude.

Backward Euler solves charge and both transverse momenta together.  Electrical
properties are prescribed: this is not ionization/electron-energy closure.
Neumann cathode disk is a declared regularization of an unknown hollow-cathode
footprint.  Every current, force and heat term shares the same series segments.
"""
import numpy as np
from scipy.sparse import bmat, coo_matrix, diags
from scipy.sparse.linalg import spsolve


class Electro:
    def __init__(self, flow, sigmaP, hall, sigmaParallel, B, current,
                 cathodeRadius=.004, anodeCenter=.07, anodeWidth=.02):
        self.flow, self.B, self.current = flow, float(B), float(current)
        self.p, self.h, self.parallel = [flow.field(v).ravel() for v in (sigmaP, hall, sigmaParallel)]
        if (not np.isfinite([B, current, cathodeRadius, anodeCenter, anodeWidth]).all()
                or np.any(self.p <= 0) or np.any(self.parallel <= 0)
                or not 0 < cathodeRadius < flow.r[-1]
                or not 0 < anodeCenter-anodeWidth/2 < anodeCenter+anodeWidth/2 < flow.z[-1]):
            raise ValueError('Positive conductivity and finite contained contact geometry required')
        f, n, nr, nz = flow, flow.count, flow.nr, flow.nz
        rc, zc = f.mean_r, (f.z[:-1]+f.z[1:])/2
        edges, segments = [], []
        self.ports = []
        def radial(cell, lo, hi, dz):
            return (cell, np.log(hi/lo)/(2*np.pi*dz*self.p[cell]),
                    -B*(hi*hi-lo*lo)/2, B*self.h[cell]/self.p[cell]*(hi-lo))
        for j in range(nz):
            dz = f.z[j+1]-f.z[j]
            for i in range(nr):
                a = j*nr+i
                if i+1 < nr:
                    edges.append((a,a+1)); face = f.r[i+1]
                    segments.append([radial(a,rc[i],face,dz),radial(a+1,face,rc[i+1],dz)])
                if j+1 < nz:
                    area = np.pi*(f.r[i+1]**2-f.r[i]**2); face = f.z[j+1]
                    edges.append((a,a+nr))
                    segments.append([(a,(face-zc[j])/(area*self.parallel[a]),0.,0.),
                                     (a+nr,(zc[j+1]-face)/(area*self.parallel[a+nr]),0.,0.)])
        overlap = np.maximum(0., np.minimum(f.r[1:],cathodeRadius)**2-f.r[:-1]**2)
        for i in np.flatnonzero(overlap):
            cell = (nz-1)*nr+i; area = np.pi*(f.r[i+1]**2-f.r[i]**2)
            self.ports.append(dict(kind='cathode',cell=int(cell),amp=float(current*overlap[i]/cathodeRadius**2),
                                   halfR=float((f.z[-1]-zc[-1])/(area*self.parallel[cell])),t=0.,m=0.))
        overlap = np.maximum(0.,np.minimum(f.z[1:],anodeCenter+anodeWidth/2)-np.maximum(f.z[:-1],anodeCenter-anodeWidth/2))
        for j in np.flatnonzero(overlap):
            cell = j*nr+nr-1
            _, R, t, m = radial(cell,rc[-1],f.r[-1],f.z[j+1]-f.z[j])
            self.ports.append(dict(kind='anode',cell=int(cell),amp=float(-current*overlap[j]/anodeWidth),halfR=R,t=t,m=m))
        row, col, val, tr, tc, tv, mr, mc, mv = [],[],[],[],[],[],[],[],[]
        resistance = []
        for k, ((a,b), parts) in enumerate(zip(edges,segments)):
            row.extend([k,k]); col.extend([a,b]); val.extend([1.,-1.])
            resistance.append(sum(s[1] for s in parts))
            for cell, R, t, m in parts:
                tr.append(k); tc.append(cell); tv.append(t)
                mr.append(k); mc.append(cell); mv.append(m)
        # Each face has its two ordered series halves. Keep only the numeric
        # heat data; advance need not retain/walk the nested Python tuples.
        self._segment_cells = np.array([s[0] for parts in segments for s in parts], dtype=int)
        self._segment_resistance = np.array([s[1] for parts in segments for s in parts])
        self._segment_hall = np.array([s[3] for parts in segments for s in parts])
        shape = (len(edges),n)
        self.D = coo_matrix((val,(row,col)),shape=shape).tocsr()
        self.T = coo_matrix((tv,(tr,tc)),shape=shape).tocsr()
        self.M = coo_matrix((mv,(mr,mc)),shape=shape).tocsr()
        self.R = np.asarray(resistance); self.G = diags(1/self.R)
        self.K = B*B*(self.p+self.h*self.h/self.p)*f.volume.ravel()
        # Geometry and conductivity are prescribed; only mass/dt changes later.
        D, T, M, G = self.D, self.T, self.M, self.G
        self._blocks = (D.T@G@D, D.T@G@T, D.T@G@M,
                        T.T@G@T, T.T@G@M, M.T@G@M)
        self.charge, self.torque, self.force = np.zeros((3,n))
        for port in self.ports:
            a, amp = port['cell'],port['amp']
            self.charge[a] += amp; self.torque[a] += amp*port['t']; self.force[a] += amp*port['m']

    def steady_torsion(self, diffusion):
        """Zero-meridional steady current/swirl; no thermal/pressure equilibrium."""
        from scipy.sparse import csr_matrix
        f,n = self.flow,self.flow.count
        free = np.setdiff1d(diffusion.velocity.nodal_dofs[2], diffusion.fixed)
        lookup = {int(v):i for i,v in enumerate(free)}
        P = csr_matrix((np.ones(n),(np.arange(n),[lookup[int(v)] for v in diffusion.vdofs[2]])),shape=(n,len(free)))
        S = diffusion.stiffness[free][:,free]; D,T,G = self.D,self.T@P,self.G
        C = D.T@G@T
        matrix = bmat([[D.T@G@D,-C],[-C.T,S+T.T@G@T]],format='csc')
        rhs = np.r_[-self.charge,P.T@self.torque]
        reduced = matrix[1:,1:]; scale = diags(1/np.sqrt(reduced.diagonal()))
        answer = np.r_[0.,scale@spsolve((scale@reduced@scale).tocsc(),scale@rhs[1:])]
        if not np.isfinite(answer).all(): raise ArithmeticError('Nonfinite torsional initialization')
        return (P@answer[n:]).reshape(f.nz,f.nr),answer[:n].reshape(f.nz,f.nr)

    def advance(self, q, dt):
        if isinstance(dt,bool) or not np.isfinite(dt) or dt <= 0:
            raise ValueError('Positive finite source timestep required')
        f = self.flow; old = f.primitive(q); n = f.count
        mass = q[0].ravel(); inertia = (q[0]*f.mean_r2).ravel()
        D,T,M,G = self.D,self.T,self.M,self.G
        A,C,F,W,H,U = self._blocks
        matrix = bmat([[A,-C,F],[-C.T,diags(inertia/dt)+W,-H],
                       [-F.T,H.T,diags(mass/dt+self.K)-U]],format='csc')
        rhs = np.r_[-self.charge,inertia/dt*old['omegaRadS'].ravel()+self.torque,
                    mass/dt*old['vrMPS'].ravel()+self.force]
        keep = np.arange(1,3*n); reduced = matrix[keep][:,keep]
        scale = diags(1/np.sqrt(abs(reduced.diagonal())))
        answer = np.r_[0.,scale@spsolve((scale@reduced@scale).tocsc(),scale@rhs[keep])]
        if not np.isfinite(answer).all(): raise ArithmeticError('Nonfinite Hall solve')
        phi,w,u = np.split(answer,3); amps = np.asarray(G@(D@phi-T@w+M@u))
        torque = np.asarray(T.T@amps)+self.torque
        force = np.asarray(M.T@amps)+self.force-self.K*u
        heat = self.K*u*u
        half_amps = np.repeat(amps, 2)
        np.add.at(heat, self._segment_cells,
            half_amps*half_amps*self._segment_resistance
            -2*half_amps*self._segment_hall*u[self._segment_cells])
        ports = []
        for port in self.ports:
            a,I,R,t,m = (port[k] for k in ('cell','amp','halfR','t','m'))
            heat[a] += I*I*R-2*I*m*u[a]
            ports.append({**port,'potentialV':float(phi[a]-I*R-t*w[a]+m*u[a])})
        scale_q = max(float(np.max(abs(heat))),np.finfo(float).tiny)
        if np.min(heat) < -1e-10*scale_q: raise ArithmeticError('Negative physical Ohmic heat')
        work = dt*(w*torque+u*force)
        out = q.copy(); out[1] = (mass*u).reshape(f.nz,f.nr); out[3] = (inertia*w).reshape(f.nz,f.nr)
        out[4] += (dt*heat+work).reshape(f.nz,f.nr)
        new = f.primitive(out)
        defect = .5*(mass*(u-old['vrMPS'].ravel())**2+inertia*(w-old['omegaRadS'].ravel())**2)
        external = -dt*sum(p['amp']*p['potentialV'] for p in ports)
        receipt = dict(potentialV=phi.tolist(),faceCurrentA=amps.tolist(),ports=ports,
            jouleByCellJ=(dt*heat).tolist(),mechanicalWorkByCellJ=work.tolist(),BEdefectByCellJ=defect.tolist(),
            externalWorkJ=float(external),energyResidualJ=float(np.sum(out[4]-q[4])-external),
            chargeResidualA=float(np.max(abs(D.T@amps+self.charge))),
            linearResidualRelative=float(np.linalg.norm(matrix@answer-rhs)/max(np.linalg.norm(rhs),1e-300)),
            minimumTemperatureK=float(new['temperatureK'].min()),prescribedCurrent=True,absoluteCurrentPrediction=False)
        return out,receipt
