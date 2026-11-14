"""Frozen-state split responses: counterfactual probes, never trajectory attribution."""
import numpy as np

from ring_flux107 import R_QUERY, Z_QUERY, project

STEPS = (1e-12, 5e-13)
BOUNDS = dict(domain=(0., .06, 0., .24), core=(0., .04, 0., .20),
              endwall=(0., .06, .22, .24), ring=(.012, .024, .220, .238),
              densityRing=(.016, .019, .225, .237))


def region_volumes(f, bounds):
    """Exact cylinder/rectangle intersections; cell values remain piecewise constant."""
    r0, r1, z0, z1 = bounds
    radial = np.maximum(0., np.minimum(f.r[1:], r1)**2-np.maximum(f.r[:-1], r0)**2)
    axial = np.maximum(0., np.minimum(f.z[1:], z1)-np.maximum(f.z[:-1], z0))
    return np.pi*axial[:, None]*radial[None, :]


def statistics(f, fields):
    result = {}
    for name, bounds in BOUNDS.items():
        weights = region_volumes(f, bounds)
        volume = float(weights.sum())
        if volume <= 0:
            raise ValueError('Required physical region is absent')
        result[name] = dict(volumeM3=volume, fields={key: dict(
            signedIntegral=float(np.sum(value*weights)),
            mean=float(np.sum(value*weights)/volume),
            rms=float(np.sqrt(np.sum(value**2*weights)/volume)),
            maximumAbsolute=float(np.max(abs(value[weights > 0]))))
            for key, value in fields.items()})
    return result


def response(f, operator, q, dt, kind):
    """Use actual implicit operator receipts, including active FiPy heat transport."""
    if kind not in ('electromagnetic', 'stressHeat') or dt not in STEPS:
        raise ValueError('Undeclared source or timestep')
    before = q.copy()
    old = f.primitive(q)
    advanced, receipt = operator.advance(q, dt)
    if not np.array_equal(q, before):
        raise ValueError('Probe mutated archived state')
    for index in (0, 5):
        if not np.array_equal(advanced[index], q[index]):
            raise ValueError('Source changed mass or species')
    if kind == 'electromagnetic' and not np.array_equal(advanced[2], q[2]):
        raise ValueError('Electromagnetic source changed axial momentum')
    new = f.primitive(advanced)
    def cell(key):
        return np.asarray(receipt[key]).reshape(f.volume.shape)
    if kind == 'electromagnetic':
        energies = {key: cell(key) for key in (
            'jouleByCellJ', 'mechanicalWorkByCellJ', 'BEdefectByCellJ')}
        thermal = energies['jouleByCellJ']+energies['BEdefectByCellJ']
        total = energies['jouleByCellJ']+energies['mechanicalWorkByCellJ']
    else:
        energies = {key: cell(key) for key in ('viscousHeatJ', 'numericalHeatJ',
            'stressRedistributionJ', 'mechanicalCellWorkJ', 'thermalRedistributionJ')}
        thermal = energies['viscousHeatJ']+energies['numericalHeatJ']+energies['thermalRedistributionJ']
        total = energies['stressRedistributionJ']+energies['thermalRedistributionJ']
    # All source energy terms above are integrated cell energies, not densities.
    fields = {key.removesuffix('J')+'PowerWM3': value/(f.volume*dt)
              for key, value in energies.items()}
    capacity = 1.5*1.380649e-23*(q[5]/f.masses[0]+(q[0]-q[5])/f.masses[1])
    fields.update(pressureRatePaS=(2/3)*thermal/(f.volume*dt),
        temperatureRateKS=thermal/(capacity*dt),
        radialVelocityRateMPS2=(advanced[1]-q[1])/(q[0]*dt),
        axialVelocityRateMPS2=(advanced[2]-q[2])/(q[0]*dt),
        omegaRateRadS2=(advanced[3]-q[3])/(q[0]*f.mean_r2*dt),
        # Euler RHS at a counterfactual post-source state; not accepted-stage history.
        eulerDensityRateResponseKgM3S2=(f.rate(advanced)[0]-f.rate(q)[0])/(f.volume*dt))
    if any(not np.isfinite(value).all() for value in fields.values()):
        raise ValueError('Nonfinite source response')
    checks = dict(massSpeciesBitwisePreserved=True, inputBitwisePreserved=True,
        maximumThermalIdentityResidualJ=float(np.max(abs(new['thermalJ']-old['thermalJ']-thermal))),
        maximumTotalEnergyIdentityResidualJ=float(np.max(abs(advanced[4]-q[4]-total))),
        maximumPressureIdentityResidualPa=float(np.max(abs(
            new['pressurePa']-old['pressurePa']-(2/3)*thermal/f.volume))),
        energyResidualJ=float(receipt['energyResidualJ']),
        energyRateResidualW=float(receipt['energyResidualJ']/dt),
        minimumTemperatureK=float(new['temperatureK'].min()),
        signedEnergyRatesW={key: float(value.sum()/dt) for key, value in energies.items()})
    for key in ('chargeResidualA', 'linearResidualRelative', 'externalWorkJ',
                'thermalLinearResidualJ', 'thermalEnergyResidualJ'):
        if key in receipt:
            checks[key] = float(receipt[key])
    return fields, checks


def diagnose(f, d, e, state):
    rr, zz = np.meshgrid(R_QUERY, Z_QUERY)
    points = np.column_stack((zz.ravel(), rr.ravel()))
    rows = []
    for snapshot in state['snapshots']:
        q = np.asarray(snapshot['q'], dtype=float)
        for name, value in f.primitive(q).items():
            if not np.array_equal(value, np.asarray(snapshot[name])):
                raise ValueError('Saved primitive mismatch')
        for kind, operator in (('electromagnetic', e), ('stressHeat', d)):
            previous = None
            for dt in STEPS:
                fields, checks = response(f, operator, q, dt, kind)
                row = dict(timeS=snapshot['timeS'], source=kind, dtS=dt, checks=checks,
                    regions=statistics(f, fields),
                    ringSamples={key: project(f, value, points).reshape(rr.shape).tolist()
                                 for key, value in fields.items()})
                if previous is not None:
                    row['halfStepDifference'] = statistics(f, {
                        key: value-previous[key] for key, value in fields.items()})
                rows.append(row)
                previous = fields
    return dict(scope='Frozen-state independent E and D one-step responses; no PDE trajectory, '
                'accumulated attribution, parameter change or new qualification gate',
        thermalOperator='Actual FVDiffusion FiPy receipt, not inherited FE thermal_stiffness',
        sampling='Ring uses scalar Q1 centroids/edge padding; regions use exact intersection '
                 'volumes with piecewise-constant cell rates. Regions overlap and are nonadditive; '
                 'their integrals are not cut-boundary flux budgets or the convergence norm',
        caution='Tiny-step state/RHS subtraction can amplify roundoff. Receipt-based thermal '
                'rates avoid subtracting large stored energies. Half-step differences are diagnostics.',
        radialQueryM=R_QUERY.tolist(), axialQueryM=Z_QUERY.tolist(), regionBoundsM=BOUNDS,
        snapshots=rows)
