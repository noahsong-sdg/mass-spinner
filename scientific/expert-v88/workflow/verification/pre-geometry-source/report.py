"""Retain valid completed assessments, including scientific failures."""
from pathlib import Path
import sys
from seals import read, sha, write


def main():
    field, field_sha = read(sys.argv[1])
    assessment, assessment_sha = read(sys.argv[2])
    if assessment['fieldSHA256'] != field_sha or assessment['sourceSHA256'] != sha(Path('assess.py').read_bytes()):
        raise ValueError('Stale assessment binding')
    write(sys.argv[3], dict(fieldSHA256=field_sha, assessmentSHA256=assessment_sha,
        sourceSHA256=sha(Path(__file__).read_bytes()), assessment=assessment,
        config=field['config'], globalQualification=False, experimentalQualification=False,
        scope='Analytic conduction workflow control only; no reactor qualification'))


if __name__ == '__main__':
    main()
