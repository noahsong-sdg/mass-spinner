"""Optional bounded Gaussian-mixture Fourier bin integrator, not a V86 integration.

Uses NumPy/SciPy characteristic functions and irfft. Fourier truncation and
period images have analytic probability bounds; the stated floating-point
budget assumes standard floating-point arithmetic, not a certified FFT proof.
No measured velocity enters this kernel; no probability renormalization.
"""
import numpy as np
from scipy.fft import irfft
from scipy.special import erfc,erfcinv,ndtr

KB=1.380649e-23
AR_MASS=39.948*1.66053906660e-27
PROBABILITY_TOLERANCE=1e-14


def spectrum(weights,means,temperature,bin_edges,instrument_sigma=0.):
    w,u,t,edges=[np.asarray(x,dtype=float) for x in (weights,means,temperature,bin_edges)]
    t=np.broadcast_to(t,u.shape)
    if (w.ndim!=1 or u.shape!=w.shape or not len(w) or edges.ndim!=1 or len(edges)<4
            or not all(np.isfinite(x).all() for x in (w,u,t,edges)) or np.any(w<0)
            or np.any(t<=0) or not np.isfinite(instrument_sigma) or instrument_sigma<0):
        raise ValueError('Finite matched photon/temperature inputs required')
    # Match V86's exact component grouping, ordering and normalization before
    # any approximation, including duplicate mean/temperature components.
    pairs,inverse=np.unique(np.column_stack((u,t)),axis=0,return_inverse=True)
    w=np.bincount(inverse,weights=w); u,t=pairs[:,0],pairs[:,1]
    total=float(sum(w)); widths=np.diff(edges)
    if not np.isfinite(total) or total<=0: raise ValueError('Positive emitted flux required')
    if np.any(widths<=0) or not np.allclose(widths,widths[0],rtol=1e-10,atol=1e-12):
        raise ValueError('Uniform increasing spectral bins required')
    fractions=w/total; sigma=np.sqrt(KB*t/AR_MASS+instrument_sigma**2)
    step=float(widths[0]); n=len(widths); padded=4*n; period=4*(edges[-1]-edges[0])
    if step>min(sigma)/8: raise ValueError('Bins underresolve the narrowest component')
    center=(edges[0]+edges[-1])/2
    # The original window lies wholly inside this centered fundamental period;
    # every periodic image entering it is bounded by true mass outside the period.
    image_bound=float(fractions@(ndtr((center-period/2-u)/sigma)+ndtr((u-center-period/2)/sigma)))
    if image_bound>=PROBABILITY_TOLERANCE:
        raise ValueError('Four-period Gaussian image probability is unresolved')
    root_a=np.sqrt(2)*np.pi*float(min(sigma))/period
    # Sum_{m>M} exp(-a*m^2) <= integral_M^infty exp(-a*x^2) dx.
    # Multiplication by 2/padded and n bounds summed absolute bin error.
    prefactor=n/padded*np.sqrt(np.pi)/root_a
    argument=PROBABILITY_TOLERANCE/prefactor
    maximum=max(1,int(np.ceil(erfcinv(min(argument,1.))/root_a)))
    if maximum>=padded//2: raise ValueError('Spectral grid cannot resolve Fourier cutoff')
    truncation_bound=float(prefactor*erfc(root_a*maximum))
    k=2*np.pi*np.arange(maximum+1)/period
    characteristic=np.zeros(maximum+1,dtype=complex)
    for start in range(0,len(w),2048):
        chunk=slice(start,start+2048)
        characteristic+=np.exp(-.5*(k[:,None]*sigma[chunk])**2-1j*k[:,None]*u[chunk])@fractions[chunk]
    coefficient=characteristic*np.sinc(k*step/(2*np.pi))*np.exp(1j*k*(edges[0]+step/2))
    coefficient[0]=1.
    transform=np.zeros(padded//2+1,dtype=complex); transform[:maximum+1]=coefficient
    masses=irfft(transform,n=padded)[:n]
    # Conservative operation-count budget under standard floating-point error
    # assumptions, including phase/width evaluation, component sums and FFT.
    operations=8*len(w)+32*np.ceil(np.log2(padded))+64*(1+max(abs(k[-1]*u))+max((k[-1]*sigma)**2))
    product=float(operations*np.finfo(float).eps)
    if product>=.01: raise ValueError('Floating-point error budget is unresolved')
    roundoff_bound=float(product/(1-product)*(1+2*sum(abs(coefficient[1:])))/padded)
    per_bin_bound=roundoff_bound+truncation_bound/n+image_bound
    if float(min(masses)) < -per_bin_bound:
        raise ArithmeticError('Negative Fourier probability exceeds roundoff budget')
    removed_negative=float(-sum(masses[masses<0])); masses=np.maximum(masses,0.)
    if float(max(masses))<=4*per_bin_bound:
        raise ValueError('No spectral maximum resolved above Fourier error budget')
    # Resolve FFT-near-tied maxima by exact original CDF probabilities. This
    # preserves the original first-maximum convention for bimodal spectra.
    candidates=np.flatnonzero(masses>=max(masses)-2*per_bin_bound)
    def exact(indices):
        indices=np.asarray(indices,dtype=int)
        result=np.zeros(len(indices))
        # Same 256-component block order as optical86.spectrum. Raw input
        # ordering or an unblocked dot product can flip nearly tied modes.
        for start in range(0,len(w),256):
            chunk=slice(start,start+256); mu=u[chunk]; sd=sigma[chunk]
            upper=ndtr((edges[indices+1,None]-mu)/sd)
            lower=ndtr((edges[indices,None]-mu)/sd)
            result+=(upper-lower)@(w[chunk]/total)
        return result
    exact_candidates=exact(candidates); peak=int(candidates[np.argmax(exact_candidates)])
    if peak in (0,n-1): raise ValueError('Spectral maximum is clipped by window')
    left,middle,right=exact([peak-1,peak,peak+1]); denominator=left-2*middle+right
    correction=.5*(left-right)/denominator if denominator!=0 else 0.
    centers=(edges[:-1]+edges[1:])/2
    centroid=float(fractions@u)
    captured=float(fractions@(ndtr((edges[-1]-u)/sigma)-ndtr((edges[0]-u)/sigma)))
    error_budget=n*roundoff_bound+truncation_bound+image_bound+removed_negative
    if abs(float(sum(masses))-captured)>error_budget:
        raise ArithmeticError('Fourier/CDF captured probability exceeds error budget')
    return dict(centroidMS=centroid,modeMS=float(centers[peak]+step*correction),capturedFlux=captured,
        binCentroidMS=float(centers@masses/sum(masses)),
        varianceM2S2=float(fractions@(KB*t/AR_MASS+(u-centroid)**2)+instrument_sigma**2),
        binCentersMS=centers,photonFractions=masses,
        fourier=dict(periodMS=float(period),frequencyCount=maximum+1,truncationProbabilityBound=truncation_bound,
            imageProbabilityBound=image_bound,floatingPointProbabilityBound=roundoff_bound,
            removedNegativeProbability=removed_negative,totalProbabilityErrorBudget=float(error_budget),
            modeCandidateCount=len(candidates),probabilityRenormalized=False))
