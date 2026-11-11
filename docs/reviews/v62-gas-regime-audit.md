# Spatial gas-regime diagnostic: independent design audit

2026-11-10. Read-only source/physics review; no project execution, dependencies,
VM runs or application changes by this reviewer. This is a proposed audit
contract, not approval of an unexecuted v62 implementation.

## Traced path and actual scope gap

`fuel-centrifuge-ui.js` supplies the operation to `simulateFuelOperation`.
For spatial gas, that driver advances `advanceFuelMixtureThermal` jointly
with `advanceFuelCoupledStep`, using accepted species transfers and endpoint
temperatures. `fuelGasState` derives local temperature, pressure and partial
energy from accepted cell U and species N. The v61 browser-file auditor already
checks those identities and the complete accepted time history.

`scientific/gas-regime-v56/assessment.py` instead accepts one `state.gasK` and
uses it for every local pressure, viscosity, path and wall-incidence moment.
That is consistent with its declared uniform-temperature assessment. Passing
the spatial history through it with only the mean temperature would be a new
scope error: it would erase the thermal gradient being investigated. No defect
in the historical v56 uniform-temperature results is established here.

In ordinary terms: the new solver contains hot and cold gas in different places,
so its physical-validity check must use those local states rather than their
average. Retaining the old assessment and adding a separately scoped scientific
adapter is preferable to silently reinterpreting existing saved cases.

## Independently reconstructible fields

Use the initial inventory reference, not instantaneous mean pressure to create
new particles:

```
V = pi R² L, dV = V/M, N = p0 V/(kB T0)
N_light,i = N x P_light,i
N_heavy,i = N (1-x) P_heavy,i
n_s,i = N_s,i/dV
T_i = U_i / [1.5 kB (N_light,i+N_heavy,i)]
p_i = kB T_i sum_s n_s,i
x_i = n_light,i / sum_s n_s,i
mbar_i = sum_s n_s,i m_s / sum_s n_s,i
```

`lightMass`/`heavyMass` are separately normalized particle-number probabilities,
not kilograms. Both arrays remain normalized even when the bulk amount of one
species is zero. The mean gas temperature is particle-number weighted;
the volume mean of local pressures equals `N kB T_number_mean/V`. An arithmetic
mean of the temperatures generally violates that relation.

The existing Li viscosity and conductivity fit remains a theoretical isotope
proxy. Call it at each actual local T. It does not become composition-resolved
data because a local mixture mass is used in a diagnostic formula. Outside the
fit's domain return unavailable rather than extrapolating or substituting a
different species. The production Fourier coefficient is user-prescribed and
must be reported separately from the fit conductivity.

## Length and time screens

