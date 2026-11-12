"""Explicitly reuse frozen V84 optical, scoring and audit operators on V85 fields."""
import importlib
from pathlib import Path
import sys

HERE=Path(__file__).resolve().parent; V84=HERE.parent/'boundary-v84'
sys.path.insert(0,str(V84))


def main():
    phase=sys.argv[1]
    if phase not in ('optics','compare'): raise ValueError('Choose optics or compare')
    module=importlib.import_module('optics84' if phase=='optics' else 'compare84')
    module.HERE=HERE  # Output/input directory only; operator and adapter sources remain frozen.
    module.main()


if __name__=='__main__': main()
