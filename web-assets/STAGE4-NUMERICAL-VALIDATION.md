# Stage-four independent coupled numerical validation

Evaluated 6 November 2026. **The spatial/particle convergence gate is NOT ESTABLISHED.** The implemented prescribed-field kinetic model has strong conservation-ledger and analytic-limit evidence, but the tested local collision grids produce non-negligible numerical angular momentum. A torque-corrected ledger verifies bookkeeping; it does not repair the physical trajectories or validate separator sorting/purity. There is no experimental validation.

## Paths and independent checks

Traced `simulateDoublewell → validateDoublewell → initial distributions/equal weights → half collision step → quartic orbit and surfaces → half collision step → conservation/history/plots`.

The nine coupled tests in `tests/doublewell-dynamics.test.ts` independently check:

- Exact cylinder/rectangle intersection areas partition πa², including odd/even grids, corners and tangent cells. The collision-cell axial factor then partitions the declared column volume.
- Equal physical particle weights follow the declared pulse or whole-column volume; integrating final absolute density over cylindrical annuli recovers each species' inventory.
- Closed collisionless H and canonical angular momentum converge at second order for three timesteps.
- Closed specular cylindrical walls and periodic z retain inventory, H and Pθ through repeated wall encounters.
- With collisions, species inventories remain fixed and pair kinetic-energy conservation is reflected in the total H ledger. Individual species angular budgets change. The measured cell torque explains the raw total Pθ error; it is not silently subtracted from trajectories.
- Summed absolute pair torque ≥ summed absolute cell-net torque ≥ absolute net torque; collisionless runs have zero pair torque. These are different diagnostics, because cancellations can hide individual nonlocal impulses.
- Open source/wall/end/active counts balance at every recorded time. Independently summing impact energies and Pθ, multiplied by physical weight, reproduces signed exit-flux ledgers.
- An entirely collected ballistic pulse has undefined/null survivor means and temperatures, and its complete outgoing H/Pθ equals the initial budget.
- A nonzero common-Ω equilibrium is compared to an independently integrated cylindrical equilibrium CDF across independent seeds. Unsupported initialization and collision regimes are rejected.

The seven separate orbit tests also compare force to a numerical potential derivative, radial turning point/time to independent Hamiltonian root/quadrature, and magnetic wall arrival to an exact circular trajectory. They do not derive expected answers by calling the production energy/field helpers.

Executed command:

```sh
./node_modules/.bin/tsx --test tests/doublewell-dynamics.test.ts tests/doublewell-orbits.test.ts
```

**16 passed, 0 failed**, about 2.5 seconds. This is a scoped numerical/source result; the parent owns final full-suite/build/typecheck, UI integration and deployment. Host execution used the user's existing explicit scoped exception after safe-dev was inaccessible. No browser/network workaround was used.

## Collisionless time refinement

Closed pulse, default physical parameters, 16 representatives/species, seed 42, 20 μs duration, collisions disabled:

| dt | Maximum H residual | Maximum raw Pθ residual |
| --- | ---: | ---: |
| 200 ns | 5.6862×10⁻⁶ | 2.4156×10⁻⁶ |
| 100 ns | 1.4216×10⁻⁶ | 6.0395×10⁻⁷ |
| 50 ns | 3.5540×10⁻⁷ | 1.5099×10⁻⁷ |

Residuals use the engine's positive initial scales rather than dividing by a potentially zero signed total. Both errors decrease by approximately four per timestep halving.

## Common-rotation stationary benchmark

Parameters: closed/specular radial and periodic axial boundaries, common Ω=−12,000 rad/s, B=0.02 T, V=2 V, κ=1.2, Ti=10 eV, density 10¹⁸ m⁻³, masses 40/84 u and unit charges, a=0.2 m, L=0.6 m, 256 representatives/species, 3 cells across, dt=100 ns, duration=20 μs, seeds **11, 22, 33, 44**. Collisions enabled. Beam energy is zero.

The independent expectation uses the same physically specified equilibrium, integrated afresh with 20,000 midpoint bins in r²:

```
n_s(r) ∝ exp{−[q_s φ(r) − (m_s Ω²+q_s Ω B)r²/2]/(e Ti)}.
```

The four pooled final CDFs differ from that expectation by at most **0.01430 for A** and **0.01785 for B** at the 20 diagnostic annular edges. Mean fitted residual kinetic temperatures across seeds change from **10.52526→10.52750 eV** for A and **10.59916→10.61539 eV** for B. Finite sampling explains the initial offset from 10 eV; the reported quantity also removes fitted rotation and axial mean flow.

This supports short-time stationarity inside a controlled, weakly coupled common-rotation benchmark. It does **not** prove convergence to that equilibrium from an arbitrary pulse, long-time stability, a local thermodynamic temperature, or the 2014 proposal's species-dependent rotating-frame endpoint. Collisions couple samples, so the CDF test tolerance is descriptive and is not a binomial confidence bound.

## Collisional timestep experiment

Closed zero-canonical initial pulse; all default physical parameters; N=128 representatives/species, 2 cells across, 20 μs duration. Each row gives the range over seeds **11, 22, 33**:

