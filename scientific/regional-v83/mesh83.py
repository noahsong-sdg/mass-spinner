"""Nested electrode-edge meshes; frozen V81 equations and independent assembly."""
import importlib.util
from pathlib import Path
import numpy as np

HERE=Path(__file__).parent


def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


transport=load('transport_for_v83',HERE.parent/'electrical-v82/transport82.py')


def access_depth(scenario,m):
    p=transport.profile(scenario['shape'],0.,scenario['electronTemperatureEV'],scenario['partition'],scenario['leadingWeakIonization'])
    value=float(m['cathodeRadiusM']*np.sqrt(1+p['effectiveBeta']**2))
    if not 0<value<m['halfLengthM']: raise ValueError('Access depth must lie inside the half vessel')
    return value


def graded(points,counts):
    pieces=[]
    for a,b,n in zip(points[:-1],points[1:],counts):
        t=np.arange(n,dtype=float)/n
        pieces.append(a+(b-a)*(1-np.cos(np.pi*t))/2)
    edges=np.r_[*pieces,points[-1]]
    if not np.isfinite(edges).all() or not np.all(np.diff(edges)>0): raise ValueError('Invalid graded mesh')
    return edges


def grid(m,radial,axial,depth):
    if radial not in (1,2,4,8) or axial not in (1,2,4,8): raise ValueError('Undeclared mesh refinement')
    a,R,L=m['cathodeRadiusM'],m['radiusM'],m['halfLengthM']
    zpoints=np.unique([0.,m['anodeCenterM']-m['anodeWidthM']/2,m['anodeCenterM']+m['anodeWidthM']/2,
                       L-.004,L-.016,L-.04,L-.08,L-depth,L])
    if zpoints[0]!=0 or zpoints[-1]!=L or not np.all(np.diff(zpoints)>0): raise ValueError('Cuts outside domain')
    counts=np.maximum(2,np.ceil(np.diff(zpoints)/.005).astype(int))*axial
    return graded([0.,a,R],[4*radial,28*radial]),graded(zpoints,counts)


def operators(m,radial,axial,depth):
    """Independent module instances; no mutation of frozen source or global grids."""
    primary=load('primary_v83',HERE.parent/'flow-v81/solver.py')
    reference=load('reference_v83',HERE.parent/'flow-v81/reference.py')
    r,z=grid(m,radial,axial,depth)
    def primary_grid(request,ref):
        if request!=m or ref!=1: raise ValueError('Unexpected primary grid request')
        return r.copy(),z.copy()
    def reference_segments(points,counts):
        points=np.asarray(points)
        expected_r=[0,m['cathodeRadiusM'],m['radiusM']]
        expected_z=[0,m['anodeCenterM']-m['anodeWidthM']/2,m['anodeCenterM']+m['anodeWidthM']/2,m['halfLengthM']]
        if points.shape==(3,) and np.array_equal(points,expected_r) and list(counts)==[4,28]: return r.copy()
        if points.shape==(4,) and np.array_equal(points,expected_z) and list(counts)==[12,4,32]: return z.copy()
        raise ValueError('Unexpected independent grid request')
    primary.grid=primary_grid; reference._segments=reference_segments
    return primary,reference
