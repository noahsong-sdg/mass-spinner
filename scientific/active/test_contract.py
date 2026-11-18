import copy
import unittest

from jsonschema import ValidationError

from scenario_contract import admit_scenario


class ScenarioContractTests(unittest.TestCase):
    def test_old_and_current_shared_scenarios(self):
        for value in [{"version": 2, "level": "1", "controls": {}},
                      {"version": 3, "level": "2", "controls": {}, "fuelRun": {
                          "initialCurrentA": 0.03, "events": [], "mode": "spin", "timeS": 0}}]:
            self.assertEqual(admit_scenario(value), value)

    def test_malformed_and_nonfinite_payloads_fail(self):
        base = {"version": 2, "level": "1", "controls": {}}
        for edit in [{"version": 99}, {"extra": 1}, {"controls": {"field": float("nan")}},
                     {"version": 3}, {"controls": {"field": [1, 2]}}]:
            value = copy.deepcopy(base) | edit
            with self.assertRaises((ValidationError, ValueError)):
                admit_scenario(value)
