"""Fixed-conductivity electrical challenges; no target-speed conditioning."""
import importlib.util
from pathlib import Path
import numpy as np
from transport82 import profile

HERE=Path(__file__).parent


def load(name,file):
    spec=importlib.util.spec_from_file_location(name,file)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


solver=load('v81_electrical_solver',HERE.parent/'flow-v81/solver.py')
reference=load('v81_electrical_reference',HERE.parent/'flow-v81/reference.py')


def properties(scenario):
    def field(key):
        return lambda r,z: profile(scenario['shape'],r,scenario['electronTemperatureEV'],
            scenario['partition'],scenario['leadingWeakIonization'])[key]+z*0
    return dict(viscosity=field('viscosityPaS'),conductivity_shape=lambda r,z:field('sigmaParallelSM')(r,z)/1070.,
                beta_field=field('effectiveBeta'))


def scaled_state(state,gain):
    """Exact fixed-current solution of the same linear, fixed-property problem."""
    if not np.isfinite(gain) or gain<=0: raise ValueError('Positive fixed-current scaling required')
    return dict(r=state['r'],z=state['z'],omega=state['omega']*gain,potential=state['potential']*gain,
                currentsA={k:v*gain for k,v in state['currentsA'].items()},
                electrodePowerW=state['electrodePowerW']*gain**2,jouleW=state['jouleW']*gain**2,
                viscousW=state['viscousW']*gain**2)
