"""Missing-force compatibility diagnostics, never a circulation-velocity model."""
import numpy as np
KB=1.380649e-23
AR_MASS=39.948*1.66053906660e-27


def assess(r,z,omega,temperature):
    """Centrifugal-only acceleration curl, conditional on prescribed fields.

    Pressure can balance pure rotation without secondary flow only with suitable
    density/thermal and Lorentz forces. Neither is inferred from this diagnostic.
    The stationary endwall is an assumed boundary; derivatives may be unresolved.
    """
    r,z,w=[np.asarray(v,dtype=float) for v in (r,z,omega)]
    rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
    if (r[0]!=0 or z[0]!=0 or np.any(np.diff(r)<=0) or np.any(np.diff(z)<=0)
            or len(zc)<3 or w.shape!=(len(zc),len(rc))
            or not all(np.isfinite(v).all() for v in (r,z,w))):
        raise ValueError('Ordered cylindrical cells and finite angular speed required')
    t=np.broadcast_to(np.asarray(temperature,dtype=float),w.shape)
    if not np.isfinite(t).all() or np.any(t<=0): raise ValueError('Positive prescribed temperature required')
    acceleration=rc[None,:]*w*w
    curl=np.gradient(acceleration,zc,axis=0,edge_order=2)
    volume=np.pi*np.diff(r*r)[None,:]*np.diff(z)[:,None]
    radial_measure=np.diff(r*r)/2
    loop=float(radial_measure@(w[0]**2-w[-1]**2))
    wall_loop=float(radial_measure@w[0]**2)
    mach=abs(rc[None,:]*w)/np.sqrt((5/3)*KB*t/AR_MASS)
    return dict(centrifugalAccelerationMaxMS2=float(np.max(acceleration)),
                centrifugalCurlMaxS2=float(np.max(abs(curl))),
                centrifugalCurlVolumeRmsS2=float(np.sqrt(np.sum(curl**2*volume)/np.sum(volume))),
                midToLastCellLoopM2S2=loop,midToStationaryWallLoopM2S2=wall_loop,
                prescribedTemperatureMachMax=float(np.max(mach)),circulationVelocityPredicted=False,
                scope='Centrifugal-only; omits density/baroclinic and Hall radial force. Not experimental qualification.')
