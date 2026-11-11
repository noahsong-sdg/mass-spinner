"""Late endpoint admission of a separately frozen producer snapshot.

Execute only inside safe-dev. This never substitutes late source hashes for
producer hashes and does not assess convergence or experimental accuracy.
--producer-root is the extracted original project tree, not its v75 directory.
"""
import argparse
import json
from pathlib import Path
from verify import digest, require, requested, source_hashes, trajectory, OBS, HERE


def supplemental(raw_path, producer_root):
    raw_path, producer_root = Path(raw_path), Path(producer_root)
    producer_dir = producer_root/'scientific/mixture-axial-v75'
    raw = json.loads(raw_path.read_text())
    manifest = json.loads((producer_dir/'manifest.json').read_text())
    require(manifest.get('schemaVersion') == 1 and raw['manifest'] == manifest,
            'Raw manifest differs from frozen producer')
    producer_hashes = source_hashes(producer_dir, producer_root)
    require(raw.get('sourceHashes') == producer_hashes,
            'Raw producer binding differs from frozen source tree')
    checker_hashes = source_hashes(HERE, HERE.parents[1])
    graph_path = 'scientific/coupled-axial-v74/independent_check.py'
    require(producer_hashes[graph_path] == checker_hashes[graph_path],
            'Late endpoint graph differs from sealed producer graph')
    require(raw.get('failures') == [], 'Incomplete producer: recorded failures')
    keys = [(t['nr'], t['nz'], t['nt'], t['mode']) for t in raw['cases']]
    require(len(keys) == len(set(keys)) and set(keys) == requested(manifest),
            'Incomplete producer: missing, extra or duplicate trajectory')
    errors = {name: 0. for name in OBS}
    for t in raw['cases']:
        for name, error in trajectory(t, manifest).items():
            errors[name] = max(errors[name], error)
    return dict(passed=True, producerBindingPassed=True, endpointAdmissionPassed=True,
                rawHash=digest(raw_path), producerSourceHashes=producer_hashes,
                lateCheckerSourceHashes=checker_hashes, manifestHash=digest(producer_dir/'manifest.json'),
                trajectoryCount=len(keys), endpointCount=sum(len(t['cases']) for t in raw['cases']),
                maxObservableRelativeErrors=errors, numericalQualificationAssessed=False,
                numericallyQualified=False, experimentalQualified=False, liveQualified=False,
                scope='Late canonical-initial and endpoint/ledger admission only. Original producer '
                      'and later checker snapshots are bound separately. No convergence controls '
                      'are assessed, and recorded intermediate audits are not rerun.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('raw', 'producer-root', 'output'):
        parser.add_argument('--'+name, type=Path, required=True)
    args = parser.parse_args()
    try:
        receipt = supplemental(args.raw, args.producer_root)
    except (AssertionError, KeyError, ValueError, TypeError, OSError) as error:
        receipt = dict(passed=False, endpointAdmissionPassed=False,
                       numericalQualificationAssessed=False, numericallyQualified=False,
                       experimentalQualified=False, liveQualified=False, error=str(error))
    args.output.write_text(json.dumps(receipt, indent=2, allow_nan=False)+'\n')
    print(json.dumps(receipt))
    raise SystemExit(0 if receipt['passed'] else 1)
