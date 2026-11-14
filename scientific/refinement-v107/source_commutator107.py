"""Common-input restriction commutators; counterfactual diagnostics, not gates."""
import hashlib
import numpy as np
from source_response107 import BOUNDS, STEPS, statistics as regional_statistics

TIMES = [0., 1e-6, 2e-6, 4e-6]
CHANNELS = ('massKgS', 'radialMomentumN', 'axialMomentumN',
            'angularTorqueNm', 'energyW', 'speciesKgS')


def require(ok, message):
    if not ok:
        raise ValueError(message)


def restrict(coarse, fine, values):
    """Sum extensive radial children, preserving axial cells; never volume-average."""
    values = np.asarray(values)
    require(fine.nr >= coarse.nr and fine.nr % coarse.nr == 0, 'Require nested radial levels')
    ratio = fine.nr//coarse.nr
    require(np.array_equal(coarse.z, fine.z) and
            np.array_equal(coarse.r, fine.r[::ratio]), 'Require identical axial and nested radial edges')
    require(values.shape[-2:] == fine.volume.shape and np.isfinite(values).all(), 'Invalid fine field')
    return values.reshape(*values.shape[:-1], coarse.nr, ratio).sum(axis=-1)


def common_input(coarse, fine, q):
    pf = fine.primitive(q)
    collapsed = restrict(coarse, fine, q)
    pc = coarse.primitive(collapsed)  # Reject nonpositive collapsed thermal energy; no repair.
    pressure_difference = pc['pressurePa']-restrict(coarse, fine, pf['pressurePa']*fine.volume)/coarse.volume
    receipt = dict(inventoryDifference=(collapsed.sum(axis=(1, 2))-q.sum(axis=(1, 2))).tolist(),
        thermalChangeJ=float(np.sum(pc['thermalJ']-restrict(coarse, fine, pf['thermalJ']))),
        kineticChangeJ=float(np.sum(pc['kineticJ']-restrict(coarse, fine, pf['kineticJ']))),
        inertiaChangeKgM2=float(np.sum(collapsed[0]*coarse.mean_r2)-np.sum(q[0]*fine.mean_r2)),
        pressureDifferenceRMSPa=float(np.sqrt(np.sum(coarse.volume*pressure_difference**2)/coarse.volume.sum())),
        regionalMapping=regional_statistics(coarse, dict(pressureDifferencePa=pressure_difference,
            thermalDifferenceJM3=(pc['thermalJ']-restrict(coarse, fine, pf['thermalJ']))/coarse.volume,
            kineticDifferenceJM3=(pc['kineticJ']-restrict(coarse, fine, pf['kineticJ']))/coarse.volume)))
    return collapsed, receipt


def source_step(flow, operator, q, h, kind):
    require(h in STEPS and kind in ('electromagnetic', 'stressHeat'), 'Undeclared source step')
    flow.primitive(q); before = q.copy()
    after, receipt = operator.advance(q, h)
    require(np.array_equal(q, before), 'Source mutated incoming state')
    for index in ((0, 2, 5) if kind == 'electromagnetic' else (0, 5)):
        require(np.array_equal(q[index], after[index]), 'Source changed a native invariant')
    flow.primitive(after)
    rate = (after-q)/h
    require(np.isfinite(rate).all(), 'Nonfinite source rate')
    scalars = {key: float(value) for key, value in receipt.items()
               if isinstance(value, (float, int, np.number))}
    require(all(np.isfinite(v) for v in scalars.values()), 'Nonfinite source receipt')
    return rate, dict(inputBitwisePreserved=True, nativeInvariantsBitwisePreserved=True,
                      inputSHA256=hashlib.sha256(q.tobytes()).hexdigest(),
                      nativeScalarReceipt=scalars)


def decomposition(native_coarse, common_coarse, restricted_fine):
    return dict(total=native_coarse-restricted_fine,
                archivedInputDifference=native_coarse-common_coarse,
                restrictionCommutator=common_coarse-restricted_fine)


def statistics(values, volume):
    return {name: dict(signedIntegral=float(value.sum()), absoluteIntegral=float(abs(value).sum()),
        perVolumeRMS=float(np.sqrt(np.sum(value**2/volume)/volume.sum())),
        maximumAbsolutePerVolume=float(np.max(abs(value)/volume)))
        for name, value in zip(CHANNELS, values)}


