# V100 evidence

[Protocol](PROTOCOL.md), [independent physics review](PHYSICS-REVIEW.md),
[results](../../SPATIAL-FLOW-V100.md).

Run inside safe-dev with the V99 scientific dependencies and frozen inputs:

```sh
python -m unittest discover -s scientific/mixture-axial-v75 -p test_flow.py -v
python -m unittest discover -s scientific/meridional-v86 -p test_diffusion86.py -v
python -m unittest discover -s scientific/meridional-v86 -p test_electro86.py -v
python -m unittest discover -s scientific/meridional-v86-independent -p torque86.py -v
python -m unittest discover -s scientific/spatial-v100 -p 'test_*.py' -v
python -m unittest discover -s scientific/coupled-v99 -p 'test_*.py' -v
python -m unittest discover -s scientific/meridional-v86 -p test_optical86.py -v
python -m unittest discover -s scientific/meridional-v86-independent -p test_fourier86.py -v
python scientific/spatial-v100/campaign100.py NEW_RESULTS
python scientific/spatial-v100/evaluate100.py NEW_RESULTS PRODUCER_ROOT
```

Use the scientific interpreter with NumPy2.4.6, SciPy1.17.1, scikit-fem12.0.2,
PyAbel0.9.1 and Matplotlib3.10.8. Final controls77pass; evaluator intentionally
exits1 for10 scientific spatial failures. It still retains every optical comparison.

[Release](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v100-spatial-flow-repair)
contains raw producer/checker sources, archived fields, failing baseline tests,
checks/logs, independent localization and app-final checks. No host RAM audit is published.
Producer manifest `689cdd4c6be836a6b47c1b5455460d2f2af0122372b0da7c7c734c32ef7515bc`;
checker `d9c1655a7fb6d1535d74bd2226f633e976a7311c328f4599499f37e659323931`.
Prediction SHA256 `afc80fc3bad27fc1daab0c5811c556104ca88f26a12179aba38bb43bcfc2f76e`.
Raw archive SHA256 `7e2e68e67bf19b30e6927955c0b05c9a82f5e0b3dff757b6cb0c2a545385c556`;
app archive `1bab2ab572611923cefe679560695d68c718623ad6cc66c50814d90531edc180`.
App source manifest remains `e805ac7417fcf6c0ddfeea9c420c0288326e0a298adccd439a8ab8ff50fc188f`.
