# Independent six-seed locality confirmation v33

8 November 2026. **Transport is not qualified.** Four complete original runs
passed independent artifact checks; two hit the prospective resource cap. Three
of the four complete runs exceed the fixed unresolved-exposure budget, and all
four contain sampled encounter-magnetization domain failures.

This addendum owns the prospective baseline `N32768-r12-z3-h100` from the
five-level confirmation plan. It does not replace the earlier sealed locality
or high-N evidence. The original unresolved-exposure gate remains 0.01, the raw
canonical-angular residual gate remains 0.001, and six independent seeds remain
required. All other transport gates and domain checks remain unchanged.

## Question and physical interpretation

The earlier full-horizon marker studies found that local density and velocity
sampling became inadequate as the pulse expanded beyond its initial source
support. At N16384, nr12, nz3, h100 ns, seed101, the sampled unresolved exposure
was 0.01385177068209016. Reducing the diagnostic threshold or counting only the
sparse species would hide part of that uncertainty. Increasing N while holding
the mesh, physical source and timestep fixed tests the demonstrated sampling
limitation directly.

Finite-cell angular error is a separate issue. The axisymmetric pair impulse
changes raw canonical angular momentum by `(ra-rb) Δpθ`: collision positions do
not move, so their magnetic canonical term is unchanged. More markers improve
sampling but do not make the finite radial lever arm vanish. This campaign
therefore retains raw angular and coverage checks separately and supplies one
level for matched radial, axial, particle and timestep comparisons owned by the
parent campaign. It cannot qualify continuum transport on its own.

## Frozen execution

All project execution uses copied Apple safe-dev stage
`/tmp/mass-spinner-transport33-confirm-locality`, guest
`safe-dev-509b4da5b3f16776`. Network was enabled only for dependency installation;
the simulations and independent analysis run offline. No host mounts, control
sockets, credentials, or production edits are used.

The prospective configuration is full200 µs, dt100 ns, 32768 representatives per
species, source-fitted annular nr12/nz3 cells, open pulse, Nanbu scattering, seeds
101/202/303/404/505/606. The frozen limits are 400 s per seed and 2400 s combined,
including the preflight. The exact physical settings are retained in `plan.json`.
Production `executeSeed` is called uninstrumented in explicit research mode.
The research admission budget now permits 65536 representatives per species
and 320 million particle steps; the interactive budget remains unchanged.

The common 45-file source-map SHA-256 is
`5e965a159a712b48413b6bf9afbad6b1d9d2b17968a301163644c58397cf5a18`.
Its compact-object run identity is
`ce9f7d1675841be920363278eaa306077e3ebdfb4af1ba41e08cdf6d7e0705b2`.
The independent plan hash is
`4ff0a038802c10f1c32d904736eed21fa7e3418e2d0eeccfc6d5de4f45f042bc`.
The complete 83-input map hash is
`386221c6a801ac29a40f93f3c9e4118f00a9c01e255650449ea06e0420954a0b`.
Inputs are verified before and after simulation. No budget or gate is changed
after observing a run.

## Optimization compatibility preflight

Before any large run, the final scalar collision arithmetic and direct original-
ion lookup were tested on the full200 µs N1024/nr12/nz9/h100 ns seed101 reference.
All eight raw objects matched the immutable v31 output exactly after JSON
serialization: species, history, conservation, collisions, regime summary,
regime history, spatial collision diagnostics, and final radial density.
The preflight completed in 10.96154488 s including process overhead.

The source diff independently preserves the old arithmetic and strict tie
handling in perpendicular-basis selection. Direct `.original` access replaces
an object-identity Map lookup without changing which ion receives the impulse.
This supports the intended performance-only change; it is not a validation of
the physical transport model.

## Original terminal results

| Seed | Original status | Wall time (s) | Max raw Pθ fraction | Unresolved exposure (%) | Outside snapshots |
| --- | --- | ---: | ---: | ---: | ---: |
| 101 | Timeout | 400.0114 | Unknown | Unknown | Unknown |
| 202 | Timeout | 400.0092 | Unknown | Unknown | Unknown |
| 303 | Complete | 351.2425 | 0.000325419 | 1.112031 | 5 |
| 404 | Complete | 297.4418 | 0.000308735 | 1.010900 | 9 |
| 505 | Complete | 304.9065 | 0.000275961 | 0.892266 | 1 |
| 606 | Complete | 308.9879 | 0.000328170 | 1.049246 | 2 |

Both timeouts have no complete raw artifact and are excluded from physical
comparisons. The summed launch wall times including preflight are 2073.56 s,
within the frozen 2400 s allowance. All original 83 inputs were verified again
after simulation. No source, seed, physical horizon, numerical setting, gate or
resource cap was changed during this campaign. A later resource recovery must
retain these terminal attempts separately; it cannot rewrite them as completed.

The original six-seed requirement is not met. Even the completed subset cannot
be called locally qualified: seeds303/404/606 exceed the 1% sampled coverage
budget, and every completed seed crosses the declared physical-domain limit.
The raw angular residual happens to pass in each complete run, which does not
override these separate failures.

