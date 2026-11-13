"""Scientific rejection is a nonzero qualification, not a lost report."""
from pathlib import Path
import sys
from seals import read, sha, write


def main():
    report, digest = read(sys.argv[1])
    if report['sourceSHA256'] != sha(Path('report.py').read_bytes()):
        raise ValueError('Stale report producer')
    if report['assessment']['assessment'] != 'pass':
        raise SystemExit('Scientific gate failed; completed report retained')
    write(sys.argv[2], dict(reportSHA256=digest, pilotControlQualified=True,
        globalQualification=False, experimentalQualification=False,
        sourceSHA256=sha(Path(__file__).read_bytes())))


if __name__ == '__main__':
    main()
