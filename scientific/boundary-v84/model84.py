"""All-Neumann ideal-ring comparison; prescribed current, never a current fit.

Frozen V81 face laws with source Eq11 boundary flux instead of conducting ports.
The numerical source support shrinks with refinement. Contact voltage is not a
finite-electrode experimental prediction.
"""
import importlib.util
from pathlib import Path
import numpy as np
from scipy.sparse import bmat,coo_matrix,diags
from scipy.sparse.linalg import spsolve
from mesh84 import grid,weights

_spec=importlib.util.spec_from_file_location('face_laws84',Path(__file__).parents[1]/'flow-v81/solver.py')
laws=importlib.util.module_from_spec(_spec); _spec.loader.exec_module(laws)


def solve(m,refinement,fields,current=None,magnetic=None,gauge=0.):
    I=m['branchCurrentA'] if current is None else current; B=m['magneticT'] if magnetic is None else magnetic
    if not np.isfinite([I,B,gauge]).all() or I==0: raise ValueError('Finite nonzero prescribed current required')
    r,z=grid(m,refinement); rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
    nr,nz=len(rc),len(zc); n=nr*nz
    mu=laws.field(fields['viscosity'],rc,zc); parallel=1070*laws.field(fields['conductivity_shape'],rc,zc)
    beta=laws.field(fields['beta_field'],rc,zc,True); transverse=parallel/(1+beta**2)
    dr,dc,dv,tr,tc,tv,sr,sc,sv=[],[],[],[],[],[],[],[],[]; resistance=[]
    def wire(a,b,R,parts=()):
        k=len(resistance); dr.extend([k,k]); dc.extend([a,b]); dv.extend([1.,-1.]); resistance.append(R)
        for cell,t in parts: tr.append(k); tc.append(cell); tv.append(t)
    def shear(a,b,g):
        sr.append(a); sc.append(a); sv.append(g)
        if b is not None: sr.extend([b,a,b]); sc.extend([b,b,a]); sv.extend([g,-g,-g])
    for j in range(nz):
        dz=z[j+1]-z[j]
        for i in range(nr):
            a=j*nr+i; area=np.pi*(r[i+1]**2-r[i]**2); moment=np.pi/2*(r[i+1]**4-r[i]**4)
            if i+1<nr:
                b=a+1; f=r[i+1]
                wire(a,b,laws.radial_electric(rc[i],f,rc[i+1],dz,transverse[a],transverse[b]),
                     [(a,-B*(f*f-rc[i]**2)/2),(b,-B*(rc[i+1]**2-f*f)/2)])
                shear(a,b,1/laws.radial_shear(rc[i],f,rc[i+1],dz,mu[a],mu[b]))
            if j+1<nz:
                b=a+nr; f=z[j+1]
                wire(a,b,laws.axial_series(zc[j],f,zc[j+1],area,parallel[a],parallel[b]))
                shear(a,b,1/laws.axial_series(zc[j],f,zc[j+1],moment,mu[a],mu[b]))
            if i==nr-1: shear(a,None,1/laws.radial_shear(rc[i],r[-1],r[-1],dz,mu[a],mu[a]))
            if j==nz-1: shear(a,None,mu[a]*moment/(z[-1]-zc[j]))
    ci,cw=weights(rc**2,m['cathodeRadiusM']**2); aj,aw=weights(zc,m['anodeCenterM'])
    ports=[]
    for i,w in zip(ci,cw):
        cell=(nz-1)*nr+i; area=np.pi*(r[i+1]**2-r[i]**2)
        ports.append(dict(kind='cathode',cell=int(cell),amp=float(I*w),
                          halfR=float((z[-1]-zc[-1])/(area*parallel[cell])),torqueWeight=0.))
    for j,w in zip(aj,aw):
        cell=j*nr+nr-1; dz=z[j+1]-z[j]
        ports.append(dict(kind='anode',cell=int(cell),amp=float(-I*w),
                          halfR=float(np.log(r[-1]/rc[-1])/(2*np.pi*dz*transverse[cell])),
                          torqueWeight=float(-B*(r[-1]**2-rc[-1]**2)/2)))
    charge=np.zeros(n); external_torque=np.zeros(n)
    for p in ports: charge[p['cell']]+=p['amp']; external_torque[p['cell']]+=p['torqueWeight']*p['amp']
    D=coo_matrix((dv,(dr,dc)),shape=(len(resistance),n)).tocsr()
    T=coo_matrix((tv,(tr,tc)),shape=(len(resistance),n)).tocsr()
    S=coo_matrix((sv,(sr,sc)),shape=(n,n)).tocsr(); G=diags(1/np.asarray(resistance))
    A=D.T@G@D; C=D.T@G@T
    matrix=bmat([[A,-C],[-C.T,S+T.T@G@T]],format='csc'); rhs=np.r_[-charge,external_torque]
    reduced=matrix[1:,1:]; scale=diags(1/np.sqrt(reduced.diagonal()))
    answer=np.r_[0.,scale@spsolve((scale@reduced@scale).tocsc(),scale@rhs[1:])]
    if not np.isfinite(answer).all(): raise ArithmeticError('Nonfinite ring solution')
    phi,omega=answer[:n]+gauge,answer[n:]; amps=np.asarray(G@(D@phi-T@omega))
    for p in ports: p['potentialV']=float(phi[p['cell']]-p['amp']*p['halfR']-p['torqueWeight']*omega[p['cell']])
    Q=float(np.asarray(resistance)@amps**2+sum(p['amp']**2*p['halfR'] for p in ports))
    W=float(omega@S@omega); P=float(-sum(p['amp']*p['potentialV'] for p in ports))
    torque=float(sum(T.T@amps+external_torque)); expected=B*I*(r[-1]**2-m['cathodeRadiusM']**2)/2
    result=dict(r=r,z=z,omega=omega.reshape(nz,nr),potential=phi.reshape(nz,nr),ports=ports,currentA=float(I),
        electrodePowerW=P,jouleW=Q,viscousW=W,driveTorqueNm=torque,sourceMomentTorqueNm=float(expected),
        chargeResidualRelative=float(max(abs(D.T@amps+charge)))/abs(I),
        powerResidualRelative=abs(P-Q-W)/max(abs(P),Q+abs(W)),
        torqueResidualRelative=abs(torque-expected)/max(abs(expected),abs(torque),np.finfo(float).tiny),
        linearResidualRelative=float(np.linalg.norm(matrix@answer-rhs))/np.linalg.norm(rhs),
        prescribedCurrent=True,absoluteCurrentPrediction=False,correctedVoltagePrediction=False,
        cathodeSupportM=[float(r[ci[0]]),float(r[ci[-1]+1])],anodeSupportM=[float(z[aj[0]]),float(z[aj[-1]+1])])
    result['chordVelocityMS']=laws.observe(result,m['chordsM'])
    return result