def regions(flow, values):
    return regional_statistics(flow, {name+'PerM3': value/flow.volume
                                      for name, value in zip(CHANNELS, values)})


def archived(flow, state, snapshot):
    require(np.array_equal(flow.r, state['radialEdgesM']) and
            np.array_equal(flow.z, state['axialEdgesM']), 'State/operator geometry mismatch')
    q = np.asarray(snapshot['q'], dtype=float)
    for name, value in flow.primitive(q).items():
        require(np.array_equal(value, snapshot[name]), 'Saved primitive mismatch: '+name)
    return q


def freeze_sources(flow, diffusion, electro, state):
    """Small rate cache; caller can discard large fine operators before coarse assembly."""
    require([s['timeS'] for s in state['snapshots']] == TIMES, 'Require all four archived clocks')
    cached = {}
    for snapshot in state['snapshots']:
        q = archived(flow, state, snapshot)
        for kind, operator in (('electromagnetic', electro), ('stressHeat', diffusion)):
            for h in STEPS:
                cached[snapshot['timeS'], kind, h] = source_step(flow, operator, q, h, kind)
    return cached


def diagnose(fc, dc, ec, coarse_state, ff, fine_state, fine_cache):
    """Caller supplies independently admitted/sealed V107 full states and native operators.

    Use ring_flux107.read_case for source/packet/field seals. Recreate operators
    from the frozen campaign inputs and verify initialized q0 before calling.
    First freeze_sources on the fine grid, then discard its large operators;
    ff retains only geometry. Caller must pin provenance of any persisted cache.
    """
    require(all([s['timeS'] for s in state['snapshots']] == TIMES
                for state in (coarse_state, fine_state)), 'Require all four archived clocks')
    rows = []
    for sc, sf in zip(coarse_state['snapshots'], fine_state['snapshots']):
        qc, qf = archived(fc, coarse_state, sc), archived(ff, fine_state, sf)
        try:
            rqf, mapping = common_input(fc, ff, qf)
        except ValueError as error:
            raise ValueError(f'Common-input restriction rejected at {sc["timeS"]} s: {error}') from error
        for kind, oc in (('electromagnetic', ec), ('stressHeat', dc)):
            previous = None
            for h in STEPS:
                nc, cr = source_step(fc, oc, qc, h, kind)
                cc, rr = source_step(fc, oc, rqf, h, kind)
                nf, fr = fine_cache[sc['timeS'], kind, h]
                require(np.asarray(nf).shape == qf.shape and np.isfinite(nf).all(), 'Invalid staged fine rate')
                require(fr['inputSHA256'] == hashlib.sha256(qf.tobytes()).hexdigest(), 'Staged input mismatch')
                terms = decomposition(nc, cc, restrict(fc, ff, nf))
                closure = terms['total']-(terms['archivedInputDifference']+terms['restrictionCommutator'])
                row = dict(timeS=sc['timeS'], source=kind, dtS=h, commonInputMapping=mapping,
                    nativeReceipts=dict(archivedCoarse=cr, restrictedInputCoarse=rr, archivedFine=fr),
                    terms={name: statistics(value, fc.volume) for name, value in terms.items()},
                    regionalTerms={name: regions(fc, value) for name, value in terms.items()},
                    algebraClosure=statistics(closure, fc.volume))
                if previous is not None:
                    row['halfStepDifference'] = {name: statistics(value-previous[name], fc.volume)
                                                 for name, value in terms.items()}
                    row['regionalHalfStepDifference'] = {name: regions(fc, value-previous[name])
                                                        for name, value in terms.items()}
                rows.append(row); previous = terms
    return dict(scope='Common-input restriction commutator, not pure operator error or qualification',
        restriction='All six extensive channels summed over nested radial children; no volume weights',
        caveat='Collapsed moments alter resolved inertia/kinetic/thermal energy and pressure; '
               'the common input is not a primitive-preserving projection. Small-step subtraction '
               'can amplify roundoff. Algebra closure is descriptive, not a new gate.',
        thermalOperator='Native FVDiffusion active FiPy heat; no inactive FE heat reconstruction',
        regionBoundsM=BOUNDS,
        regionalInterpretation='Exact cell-intersection allocations of piecewise-constant rate densities; '
            'overlapping regions are nonadditive, not cut-boundary fluxes or convergence norms. '
            'PerM3 fields divide CHANNELS units by m³; signed regional integrals recover CHANNELS units.',
        channels=list(CHANNELS), snapshots=rows)
