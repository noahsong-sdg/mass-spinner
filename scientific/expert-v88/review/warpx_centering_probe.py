"""Independent native-binary centering witness; run only in the WarpX guest."""
import json
import os
from pathlib import Path
import sys

import numpy as np
import reference as r
from pywarpx import geometry, libwarpx, particle_containers


mode = sys.argv[1]
if mode not in ('default', 'off'):
    raise ValueError('Unknown centering witness')
protocol = json.loads(Path('protocol.json').read_text())
c = r.config(protocol, 'orbit-coarse')
runner_hash = r.digest('reference.py')
out = Path.cwd()/'independent-centering'/mode
out.mkdir(parents=True, exist_ok=False)
os.chdir(out)
text = r.deck(c)
if mode == 'off':
    text += '\nwarpx.synchronize_velocity_for_diagnostics = 0\n'
Path('inputs').write_text(text)
geometry.dims = 'RZ'
libwarpx.initialize(['python', 'inputs'])
pcs = [particle_containers.ParticleContainerWrapper(name) for name in ('ionA', 'ionB')]
for s, pc in enumerate(pcs):
    x, y, z, u, w = r.initial(c, s)
    r.inject(pc, x, y, z, u, w)
before = [r.snapshot(pc, m, c) for pc, m in zip(pcs, r.MASSES)]
libwarpx.warpx.evolve(10)
after = [r.snapshot(pc, m, c) for pc, m in zip(pcs, r.MASSES)]
actual = float(libwarpx.warpx.gett_new(0))
libwarpx.finalize()
rows = []
for mass, initial, final in zip(r.MASSES, before, after):
    errors = {}
    for label, offset in (('sameTime', 0.), ('minusHalf', -.5), ('plusHalf', .5)):
        settings = c | {'end': actual+offset*c['dt']}
        position, velocity = r.exact_xy(initial[1], mass, settings)
        measured = final[1]['v'][:, 0]+1j*final[1]['v'][:, 1]
        errors[label] = dict(
            velocityRelative=float(np.sqrt(np.mean(abs(measured-velocity)**2))/np.sqrt(np.mean(abs(velocity)**2))),
            positionRelative=float(np.sqrt(np.mean(abs(final[1]['x']+1j*final[1]['y']-position)**2)))/r.RHI)
    rows.append(errors)
result = dict(mode=mode, actualTimeS=actual, dtS=c['dt'], runnerSHA256=runner_hash,
              rows=rows, interpretation='Binary response witness; not proof of exact packaged source commit')
Path('result.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result))
