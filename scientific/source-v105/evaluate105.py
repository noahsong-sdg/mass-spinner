"""Unchanged V99/V100 numerical and retrospective optical gates for V105."""
import json
from pathlib import Path
import sys
import campaign105
from geometry101 import expected_edges
from evaluate100 import evaluate


if __name__ == '__main__':
    directory = Path(sys.argv[1]).resolve()
    packet = json.loads((directory/'predictions.json').read_bytes())
    if packet.get('radialBalanceMethod') != campaign105.METHOD:
        raise ValueError('Require the declared source/wall candidate')
    raise SystemExit(not evaluate(directory, Path(sys.argv[2]).resolve(),
                                 campaign105, expected_edges))
