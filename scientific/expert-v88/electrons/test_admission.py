import json
from pathlib import Path
import tempfile
import unittest
import shutil
import admission as m
import adapter as a

class Admission(unittest.TestCase):
    def test_real_bulk_and_domain(self):
        path=a.ROOT/'results/bulk-admission-v2.json'; sha=a.digest(path)
        self.assertGreater(m.lookup(path,sha,10,300,'mobilityM2VS'),0)
        for field,temp,key,b in ((11,300,'mobilityM2VS',0),(10,500,'meanEnergyEV',0),
            (10,300,'ionizationRateM3S',0),(10,300,'mobilityM2VS',.1),
            (float('nan'),300,'mobilityM2VS',0)):
            with self.assertRaises(ValueError): m.lookup(path,sha,field,temp,key,b)
        with self.assertRaisesRegex(ValueError,'Stale'): m.lookup(path,'stale',10,300,'meanEnergyEV')

    def test_stale_pre_admission_schema(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/'legacy.json'; p.write_text(json.dumps({'qualifiedUnmagnetizedGrid':True,'rows':[]}))
            with self.assertRaisesRegex(ValueError,'domain'): m.lookup(p,a.digest(p),10,300,'meanEnergyEV')

    def test_signed_power_no_duplicate_terms(self):
        data=json.loads((a.ROOT/'results/bulk-admission-v2.json').read_text())
        for row in data['rows']:
            terms=row['powerDiagnosticsJM3S']
            self.assertEqual(len(terms),14)
            self.assertGreater(terms['Field'],0)
            self.assertLessEqual(terms['Ionization collisions'],0)
            self.assertLess(abs(sum(terms.values()))/terms['Field'],1e-6)

    def test_stale_native_power_and_source_row(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); (root/'results').mkdir()
            for name in ('transport-table.json','receipt.json'):
                shutil.copy2(a.ROOT/'results'/name,root/'results'/name)
            table_path=root/'results/transport-table.json'; table=json.loads(table_path.read_text())
            for row in table['rows']:
                source=next((a.ROOT/'output'/row['label']).rglob('powerBalance.txt'))
                target=root/'output'/row['label']/source.relative_to(a.ROOT/'output'/row['label'])
                target.parent.mkdir(parents=True); shutil.copy2(source,target)
            m.make_admission(root)
            row=table['rows'][0]; power=next((root/'output'/row['label']).rglob('powerBalance.txt'))
            original=power.read_bytes(); power.write_bytes(original+b'changed')
            with self.assertRaisesRegex(ValueError,'native power'): m.make_admission(root)
            power.write_bytes(original); row['mobilityM2VS']+=1
            table_path.write_text(json.dumps(table))
            with self.assertRaisesRegex(ValueError,'source-table row'): m.make_admission(root)

if __name__=='__main__': unittest.main()
