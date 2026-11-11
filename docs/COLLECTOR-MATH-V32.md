# Collector mathematics: independent v32 review

Status: final-source mathematical and independent event review complete; eight independent regression tests pass. This review does not validate collision physics or self-consistent electromagnetic fields.

## Root cause and selected path

The rotating and ICR simulation advances a synchronized drift–Boris–drift orbit, then the previous collector routine intersects only the chord between its endpoints. A near-grazing orbit can leave and reenter the cylinder while both endpoints remain inside. In simple terms, a straight ruler misses the outward bulge of the curved trajectory. Reducing the gyro-step alone does not provide a uniform grazing-event error bound.

The smallest coherent fix is to isolate collector contact on the existing fractional Boris step. It preserves the orbit model and avoids changing the physical detector radius. Reusing the double-well polynomial isolator is preferable to sampling a fixed number of substeps, because a narrow leave/reenter interval can fall between every fixed sample. This is event localization on a numerical orbit, not an exact solution of the Lorentz equations.

## Rational representation

Let the fractional elapsed time be τ=hu, 0≤u≤1; let γ=q/m, t=γBτ/2 and D=1+t². With transverse electric field E evaluated at the drift midpoint p+vτ/2, direct matrix reduction of the Boris rotation gives

```
Nx = xD + τvx + τt vy + γτ²(Ex+tEy)/2
Ny = yD + τvy - τt vx + γτ²(Ey-tEx)/2
x(τ)=Nx/D, y(τ)=Ny/D, z(τ)=z+τvz.
```

For the prescribed DC field E=k(p+vτ/2)+F, with fixed F, Nx and Ny have degree at most four. The side-wall equation is the degree-eight polynomial Nx²+Ny²−a²D²=0. Since D>0 for finite real τ, multiplication by D² introduces no real roots. Use dimensionless p/a and τ/h to improve conditioning. Axial source/end events remain ballistic and must compete with side-wall events by elapsed time.

The polynomial derivative recursively partitions [0,1] into monotone intervals, where a sign-changing root can be bracketed. Critical points retain multiple roots, including tangencies. Only first contacts/outward crossings should collect; reentry roots cannot supersede an earlier event. An inward launch from an existing surface must not create a spurious zero-time hit. A numerically unresolved grazing classification should produce an explicit numerical error, not a larger detector.

The fast exclusion also has a direct bound: magnetic rotation preserves transverse speed, so |v′⊥|≤|v⊥|+|γ|Eboundτ and |Δp⊥|≤τ(|v⊥|+|γ|Eboundτ/2). The linear-field bound uses the ballistic drift midpoint radius r+|v⊥|h/2 and the RF amplitude. Replacing τ by h is conservative because all bounding terms are nonnegative. This half factor comes from the two half drifts; it does not omit half of the electric acceleration.

## Time-dependent midpoint RF

The actual partial step evaluates F at t₀+τ/2. Freezing F at the complete step's midpoint changes that path. Instead write φ=ωt₀, δ=ωτ/2 and use phase addition with sinδ through degree seven and cosδ through degree eight to generate polynomial candidates. Nx/Ny then have degree at most eleven and the wall polynomial degree at most twenty-two.

Under the existing RF-frequency guard |ωh|≤0.03, |δ|≤0.015. Taylor remainders satisfy

```
|sinδ−S7(δ)| ≤ 0.015^9/9! = 1.0593959263392855e−22
|cosδ−C8(δ)| ≤ 0.015^10/10! = 1.5890938895089282e−25.
```

The RF-acceleration guard |γF|h²/a≤0.0009 bounds the normalized transverse position error by

```
0.00045 sqrt(1+0.015²) hypot(sine remainder,cosine remainder)
≤ 4.767823321342118e−26.
```

This bound is for Taylor truncation alone; IEEE floating-point arithmetic and phase evaluation dominate it. Candidate positions must therefore be checked against the actual production RF evaluation at t₀+τ/2. No global change to RF phase evaluation is needed. The bounded approximation must remain explicit in documentation, rather than calling the RF path exactly polynomial.

