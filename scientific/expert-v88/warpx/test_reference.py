import copy
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest

import numpy as np

from analyze import checked
from reference import MASSES, config, deck, digest, exact_xy, inject, snapshot


class ReferenceTests(unittest.TestCase):
    def setUp(self):
        self.protocol = json.loads(Path('protocol.json').read_text())

    def test_stale_protocol_rejected(self):
        stale = copy.deepcopy(self.protocol)
        stale['schemaVersion'] = 87
        with self.assertRaises(ValueError):
            config(stale, 'orbit-coarse')

    def test_invalid_subcycle_rejected(self):
        invalid = copy.deepcopy(self.protocol)
        invalid['common']['subcycles'] = 0
        with self.assertRaises(ValueError):
            config(invalid, 'bobylev')

    def test_implicit_or_invalid_law_rejected(self):
        invalid = copy.deepcopy(self.protocol)
        invalid['common']['law'] = 'default'
        with self.assertRaises(ValueError):
            config(invalid, 'orbit-coarse')

    def test_real_push_and_explicit_law(self):
        text = deck(config(self.protocol, 'nanbu-sub4'))
        self.assertIn('ionA.do_not_push = 0', text)
        self.assertIn('ionA.do_not_gather = 0', text)
        self.assertIn('cross.cumulative_scattering_angle_model = NANBU', text)
        self.assertIn('cross.ndt_subcycle = 4', text)
        self.assertIn('selfA.species = ionA ionA', text)
        self.assertIn('selfB.species = ionB ionB', text)
        self.assertNotIn('warpx.E_ext_grid_init_style', text)
        self.assertIn('particles.E_ext_particle_init_style = parse_e_ext_particle_function', text)
        self.assertIn('particles.B_ext_particle_init_style = parse_b_ext_particle_function', text)

    def test_exact_zero_field_free_flight(self):
        c = config(self.protocol, 'free-control')
        raw = dict(x=np.array([.01]), y=np.array([.02]), v=np.array([[2., 3., 0.]]))
        position, velocity = exact_xy(raw, 1., c)
        np.testing.assert_allclose(position, [.01+2*c['end']+1j*(.02+3*c['end'])])
        np.testing.assert_allclose(velocity, [2+3j])

    def test_stale_result_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'result.json'
            path.write_text(json.dumps(dict(schemaVersion=88, protocolSHA256='old')))
            with self.assertRaises(ValueError):
                checked(path, 'new', 'runner', 'case', {})

    def test_changed_raw_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'result.json'
            deck_path, raw_path = path.parent/'warpx.inputs', path.parent/'raw.npz'
            deck_path.write_text('input')
            raw_path.write_bytes(b'original')
            path.write_text(json.dumps(dict(schemaVersion=88, protocolSHA256='p', runnerSHA256='r',
                                            case='case', config={}, deckSHA256=digest(deck_path), rawSHA256=digest(raw_path))))
            raw_path.write_bytes(b'changed')
            with self.assertRaises(ValueError):
                checked(path, 'p', 'r', 'case', {})

    def test_rz_actual_radius_component(self):
        arrays = dict(id=[1], theta=[0.], weight=[1.], ux=[0.], uy=[1.], uz=[0.], z=[.01])
        pc = SimpleNamespace(**{'get_particle_'+key: lambda copy_to_host=True, value=value: [np.array(value)]
                                for key, value in arrays.items()})
        def radial(component, level, copy_to_host):
            self.assertEqual((component, level, copy_to_host), ('r', 0, True))
            return [np.array([.02])]
        pc.get_particle_real_arrays = radial
        record, raw = snapshot(pc, MASSES[0], config(self.protocol, 'orbit-coarse'))
        self.assertEqual(record['radialMeanM'], .02)
        np.testing.assert_array_equal(raw['x'], [.02])

    def test_injection_uses_contiguous_velocity_columns(self):
        captured = {}
        pc = SimpleNamespace(add_particles=lambda **kwargs: captured.update(kwargs))
        u = np.arange(18.).reshape(6, 3)
        inject(pc, np.ones(6), np.ones(6), np.ones(6), u, 1.)
        for axis, name in enumerate(('ux', 'uy', 'uz')):
            self.assertTrue(captured[name].flags.c_contiguous)
            np.testing.assert_array_equal(captured[name], u[:, axis])


if __name__ == '__main__':
    unittest.main()