The viscosity convention is
`lambda_i = mu_i/p_i * sqrt(pi kB T_i/(2 mbar_i))` and the stress-time proxy
is `mu_i/p_i`. Neither supplies a measured collision frequency. This convention
is explicitly distinguished from alternative definitions in
[Sharipov/Seleznev, Eq. 2.3](https://srd.nist.gov/jpcrdreprint/1.556019.pdf).

Report radius Kn and resolved interior log-gradient screens for T, pressure,
total number density and each present species. On the actual RMS-center grid
`r_i=R sqrt[(i+0.5)/M]`, a disclosed conservative face proxy is

```
max(lambda_i,lambda_i+1) * abs(log(a_i+1/a_i))/(r_i+1-r_i)
```

This is a secant estimate from cell means, not a continuum derivative error
certificate. Do not use delta-y as delta-r, or call `lambda/cell_width` the
physical gradient Kn. A uniform field must give zero interior gradient even
when the mesh is refined below a mean-free-path length. At zero amount of a
species, skip its gradient; an actual vacuum or missing properties makes the
corresponding screen unresolved, not a density-floored pass.

If adjacent accepted states supply `abs(delta ln T)/delta t`, label it an
Eulerian finite-secant rate and combine it with a declared local stress-time
proxy if desired. It is not a material derivative, since species move between
the fixed cells. The first state's rate is unavailable, not established zero.
Numerical dt itself is not a physical forcing timescale. Stored-value roundoff
and finite-secant resolution prevent an all-time derivative guarantee.

Kn < 0.01 can remain a disclosed screening convention; it is not an empirically
established universal pass/fail gate for this rotating mixture. A continuum
solution can have a kinetic wall layer even when bulk gradients are small;
[Hadjiconstantinou 2006](https://web.mit.edu/ngh/www/PhysFluids_18_111301.pdf)
distinguishes the outer hydrodynamic solution and that near-wall layer, and
discusses the extra relaxation requirement for transient slip descriptions.

## Wall heat flow: do not conflate three temperature drops

The current mixture code has a prescribed film G and bulk half-cell
resistances. Independently derive its outward heat rate from the saved state:

```
A = 2 pi R L
R_gas = 1/(8 pi L kappa_imposed M)
R_solid = log(r_W,center/R)/(2 pi L k_W(T_W,cell))
Q_out = (T_gas,last-T_W,first)/(R_gas + 1/G + R_solid)
T_gas,surface = T_gas,last-Q_out R_gas
T_W,surface = T_W,first+Q_out R_solid
```

For G=0 or imposed kappa=0, the solved interface heat is zero; do not divide by
zero or invent a measured accommodation coefficient. The Fourier boundary
gradient follows `dT/dr = -Q_out/(A kappa_imposed)` when defined. Its gas-side
thermal-gradient Kn is distinct from the film jump
`T_gas,surface-T_W,surface=Q_out/G`. Dividing that interfacial jump by a gas mesh
spacing would manufacture a mesh-dependent gas gradient.

An incident-Maxwellian reference uses outer-cell local T and species densities:
`Gamma_s=n_s sqrt(kB T/(2 pi m_s))` and `G_Maxwell=2 kB A sum_s Gamma_s`.
The nominal G, not the combined center-to-center effective G, is the coefficient
to compare to this single-interface reference. The outer-cell distribution is
not an exact wall distribution. A reference ratio is conditional, never a
universal heat-transfer cap or a measured accommodation coefficient.
Do not substitute the continuum Smoluchowski jump law for this reference:
the v57 documentation already records their differing factor and distributions.
Tangential drift energy is a separate diagnostic; adding it to heat evolution
would risk counting existing wall-drag heating twice.

## Prospective independent audit and negative controls

The assessor and auditor should not import each other's arithmetic. The auditor
should reconstruct N, local n/T/p, paths and gradients, use independent
half-range Gaussian quadrature for the wall moment, and check the three
interface drops above with explicit sign conventions. Neither should trust an
already exported `qualified` flag or substitute equilibrium profiles for the
accepted transient state.

Necessary controls include uniform fields; nonuniform U/N with unchanged
number-weighted mean T; unequal species masses/composition; fixed-N heating;
absent species; vacuum/missing properties; zero film and zero imposed kappa;
heat-flow reversal; nonuniform RMS radii; initial unknown time rate; and a
deliberately corrupted diagnostic/identity that the independent auditor rejects.

A streamed assessment may examine every checkpoint without retaining all of
them. Report exact input SHA, source hash, checkpoint count, time endpoints,
full EOF consumption, every diagnostic's available/unavailable count, extrema
with arg-time/cell/face, and the declared aggregation rule. An auditor checking
only selected extrema or a small witness packet is a selected-state audit;
it must not be called independent all-state validation. A second full stream
can establish all-state arithmetic at additional runtime cost. Neither scope
establishes continuum accuracy, true between-knot extrema, kinetic boundary
accuracy or measured Marathon performance.

## Executed-evidence review and scoped closeout

2026-11-10. This reviewer authored `audit-independent.py` separately from the
assessor, campaign and tests. It imports none of their arithmetic or transport
helpers. The parent, exclusively, executed the isolated VM commands. I inspected
the resulting files and receipts, not a newly executed independent campaign.

Evidence checked:

- `scientific/fixes-v43/spatial62-actual-history.receipt.json` and the exported
  `summary.json`: the assessor visited 31,791 accepted checkpoints and 8,138,496
  cell states of the preserved 1 s browser export. It consumed the JSON through
  EOF and enforced the retained count, duration and exact input digest. The run
  took 86.19 s at the verified 651-input snapshot SHA256
  `90527fe160916e8c1b378c298917273add632a9c02ccd155f0024f95d50ee6b1`.
- `spatial62-independent-witnesses.receipt.json`, exported `audit.json` and
  `manifest.json`: the independent arithmetic audit passed all 49 supplied
  current/predecessor witnesses. Its packet SHA256
  `be60085654fb541d32480d7bc96e22845e3303ef58a11719996a473b5a172e54`
  matches the manifest's uncompressed witness packet digest. The audit and
  plotting command exited zero at that same source snapshot. Its Gaussian
  moment quadrature errors are reported separately.
- The source input remains the actual downloaded gzip SHA256
  `449703e8ff16c13881f5428a97a39ec5dee24d5c1092adebc1b6677613f8cb20`;
  its producing source hash is
  `a13a2f09e7316019a0cb3fb7b7f1241a179728c10ee347c47ec8a64d4c080270`.
  The separate v61 full-file conservation/source audit remains the evidence
  for the complete canonical history; this witness audit does not replace it.
- `spatial62-shape-red.log/.receipt.json` reproduce two failures: singleton
  temperature and pressure arrays were accepted through NumPy broadcasting.
  The coherent fix checks each derived field's exact mesh shape and finiteness
  before numerical comparison. In plain terms, one valid number can no longer
  masquerade as a complete spatial profile. `spatial62-shape-green` passes all
  nine tests at 650-input SHA256
  `cc69df50ef71a5ba228713ce8d7c02473bdec64a2a5808696b6d6c5bed910031`.
  The regression and malformed/absent/zero-transport/temporal/corruption controls
  are retained. This shape check enforces a real canonical mesh invariant;
  broadcasting or silently filling truncated values would conceal bad data.
- Reopened `findings.png`. Labels distinguish proxy scales, Eulerian rate,
  inferred radial Mach and selected accepted knots; the 0.01 line is explicitly
  a reference rather than a physical acceptance gate. The plotted profiles are
  cell means and do not claim a solved kinetic wall layer.

The all-state assessor reports maxima of radius Kn 0.0088931, interior thermal
gradient Kn 0.00103581 at 13.9103 microseconds, wall Fourier-gradient Kn 0.00107742,
Eulerian thermal-rate/stress-time product 0.0157838, and continuity-inferred
radial Mach 2.73096e-5 at 6.36279 microseconds. The imposed/proxy conductivity
ratio spans 1.84255--3.35183. The independently audited subset includes the
reported peak states and the minimum-conductivity-ratio state at 0.361877 s.
That independently checks the arithmetic at those states; it does not prove
that the assessor's global extrema selection could not have omitted a larger
value elsewhere. `independentlyAuditedEveryHistoryState=false` is correct.

No blocking correctness or scope issue was found in the inspected assessment,
witness reconstruction and declared coverage. The source field is now named
`filmToMaxwellReference`; neither its value nor small gradient/Mach diagnostics
establish Li/W accommodation, local kinetic equilibrium, continuum accuracy,
radial momentum closure or device performance. The review does not endorse
switching production conductivity to the theoretical proxy or claiming an
acoustic-timescale assessment that was not implemented. Physical qualification
correctly remains false. Separate production build/typecheck and any final
release-identity checks remain parent-owned closeout evidence.

## Final-gate receipt review

Reopened `docs/SPATIAL-GAS-REGIME-V62.md` and
`scientific/fixes-v43/spatial62-final.{receipt.json,log}` after closeout.
The final command exited zero in 7.980984962 s at the verified 652-input
snapshot SHA256
`c513634e7e841bb48873528d4afdb57a22e95648c4b79c5addd2c5866b24244e`.
The receipt/log support 11 new diagnostic tests, 16 existing v56 tests and
10 v61 oracle tests passing, followed by successful typecheck, production
build, site-resource and asset checks. The site check explicitly disclaims
browser runtime verification. The build retains its pre-existing large-chunk
warning; it is not reported as a failed scientific check.

The gate reports all 151 generated release files byte-identical to the prior
Final D release, SHA256
`889256c3ef8ae80b934786f1dec45f4b5f1d9a06f39dd787d0245df11390a56d`.
The main report correctly distinguishes this identity check from a new live
browser run or deployment. The added orchestration and two invariant tests do
not change the assessor used for the earlier 651-input all-state assessment.

No blocking inconsistency was found. The independently executed arithmetic
scope remains the 49 selected witnesses; all-state coverage belongs to the
assessor and its receipt. Neither final test success nor release identity
changes `qualified=false`, establishes transport calibration, or validates
the global peak-selection algorithm independently. This reviewer inspected
the final evidence and did not execute a second VM campaign.
