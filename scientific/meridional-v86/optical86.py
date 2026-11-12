"""Frozen brightness/thermal alternatives with resolved two-sided radial Doppler motion.

Emission is the measured brightness-conditioned V80 field, not an advected
material tracer. No target velocity enters this API. New LOS quadrature has
its own refinement gate; the old rotation-only source files are unchanged.
"""
import importlib.util
from pathlib import Path

import numpy as np

V80=Path(__file__).parents[1]/'optical-v80'


def load(name,file):
    spec=importlib.util.spec_from_file_location(name,file)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


emission80=load('emission_v80_for86',V80/'emissivity.py')
spectrum80=load('spectrum_v80_for86',V80/'spectrum.py')
feasible80=load('feasible_v80_for86',V80/'feasible.py')
TEMPERATURES=(1400,1800,2900,5950,7250,'linear')
INSTRUMENTS=(0.,500.,1000.)


def fields(radial_edges,omega,radial_velocity):
    e,w,u=[np.asarray(x,dtype=float) for x in (radial_edges,omega,radial_velocity)]
    if (e.ndim!=1 or len(e)<2 or w.shape!=(len(e)-1,) or u.shape!=w.shape
            or not all(np.isfinite(x).all() for x in (e,w,u)) or e[0]!=0
            or np.any(np.diff(e)<=0)):
        raise ValueError('Finite matched radial edges, angular and radial velocities required')
    return e,w,u


def components(emission_edges,emission,velocity_edges,omega,radial_velocity,impact,order=8):
    """Exact annular photon paths; quadrature only resolves ur*x/r.

    Positive impact retains V80's +b*Omega convention. The radial sign is a
    choice of sightline direction and cancels in the symmetric centroid.
    Returned radii retain V80's common-annulus thermal-proxy locations, so
    enabling infinitesimal ur does not change the imposed temperature model.
    """
    r,w,u=fields(velocity_edges,omega,radial_velocity)
    if not isinstance(order,int) or order<2: raise ValueError('LOS quadrature order >=2 required')
    e,f=[np.asarray(x,dtype=float) for x in (emission_edges,emission)]
    # Reuse the frozen admission/path law, including empty-chord rejection.
    legacy=spectrum80.components(e,f,r,w,impact)
    if np.all(u==0): return legacy
    edges=np.unique(np.r_[e,r]); mid=(edges[:-1]+edges[1:])/2
    ei=np.searchsorted(e,mid,side='right')-1
    vi=np.searchsorted(r,mid,side='right')-1
    roots=np.sqrt(np.maximum(edges**2-impact**2,0))
    length=np.diff(roots); keep=(length>0)&(f[ei]>0)
    lo,hi=roots[:-1][keep],roots[1:][keep]
    nodes,gauss=np.polynomial.legendre.leggauss(order)
    x=(lo[:,None]+hi[:,None])/2+(hi-lo)[:,None]*nodes/2
    projection=x/np.sqrt(x*x+impact*impact)
    shift=u[vi[keep],None]*projection
    center=impact*w[vi[keep],None]+np.zeros_like(shift)
    weight=(hi-lo)[:,None]*gauss/2*f[ei[keep],None]
    means=np.stack((center-shift,center+shift),axis=-1)
    weights=np.repeat(weight[:,:,None],2,axis=-1)
    radii=np.broadcast_to(mid[keep,None,None],means.shape)
    return weights.ravel(),means.ravel(),radii.ravel()


