"""Supplemental energy accounting for sealed, equal-mass Ar V101 packets.

No velocity target, fitted coefficient, new closure or qualification gate.
Execute inside safe-dev. Reuses V100's existing sealed field-packet loader.
"""
import hashlib
import json
from pathlib import Path
import sys
import numpy as np

KB = 1.380649e-23
EV_J = 1.602176634e-19
M_AR = 39.948*1.66053906660e-27
STEP_HEAT = ('ohmicJ', 'emNumericalHeatJ', 'viscousHeatJ', 'viscousNumericalHeatJ')
INITIALIZER = 'dfc00e1693518e5889b6e507f12b0a3cec1ad7b3e2556b833c1dd38ecfc07f50'
HERE = Path(__file__).resolve().parent


def receipt_totals(history, target):
    """History heat entries already have units J/step, unlike cumulative work."""
    previous = 0.
    selected = []
    for row in history:
        time, dt = row['timeS'], row['dtS']
        if not np.isfinite([time, dt]).all() or time <= previous or dt <= 0:
            raise ValueError('Finite ordered positive accepted clocks required')
        if abs((time-previous)-dt) > 64*np.finfo(float).eps*max(time, previous, dt):
            raise ValueError('Accepted timestep intervals must cover the complete history')
        previous = time
        if time <= target:
            selected.append(row)
    if target < 0 or not np.isfinite(target) or (target and (not selected or selected[-1]['timeS'] != target)):
        raise ValueError('Snapshot must match a retained accepted clock')
    values = {key: float(sum(row[key] for row in selected)) for key in STEP_HEAT}
    values['externalElectricalWorkJ'] = float(selected[-1]['electricalWorkJ']) if selected else 0.
    if not np.isfinite(list(values.values())).all():
        raise ValueError('Finite energy receipts required')
    return values


def frame_metrics(frame, state, temperature_range):
    """Reconstruct energy from integrated q independently of saved primitives."""
    r, z = (np.asarray(state[key], dtype=float) for key in ('radialEdgesM', 'axialEdgesM'))
    if any(x.ndim != 1 or len(x) < 2 or not np.isfinite(x).all() or np.any(np.diff(x) <= 0)
           for x in (r, z)) or r[0] < 0:
        raise ValueError('Ordered finite cylindrical edges required')
    volume = np.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]
    q = np.asarray(frame['q'], dtype=float)
    if q.shape != (6, *volume.shape) or not np.isfinite(q).all() or np.any(q[0] <= 0):
        raise ValueError('Six finite equal-mass-Ar cell fields with positive mass required')
    mass, mr, mz, angular, energy, species = q
    if np.any(species < 0) or np.any(species > mass):
        raise ValueError('Both species masses must be nonnegative')
    mean_r2 = (r[1:]**2+r[:-1]**2)/2
    kinetic = .5*(mr*mr+mz*mz)/mass+.5*angular*angular/(mass*mean_r2)
    thermal = energy-kinetic
    capacity = 1.5*KB*mass/M_AR
    temperature = thermal/capacity
    if not np.isfinite(temperature).all() or np.any(thermal <= 0):
        raise ValueError('Positive finite Ar thermal energy required')
    saved_temperature = np.asarray(frame['temperatureK'], dtype=float)
    if saved_temperature.shape != temperature.shape or not np.isfinite(saved_temperature).all():
        raise ValueError('Saved temperature must match the finite cell shape')
    lo, hi = temperature_range
    if not np.isfinite([lo, hi]).all() or not 0 < lo < hi:
        raise ValueError('Documented ordered positive correlation bounds required')
    j, i = np.unravel_index(np.argmax(temperature), temperature.shape)
    return dict(timeS=frame['timeS'], totalEnergyJ=float(energy.sum()),
        kineticEnergyJ=float(kinetic.sum()), thermalEnergyJ=float(thermal.sum()),
        massKg=float(mass.sum()), minimumTemperatureK=float(temperature.min()),
        maximumTemperatureK=float(temperature.max()),
        massWeightedTemperatureK=float(thermal.sum()/capacity.sum()),
        volumeWeightedTemperatureK=float(np.sum(volume*temperature)/volume.sum()),
        massFractionAboveCorrelationRange=float(mass[temperature > hi].sum()/mass.sum()),
        massFractionBelowCorrelationRange=float(mass[temperature < lo].sum()/mass.sum()),
        maximumTemperatureLocationM=dict(
            r=float((2/3)*np.diff(r**3)[i]/np.diff(r*r)[i]), z=float((z[j]+z[j+1])/2)),
        savedTemperatureMaximumDifferenceK=float(np.max(abs(temperature-saved_temperature))))