## Independently checked artifacts

The frozen checker reconstructed raw angular balance from saved survivor means
plus **196646 timed exits**. The maximum difference from the producer's signed
history was **9.34e-17**. It independently integrated active-population-weighted
unresolved exposure, checked exact full200 µs monotone histories, species
partitions/collector memberships, source/configuration/research-mode identity,
and final radial-density inventory. All checks pass on the four complete runs;
the largest density-inventory relative discrepancy is **4.19e-16**. Timeout
exclusions and absent artifacts are explicit in `independent-confirmation.json`.

A separately frozen analysis, SHA-256
`c6d9cba6aacec6a25e7d2580a0cbb0e10c450cdadcad0138a9cfefe678f5d85b`,
reconstructed all **62 exported observables per complete seed** from raw data.
It checked nonnegative monotone unconditional survivor CDFs and their terminal
active fractions, collector quantiles, signed impact Hamiltonian
means, final radius/temperature, and the species angular-transfer sum against
the final raw angular residual. All pass; the maximum observable absolute
discrepancy is **2.78e-17**. No invalid output was replaced or clipped.

These checks validate the stored bookkeeping and converter execution path.
They do not establish collision-generator consistency, continuum convergence,
an entropy theorem, or equivalence across the other campaign levels.

## The newly visible physical-domain failure

All **17** saved outside-domain assessments identify the same specific failure:
the encounter-magnetization estimate `Ω λD/g` reaches the fixed limit0.1.
The complete assessments, times, reference states and observed extrema are
retained in `domain-observables-audit.json`.

| Seed | Worst ΩλD/g | Time of worst sample (µs) |
| --- | ---: | ---: |
| 303 | 0.138391708 | 148.2 |
| 404 | 0.112512377 | 91.0 |
| 505 | 0.103269997 | 171.6 |
| 606 | 0.188012184 | 172.9 |

The analytic reference estimate is0.000329184 with no reference-domain reasons.
At outside times, the other saved observed limits remain far from failure:
maximum coupling≤0.00108920, minimum Debye population≥47508.8, and minimum
estimated Coulomb logarithm≥11.8681. These extrema can come from different cells;
they must not be combined into a fictitious single local state.

Technically, an unmagnetized binary-encounter approximation requires little
gyromotion during a screening-scale encounter. In simple terms, some sampled
states say that the magnetic field can turn an ion appreciably while the
collision is taking place. Smaller timesteps do not by themselves change this
physical ordering. The gate therefore cannot be repaired by subtracting a
ledger torque or merely increasing the research work allowance.

One falsifiable explanation is a sampling/domain interaction in dilute regions.
A resolved present species needs at least four markers, so its minimum sampled
physical density scales approximately as `4*weight/cellVolume`. Higher N or
larger cells can admit resolved estimates at lower density; the Debye length
then grows and may increase encounter magnetization. This is an inference,
not a localized finding: the uninstrumented raw artifacts do not retain the
offending cell's identity, density, species counts, drift or speed. Sparse
temperature sampling is another possible contributor. A per-cell witness is
needed before choosing between estimator noise and a physically magnetized
tail. Neither possibility permits weakening the existing domain gate.

## Reviewable next work

The demonstrated numerical limitation remains insufficient joint marker/mesh
resolution, and the newly exposed model boundary is encounter magnetization.
The smallest coherent continuation is to preserve the original resource
failures, recover the same fixed seed inputs under a separately prospective
serial budget, and add diagnostic witnesses without changing the collision law.
Then assess a justified magnetized-encounter treatment or a separately declared
physical parameter domain, depending on the witnesses. A new operator would
need its own primary-source derivation and benchmarks. Coarsening diagnostic
cells, clipping dilute tails, loosening the threshold, or calling a raw torque
pass sufficient would conceal a measured limitation rather than fix it.

The aggregate campaign owns paired whole-run uncertainty, particle/radial/axial/
timestep equivalence and all final qualification statements. This evidence
supplies the exact original baseline level, including its missing results.

## Exact checks and preservation

Commands used with absolute `safe-dev -C` stage arguments:

```text
safe-dev init
safe-dev run --online -- npm ci --ignore-scripts
safe-dev run -- python3 run-confirmation.py
safe-dev export /tmp/mass-spinner-transport33-confirm-locality-original-export
safe-dev run -- python3 check-confirmation.py
safe-dev run -- python3 -c <exact pinned analysis> <same text as provenance>
safe-dev export /tmp/mass-spinner-transport33-confirm-locality-audited-export
```

The last analysis writes its exact executed text into the guest before reading
results, and its computed hash matches the prospectively frozen analysis hash.
The evidence directory contains both original simulation inputs/results and
the separate independent analysis. No source sync or destructive replacement
occurred. All valuable guest outputs are exported. No owned VM invocation is
running. Production code/build/typecheck/deployment remain parent-owned; this
evidence-only work does not claim those checks as its own.
