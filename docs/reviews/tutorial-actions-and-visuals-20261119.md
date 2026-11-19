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

Static checks: `git diff --check`; comparison of all existing tutorial equation blocks with HEAD. Runtime checks and publication receipts will follow the isolated CI run.