def spectrum(weights,means,temperature,bins,instrument_sigma=0.):
    """Same SciPy-CDF bin integral as V80, accumulated in bounded-memory blocks."""
    w,u,t,bins=[np.asarray(x,dtype=float) for x in (weights,means,temperature,bins)]
    t=np.broadcast_to(t,u.shape)
    if (w.shape!=u.shape or u.ndim!=1 or not len(u) or bins.ndim!=1 or len(bins)<4
            or not all(np.isfinite(x).all() for x in (w,u,t,bins)) or np.any(w<0)
            or np.any(t<=0) or not np.isfinite(instrument_sigma) or instrument_sigma<0):
        raise ValueError('Finite matched photon, temperature and spectral inputs required')
    widths=np.diff(bins)
    if np.any(widths<=0) or not np.allclose(widths,widths[0],rtol=1e-10,atol=1e-12):
        raise ValueError('Uniform increasing spectral bins required')
    pairs,inverse=np.unique(np.column_stack((u,t)),axis=0,return_inverse=True)
    combined=np.bincount(inverse,weights=w); total=float(sum(combined))
    if not np.isfinite(total) or total<=0: raise ValueError('Positive finite emitted flux required')
    sigma=np.sqrt(spectrum80.KB*pairs[:,1]/spectrum80.AR_MASS+instrument_sigma**2)
    if widths[0]>min(sigma)/8: raise ValueError('Bins underresolve the narrowest component')
    masses=np.zeros(len(bins)-1)
    for start in range(0,len(pairs),256):
        chunk=slice(start,start+256); mu=pairs[chunk,0]; sd=sigma[chunk]
        cdf=spectrum80.ndtr((bins[:,None]-mu)/sd)
        masses+=np.diff(cdf,axis=0)@(combined[chunk]/total)
    fractions=combined/total; centroid=float(fractions@pairs[:,0])
    centers=(np.asarray(bins[:-1])+np.asarray(bins[1:]))/2; step=bins[1]-bins[0]
    k=int(np.argmax(masses))
    if k in (0,len(masses)-1): raise ValueError('Spectral maximum is clipped by window')
    denominator=masses[k-1]-2*masses[k]+masses[k+1]
    correction=.5*(masses[k-1]-masses[k+1])/denominator if denominator else 0.
    variance=float(fractions@(spectrum80.KB*pairs[:,1]/spectrum80.AR_MASS+(pairs[:,0]-centroid)**2)+instrument_sigma**2)
    return dict(centroidMS=centroid,modeMS=float(centers[k]+step*correction),
        capturedFlux=float(sum(masses)),binCentroidMS=float(centers@masses/sum(masses)),
        varianceM2S2=variance,binCentersMS=centers,photonFractions=masses)


def temperature_proxy(label,radii):
    return 5950+(1800-5950)*np.minimum(radii/.05,1) if label=='linear' else label


