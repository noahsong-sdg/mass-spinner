# v69 local thermal evidence

See [results and limits](../../../docs/LOCAL-THERMAL-REFINEMENT-V69.md), the
[prospective protocol](../../thermal-local-v69/PROTOCOL.md), and the two reviews
linked from the report. Numerical verification is separate from experimental
accuracy and deployment.

All executable studies use source snapshot
`5134e97644469f1e82ec9b04a397a4c60090532237544e4b1e9902d0f4fc173d`.
The parent exclusively executes/syncs the offline safe-dev VM. Reviewers inspect
source, hashes and exported data; host archive work is trusted stdlib transport.

| Evidence | Contents |
| --- | --- |
| `studies/initial/` | 48-case raw thermal benchmark, independent SciPy assessment, first gas pair, seed, receipts |
| `studies/coupled/` | Six additional conservation audits, next coarse gas pair, coupled wall startup, actual batch logs |
| `studies/finest/` | Finest gas pair and complete 1-ms wall pair, exact combined packets and all reports |
| `studies/source-seal/` | All 744 tested inputs, per-file hashes, original origins, verified archive |
| `studies/raw-fine/` | Exact standalone 800-step packet, compressed |
| `studies/raw-full/` | Exact standalone 400-step and two full-horizon packets, compressed |
| `studies/raw-start/` | Other four standalone packets, final regression/build logs, PNG/SVG figure |
| `studies/packet-archives.json` | Original and compressed hashes, byte counts, producer source/specification/seed binding |
| `studies/control-evidence/` | Exact trusted-controller commands, receipts, source manifests, logs and transport scripts |
| `studies/review-closeout/`, `studies/CLOSEOUT.json` | Final document/review copies and cross-artifact integrity index |

Raw packet export manifests record the files before compression. The supplemental
packet index maps those exact raw bytes to current `.json.gz` paths. Every gzip
was decompressed and verified before removing its redundant uncompressed host
copy. Preserve both manifests and the index. Combined pair archives keep their
original bytes and hashes; they do not replace the standalone producer metadata.

The two coarse gas pairs fail the new local endpoint target and exit 1. Their
original global gates pass. The fine pair passes the declared endpoint target.
Early local surface and tiny solid-tail failures remain in every relevant report.
Do not summarize this evidence as uniform convergence, experimental validation,
or qualification of live defaults.
