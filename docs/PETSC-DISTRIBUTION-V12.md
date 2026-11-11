# PETSc finite-element distribution export, v12

This slice adds output and independent reconstruction to the exact-SI homogeneous two-ion PETSc reference. It does not change the physical operator, initialization, time integrator, nonlinear/linear solver, or frozen `scientific/petsc` study. The adapter, lock, and original driver are copied into `scientific/petsc-distribution-v12`; the build hash-checks the original driver before generating a wrapper in the guest cache.

## Why another export was necessary

The existing driver emits density, temperature, energy, momentum, quadrature minima, and sampled negative mass. Those moments do not determine the distribution. Two fields can share the same temperature and have different tails, anisotropy, or negative regions. This exporter records actual finite-element fields, rather than fitting a Maxwellian to moments.

For each requested checkpoint and each species, the self-contained JSON contains every quadrilateral cell's actual oriented closure coefficients, scalar Q2 basis at nine reference interpolation points, physical coordinates at those points, original FE quadrature points/weights/basis, and physical quadrature coordinates and Jacobian determinants. These data determine the cell polynomial and geometry; independent Python reconstructs them without PETSc. The native binary Vec is an additional raw global-coefficient artifact. Its in-process `VecLoad` check reloads into a separate sequential vector and requires exactly zero coefficient difference; it does not claim to reconstruct a mesh from the native vector alone.

The explicit schema is restricted to scalar tensor Q2 quadrilaterals. Unsupported bases/cells fail rather than silently approximate. The reference interpolation grid is `[-1,0,1]²`; the bridge through tabulated basis values avoids assuming PETSc closure ordering equals interpolation-node ordering. Physical geometry is independently reconstructed at the original quadrature points and checked against PETSc's geometry.

## Normalization and integration

The field is `F_s = v0³ f_s / n0`; coordinates are velocity divided by the common `v0`. An axisymmetric distribution has measure `2πr dr dz`, with `r=v_perp/v0` and `z=v_parallel/v0`. Reloaded moments use:

- `n_s = n0 ∫F_s 2πr dr dz`.
- `P_s = m_s n0 v0 ∫z F_s 2πr dr dz`.
- `E_s = ½ m_s n0 v0² ∫(r²+z²)F_s 2πr dr dz`.
- `T_s[eV] = m_s v0²/(3e) [⟨r²+z²⟩−⟨z⟩²]`.

The negative-number fraction is `∫max(−F,0)d³v / ∫F d³v`. The recorded entropy quantity integrates the positive part only when negative values exist; it is not a valid full H functional in that case. Neither coefficients nor reconstructed fields are clipped, normalized, or rate-fitted.

The original quadrature comparison checks serialization and reconstruction against the driver. Independent 8×8 and 16×16 Gauss rules per cell probe sensitivity of negative mass and positive-part entropy to quadrature. These nonlinear integrals are not necessarily accurately resolved by the quadrature that integrates low-order moments exactly. Denser sampled positivity is still not a proof of global positivity, and this export does not qualify a physically unconverged or finite-domain-limited reference by itself.

## Exporter defect found during verification

