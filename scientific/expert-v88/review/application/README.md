# Application verification

The final check used a fresh safe-dev VM, `safe-dev-8bed71533ca2cd54`, from
`/private/tmp/mass-spinner-app-v88-clean-20261112`.

- `npm ci --cache /work/home/app-v88-cache`: succeeded with the existing lock.
- Offline `npm test`: **1238 passed, zero failed** (46.622 s).
- Offline `npm run typecheck`: passed.
- Offline `npm run build`: passed; existing large-bundle warning retained.
- Separate target supplement: four zero-current-rate controls passed; all
  45 samples across three zero-current trajectories have exactly zero rate.

[Verification metadata](final/verification.json) records the precise source
snapshot: 2666 files, 509162577 bytes, SHA-256
`a81d4ae45bf8f9a5b90726b0480f135c336bb516207e16bbe6b756a3e53681e7`.
Every file in the [pre-test manifest](final/source-files.sha256) was checked
against the host staging copy. All 557 application/source/test/fixture entries
also match the canonical project. Node 22.23.4, npm 10.9.9; exact install,
test, typecheck and build logs are retained in `final/`.

## Why a fresh VM was necessary

The initial check in the older public VM failed nine tests after the disk-full
incident. Hash comparison identified 11 corrupted guest asset files; the
canonical and host staging copies matched. Restoring only those copied assets
fixed eight failures. The remaining read returned Linux `EUCLEAN` (-117) for
`scientific/neutron-v38/results/decay-oracle.json`, establishing a damaged guest
filesystem rather than an application regression. No production source or
test expectations were changed to obtain a pass.

Both failed checks and their manifests are retained under `attempt01/` and
`attempt02/`. The clean VM was initialized through safe-dev and dependencies
installed inside it. All checks then ran offline. The old volume and its unique
scientific evidence were preserved; no filesystem/security policy was weakened.
Copying the verified source into a fresh filesystem was preferable to trusting
partial repairs or treating a failed test as a code defect.

The zero-current supplement's exact commands were:

```text
/work/home/diagnostic-v72-venv/bin/python -m unittest discover -s scientific/expert-v88/target-radau -p test_audit_zero_beam.py -v
/work/home/diagnostic-v72-venv/bin/python scientific/expert-v88/target-radau/audit_zero_beam.py scientific/expert-v88/target-radau/results/browser.json scientific/expert-v88/target-radau/results/zero-beam-admission.json
```

Its helper and immutable browser bytes are sealed in the separate receipt;
the original failed physical qualification remains false. Review checked its
source/log identities without claiming a second execution of those four tests.