def predict(radial_edges,omega,radial_velocity,brightness,locations,
            meshes=(64,128,256),bin_sizes=(10.,5.,2.5),los_orders=(2,4,8),spectrum_fn=spectrum):
    """One midplane state; all 72 frozen estimator alternatives, without selection."""
    e,w,ur=fields(radial_edges,omega,radial_velocity)
    locations=[dict(id=p['id'],radiusM=float(p['radiusM'])) for p in locations]
    if (len(meshes)<2 or len(bin_sizes)<2 or len(los_orders)<2
            or any(a>=b for a,b in zip(meshes,meshes[1:]))
            or any(a<=b for a,b in zip(bin_sizes,bin_sizes[1:]))
            or any(a>=b for a,b in zip(los_orders,los_orders[1:]))):
        raise ValueError('Increasing optical/LOS and decreasing spectral refinements required')
    b=np.array([p['radiusM'] for p in brightness]); intensity=np.array([p['brightness'] for p in brightness])
    lower,upper=np.array([p['brightnessExtractionRange'] for p in brightness]).T
    reconstructions=[]; closures=[]; lp_bounds=[]
    omit=lambda s:{k:v for k,v in s.items() if k not in ('binCentersMS','photonFractions')}
    def relative(a,b): return abs(a-b)/max(abs(a),1e-12)
    for closure in ('linear','sqrt'):
        runs=[dict(mesh=n,**emission80.reconstruct(b,intensity,e[-1],n,closure)) for n in meshes]
        reconstructions.extend(runs); centroids=[]; spectra=[]
        for rec in runs:
            values=[]
            for p in locations:
                cw,cu,_=components(rec['radialEdgesM'],rec['emissivity'],e,w,ur,p['radiusM'],los_orders[-1])
                values.append(float(cw@cu/sum(cw)))
            centroids.append(dict(mesh=rec['mesh'],velocityMS=values))
        rec=runs[-1]
        for p in locations:
            args=(rec['radialEdgesM'],rec['emissivity'],e,w,ur,p['radiusM'])
            lw,lu,lr=components(*args,los_orders[-1])
            coarse=runs[-2]
            cw,cu,cr=components(coarse['radialEdgesM'],coarse['emissivity'],e,w,ur,p['radiusM'],los_orders[-1])
            quadratures=[components(*args,order) for order in los_orders[:-1]]
            for temperature in TEMPERATURES:
                for instrument in INSTRUMENTS:
                    refinements=[]
                    for step in bin_sizes:
                        bins=np.linspace(-12000,12000,round(24000/step)+1)
                        value=spectrum_fn(lw,lu,temperature_proxy(temperature,lr),bins,instrument)
                        refinements.append(dict(binWidthMS=step,**omit(value)))
                    coarse_spectrum=spectrum_fn(cw,cu,temperature_proxy(temperature,cr),bins,instrument)
                    optical_change={k:relative(refinements[-1][k],coarse_spectrum[k]) for k in ('modeMS','varianceM2S2')}
                    change=max(relative(refinements[-1][k],refinements[-2][k]) for k in ('centroidMS','modeMS'))
                    los=[]
                    for order,(qw,qu,qr) in zip(los_orders[:-1],quadratures):
                        los.append(dict(order=order,**omit(spectrum_fn(qw,qu,temperature_proxy(temperature,qr),bins,instrument))))
                    los.append(dict(order=los_orders[-1],**refinements[-1]))
                    los_change={k:relative(los[-1][k],los[-2][k]) for k in ('modeMS','varianceM2S2')}
                    spectra.append(dict(id=p['id'],temperatureK=temperature,instrumentSigmaMS=instrument,
                        refinements=refinements,finalRelativeChange=change,opticalMeshRelativeChanges=optical_change,
                        coarseOpticalSpectrum={k:coarse_spectrum[k] for k in ('centroidMS','modeMS','varianceM2S2','capturedFlux')},
                        opticalSpectrumMeshGate=bool(all(v<.01 for v in optical_change.values())),
                        fluxGate=bool(all(abs(s['capturedFlux']-1)<1e-8 for s in refinements+los)),
                        spectralGate=bool(change<.01),losQuadrature=los,losQuadratureRelativeChanges=los_change,
                        losQuadratureGate=bool(all(v<.01 for v in los_change.values()))))
        closures.append(dict(edgeClosure=closure,centroidMeshes=centroids,spectra=spectra))
    # Radial Doppler terms cancel in the symmetric centroid for every annulus;
    # unchanged brightness-only LP moments therefore remain exactly applicable.
    for n in meshes:
        _,edges=emission80.optical_grid(e[-1],n); A=emission80.path_matrix(b,edges); points=[]
        for p in locations:
            path=emission80.path_matrix([p['radiusM']],edges)[0]
            moment=spectrum80.projected_moment(edges,e,w,p['radiusM'])
            points.append(dict(id=p['id'],**feasible80.centroid_bounds(A,lower,upper,path,moment)))
        lp_bounds.append(dict(mesh=n,points=points))
    return dict(experimentalQualification=False,targetVelocityRead=False,brightness=brightness,locations=locations,
        reconstructions=reconstructions,cases=[dict(beta='meridional-current',voltageV=None,refinement=4,
            closures=closures,brightnessBounds=lp_bounds)],selectedSpectrum=None,
        losScope='Axisymmetric two-sided radial plus azimuthal Doppler motion; fixed brightness-conditioned emission and six frozen thermal proxies, not evolved plasma emissivity or local gas thermometry.',
        lpScope='Unchanged symmetric centroid moments with brightness constraints; no spectral-mode LP bound')
