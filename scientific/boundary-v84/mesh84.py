"""Nested delta-ring regularization; numerical support is not an emission width."""
import importlib.util
from pathlib import Path
import numpy as np

_spec=importlib.util.spec_from_file_location('frozen_mesh83',Path(__file__).parents[1]/'regional-v83/mesh83.py')
base=importlib.util.module_from_spec(_spec); _spec.loader.exec_module(base)


def grid(m,refinement):
    if type(refinement) is not int or refinement not in (1,2,4,8): raise ValueError('Undeclared refinement')
    a,R,L,c,w=(m[k] for k in ('cathodeRadiusM','radiusM','halfLengthM','anodeCenterM','anodeWidthM'))
    if not 0<a<R or not 0<c-w/2<c<c+w/2<L: raise ValueError('Invalid source geometry')
    points=np.unique([0.,c-w/2,c,c+w/2,L-.004,L-.016,L-.04,L-.08,L])
    if points[0]!=0 or points[-1]!=L: raise ValueError('Cuts outside vessel')
    counts=np.maximum(2,np.ceil(np.diff(points)/.005).astype(int))*refinement
    return base.graded([0.,a,R],[4*refinement,28*refinement]),base.graded(points,counts)


def weights(coordinates,target):
    """Positive two-point weights preserve the physical source's first moment."""
    x=np.asarray(coordinates,dtype=float)
    if x.ndim!=1 or not np.isfinite(x).all() or not np.all(np.diff(x)>0) or not x[0]<target<x[-1]:
        raise ValueError('Source must be bracketed by increasing cell coordinates')
    hi=int(np.searchsorted(x,target)); lo=hi-1
    upper=(target-x[lo])/(x[hi]-x[lo])
    return np.array([lo,hi]),np.array([1-upper,upper])
