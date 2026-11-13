"""Verify provenance before comparing the frozen WarpX feasibility gates."""
import json
from pathlib import Path
from reference import config, digest


def checked(path, protocol_hash, runner_hash, name, settings):
    record = json.loads(Path(path).read_text())
    if record.get('schemaVersion') != 88 or record.get('protocolSHA256') != protocol_hash:
        raise ValueError('Stale result/schema/protocol')
    if record.get('runnerSHA256') != runner_hash:
        raise ValueError('Runner differs from executed snapshot')
    if record.get('case') != name or record.get('config') != settings:
        raise ValueError('Case/config differs from frozen protocol')
    if record['deckSHA256'] != digest(Path(path).parent/'warpx.inputs'):
        raise ValueError('Input deck changed after execution')
    if record.get('rawSHA256') != digest(Path(path).parent/'raw.npz'):
        raise ValueError('Raw phase-space archive changed after execution')
    return record


def main():
    protocol = json.loads(Path('protocol.json').read_text())
    frozen = Path('campaign-protocol.sha256').read_text().strip()
    if frozen != digest('protocol.json'):
        raise ValueError('Protocol changed during/after campaign')
    gates = protocol['gates']
    mapping = {'energyJRelativeChange': 'energyRelative',
               'canonicalAngularKGMS2RelativeChange': 'canonicalAngularRelative',
               'numberRelativeChange': 'closedInventoryRelative',
               'orbitPositionRelative': 'orbitPositionRelative',
               'orbitVelocityRelative': 'orbitVelocityRelative'}
    cases = {}
    for name in protocol['cases']:
        record = checked(Path('results')/name/'result.json', frozen, digest('reference.py'), name, config(protocol, name))
        cases[name] = dict(metrics=record['metrics'],
                           gates={key: {'passed': value <= gates[mapping[key]],
                                        'value': value, 'threshold': gates[mapping[key]]}
                                  for key, value in record['metrics'].items()})
        cases[name]['strictEnergyGate'] = {'passed': record['metrics']['energyJRelativeChange'] <= gates['strictEnergyRelative'],
                                          'threshold': gates['strictEnergyRelative']}
    contraction = {key: [cases[a]['metrics'][key]/cases[b]['metrics'][key]
                         for a, b in [('orbit-coarse', 'orbit-medium'), ('orbit-medium', 'orbit-fine')]]
                   for key in ('orbitPositionRelative', 'orbitVelocityRelative')}
    Path('summary.json').write_text(json.dumps(dict(schemaVersion=88, protocolSHA256=frozen, orbitErrorContraction=contraction,
        cases=cases, unqualified=protocol['unqualified'],
        interpretation='Orbit diagnostics and collision locality feasibility only; failed gates are retained.'),
        indent=2, allow_nan=False)+'\n')


if __name__ == '__main__':
    main()
