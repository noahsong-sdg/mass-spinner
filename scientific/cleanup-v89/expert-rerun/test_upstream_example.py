import hashlib
from pathlib import Path
import unittest
import audit_upstream_example as m


class AdmissionTests(unittest.TestCase):
    def receipt(self, raw, code=0):
        return {"commands": [{"name": "upstream-example", "exitCode": code,
                              "logSHA256": hashlib.sha256(raw).hexdigest()}]}

    def test_finite_completed_smoke(self):
        raw = b"0.5 1.0\nSimulation finished\n"
        self.assertTrue(m.audit(raw, self.receipt(raw))["numericalPass"])

    def test_exit_zero_with_nonfinite_rows_fails(self):
        raw = b"0.5 nan\n1.5 -nan\n2.5 inf\nSimulation finished\n"
        result = m.audit(raw, self.receipt(raw))
        self.assertTrue(result["cliCompleted"])
        self.assertFalse(result["numericalPass"])
        self.assertEqual(result["nonfiniteRows"], 3)

    def test_domain_and_convergence_warnings_fail_without_nan(self):
        raw = b"[Warning] The maximum grid energy 1020eV exceeds the lookup table 1000eV; not reliable\n[Warning] Iterative temporal growth scheme did not converge.\n"
        result = m.audit(raw, self.receipt(raw))
        self.assertFalse(result["numericalPass"])
        self.assertEqual(len(result["energyDomainWarnings"]), 1)
        self.assertEqual(len(result["nonconvergenceWarnings"]), 1)

    def test_nonzero_cli_fails_despite_finite_output(self):
        raw = b"0.5 1.0\n"
        self.assertFalse(m.audit(raw, self.receipt(raw, 1))["numericalPass"])

    def test_stale_log_and_missing_command_rejected(self):
        raw = b"0.5 1.0\n"
        with self.assertRaisesRegex(ValueError, "sealed"):
            m.audit(raw+b"changed", self.receipt(raw))
        with self.assertRaisesRegex(ValueError, "Exactly"):
            m.audit(raw, {"commands": []})


if __name__ == "__main__":
    unittest.main()

