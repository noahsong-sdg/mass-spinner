"""Admit V86 report input identities without modifying frozen evidence.

This checks cross-artifact bindings, not solver correctness, source integrity,
or experimental qualification. Execute only inside safe-dev.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


SCIENTIFIC = Path(__file__).resolve().parent.parent


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate_inputs(results, target):
    """Read each input once and return a receipt of its admitted exact bytes."""
    results, target = Path(results), Path(target)
    paths = {name: results/name for name in (
        'predictions.json', 'optical-index.json', 'comparison-summary.json',
        'comparison.json.gz', 'audit.json', 'panel-audit.json')}
    paths['target'] = target
    raw = {name: path.read_bytes() for name, path in paths.items()}
    values = {name: json.loads(gzip.decompress(data) if name.endswith('.gz') else data)
              for name, data in raw.items()}
    require(all(isinstance(value, dict) for value in values.values()),
            'Report input must be a JSON object')
    hashes = {name: sha(data) for name, data in raw.items()}
    prediction = hashes['predictions.json']
    comparison = values['comparison.json.gz']
    summary = values['comparison-summary.json']
    for name in ('optical-index.json', 'comparison-summary.json',
                 'comparison.json.gz', 'audit.json', 'panel-audit.json'):
        require(values[name].get('predictionSHA256') == prediction,
                f'Stale prediction binding: {name}')
    require(summary.get('comparisonSHA256') == hashes['comparison.json.gz'],
            'Stale comparison packet')
    for name in ('comparison-summary.json', 'comparison.json.gz'):
        require(values[name].get('opticalIndexSHA256') == hashes['optical-index.json'],
                f'Stale optical index binding: {name}')
        require(values[name].get('targetFileSHA256') == hashes['target'],
                f'Stale target binding: {name}')
    require(values['panel-audit.json'].get('originalAuditSHA256') == hashes['audit.json'],
            'Stale panel original-audit binding')
    expected_summary = {key: value for key, value in comparison.items() if key != 'cases'}
    expected_summary['comparisonSHA256'] = hashes['comparison.json.gz']
    require(summary == expected_summary, 'Comparison summary metadata differs from packet')
    for key in ('experimentalQualification', 'currentFitted', 'velocityFitted',
                'scoredTimeSelected', 'steadyComparison'):
        require(comparison.get(key) is False, f'Comparison scope changed: {key}')
    require(comparison.get('previouslyViewedDevelopmentData') is True,
            'Comparison must retain viewed-development-data scope')
    return dict(evidenceAdmitted=True, globalQualification=False,
                experimentalQualification=False, predictionSHA256=prediction,
                artifactSHA256=hashes,
                inputPaths={name: str(path.resolve()) for name, path in paths.items()},
                scope='Report input identities only; no numerical or experimental qualification')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--results', type=Path,
                        default=SCIENTIFIC/'meridional-v86/results')
    parser.add_argument('--target', type=Path,
                        default=SCIENTIFIC/'profile-v79/results/score.json')
    args = parser.parse_args()
    receipt = validate_inputs(args.results, args.target)
    receipt['checkerSHA256'] = sha(Path(__file__).read_bytes())
    print(json.dumps(receipt, indent=2, allow_nan=False))


if __name__ == '__main__':
    main()
