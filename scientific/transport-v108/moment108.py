"""NONCONSERVATIVE thermal-preserving diagnostic; never an evolution method."""
import hashlib
import numpy as np
from source_commutator107 import common_input, restrict
from source_response107 import STEPS, statistics
from transport108 import restrict_fields


def thermal_companion(coarse, fine, q):
    """Preserve R thermal energy instead of R total energy; report that offset.

    Mass, momenta and species stay exactly equal to conservative restriction.
    This diagnostic intentionally changes total energy and cannot be adopted
    as a conservative state restriction or a production transport correction.
    """
    restricted, mapping = common_input(coarse, fine, q)
    pc, pf = coarse.primitive(restricted), fine.primitive(q)
    target = restrict(coarse, fine, pf['thermalJ'])
    companion = restricted.copy()
    companion[4] = target+pc['kineticJ']
    pt = coarse.primitive(companion)
    np.testing.assert_array_equal(companion[[0, 1, 2, 3, 5]], restricted[[0, 1, 2, 3, 5]])
    offset = companion[4]-restricted[4]
    receipt = dict(scope='Nonconservative diagnostic companion; no production adoption',
        conservativeMapping=mapping, energyOffsetJ=float(offset.sum()),
        maximumThermalReconstructionResidualJ=float(np.max(abs(pt['thermalJ']-target))),
        regionalOffset=statistics(coarse, {'totalEnergyOffsetJM3': offset/coarse.volume,
            'pressureOffsetPa': pt['pressurePa']-pc['pressurePa']}))
    return restricted, companion, receipt


def heat_response(flow, diffusion, q, h):
    """Call the active conduct hook, with incoming capacities; do not run stress."""
    if h not in STEPS:
        raise ValueError('Undeclared heat-probe step')
    before = q.copy()
    p = flow.primitive(q)
    capacity = 1.5*1.380649e-23*(q[5]/flow.masses[0]+(q[0]-q[5])/flow.masses[1])
    temperature, _ = diffusion.conduct(p['thermalJ'].ravel(), capacity.ravel(), h)
    change = capacity*np.asarray(temperature).reshape(capacity.shape)-p['thermalJ']
    rate = change/(flow.volume*h)
    if not np.array_equal(q, before) or not np.isfinite(rate).all():
        raise ValueError('Heat probe mutated input or returned nonfinite rates')
    return {'incomingConductionWM3': rate}, dict(
        inputSHA256=hashlib.sha256(q.tobytes()).hexdigest(),
        dtS=h, inputBitwisePreserved=True, thermalEnergyResidualJ=float(change.sum()))


def diagnose(coarse, dc, fine, qf, fine_response, h):
    rq, qt, mapping = thermal_companion(coarse, fine, qf)
    conservative, cr = heat_response(coarse, dc, rq, h)
    companion, tr = heat_response(coarse, dc, qt, h)
    ff, fr = fine_response
    if fr['inputSHA256'] != hashlib.sha256(qf.tobytes()).hexdigest() or fr['dtS'] != h:
        raise ValueError('Stale fine heat response')
    restricted = restrict_fields(coarse, fine, ff)['incomingConductionWM3']
    hc, ht = conservative['incomingConductionWM3'], companion['incomingConductionWM3']
    fields = dict(fullDifferenceWM3=hc-restricted,
        restrictionThermalizationWM3=hc-ht, thermalPreservingRemainderWM3=ht-restricted)
    closure = fields['fullDifferenceWM3']-fields['restrictionThermalizationWM3']-fields['thermalPreservingRemainderWM3']
    return dict(scope='Nonconservative companion diagnostic, not a pure operator error or new gate',
        mapping=mapping, regions=statistics(coarse, fields),
        algebraMaximumAbsoluteWM3=float(np.max(abs(closure))),
        receipts=dict(conservative=cr, companion=tr, fine=fr))
