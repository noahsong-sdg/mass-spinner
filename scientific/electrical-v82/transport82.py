"""Conditional electron-collision covariance; no current or velocity fitting.

The source's 1 and 2.5 eV diffuse-mode alternatives are retained. Density,
heavy-particle temperature, ion Hall parameter, Coulomb logarithm and the
electron-neutral cross section remain fixed. This is not a discharge closure.
"""
import importlib.util
from pathlib import Path
import numpy as np

_spec=importlib.util.spec_from_file_location('frozen_transport_v81',Path(__file__).parents[1]/'flow-v81/transport.py')
base=importlib.util.module_from_spec(_spec); _spec.loader.exec_module(base)
E=1.602176634e-19
ME=9.1093837139e-31
B=0.13
QEN=4.e-20
NEUTRAL_ENDPOINTS_M3=(4.3e20,45.e20)
PARTITIONS=('source','electron-ion-only','uniform-20pct')
SCENARIOS=tuple(dict(name=shape+'-'+label,shape=shape,electronTemperatureEV=te,partition=partition,
                    leadingWeakIonization=leading)
    for shape in ('linear','quadratic') for label,te,partition,leading in (
        ('v81-leading-te1',1.,'source',True),('finite-te1',1.,'source',False),
        ('finite-te2.5-source',2.5,'source',False),('finite-te2.5-ei-only',2.5,'electron-ion-only',False),
        ('finite-te2.5-uniform20',2.5,'uniform-20pct',False)))


def collision_gain(electron_temperature_ev,neutral_fraction):
    """Fixed-lnΛ electron-ion T^-3/2 plus fixed-Qen neutral T^1/2 rates."""
    t,f=np.broadcast_arrays(np.asarray(electron_temperature_ev,dtype=float),np.asarray(neutral_fraction,dtype=float))
    if not np.isfinite(t).all() or np.any(t<=0) or not np.isfinite(f).all() or np.any((f<0)|(f>=1)):
        raise ValueError('Positive finite Te and 0 <= collision fraction < 1 required')
    return 1./((1.-f)*t**-1.5+f*np.sqrt(t))


def profile(shape,radius_m,electron_temperature_ev=1.,partition='source',leading_weak_ionization=False):
    """Cellwise positive fields for the ten frozen conditional scenarios.

    Radius may be scalar or any array shape. An axial extension is a separate
    campaign assumption. The neutral mass fraction is distinct from the
    collision fraction. Single ionization and equal neutral/ion Ar masses are
    assumed; electron density is implied by the original sigma/beta endpoints.
    """
    if (partition not in PARTITIONS or electron_temperature_ev not in (1.,2.5)
            or not isinstance(leading_weak_ionization,bool)):
        raise ValueError('Declare a source/control partition and Te of 1 or 2.5 eV')
    r=np.asarray(radius_m,dtype=float)
    original=base.source_collision_profile(shape,r)
    x=np.minimum(r/.05,1.)**(2 if shape=='quadratic' else 1)
    neutral=NEUTRAL_ENDPOINTS_M3[0]+np.diff(NEUTRAL_ENDPOINTS_M3)[0]*x
    nu_total_1=E*B/(ME*original['electronBeta'])
    nu_en_source_1=neutral*QEN*np.sqrt(8*E/(np.pi*ME))
    source_fraction=nu_en_source_1/nu_total_1
    if not np.isfinite(source_fraction).all() or np.any((source_fraction<0)|(source_fraction>=1)):
        raise ValueError('Source neutral collisions must fit the total reference rate')
    fraction=(source_fraction if partition=='source' else np.zeros_like(r)
              if partition=='electron-ion-only' else np.full_like(r,.2))
    gain=collision_gain(electron_temperature_ev,fraction)
    sigma=original['sourceParallelSM']*gain
    electron=original['electronBeta']*gain; ion=original['ionBeta']
    implied_electron_density=original['sourceParallelSM']*B/(E*original['electronBeta'])
    neutral_mass_fraction=np.ones_like(r) if leading_weak_ionization else neutral/(neutral+implied_electron_density)
    slip=neutral_mass_fraction**2*electron*ion
    denominator=(1.+slip)**2+electron**2
    temperature,mu=base.profile(shape+'-nominal',r)
    nu_ei_1=nu_total_1*(1.-fraction); nu_en_1=nu_total_1*fraction
    return dict(sigmaParallelSM=sigma,effectiveBeta=np.sqrt(slip+electron**2/(1.+slip)),
        viscosityPaS=mu,heavyTemperatureK=temperature,
        pedersenSM=sigma*(1.+slip)/denominator,hallSM=sigma*electron/denominator,
        electronBeta=electron,ionBeta=ion,ionSlipFactor=slip,
        impliedElectronDensityM3=implied_electron_density,neutralMassFraction=neutral_mass_fraction,
        neutralDensityM3=neutral,sourceNeutralCollisionFraction=source_fraction,
        neutralCollisionFractionUsed=fraction,electronConductivityGain=gain,
        referenceTotalElectronRateS=nu_total_1,sourceReferenceNeutralRateS=nu_en_source_1,
        referenceElectronIonRateS=nu_ei_1,referenceElectronNeutralRateS=nu_en_1,
        electronIonRateS=nu_ei_1*electron_temperature_ev**-1.5,
        electronNeutralRateS=nu_en_1*np.sqrt(electron_temperature_ev))
