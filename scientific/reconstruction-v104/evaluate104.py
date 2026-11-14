"""Apply the unchanged exact-panel and optical checks to the V104 candidate."""
import json
from pathlib import Path
import sys
import campaign104
from geometry101 import expected_edges
from evaluate100 import evaluate


if __name__ == '__main__':
    directory = Path(sys.argv[1]).resolve()
    packet = json.loads((directory/'predictions.json').read_bytes())
    if packet.get('radialBalanceMethod') != campaign104.METHOD:
        raise ValueError('The limited-pressure candidate is required')
    raise SystemExit(not evaluate(directory, Path(sys.argv[2]).resolve(),
                                 campaign104, expected_edges))
