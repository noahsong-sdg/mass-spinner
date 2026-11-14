# Frozen split response, V107

Diagnose the admitted 80/160/320 × 48 saved states at 0/1/2/4 μs. Reuse the
unchanged producing `campaign107` initialization, require bitwise-identical q0,
and use the actual electromagnetic and Q1-stress/FiPy-heat implementations.
Input admission, packet seals, source seals and canonical audit stay unchanged.

For each archived state, apply E and D **separately** at 1 ps and 0.5 ps.
These are counterfactual one-step responses, not accepted trajectory stages.
No coefficient, timestep policy, convergence threshold or public solver changes.

Before execution, distinguish three hypotheses:

1. Current source responses are mesh-stable while the evolved Euler transport
   sharpens: investigate past/upstream forcing and transient transport next.
2. Source pressure/velocity responses sharpen or shift too: this identifies
   source-coupled gradients, without demonstrating a defective closure.
3. Half-step differences or state/receipt disagreement expose subtraction or
   linear-solve limitations: retain raw residuals, without declaring physics failure.

Enforce unchanged archived q and bitwise preserved mass/species. E also preserves
axial momentum. Check ΔE = Joule + mechanical work and ΔU = Joule + BE defect for
E; ΔE = stress redistribution + thermal redistribution and ΔU = viscous heat +
numerical heat + thermal redistribution for D. Never add numerical heat twice.
Use receipt-based Δp = (γ−1)ΔU/V and ΔT = ΔU/Cv; retain primitive identity residuals.
Conduction means the active FiPy receipt, never inherited inactive FE stiffness.

Report signed cell power densities, pressure and velocity responses, and the
change in the Euler density RHS per probe time. The latter uses tiny-step
subtraction and can amplify roundoff. Retain both h and h/2, not a fitted limit.
Use exact cell/region intersection volumes for whole domain, upstream core,
endwall, broad sampling ring and focal density ring. Regions overlap; their
integrals are descriptive allocations, not exact cut-boundary flux budgets.
Retain the prior fixed scalar-Q1 ring sampling. None replaces the stable norm.

Run analytic region controls, null/uniform D, actual FiPy hot/cold redistribution,
and nonzero-flow E/D work and thermal identities before full saved-state probes.
All execution is offline in the existing safe-dev science VM at 1 GiB. Seal
source, controllers, admitted inputs, logs and results; recheck seals afterward.
No new trajectory or 640-cell run is authorized by this diagnostic protocol.
