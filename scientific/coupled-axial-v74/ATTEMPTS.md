# v74 retained development attempts

No failed physical cases or acceptance thresholds have been removed.

1. First control suite: 9/10 passed. SciPy LinearOperator inferred its dtype
   with an int8 probe; the JSON adapter did not encode numpy int8. Specify the
   floating operator dtype and convert adapter scalars to ordinary floats.
   Regression includes integer-array current input. Rerun: all11 controls passed.
2. `attempt-01.json`: successful preliminary6x6/4-step trajectory, before
   independent per-step audit and separate-axis manifest extensions. Its original
   manifest/source hashes remain in the artifact. Independent checker validated
   both retained endpoints and rejected all five deliberately corrupted cases.
3. First full-study launch failed before computation: importing coupled.py had
   prepended the v73 directory to sys.path, causing the unrelated v73 checker
   to shadow the v74 checker. Import torsion by its explicit file path instead;
   do not change global module lookup. Added a regression on the actual study
   import and checker source path. No numerical results were produced by this
   failed launch.
4. `study-01.json` retained the failed local momentum checks. The separate
   `diagnostic-01.json` and `failed-24-24-4-False-1.json` isolate insufficient
   weak-cell electrical precision; the unchanged local check passes with the
   research adapter's stricter current solve. The default live precision stays
   unchanged.
5. `study-02.json`:18 complete trajectories and all their per-step balance
   receipts were retained. The parent deliberately interrupted only its own
   verified safe-dev VM (SIGINT, exit130), during the48x48/512-step repeat,
   after discovering a non-finite-energy boundary idealization. The96x96
   reference had not started. This interrupted run is never qualified.
   A4V outer boundary directly touching grounded endplates has corner
   electric-field singularities. Final Joule power at fixed256steps grows
   2.485855→3.444947→4.437036→5.441208W on6→12→24→48 grids, consistent with
   the analytically predicted logarithmic divergence. This is a failure of
   the verification input, not a license to relax the convergence gate.
6. Prospective study03 uses a smooth manufactured outer voltage
   `4 sin(pi z/L)` with grounded endplates, and adds the2ms intermediate
   output. Its potential boundary is continuous and has finite-energy trials.
   It represents a distributed prescribed potential, not one equipotential
   metal electrode or an inferred Marathon apparatus. A static Bessel-function
   current benchmark checks this forcing independently before the coupled run.
7. Pre-study03:32 controls passed; the analytic static program then failed
   while writing JSON because a NumPy power-error comparison produced a NumPy
   boolean. Normalize the computed error to an ordinary Python float. The
   actual five-mesh analytic report now has a JSON round-trip regression.
   The expensive coupled study had not started. Adjacent inspection also
   found that NumPy axial-edge inputs could alias thermal geometry; the
   constructor now owns edge copies, with an input-mutation regression.

Independent review also corrected scalar initial-speed normalization and added
an explicit endpoint electrical/mechanical work-defect gate. These corrections
preserve the physical equations; they do not add heat corrections or relax
convergence tolerances.

8. `study-03.json`: 19 complete trajectories passed per-step checks, including
   the 48×48/512-step repeat. The 96×96 reference failed its first independent
   near-axis momentum row. `precision-03.json` retains identical-step replays:
   current tolerances 1e-14, 4e-15 and 2e-15 fail; 1e-15 and four machine
   epsilons pass unchanged local gates. The adapter now requests that admitted
   floor; `failed-96-96-256-False-1.json` is a regression fixture. The tested
   study03 source snapshot was
   `8f858e63333b04219d06b7f17f72f2c5405f9999ef376020ce0b01dafdfbcc94`.
   `convergence-03.json` also retains 2–3% early interface-heat/torque failures
   at 24×24/64 steps; spatial-only and both axis-only series passed. Study04
   adds joint 36×36/144 and temporal 24×24/128 levels before repeating the full
   study with stricter electrical precision. Original cases/gates remain.

9. The independent final review identified an artifact-admission flaw: green
   audit/convergence reports from another same-manifest run could be paired
   with changed raw fields. The CLI reports now record exact input SHA-256s,
   which final admission matches to the actual raw/static artifacts. This is
   a provenance fix, not a change to the equations or accepted residuals.

10. `study-04.json`: the 96×96 case passed its original torque witness, then
    failed the thermal line search before the first scheduled output. The
    parent stopped its own run with SIGINT (exit130) during the next trajectory;
    no partial case is qualified. `thermal-diagnostic-04.json` captures step10,
    iteration9, gas cell0: residual4.403865e-17 W versus inner tolerance
    4.346821e-17 W; Newton increment2.737443e-14 K, below half a temperature
    ULP. The new 2D solver had omitted the existing radial solver's conductive
    roundoff allowance. Restoring its explicit 16-epsilon conductance/absolute-
    temperature term changes no heat source or independent physical gate.
    Study04 source snapshot:
    `bc916fb78f6bd56f5e58a4dd660e353fbed950a29fb0682fef68cd45bdfc6b2a`.
    Prospective study05 repeats all study04 inputs and levels after this fix.
