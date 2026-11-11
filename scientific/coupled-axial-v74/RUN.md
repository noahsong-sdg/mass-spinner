# Reproduce v74

Run project code only inside safe-dev. A fresh public checkout fits its source
limit; the original developer workspace also contains ignored bulk research
and uses a curated source copy instead. No host directory or credentials mount.

```
safe-dev -C /absolute/checkout init
safe-dev -C /absolute/checkout run --online -- npm ci --ignore-scripts --no-audit --no-fund
safe-dev -C /absolute/checkout run -- python3 -m venv /work/home/v74-venv
safe-dev -C /absolute/checkout run --online -- /work/home/v74-venv/bin/pip install -r scientific/coupled-axial-v74/requirements.txt
safe-dev -C /absolute/checkout run -- /work/home/v74-venv/bin/python -m unittest discover -s scientific/coupled-axial-v74 -p 'test_*.py' -v
safe-dev -C /absolute/checkout run -- /work/home/v74-venv/bin/python scientific/coupled-axial-v74/static_current.py --output scientific/coupled-axial-v74/static-current.json
safe-dev -C /absolute/checkout run -- /work/home/v74-venv/bin/python scientific/coupled-axial-v74/run_report.py --output scientific/coupled-axial-v74/report.json
safe-dev -C /absolute/checkout run -- /work/home/v74-venv/bin/python scientific/coupled-axial-v74/independent_check.py scientific/coupled-axial-v74/report.json scientific/coupled-axial-v74/independent.json
safe-dev -C /absolute/checkout run -- /work/home/v74-venv/bin/python scientific/coupled-axial-v74/analyze.py scientific/coupled-axial-v74/convergence.json scientific/coupled-axial-v74/report.json --static scientific/coupled-axial-v74/static-current.json
safe-dev -C /absolute/checkout run -- /work/home/v74-venv/bin/python scientific/coupled-axial-v74/verify_results.py --raw scientific/coupled-axial-v74/report.json --static scientific/coupled-axial-v74/static-current.json --independent scientific/coupled-axial-v74/independent.json --convergence scientific/coupled-axial-v74/convergence.json --output scientific/coupled-axial-v74/receipt.json
safe-dev -C /absolute/checkout run -- /work/home/v74-venv/bin/python scientific/coupled-axial-v74/plot.py scientific/coupled-axial-v74/report.json scientific/coupled-axial-v74/convergence.json scientific/coupled-axial-v74/validation.png
```

The runner checks independent cell equations at every accepted step and retains
full fields at manifest output times. It writes raw failure witnesses when an
independent check rejects an endpoint. Failed trajectories exit nonzero and
remain in the report; do not merge a failed attempt into a corrected-run
qualification report. Publish both attempts separately.

Export valuable results before refreshing guest source with
`safe-dev sync --replace-guest`; source is a copy and dependencies are removed
by that refresh. A study can take substantial CPU time. `--only nr:nz:nt` runs
one manifest case; suffix `:tight`, `:linear` or `:thermal` selects the declared
tolerance repeats. The analyzer rejects missing required trajectories/times.
