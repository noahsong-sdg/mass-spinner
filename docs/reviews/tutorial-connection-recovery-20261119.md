# Tutorial connection recovery

## Older simulator tabs

The live browser reproduced the reported failure. An older simulator loaded `main-C0I8CbFm.js`. That bundle has no tutorial connection handlers. The current reader waited for a reply that the older simulator could not send.

In simple terms, the tutorial and simulator used different message formats. A fresh simulator accepted the same action.

The reader now shows **Open new simulator with default inputs** while an unsent action waits. This explicit recovery opens a current simulator. It preserves the original tab and its run. Automatic reload could discard that run.

The reader sends the pending action after the new simulator authorizes the connection. It waits for an execution receipt before it changes focus. The Simulator header link still changes focus immediately.

A reader-specific storage key preserves the new connection through tutorial navigation. Existing origin, source, capability and request-ID checks remain. Late messages from the older simulator cannot execute the action.

Recovery remains available after a connection timeout. After dispatch, it is hidden to prevent a second execution while the first result is unknown.

## Coil selection

The first browser run found a second defect on desktop and phone. The component selector existed before geometry initialization added its options. The action selected a value that was not available. Initialization then selected Vessel.

The action now waits for `option[value="coils"]`. The existing DOM observer detects this option. This checks actual readiness instead of adding a fixed delay. Later geometry updates preserve the valid selection.

No physics, equations, physical inputs or solver code changed.

## Regression checks

Unit checks cover an older receiver, timeout recovery, late messages, dispatch state, focus and asynchronously populated coil options. They also check connection persistence and direct header navigation.

The browser regression opens a current tutorial from an older simulator fixture. It checks recovery, gas and drive controls, coil selection and cross-tutorial actions. It checks that the older tab stays unchanged. The same test runs on desktop and phone.

[Run 44657863001](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44657863001) found the coil defect. Its new browser test failed in both layouts. The other 29 tests passed in each layout. That candidate was not published. No assertion, deadline, retry or gate was relaxed.

## Final checks

Qualified source: `bc59c2b31f27b37a442ab74f62fea5e5d0757bc5`.

[Verify run 44660819518](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44660819518) passed:

- `node --import tsx scripts/check-dependencies.ts npm-audit.json`: no high or critical dependency advisories.
- `npm run typecheck`, `typecheck:infrastructure`, `typecheck:boundaries`, `typecheck:tests`: passed.
- `npm run lint`: passed.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,608 passed; none failed.
- Python unittest discovery for `test_screen.py`, `test_argon_reference_export.py`, `test_dev_snapshot.py` and `test_deploy_credentials.py`: 28 passed.
- `npm run build`: passed.
- `npm run check:site`, `check:assets`, `check:gltf`, `release:seal`, `release:verify`: passed.
- Isolated Playwright projects: 30 desktop and 30 phone checks passed.

The local isolation tool refused to start because host memory pressure was not normal. All project build and runtime checks ran in isolated GitHub jobs.

## Publication

[Deploy preparation 44663654854](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44663654854) passed admission, digest, identity, stale-release and retained-generation checks. Its publish step failed because GitHub had no Cloudflare deployment credentials.

The exact prepared artifact was published with official Wrangler 4.164.0 and the existing local Cloudflare login. The temporary configuration had no build command or project hooks.

- Cloudflare version: `f863b0b9-fcfc-4b1f-a127-c4e082643ceb`.
- Prepared manifest SHA256: `60d610b9dbb4f0651b5941b295cbdd42155ef458ace0d79be4456510cb629cd2`.
- All 254 candidate entries were preserved in the prepared release.
- All 393 local manifest entries matched their hashes.
- All 392 served files matched the release hashes. `_redirects` is a deployment control file.
- All 12 redirect checks passed.
- Live byte check completed at `2026-11-20T02:55:41Z`.

## Live browser check

The native browser repeated the original failure with the older simulator still open. Recovery opened the current simulator and returned **Opened in the simulator**.

The gas representation was `both`, and the drive display was `all`. The 3D canvas was visible. **Show the coils** selected `coils`. After navigation to Tutorial 2, **Show drive work** opened the energy plot in the same simulator. Coil selection remained unchanged.

The original simulator still had its older script and URL. It was not reloaded. Temporary test tabs were closed; existing user tabs were preserved.

Phone verification used isolated CI Chromium against the exact published candidate. The native browser check used its desktop viewport. These checks verify tutorial behavior, not experimental accuracy.
