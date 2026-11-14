"""Original geometry, numerical and retrospective optical gates for V106."""
import json
from pathlib import Path
import sys
import campaign106
from geometry101 import expected_edges
from evaluate100 import evaluate


if __name__ == '__main__':
    directory = Path(sys.argv[1]).resolve()
    packet = json.loads((directory/'predictions.json').read_bytes())
    if packet.get('radialBalanceMethod') != campaign106.METHOD:
        raise ValueError('Require the declared finite-volume heat candidate')
    raise SystemExit(not evaluate(directory, Path(sys.argv[2]).resolve(),
                                 campaign106, expected_edges))
