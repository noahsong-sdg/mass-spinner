"""Apply the unchanged convergence and optical gates to the V103 producer."""
import json
from pathlib import Path
import sys
import campaign103
from geometry101 import expected_edges
from evaluate100 import evaluate


if __name__ == '__main__':
    directory = Path(sys.argv[1]).resolve()
    packet = json.loads((directory/'predictions.json').read_bytes())
    if packet.get('radialBalanceMethod') != campaign103.METHOD:
        raise ValueError('The corrected radial-balance producer is required')
    raise SystemExit(not evaluate(directory, Path(sys.argv[2]).resolve(),
                                 campaign103, expected_edges))