The first optimized short evolution crashed in `DMPlexVecGetClosure`, after successful initial exports. The buffer pointer and size were uninitialized. [PETSc's API contract](https://petsc.org/release/manualpages/DMPlex/DMPlexVecGetClosure/) treats a non-null incoming pointer as caller-supplied storage; random stack contents therefore became a destination buffer. In simple terms, the exporter accidentally told PETSc to write into an arbitrary address.

The smallest root-cause fix initializes `closure=NULL` and `size=0` for every cell, allowing PETSc to provide its managed work buffer, then restores it using the matching API. This preserves the intended allocation/restore contract. Arbitrary guards or switching off optimization would hide the bug. Initial sanitizer runs happened to pass because instrumentation changed stack contents; optimized reproduction remained a required gate.

An earlier suspicion about DM-associated native reload was not supported: disabling the entire native export/reload block still reproduced the crash. It must not be cited as the root cause. Reloading into an independent sequential Vec remains a straightforward coefficient-only ownership boundary.

## Reproduction and evidence

All installation, compilation, scientific runs, and Python checks execute inside Apple `safe-dev` VMs. Initial work and the artifact regressions used this package's own VM. The accepted replay used an explicitly approved, disjoint `field-replay-v12` staging directory in the main study's VM after that study completed, exported and verified its results. It reused the existing pinned environment and immutable Landau object without downloads or changes to the main source, object, binaries, library or results. Fresh post-export checks used this package's VM and a separate reviewer's VM. Host source changes were explicitly synchronized before execution; no host credentials, home directory or control socket was mounted. The lock pins PETSc 3.26.1 and its dependencies; the source archive SHA-256 is `b02a89a8ed65a4ea528a3875261af5526a27af2b61c79ed34d2f5700ee669f47`.

From the package directory, use the absolute safe-dev launcher with `-C` pointing to that directory:

```sh
safe-dev init
safe-dev run --online -- sh bootstrap.sh
safe-dev run --online -- sh build.sh
safe-dev run -- python3 run_case.py pilot-export --mesh 2 --duration .000005 --export
safe-dev run -- python3 run_case.py pilot-off --mesh 2 --duration .000005
safe-dev run -- python3 run_case.py pilot-original --mesh 2 --duration .000005 --original
safe-dev run -- python3 -m unittest -v test_reload
safe-dev run -- python3 run_case.py fine --export
safe-dev run -- python3 reload.py results/fine
```

`build.sh` needs online access only to fetch the hash-verified source if absent; compilation itself does not require network. The matched fine case uses 40u/84u, charge +e, density `5e17 m⁻³` each, isotropic 2/10eV, lnΛ12, two 12×24 Q2 grids, R6, dt5μs, and .5ms. Checkpoints are initial, .1ms, .25ms, and final .5ms. `run.json` records exact arguments and source identities; `process.json` records exit status and elapsed time. Failed diagnostic pilots are retained separately under `diagnostics` and are not scientific results.

## Persisted artifact integrity

The first fine run returned success and its guest reconstruction checked eight fields. After export, both .25ms JSON files contained only NUL bytes despite retaining plausible sizes; the other six JSON files and all eight 1,225-coefficient native vectors parsed. That attempt is preserved under `diagnostics/fine-attempt1` and is not an accepted field bundle. The original guest was reset before host verification and no pre-exit field hash manifest existed, so the original bytes cannot be retrospectively established. Storage pressure was observed during the broader session; the cause of this corruption is unknown.

The gap was accepting in-guest completion before checking persistence and transfer. The output path now checks C stream errors and close status. After the solver, Python synchronizes the actual closed JSON, Vec, metadata and log files, reopens and reconstructs every required field and vector, writes synchronized verification reports, then atomically writes a SHA-256/size completion manifest and synchronizes its directory. Actual host checksum verification establishes identity with those validated bytes before any guest reset. Fresh post-export checks verify the required set, decode all native vectors and parse all JSON fields; a distinct independent Q2 integrator reconstructs the fields. Dense 8/16 quadrature is not redundantly repeated solely for transfer verification. Corrupt or incomplete bundles fail; fields are not silently repaired or replaced from a fitted distribution.

Ten regression tests pass, including full bundle completion refusing NUL/truncated checkpoints and a byte change after completion invalidating verification. These exercise the artifact pipeline rather than only a JSON parser. The fresh fine rerun reuses the main study's existing pinned environment and unchanged Landau object, compiled into separate wrapper/cache names. It explicitly pins `OMP_NUM_THREADS=OPENBLAS_NUM_THREADS=1` to match the main study; the rejected first attempt left these variables unset/default, and did not measure actual thread count. Physics inputs and the original C driver remain unchanged.

## Accepted replay and limits

The accepted bundle is `scientific/petsc-distribution-v12/results/fine`. The solver exited 0 after 986.760402161 seconds. All eight JSON fields and eight native vectors are present at the four requested times; each vector has 1,225 coefficients. The original setup and all 101 reported checkpoint records match the frozen no-export `mesh12` run exactly, including IEEE754 binary64 encodings of every numeric leaf. Every reported numeric maximum difference is zero. This is a statement about the measured setup/checkpoint records, rather than an unavailable comparison of both solvers' complete internal states.

The exact command, thread environment and source hashes are recorded in `results/fine/run.json`. The unchanged physical driver hash is `9c2ea2c7f1af093ae07f11e7ce8cd91da135c017c4dc157c993dc3f6929257a5`; the output header hash is `016d26e3a6b9b087827651318d93f945a2b457308fd83e50bae6e836e2c12822`. The reused Landau object hash is `0e0db73fd95da4aece7b4416ce7cb290b5e9488c44ffd9604406a5760391bf5c`.

The evidence includes:

- `results/bundle-regressions.txt`: ten passing regression tests on the latest staged build, including original/export-off/export-on checkpoint identity and both artifact corruption cases.
- `results/sanitized-short`: an optimized AddressSanitizer/UndefinedBehaviorSanitizer .1ms short evolution, six validated fields and empty stderr. Instrumentation covers the driver/export wrapper; the prebuilt PETSc library and unchanged Landau object are not instrumented.
- `results/fine-vs-frozen-mesh12.json`: all 101 checkpoint comparisons, exact IEEE754 comparison method, zero maximum differences, explicit tolerances and the main reference file's SHA-256.
- `results/main-inputs-readonly-verification.json` and `build-inputs.sha256`: reused main inputs retained their original verified hashes.
- `export-manifest.sha256` and `host-export-verification.txt`: all 103 exported source/config/data/report files passed actual host checksum verification; the parent independently repeated this check. The fine bundle's own manifest binds 30 data/report records.
- `results/fine-field-summary.json`: maximum original-quadrature basis reconstruction error `4.16e-17`, geometry error `3.55e-15`, and native coefficient versus reconstructed nodal-value error `2.08e-17`.

Fresh independent Q2 integration in a separate VM checked all eight fields against their checkpoint moments after validating the manifest and exact checkpoint identity. It also independently found a tiny negative tail in the 84u .1ms field: `F=-1.3716742802843133e-16` at a point missed by the original Gauss3 quadrature. The export's 8/16 rules estimate negative-number fractions `1.05e-16` and `6.88e-17` there. These are extremely small sampled fractions, but they demonstrate why positive coefficients and original quadrature samples do not certify a globally positive field or a full H functional.

The accepted final temperatures are 5.382956217825284eV and 6.614946525645007eV. Serialization, reconstruction and agreement with the frozen homogeneous benchmark are verified. Finite-domain convergence, time/mesh convergence, cross-code agreement and complete separator-device validity remain separate qualification questions.
