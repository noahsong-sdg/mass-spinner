import tempfile,unittest
from pathlib import Path
import numpy as np
from scipy.integrate import quad
from scipy.special import jv
import reference88 as r


class Controls(unittest.TestCase):
    def test_parser_uniform_and_nonuniform(self):
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp)/'U'; p.write_text('internalField uniform (1 2 3);')
            np.testing.assert_equal(r.read_field(p,2,3),[[1,2,3],[1,2,3]])
            p.write_text('internalField nonuniform List<vector> 2 ((1 2 3) (4 5 6));')
            np.testing.assert_equal(r.read_field(p,2,3),[[1,2,3],[4,5,6]])
            with self.assertRaises(ValueError): r.read_field(p,3,3)
    def test_argon_internal_energy_not_enthalpy(self):
        self.assertAlmostEqual(r.ALPHA/r.NU,2.5)
        self.assertAlmostEqual(r.K/(r.RHO*(r.CV+r.KB/r.M))/r.NU,1.5)
    def test_native_torque_includes_initial_time(self):
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp)/'forces.dat'
            p.write_text('# Header\n0 '+ ' '.join(['0']*11+['2'])+'\n1 '+ ' '.join(['0']*11+['3'])+'\n')
            np.testing.assert_equal(r.read_torque(p,[0,1]),[2,3])
            with self.assertRaises(ValueError): r.read_torque(p,[1])
            with self.assertRaises(ValueError): r.read_torque(p,[0,2])
    def test_boundary_and_angular_integrals(self):
        self.assertLess(abs(jv(1,r.CHI)),1e-14)
        angular=quad(lambda x:x*x*jv(1,r.CHI*x),0,1)[0]
        kinetic=quad(lambda x:x*jv(1,r.CHI*x)**2,0,1)[0]
        self.assertAlmostEqual(angular,jv(2,r.CHI)/r.CHI,places=13)
        self.assertAlmostEqual(kinetic,jv(2,r.CHI)**2/2,places=13)


if __name__=='__main__': unittest.main()
