# Playback CPU study

Run `scripts/study-playback-performance.ts` in the isolated guest after tests and
before committing. It creates temporary baseline modules inside guest `src/` and
removes them in `finally`. Do not run typecheck/build concurrently with the study.

Prepare a directory containing the committed baseline files using read-only Git
extraction. Transfer that directory into the guest with the usual safe-dev source
mechanism; no old source copies belong in the commit.

```sh
study_base=$(mktemp -d /tmp/mass-spinner-playback-head.XXXXXX)
git rev-parse HEAD > "$study_base/REVISION"
for file in fuel-motion.ts laboratory.ts fuel-centrifuge-geometry.ts fuel-centrifuge-ui.ts; do
  git show "HEAD:src/$file" > "$study_base/$file"
done
```

Inside the guest, run:

```sh
npm exec tsx scripts/study-playback-performance.ts -- \
  --baseline-dir /tmp/mass-spinner-playback-head \
  --history 10000 --rounds 5 --frames 8 --warmup 4 --micro-frames 128 \
  > /tmp/playback-performance.json
```

Repeat with `--history 129` and a separate output file to check ordinary short
histories; a long-history win alone does not establish a common-case win. Use the
actual transferred baseline directory path. The report records baseline
revision, individual source hashes, runtime/CPU details, all batch measurements,
median CPU times, history-read counts, SVG evidence and process memory.

Two comparisons answer different questions:

1. Hidden scene: the public uncached sampler versus the accepted motion owner's
   cached sampler, at exactly the same clock and with equal numerical results.
   A separate counting trial establishes the number of full-history traversals.
2. Visible UI: committed versus current UI, motion, geometry and SVG plot paths,
   with A pinned and B current. Spin, six-series energy, and separation plots run
   through their real playback callbacks. This includes the added canonical plot
   endpoint callbacks, field updates, tracers, comparison ranges and readouts.

Both use real 16-cell transport output oversampled into 10,000 checkpoint records.
That history is a **synthetic playback stress case**, not a better physical solve,
experimental dataset or convergence result. Both versions share identical input.
Warmup precedes each comparison; batch order alternates to reduce ordering bias.

The display adapter updates real Three.js scene matrices. JSDOM executes real SVG
and UI code. Neither GPU rasterization nor browser layout/paint is measured;
Blender asset loading, worker solves, initial setup, and apparatus event handling
are also excluded. Report full batch variability; do not translate these CPU
measurements into a browser FPS or GPU speedup claim.

If canonical endpoints outweigh the removed scans, retain their correct physics.
The next candidate is a single playback-clock sample owned by the plot/scene
adapter and shared across its ordinates, invalidated whenever accepted result or
clock changes. Profile that separately. Keep public mutable-input samplers pure;
do not introduce a process-wide cache or remove canonical reconstruction.

## Observed ordinary-history result

The isolated guest completed the 129-checkpoint case on Node 26.13.1, using the
source hashes and individual batches in [the receipt](playback-performance-129-20261119.json).
Infrastructure typecheck including the study script also passed.

| CPU path | Committed median, ms | Current median, ms |
|---|---:|---:|
| Hidden same-clock sampler | 0.02121 | 0.02111 |
| Pinned spin plot and scene | 3.1615 | 3.2788 |
| Pinned energy plot and scene | 1.5052 | 1.5341 |
| Pinned separation plot and scene | 1.2734 | 1.1488 |

The changes are mixed and batch times vary; this does not establish a general
speedup or an actionable net regression. Both versions reached identical clocks,
SVG series counts, scene-node counts and render-call counts. The counting trial
recorded one constructor traversal of 129 checkpoints, no traversals across five
cached updates, and five traversals / 645 checkpoint visits across five public
uncached samples.

Two attempts to start the 10,000-checkpoint case were refused before guest
execution by safe-dev's host memory-pressure guard; the kernel reported level 2.
No stress-case timing is claimed, and the resource guard was not bypassed.
Guest report files remain under `/work/home/playback-performance-*-20261119.*`.

