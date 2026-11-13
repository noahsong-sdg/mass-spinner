import json
from pathlib import Path
import tempfile
import unittest
import adapter as a

class Adapter(unittest.TestCase):
    def test_stale_and_unqualified_table(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'table.json'; path.write_text('{}')
            with self.assertRaisesRegex(ValueError,'Stale'): a.lookup(path,'stale',10,300)
            path.write_text(json.dumps(dict(qualifiedUnmagnetizedGrid=False)))
            with self.assertRaisesRegex(ValueError,'unqualified'): a.lookup(path,a.digest(path),10,300)

    def test_exact_domain_and_no_extrapolation(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'table.json'
            row=dict(reducedFieldTd=10,gasTemperatureK=300,mobilityM2VS=1)
            path.write_text(json.dumps(dict(qualifiedUnmagnetizedGrid=True,rows=[row])))
            self.assertEqual(a.lookup(path,a.digest(path),10,300),row)
            for field,temp in ((9,300),(11,300),(10,500),(float('nan'),300)):
                with self.assertRaisesRegex(ValueError,'Outside'): a.lookup(path,a.digest(path),field,temp)

    def test_term_absent_and_nonfinite(self):
        self.assertEqual(a.term(' Value = +1.000000e-03 (m2/s)','Value'),.001)
        for text in ('Other = 1','Value = 1e999'):
            with self.assertRaises(ValueError): a.term(text,'Value')

    def test_refuse_ambiguous_upstream_config(self):
        with self.assertRaisesRegex(ValueError,'Ambiguous'): a.make_input('reducedField: 1',10,300,1000,'x')

if __name__=='__main__': unittest.main()
