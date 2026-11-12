"""Exercise actual prediction with forbidden measured-velocity file access."""
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import numpy as np
from campaign import predict_case


class PredictionIndependence(unittest.TestCase):
    def test_actual_prediction_never_reads_velocity_target_files(self):
        m=json.loads((Path(__file__).parents[1]/'profile-v79/manifest.json').read_text())
        original_text,original_bytes=Path.read_text,Path.read_bytes
        def text(path,*args,**kwargs):
            if path.name in ('score.json','measured.json'):
                raise AssertionError('Flow accessed velocity targets')
            return original_text(path,*args,**kwargs)
        def raw(path,*args,**kwargs):
            if path.name in ('score.json','measured.json'):
                raise AssertionError('Flow accessed velocity targets')
            return original_bytes(path,*args,**kwargs)
        with patch.object(Path,'read_text',text),patch.object(Path,'read_bytes',raw):
            a,first=predict_case(m,dict(transportCase='quadratic-nominal',beta=9),1,18.5)
            b,changed=predict_case({**m,'measuredVelocityMS':[-1e20]*5},
                                  dict(transportCase='quadratic-nominal',beta=9),1,18.5)
        np.testing.assert_array_equal(first['omega'],changed['omega'])
        self.assertEqual(a,b)


if __name__=='__main__': unittest.main()