def analyze(state, manifest, scenario, temperature_range):
    if not state['snapshots'] or state['snapshots'][0]['timeS'] != 0:
        raise ValueError('Initial t=0 snapshot required')
    initial = frame_metrics(state['snapshots'][0], state, temperature_range)
    rows = []
    for frame in state['snapshots']:
        metrics = frame_metrics(frame, state, temperature_range)
        receipts = receipt_totals(state['history'], frame['timeS'])
        changes = {key: metrics[key]-initial[key] for key in
                   ('totalEnergyJ', 'kineticEnergyJ', 'thermalEnergyJ')}
        time, current = frame['timeS'], manifest['branchCurrentA']
        metrics.update(energyChangesJ=changes, cumulativeReceiptsJ=receipts,
            globalEnergyBalanceResidualJ=changes['totalEnergyJ']-receipts['externalElectricalWorkJ'],
            remainingThermalChangeJ=changes['thermalEnergyJ']-sum(receipts[key] for key in STEP_HEAT),
            inferredMeanTerminalVoltageV=(receipts['externalElectricalWorkJ']/(current*time)
                                          if time and current else None),
            maximumHeavyOverPrescribedElectronTemperature=(metrics['maximumTemperatureK']*KB
                                                         /(scenario['electronTemperatureEV']*EV_J)))
        rows.append(metrics)
    return rows


def validate_packet(packet):
    if packet.get('mesh') != 'smooth-source-aligned' or packet['manifest'].get('sourceDOI') != '10.1515/zna-1979-0602':
        raise ValueError('This report applies only to the declared V101 equal-mass-Ar study')
    if packet.get('sourceSHA256', {}).get('scientific/coupled-v99/campaign99.py') != INITIALIZER:
        raise ValueError('The known equal-mass-Ar V101 initializer identity is required')


def main(predictions, output):
    raw = predictions.read_bytes()
    packet = json.loads(raw)
    validate_packet(packet)
    sys.path.insert(0, str(HERE.parent/'spatial-v100'))
    from independent100 import load
    source_path = HERE.parent/'flow-v81/argon-viscosity-source.json'
    source_raw = source_path.read_bytes()
    source = json.loads(source_raw)
    states = load(predictions)
    result = dict(scope='Supplemental energy/closure diagnostic; not experimental qualification',
        experimentalQualification=False, productionEquationsChanged=False,
        predictionSHA256=hashlib.sha256(raw).hexdigest(),
        equalMassArInitializerSHA256=INITIALIZER,
        diagnosticSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        fieldLoaderSHA256=hashlib.sha256((HERE.parent/'spatial-v100/independent100.py').read_bytes()).hexdigest(),
        correlationSourceSHA256=hashlib.sha256(source_raw).hexdigest(),
        correlationRangeK=source['temperatureRangeK'], correlationDOI=source['doi'],
        correlationScope=source['scope'],
        prescribedClosure=dict(electronEnergyEvolved=False, ionizationEvolved=False,
            electricalTransportUpdated=False, viscosityUpdated=False,
            externalWallHeatExchange=False, separateIonNeutralTemperatures=False),
        interpretation=dict(
            correlationRange='Available dilute neutral-Ar viscosity correlation range, not a plasma-validity or temperature gate.',
            remainingThermalChange='Signed remainder after recorded dissipative heat: includes reversible pressure work, hydro numerical conversion and residuals; not unidentified external power.',
            voltage='Work/current/time infers the modeled terminal voltage; the manifest bulkVoltageV is not imposed by this current-driven campaign.',
            temperatureRatio='Context against prescribed electron temperature, not an equilibration or ionization criterion.'),
        cases=[dict(refinement=n, cfl=cfl, frames=analyze(state, packet['manifest'],
                    packet['scenario'], source['temperatureRangeK'])) for (n, cfl), state in states.items()])
    with output.open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)


if __name__ == '__main__':
    main(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())