## Independent probe evidence

The source snapshot preceding v32 was copied into `/tmp/mass-spinner-events32-math` and executed only in Apple safe-dev guest `safe-dev-5c63d282f251235b`. The independent matrix reduction was compared against production `step`, which uses cross products. Across 20,000 randomized signed-charge, signed-field cases, maximum absolute position discrepancy was 2.220446049250313e−16. Across 20,000 RF phase samples up to ±3000 rad and guard-saturating normalized RF displacement, maximum phase-addition versus direct-trigonometry normalized discrepancy was 9.832258553622528e−17. These randomized checks support implementation consistency; they are not a proof of exhaustive floating-point correctness.

For pure uniform B, the synchronized fractional position lies on the exact physical circle with angle θ(τ)=2 atan(Ωτ/2), Ω=γB. This follows from the rational representation and supplies an independent contact-time oracle: τ*=2 tan(Ωt*/2)/Ω. It separates numerical-path event error from physical phase error.

For the retained near-grazing witness p=(0.99999,0,0.5), v=(0.003,−0.5,0), Ω=a=1, h=0.03, the numerical first-contact time is approximately 0.00399999899986. Production `step` evaluated there gives radius exactly 1 in double precision, while its full-step endpoint radius is 0.9999675099823457 and the chord detector reports no contact. The independent circle bisection uses floating trigonometry; its quoted event time has roughly 1e−13 absolute uncertainty, not arbitrary precision.

## Final-source gates

`tests/collector-math-v32.test.ts` passed 8/8 in the independent VM against the candidate `advanceOrbit` implementation. Checks cover the retained grazing witness; 10,000 randomized pure-B trajectories against independent analytic circle roots; earliest wall/end/source ordering; inward and outward surface launches; constant RF against a ballistic quadratic; and twenty genuinely time-dependent RF event cases spanning starting phases 0, 0.123, 10, 500 and 3000 rad, both B signs and both handedness values. The RF oracle independently evaluates the matrix-position formula and brackets its first outward crossing before bisection, using no production field, step, polynomial or root function. These chosen RF witnesses have comfortably resolved excursions, so dense bracketing is suitable for checking these cases; it is not the event method proposed for general operation. Interior tangency and a resolved near miss with maximum radius 1−1e−12 also pass.

The final independent typecheck passed. Exact commands, run through `/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-events32-math run --`, were `./node_modules/.bin/tsx --test tests/collector-math-v32.test.ts`, `./node_modules/.bin/tsc --noEmit` and `./node_modules/.bin/tsx probe.ts`. Dependencies were installed online only inside that VM using `npm ci --ignore-scripts`; all probes and checks ran offline. The guest was exported before source replacement and after final tests. Parent integration owns the full repository test/build gate.

The four touched production source files matched the canonical project byte for byte when this run was completed. Retained evidence is in `scientific/collector-v32/math/`, including tested-source hashes and the TAP output. The position probe is retained as a stage-root script: copy it to `probe.ts` beside the copied `src/` to reproduce it.

Remaining numerical limits: a grazing time is intrinsically ill-conditioned, with time sensitivity inversely proportional to radial crossing speed. There is no uniform relative event-time guarantee at an exact tangency. The RF polynomial candidate bound assumes the current frequency and RF-acceleration timestep guards; future direct callers of `advanceOrbit` must preserve them. Explicit ambiguity errors near the floating-point classification boundary are preferable to silent collection or detector-radius inflation. These checks establish numerical-path consistency over the stated gates; physical orbit accuracy still requires timestep convergence.

## Primary reference

[WarpX's Boris momentum pusher](https://warpx.readthedocs.io/en/26.06/_static/doxyhtml/_update_momentum_boris_8_h_source.html), lines 45–47, documents tan(α/2)=|qBΔt/(2γm)| and attributes the relation to Birdsall and Langdon. The synchronized-position rational reduction and RF truncation bound above are derived specifically for this repository's nonrelativistic drift–kick–drift implementation; WarpX's velocity pusher does not by itself validate these collector formulas.
