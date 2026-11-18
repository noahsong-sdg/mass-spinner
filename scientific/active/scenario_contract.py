"""Portable shape admission; physical/history semantics remain the solver's responsibility."""
import json
from pathlib import Path

from jsonschema import Draft7Validator

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = json.loads((ROOT / "schemas/scenario-v2-v3.schema.json").read_text())
Draft7Validator.check_schema(SCHEMA)
VALIDATOR = Draft7Validator(SCHEMA)


def admit_scenario(value):
    # JSON Schema's number includes Python's nonfinite float values; wire JSON does not.
    json.dumps(value, allow_nan=False)
    VALIDATOR.validate(value)
    return value
