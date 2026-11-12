"""Light controls for independent witness gates; parent safe-dev only."""
import copy
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import numpy as np

import validate_fourier86 as validator
from validate_fourier86 import compare


class WitnessGates(unittest.TestCase):
    def fixture(self):
        direct = dict(photonFractions=np.array([.2, .6, .2]), centroidMS=100.,
                      modeMS=100., varianceM2S2=2e5, capturedFlux=1.)
        actual = copy.deepcopy(direct)
        actual['fourier'] = dict(probabilityRenormalized=False, totalProbabilityErrorBudget=1e-12)
        return direct, actual

    def test_equivalent_spectra_pass(self):
        self.assertTrue(compare(*self.fixture())['passed'])

    def test_failed_mode_cannot_hide_behind_matching_moments(self):
        direct, actual = self.fixture()
        actual['modeMS'] += 2e-6
        result = compare(direct, actual)
        self.assertFalse(result['passed'])
        self.assertFalse(result['gates']['modeMS'])
        self.assertTrue(result['gates']['centroidMS'])

    def test_spectral_and_flux_failures_are_separate(self):
        direct, actual = self.fixture()
        actual['photonFractions'] += np.array([2e-10, 0., -2e-10])
        self.assertFalse(compare(direct, actual)['gates']['probability'])
        actual = self.fixture()[1]
        actual['capturedFlux'] -= 1e-10
        self.assertFalse(compare(direct, actual)['gates']['capturedFlux'])

    def test_nonfinite_and_renormalized_results_fail(self):
        direct, actual = self.fixture()
        actual['varianceM2S2'] = np.nan
        self.assertFalse(compare(direct, actual)['passed'])
        direct, actual = self.fixture()
        actual['fourier']['probabilityRenormalized'] = True
        self.assertFalse(compare(direct, actual)['passed'])

    def test_archived_producer_is_explicit_and_external_sources_remain_live(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / 'snapshot'
            archive.mkdir()
            old = archive / 'optical86.py'
            old.write_text('old exact producer')
            current = root / 'scientific/meridional-v86/optical86.py'
            current.parent.mkdir(parents=True)
            current.write_text('new numerical callback integration')
            external = root / 'scientific/flow-v81/transport.py'
            external.parent.mkdir(parents=True)
            external.write_text('unchanged external source')
            flow = dict(sourceSHA256={
                'scientific/meridional-v86/optical86.py': validator.digest(old.read_bytes()),
                'scientific/flow-v81/transport.py': validator.digest(external.read_bytes())})
            with patch.multiple(validator, ROOT=root, SOURCE_SNAPSHOT=archive):
                validator.check_flow_sources(flow)
                external.write_text('stale external source')
                with self.assertRaises(ValueError):
                    validator.check_flow_sources(flow)

    def test_missing_archive_never_falls_back_to_matching_current_source(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            current = root / 'scientific/meridional-v86/optical86.py'
            current.parent.mkdir(parents=True)
            current.write_text('matching current source')
            flow = dict(sourceSHA256={'scientific/meridional-v86/optical86.py': validator.digest(current.read_bytes())})
            with patch.multiple(validator, ROOT=root, SOURCE_SNAPSHOT=root / 'missing'):
                with self.assertRaises(FileNotFoundError):
                    validator.check_flow_sources(flow)

    def test_archived_mapping_rejects_parent_traversal(self):
        flow = dict(sourceSHA256={'scientific/meridional-v86/../transport.py': 'unread'})
        with self.assertRaises(ValueError):
            validator.check_flow_sources(flow)


if __name__ == '__main__':
    unittest.main()
