# Coupled argon release

See [results](../../COUPLED-FLOW-V99.md) and [protocol](PROTOCOL.md). Live model unchanged.
Execute only inside safe-dev with the pinned scientific requirements.

```sh
python -m unittest discover -s scientific/coupled-v99 -p 'test_*.py' -v
python scientific/coupled-v99/campaign99.py NEW_RESULTS
python scientific/coupled-v99/audit99.py NEW_RESULTS/predictions.json . NEW_RESULTS/audit.json cflBound
python scientific/coupled-v99/optics99.py predict NEW_RESULTS
python scientific/coupled-v99/optics99.py score NEW_RESULTS
```

The original five-run campaign uses retained producer source01 and its explicit
`actualCfl` configured-bound metadata schema. Replay its audit against that root;
current producer source02 uses `cflBound`. Never overwrite the original evidence.
