# Recorded finite-film RustBCA study

This is an actual native diagnostic, not a live retention kernel, measured LiT validation or Marathon operating point. It extends the retained homogeneous half-space study to finite films with explicit upstream/downstream escape and optional backing retention.

## Fixed scenario and gates

The protocol was prepared before native execution: 100 keV normal-incidence D; .1/2 µm LiT films; free film or 10 µm W backing; 256/1024 incident projectiles; seeds 3801/3802 (16 cases). Li and T each use 6e28 atoms/m³; W uses the upstream example 6.306e28 atoms/m³. LiT binding/cutoff inputs retain the uncalibrated v35 scenario; W example values and the explicit W displacement-threshold assumption remain in the protocol. None is a new empirical material preset.

The retained RustBCA binary SHA256 is `33dd9018c6f3e8a5e150d65a4fca95a0b71a73674c1d677f23800018cd26ff5b`; v35 records upstream commit `673bd3f2b907b14517a6b3cafa1c5372a5eb4ae2`. The actual binary hash is checked before execution. Source references, binding assumptions and data-domain caveats are in [the material report](MATERIAL-REALISM-V38.md).

Producer checks require complete incident partitions, finite in/out endpoints, an incident-projectile energy-transfer ledger with unresolved stopped energy bounded by 1 eV per retained projectile plus `1e-5 eV × incident count` numerical tolerance, and eight coarse/fine retention comparisons under the predeclared familywise Hoeffding budget (alpha .01). The union bound does not require coarse/fine runs to be independent. These statistical checks are sampling-consistency checks, not a resolved physical/model bias bound.

## Observed producer result

All **16 native processes completed**, and producer incident-partition, energy and eight sampling-refinement gates pass. A separate reviewer independently streamed all 5,330,275,010 raw bytes and reproduced all 16 raw SHA/partition/endpoint/energy checks, 64 Wilson intervals and eight sampling decisions, including the public translation. The final read-only audit command exited zero in 57.85 seconds. An earlier receipt-assembly attempt failed only on an absent optional translator-source file after its raw checks passed; the complete second pass retained the original gates.

- .1 µm free films: all sampled projectiles exit downstream (0/256 and 0/1024 sampled film retention).
- 2 µm films, free or W-backed: all sampled projectiles remain in the film. This is a finite-sample outcome, not exact probability one.
- .1 µm film + W backing: film-retained counts are 0/2 at 256 projectiles, 3/3 at 1024; upstream escapes are 8/6 and 31/41 respectively; the rest are retained in W. This illustrates why a half-space deposition range is not automatically a thin-film loading probability.

The displayed Wilson intervals are pointwise 95% sampling intervals for each channel relative to every incident ion. They are not joint confidence regions, systematic uncertainty or material calibration. Counts at zero and the incident total retain finite-sampling interval width. The maximum coarse/fine difference was 0.0048828125 against a much wider 0.18832909765 budget: this passes the declared sampling-consistency gate, not a percent-level convergence qualification.

The energy ledger records incident-projectile electronic/nuclear transfers and escaping projectile energy. Nuclear transfers include energy passed to target particles; that is not automatically heat. Recoil transport, target binding, lattice/chemical energy and full assembly thermal closure are not established by this ledger. Tiny negative unresolved residuals in fully transmitted cases are within the explicitly displayed numerical tolerance.

## Transport and verification status

Native execution and readout ran offline inside copied-source Apple VM `safe-dev-91df66bcebf94022`, bounded by the frozen 180-second campaign cap. Commands and exact status are retained in `scientific/material-v38/native-execution-receipt.json`. Compact reference JSON is `web-assets/marathon-reference/finite-film-v38.json`, SHA256 `74dfbf4e330059322742125e4fd62c0ec8ed927c07db09af316d48dfe4b1998f`; canonical readout SHA256 is `30f95fd2e5f7d520af465b9c1a0241979a6713d5b9d2ee1a79525d400792e927`.

Raw energy-loss outputs total 5,330,275,010 bytes, exceeding the unchanged safe-dev 512 MiB per-export cap. Metadata was exported successfully. Per-case lossless archive preparation reopened and SHA-verified nine archives; a tenth archive had a zeroed gzip header when the host Data filesystem reached 100%, despite free space inside the guest volume. The affected original raw case was hash-verified before removing only the corrupt derived archive. All unique raw output remains preserved in the producer guest; the parent chose retaining it there rather than filling the host with duplicate archives. Exact raw/derived paths and file identity maps are in `scientific/material-v38/raw-retention.json`. The VM must not be retired before complete raw export and hash verification. This transport limitation does not negate the completed independent read-only raw-data audit in that VM.

A post-restart recheck found that seven of the nine initial compressed hashes still match and two changed; those two derived archives are explicitly invalid in `scientific/material-v38/archive-recheck.json`. The exact storage flush cause is inferred from the disk-full incident; the changed bytes and exhausted host capacity are verified. The independently verified original raw data remains authoritative. A previously successful in-process archive readback is insufficient proof of a durable backup.

The collapsed reference panel renders these recordings only. Its case selector changes the selected recorded geometry/count/seed; it does not change the live solver, interpolate retention or silently recalibrate replacement probabilities. Its final scoped tests passed **2/2**, including the explicit numerical energy tolerance, preserved failed gate status and rejection of incomplete incident partitions. Exact snapshot hashes are in `scientific/material-v38/ui-check-receipt.json`; the parent’s combined final gate owns the integrated build. No deployed visual/GPU observation is implied.