| dt | Max H residual | Max torque-corrected Pθ residual | Max raw Pθ residual | Accumulated absolute cell-net torque/P scale | Unpaired exposure |
| --- | ---: | ---: | ---: | ---: | ---: |
| 200 ns | 2.74–3.81×10⁻⁶ | 3.28–3.34×10⁻⁶ | 0.00114–0.00290 | 0.0302–0.0314 | 1.63–2.13% |
| 100 ns | 6.68–9.48×10⁻⁷ | 8.19–8.25×10⁻⁷ | 0.00112–0.00264 | 0.0415–0.0438 | 1.70–2.00% |
| 50 ns | 1.63–2.45×10⁻⁷ | 2.04–2.09×10⁻⁷ | 0.000830–0.00415 | 0.0600–0.0630 | 1.70–2.02% |

The orbit/ledger remainder decreases approximately quadratically. **Raw angular momentum does not converge monotonically with dt.** The sum of absolute stochastic torque increments grows under timestep refinement; this is consistent with accumulating Brownian-like variation and is not evidence that the total signed physical error grows by the same factor. Spatially separated impulses remain the source of that error even at smaller timesteps. Pair torque and its quadratic variation are useful additional diagnostics; an absolute-increment sum alone is not a transport-error norm.

Only a small fraction of sampled pairs have angular variance >0.1: about 0.064–0.088%, 0.016–0.034%, and 0.016–0.021% in these three timestep settings. Reporting that marker does not establish convergence of all collisional moments.

## Joint particle/cell refinement experiment: unresolved gate

Closed zero-canonical pulse, default physical parameters, dt=100 ns, 20 μs, seeds **11, 22, 33**. The whole-cylinder collision grid is Cartesian with exact cylinder-cut cell volumes. N is per species. Ranges below span seeds.

| N / cells across | Max H residual | Max corrected Pθ residual | Max raw Pθ residual | Absolute cell-net torque/P scale | Unpaired exposure |
| --- | ---: | ---: | ---: | ---: | ---: |
| 128 / 2 | 6.68–9.48×10⁻⁷ | 8.19–8.25×10⁻⁷ | 0.00112–0.00264 | 0.0415–0.0438 | 1.70–2.00% |
| 512 / 3 | 8.75–9.08×10⁻⁷ | 8.23–8.73×10⁻⁷ | 0.00473–0.00578 | 0.0436–0.0446 | 1.12–1.27% |
| 2048 / 4 | 8.61–8.98×10⁻⁷ | 8.44–8.59×10⁻⁷ | 0.00272–0.00352 | 0.0258–0.0264 | 0.546–0.560% |

Seed-11 absolute **pair** torque/P scale is 0.16845, 0.38530 and 0.26938 respectively, substantially larger than the cell-net sums. Cell-net cancellation therefore cannot establish local angular conservation.

Final survivor mean radius, ensemble mean ± **between-seed sample standard deviation**, not standard error or a confidence interval:

| N / cells | A mean radius (m) | B mean radius (m) |
| --- | ---: | ---: |
| 128 / 2 | 0.07260 ± 0.00339 | 0.07919 ± 0.00202 |
| 512 / 3 | 0.07471 ± 0.00081 | 0.07757 ± 0.00087 |
| 2048 / 4 | 0.07414 ± 0.00019 | 0.07835 ± 0.00157 |

Mean-radius values have some overlap on this short horizon, but three seeds and these grids do **not** establish spatial/particle convergence. Refining particle count changes occupancy noise at the same time as refining cells changes local density resolution and nonlocal torque. In particular, the coarsest cells are wider than the initial pulse radius and dilute its peak density, biasing early collision rates. The raw-Pθ error remains at the per-mille level in the finest tested setting and is not monotonically reduced from the coarse setting. No acceptance threshold was relaxed to turn this into a pass.

## Open-pulse accounting example

Default physical parameters except density 10¹⁷ m⁻³, N=64/species, dt=200 ns, duration=200 μs, seed 42. Final `(active, wall, end, source)` counts are **A=(12,0,49,3)** and **B=(22,4,33,5)**. All counts and impact records reconcile. Maximum H residual including signed outgoing energy is **4.98×10⁻⁶**; torque-corrected Pθ residual is **4.47×10⁻⁶**, while raw Pθ reaches **1.56×10⁻³**. Unpaired representative exposure is about **18%** by the full run as the pulse empties and spreads.

That last figure is a limitation: exact accounting of sparse cells does not recover collisions with missing partners. Outlet fractions are model outputs with numerical and physical assumptions, not validated apparatus purity or throughput. Independent-seed, timestep, particle/cell and physical-regime checks are necessary for each intended operating point.

## Remaining validation boundaries

- Collision-only normalization and thermal-exchange benchmarks are separately documented by the collision-kernel reviewers; they do not validate the inhomogeneous transport closure.
- Force, surface, H and flux checks pass, but grazing contacts still require timestep convergence and the finite collision grid creates measured angular-momentum error.
- Density, electron screening, Coulomb log, prescribed potential and source are hypothetical declared inputs. Initial and local regime diagnostics cannot replace measured plasma fields or an evolved electron model.
- Neither a reference equilibrium initializer nor a small corrected residual proves separation before cross-species drag and axial loss. Long-time relaxation, spatial/particle convergence and experimental comparison remain open gates.
- Browser runtime, public control behavior and GPU appearance were not exercised by this validator. No claim about those surfaces follows from the tests above.
