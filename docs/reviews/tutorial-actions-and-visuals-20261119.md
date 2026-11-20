# Tutorial actions and visual references

## Problems and fixes

| Problem | Cause in code | Simple explanation | Fix and reason |
| --- | --- | --- | --- |
| The reader showed a wait message before an action. | Initial authorization used the action-status output. | Reading looked like an unfinished operation. | Keep initial authorization silent. Put action feedback beside the selected link. Authorization still permits reconnection after a reload. |
| An action could target an older simulator. | Global window names reused readers with an earlier opener and simulators from other readers. | A link could control the wrong tab. | Open Docs from the current simulator. Give each independent reader its own simulator window name. Keep that name through reader navigation. Do not navigate an existing simulator. |
| The first direct-reader action had no execution receipt. | New-window navigation included the action query, then removed the pending request. | Opening a tab did not confirm that the requested view opened. | Open the simulator without an action query. Send one acknowledged request after authorization. Keep request IDs, origin checks and reload interruption checks. |
| Gas and coil views waited for a physical result. | The accepted-result gate also blocked display actions. | Looking at hardware unnecessarily required a completed calculation. | Wait for the required display controls to mount. Keep the result gate for actions that need physical results. |
| Adjacent-section links and missing examples interrupted reading. | The renderer added Next links after every section. Most sections had no local visual. | The reader had more navigation than explanation. | Remove same-page Next links. Keep the contents and cross-tutorial links. Add local examples and short reasons for each question. |

## Physical scope

The new spin-up curves solve an exact two-population reference. The populations have equal, constant inertias and linear collision coupling. There is no wall drag or radial redistribution. Collisions conserve total angular momentum. After power stops, the speed difference decreases without a change to total angular momentum.

The separation bars compare the equilibrium exponent, not purity. The magnetic bars hold torque, geometry and conductivity constant. They do not describe a constant-current experiment. The inventory bars include only steady unburned exhaust at fixed fusion power. Routing diagrams show direction, not flow rate. The diagnostic diagram uses an offset sightline. A center chord would have no rotation signal for axisymmetric azimuthal flow. It assumes no emission profile. Motion controls appear only for diagram states with animated paths.

The tutorial text states these conditions beside each example. Existing equation blocks, action IDs and anchors stay the same. Technical names and equations remain unchanged during the STE wording check. The review uses ASD-STE100 Issue 9; it is not a formal compliance certificate.

## Verification

The local memory guard refused an isolated runtime because host memory pressure was not normal. No project tests or build ran on the host.

Static checks passed: `git diff --check` and comparison of all 20 existing tutorial equation blocks with the earlier source. The rendered concept descriptions, readings and captions have no sentence above 25 words. The rules and dictionary review are separate checks.

[Verify run 44643120593](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44643120593) passed for source `2dddae01aee1ebf2e5bd689389b876f8cc1dca48`.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed; app and contracts |
| `npm run typecheck:infrastructure` | Passed |
| `npm run typecheck:boundaries` | Passed |
| `npm run typecheck:tests` | Passed |
| `npm run lint` | Passed |
| Four Python unittest suites in Verify | 28 passed |
| `node --import tsx --test --test-concurrency=1 tests/*.test.ts` | 1,604 passed; no failures |
| `npm run build` | Passed |
| `npm run check:site`, `npm run check:assets`, `npm run check:gltf` | Passed |
| `npm run release:seal`, `npm run release:verify` | Passed; 254 candidate files |
| Playwright desktop | 29 passed |
| Playwright phone | 29 passed |

The Python suites were `test_screen.py`, `test_argon_reference_export.py`, `test_dev_snapshot.py` and `test_deploy_credentials.py`. Verify ran each with `python3 -m unittest discover` in its isolated environment.

The new regression tests check silent initial authorization, first-action receipts, reader isolation, old window names, copied storage and ordered-list feedback. They also check display readiness, diagram controls, reduced motion, unique SVG IDs and touch-target height. Numerical checks compare spin-up derivatives with the two-population equations. They check collision momentum conservation, power-off continuity and the stated reference factors.

## Publication

[Release preparation 44646209341](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44646209341) passed admission, identity, digest, current-release and retained-generation checks. Its publish step stopped because GitHub Actions had no Cloudflare credentials.

The project-pinned Wrangler 4.164.0 published the prepared artifact with the existing Cloudflare login. The assets-only configuration had no build command. All 254 candidate file hashes stayed unchanged in the 389-entry prepared manifest.

- Cloudflare version: `4892d669-f699-489d-9beb-11d99faaa1f7`.
- Prepared manifest SHA256: `feaf3c3afd808dfe236ed4851ed0537a0754a9667b2a3fed60f89f0f4bc1d919`.
- Live byte check: 389 local hashes and 388 served file hashes passed.
- All 12 redirect status and destination checks passed. `_redirects` was checked locally as a deployment control file.

## Live browser observations

A new direct reader had no visible idle status. Show gas & drive opened its own simulator and returned an execution receipt. The display controls were Both, cutaway 0.62 and all drive directions. Show the coils selected Magnetic coils and opened Examine.

Reader navigation to Tutorial 2 reused that simulator. Show drive work opened the heat plot. The coil selection remained in place. Tutorial 2 rendered nine figures with no equation errors.

The live reference controls gave the expected results: power-off spin-up, 0.25 resistive-heat factor at twice the field, cascade routing and 2.05 exhaust inventory at half burn fraction. The diagnostic motion control appeared only after selection of Collected light.

The native viewport control kept a 1280 px layout after a 390 px request. Thus, the live native check covers desktop. Phone evidence comes from CI Chromium on the exact published bytes. The native test tab reported two Electron startup errors from `node:electron/js2c/sandbox_bundle`. No app-source error appeared in that log. The temporary viewport setting was reset. All test tabs from this task were closed.

These checks verify tutorial behavior and the stated reference equations. They do not show experimental accuracy.
