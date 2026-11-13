"""Use unchanged convergence/optics gates with independent V101 geometry."""
from pathlib import Path
import sys
import campaign101
from geometry101 import expected_edges

sys.path.insert(0, str(Path(__file__).parents[1]/'spatial-v100'))
from evaluate100 import evaluate


if __name__ == '__main__':
    raise SystemExit(not evaluate(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve(),
                                 campaign101, expected_edges))
