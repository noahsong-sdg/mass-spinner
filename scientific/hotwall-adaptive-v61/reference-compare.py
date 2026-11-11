"""Unchanged v60 finite-reference gates for v61 canonical study packets.

Execute only inside safe-dev. CLI:
  reference-compare.py FULL_REFERENCE.json.gz EARLY_REFERENCE.json.gz OUTPUT.json CANDIDATE.json...

Candidates use the v60 packet format. Their observation times must exactly match
the reference times within their declared horizon. This is a startup comparison;
intervention histories need matching event-bearing references, never these
no-event archives. Accuracy failures are retained findings; malformed inputs fail.
The independent v60 analyzer is reused, not any production numerical helper.
"""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile

import numpy as np


ANALYZER_PATH = Path(__file__).resolve().parents[1] / 'hotwall-boundary-v60' / 'analyze-joint.py'
SPEC = importlib.util.spec_from_file_location('hotwall_v60_reference_analysis', ANALYZER_PATH)
ANALYSIS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ANALYSIS)


def load(path):
    """Use the old canonical audit unchanged, including for compressed archives."""
    path = Path(path)
    opener = gzip.open if path.suffix == '.gz' else open
    with opener(path, 'rt') as stream:
        packet = json.load(stream)
    with tempfile.TemporaryDirectory(prefix='hotwall-reference-') as directory:
        plain = Path(directory) / 'packet.json'
        with plain.open('w') as stream:
            json.dump(packet, stream)
        result = ANALYSIS.load_case(plain)
    result['sources'] = [str(path)]
    result['sourceSha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    result['operation'] = packet['operation']
    result['timeControl'] = packet.get('timeControl')
    return result


def event_schedule(case):
    return case['operation']['events']


def physical_operation(case):
    operation = json.loads(json.dumps(case['operation']))
    operation['thermal']['gas'].pop('accuracy', None)
    operation['thermal']['spatial'].pop('cells')
    return operation


def window(reference, candidate):
    horizon = candidate['config']['durationS']
    times = reference['times']
    indices = np.flatnonzero(times <= horizon)
    if not len(indices) or not np.array_equal(times[indices], candidate['times']):
        raise ValueError('Candidate must retain every exact reference observation time in its horizon.')
    return {**reference, 'times': times[indices],
            'arrays': {key: values[indices] for key, values in reference['arrays'].items()}}


def analyze(full_path, early_path, candidate_paths):
    if not candidate_paths:
        raise ValueError('At least one candidate is required for qualification.')
    full, early = load(full_path), load(early_path)
    for case, expected, horizon in ((full, (512, 128, 32768), 1),
                                    (early, (512, 128, 16384), .002)):
        if ANALYSIS.key(case) != expected or case['config']['durationS'] != horizon:
            raise ValueError('Expected the registered 512/128 full-32768 and early-16384 startup references.')
    if event_schedule(full) != event_schedule(early):
        raise ValueError('Composite references require identical current-event schedules.')
    if physical_operation(full) != physical_operation(early):
        raise ValueError('Composite references require identical physical operating inputs.')
    reference = ANALYSIS.composite_reference(full, early)
    # composite_reference retains physical setup but represents a comparison
    # dataset assembled from two integrations, not an integrated trajectory.
    reference['operation'] = full['operation']
    overlap_full, overlap_early = ANALYSIS.aligned_overlap(full, early)
    overlap = ANALYSIS.compare(overlap_full, overlap_early)
    comparisons = []
    for candidate_path in candidate_paths:
        candidate = load(candidate_path)
        if event_schedule(candidate) != event_schedule(full):
            raise ValueError('Candidate events differ from the reference; startup archives cannot qualify an intervention.')
        if physical_operation(candidate) != physical_operation(full):
            raise ValueError('Candidate physical operating inputs differ from the comparison reference.')
        if candidate['config']['durationS'] not in (early['config']['durationS'], full['config']['durationS']):
            raise ValueError('Only the declared early and full reference horizons are qualified.')
        comparison = ANALYSIS.compare(candidate, window(reference, candidate))
        comparison['candidateSources'] = candidate['sources']
        comparison['candidateSourceSha256'] = candidate['sourceSha256']
        comparison['timeControl'] = candidate['timeControl']
        comparisons.append(comparison)
    return {
        'scope': 'Finite common-annulus reference comparison at exact shared playback observations; not a continuum bound or device calibration.',
        'referenceSources': full['sources'] + early['sources'],
        'referenceSourceSha256': {'full': full['sourceSha256'], 'early': early['sourceSha256']},
        'referenceConstruction': 'Full history with exact early observation samples replaced; no analyzer interpolation.',
        'productionPlaybackMayInterpolateCanonicalStates': True,
        'accuracyThresholds': {
            'gasAbsoluteK': .1, 'localHeatingRelative': .05, 'minimumLocalRiseK': .1,
            'rotorRelative': .03, 'wallFluxRelative': .01, 'minimumWallFluxW': .5,
            'wallHeatRelative': .01, 'minimumWallHeatJ': 1e-6,
        },
        'gatesStrictlyBelowThreshold': True,
        'referenceEarlyOverlap': overlap,
        'comparisons': comparisons,
        'allCandidateAccuracyGatesPassed': all(c['allAccuracyGatesPassed'] for c in comparisons),
        'accuracyFailuresAreRetained': True,
    }


def main():
    if len(sys.argv) < 5:
        raise SystemExit('usage: reference-compare.py FULL EARLY OUTPUT CANDIDATE...')
    result = analyze(sys.argv[1], sys.argv[2], sys.argv[4:])
    with Path(sys.argv[3]).open('w') as stream:
        json.dump(result, stream, indent=2)
        stream.write('\n')
    print(json.dumps({'candidates': len(result['comparisons']),
                      'allCandidateAccuracyGatesPassed': result['allCandidateAccuracyGatesPassed']}))


if __name__ == '__main__':
    main()
