"""Frozen D-stage decomposition using native stress and active FiPy receipts."""
import hashlib
import numpy as np
from source_commutator107 import common_input, restrict, decomposition
from source_response107 import STEPS, statistics


def split(flow, diffusion, q, dt):
    if dt not in STEPS:
        raise ValueError('Undeclared probe step')
    incoming = q.copy()
    before = flow.primitive(q)
    after, receipt = diffusion.advance(q, dt)
    if not np.array_equal(q, incoming):
        raise ValueError('Native D mutated its incoming state')
    np.testing.assert_array_equal(after[[0, 5]], q[[0, 5]])
    def cell(name):
        return np.asarray(receipt[name]).reshape(flow.volume.shape)
    # Recover the actual intermediate state from the production momentum and
    # stress-work receipt, before its ordered conduction stage. No alternate solve.
    stress = after.copy()
    stress[4] = q[4]+cell('stressRedistributionJ')
    intermediate = flow.primitive(stress)
    capacity = 1.5*1.380649e-23*(q[5]/flow.masses[0]+(q[0]-q[5])/flow.masses[1])
    temperature, _ = diffusion.conduct(before['thermalJ'].ravel(), capacity.ravel(), dt)
    direct_heat = capacity*np.asarray(temperature).reshape(capacity.shape)-before['thermalJ']
    thermal_stress = cell('viscousHeatJ')+cell('numericalHeatJ')
    ordered_heat = cell('thermalRedistributionJ')
    volume_step = flow.volume*dt
    fields = {
        'stressRadialForceNM3': (stress[1]-q[1])/volume_step,
        'stressAxialForceNM3': (stress[2]-q[2])/volume_step,
        'stressTorqueNmM3': (stress[3]-q[3])/volume_step,
        'stressEnergyWM3': cell('stressRedistributionJ')/volume_step,
        'viscousHeatWM3': cell('viscousHeatJ')/volume_step,
        'numericalHeatWM3': cell('numericalHeatJ')/volume_step,
        'orderedConductionWM3': ordered_heat/volume_step,
        'incomingConductionWM3': direct_heat/volume_step,
        'conductionOrderInteractionWM3': (ordered_heat-direct_heat)/volume_step,
        'stressPressureRatePaS': (2/3)*thermal_stress/volume_step,
        'conductionPressureRatePaS': (2/3)*ordered_heat/volume_step,
        'combinedPressureRatePaS': (2/3)*(thermal_stress+ordered_heat)/volume_step,
    }
    if any(not np.isfinite(v).all() for v in fields.values()):
        raise ValueError('Nonfinite decomposed response')
    checks = dict(inputSHA256=hashlib.sha256(q.tobytes()).hexdigest(),
        inputBitwisePreserved=True, massSpeciesBitwisePreserved=True,
        maximumStressThermalIdentityJ=float(np.max(abs(
            intermediate['thermalJ']-before['thermalJ']-thermal_stress))),
        maximumEnergyReconstructionJ=float(np.max(abs(
            after[4]-(q[4]+cell('stressRedistributionJ')+ordered_heat)))),
        stressEnergySumJ=float(np.sum(cell('stressRedistributionJ'))),
        conductionEnergySumJ=float(np.sum(ordered_heat)),
        nativeThermalLinearResidualJ=float(receipt['thermalLinearResidualJ']),
        nativeEnergyResidualJ=float(receipt['energyResidualJ']))
    return fields, checks


def restrict_fields(coarse, fine, fields):
    """Conservatively restrict intensive rates through their extensive content."""
    return {name: restrict(coarse, fine, value*fine.volume)/coarse.volume
            for name, value in fields.items()}


def compare(coarse, diffusion, qc, fine, qf, fine_response, dt):
    rqf, mapping = common_input(coarse, fine, qf)
    native, nr = split(coarse, diffusion, qc, dt)
    common, cr = split(coarse, diffusion, rqf, dt)
    ff, fr = fine_response
    if fr['inputSHA256'] != hashlib.sha256(qf.tobytes()).hexdigest():
        raise ValueError('Cached fine state mismatch')
    restricted = restrict_fields(coarse, fine, ff)
    terms = {name: {} for name in ('total', 'archivedInputDifference', 'restrictionCommutator')}
    maximum_closure = {}
    for key in native:
        parts = decomposition(native[key], common[key], restricted[key])
        for name, values in parts.items():
            terms[name][key] = values
        maximum_closure[key] = float(np.max(abs(
            parts['total']-parts['archivedInputDifference']-parts['restrictionCommutator'])))
    return dict(regionalTerms={name: statistics(coarse, fields) for name, fields in terms.items()},
        commonInputMapping=mapping, algebraMaximumAbsolute=maximum_closure,
        nativeRegions=statistics(coarse, native),
        receipts=dict(coarse=nr, common=cr, fine=fr))
