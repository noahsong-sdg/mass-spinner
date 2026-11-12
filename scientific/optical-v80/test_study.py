import copy
import json
from pathlib import Path
import tempfile
import shutil
import unittest
from unittest.mock import patch

import numpy as np
from study import extract, predict, main

HERE=Path(__file__).parent


class PredictionSeparationControls(unittest.TestCase):
    def test_brightness_coordinates_and_axis_uncertainty(self):
        d=json.loads((HERE/'brightness-independent.json').read_text())
        rows=extract(d)
        self.assertEqual(len(rows),29)
        self.assertTrue(all(p['brightnessExtractionRange'][0]<p['brightness']<p['brightnessExtractionRange'][1] for p in rows))
        self.assertAlmostEqual(rows[-1]['radiusM'],.06*(845-134)/(894-134))
        invalid=copy.deepcopy(d); invalid['xAnchors'][3]['xPx']+=20
        with self.assertRaises(ValueError): extract(invalid)

    def test_measured_speed_mutation_leaves_prediction_bytes_identical(self):
        locations=[dict(id='ar-i-r3',radiusM=.03)]
        with tempfile.TemporaryDirectory() as directory:
            home=Path(directory)/'optical-v80'; home.mkdir()
            target_dir=home.parent/'profile-v79/results'; target_dir.mkdir(parents=True)
            for name in ('predictions.json','score.json'):
                shutil.copy2(HERE.parent/'profile-v79/results'/name,target_dir/name)
            for name in ('brightness-independent.json','PROTOCOL.md','NUMERICAL-ADDENDUM.md'):
                shutil.copy2(HERE/name,home/name)
            shutil.copytree(HERE/'sources',home/'sources')
            (home/'locations.json').write_text(json.dumps(dict(points=locations)))
            small=lambda p,b,l: predict(p,b,l,meshes=(8,16),bin_sizes=(50.,25.))
            with patch('study.HERE',home), patch('study.predict',side_effect=small), patch('builtins.print'):
                main(); before=(home/'results/optical-predictions.json').read_bytes()
                targets=json.loads((target_dir/'score.json').read_text())
                for p in targets['points']: p['velocityMS']=123456789.
                (target_dir/'score.json').write_text(json.dumps(targets))
                main(); after=(home/'results/optical-predictions.json').read_bytes()
            self.assertEqual(before,after)
        result=json.loads(before)
        self.assertEqual(len(result['cases'][0]['closures']),2)
        self.assertTrue(np.isfinite(result['selectedSpectrum']['varianceM2S2']))


if __name__=='__main__': unittest.main()
