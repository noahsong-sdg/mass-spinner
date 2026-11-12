from itertools import product
import unittest
from compare84 import paired


class AlternativeInventory(unittest.TestCase):
    def setUp(self):
        keys=('edgeClosure','temperatureK','instrumentSigmaMS','estimator')
        self.rows=[dict(zip(keys,v)) for v in product(('linear','sqrt'),(1400,1800,2900,5950,7250,'linear'),(0.,500.,1000.),('centroidMS','modeMS'))]

    def test_all_alternatives_match_by_identity_not_position(self):
        values=paired(self.rows,list(reversed(self.rows)))
        self.assertEqual(len(values),72)
        self.assertTrue(all(a==b for a,b in values))

    def test_missing_duplicate_or_stale_alternative_rejected(self):
        stale=[dict(r) for r in self.rows]; stale[0]['temperatureK']=100
        for rows in (self.rows[:-1],self.rows+[self.rows[0]],stale):
            with self.assertRaises(ValueError): paired(self.rows,rows)


if __name__=='__main__': unittest.main()
