# Reading composition and density

## Root causes

The composition shortcut selected the endpoint, opened the percentage plot and
scrolled to the graph. The plot showed both isotopes on a fixed 0–100% scale;
the default lithium curves near 8% and 92% therefore looked almost flat. The
sample readout listed numbers without explaining the comparison with the feed.
The density shortcut used a different radial unit and showed normalized density
without a nearby explanation of its reference. Narrow scene space also wrapped
playback controls into a tall column.

In plain terms, the links opened the right results but did not explain how to read
them. More prose in a separate window did not repair the result view itself.

## Fix

- Show the sampled location, isotope percentages, approximate counts per 1,000
  atoms, a full 100% composition bar and the difference from the accepted feed.
  Put axis/wall buttons and a radius slider beside these values. All share the
  existing 3D sampler and physical-time selection; they never request a new run.
- Plot only the light percentage and feed with an explicitly labeled zoomed
  vertical axis. The heavy percentage remains in the sample readout. Pinned A/B
  curves share a domain containing both feeds and all plotted values. Highlighting
  heavy atoms in 3D cannot dim the sole light-percentage curve.
- Scroll guide shortcuts to their interpretation, rather than past it to the graph.
  The density shortcut also opens the matching 3D diagnostic.
- Preserve finite-volume cell jumps for density as well as composition; both
  radial axes use centimeters. Explain density relative to each species' own
  volume mean; an absent species has no density/own-mean ratio.
- Replace the qualitative composition sketch with a switchable equilibrium
  density example. No spin, spinning and warmer cases use a common graph scale.
  The curve is n(r)/n(0) = exp[m v_wall² (r/R)²/(2 k T)], with actual lithium
  isotope masses, 0/1500 m/s and 500/1000 K. This is a neutral, ideal-gas,
  rigid-rotation, uniform-temperature example, not a live trajectory or a general
  charged-plasma equilibrium. Equal-size samples, not annular shell counts, are
  being compared. Axis-normalized density is explicitly distinct from live
  volume-mean-normalized density and from mixture percentages.
- Use a container query to keep playback compact when guide/results rails leave
  little scene width, including on a desktop viewport.

This changes presentation and sampling controls, not the transport, collision,
momentum or heat equations. Reusing the sampler avoids a second interpretation of
the live data. The fixed-input equilibrium example isolates what a steeper density
gradient means without changing or implying equilibration of the user's run.

## Verification

Release source: `7d879198eb92c6090836588f07c25ef84defac7c`.
[CI run](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44192386628)
passed in an offline, 1 GiB Docker container:

- `npm run typecheck` (application and contract configurations).
- All focused groups in `.github/workflows/verify.yml`, including the guide,
  integration, equilibrium, sharing and worker paths.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,450 passed,
  zero failed. New regression coverage checks shared/pinned zoom domains,
  unchanged percentages, pure/absent species, cellwise density, example exponents,
  probe/time synchronization and heavy-highlight readability.
- Python electron-applicability suite: 17 passed; argon export suite: 3 passed.
- `npm run build`, `npm run check:site`, `npm run check:assets` passed.
- `git diff --check` passed.

The first complete run found one pre-existing UI assertion requiring the exact
phrase “not finite-time separation.” The equilibrium label was restored; the
assertion and numerical gates were not relaxed. Local safe-dev admission remained
blocked by host memory pressure; project execution used isolated CI instead.

Cloudflare deployment: `4200d3f6-017c-43a5-84f7-a5de46ba040a`.
The verified artifact was deployed without rebuilding on the host. Seventeen
older hashed assets were retained unchanged for already-open tabs. Native browser
verification reopened the public site and checked source links pinned to the
release commit.

Observed default run at 1 s:

| Sample | Light fraction | Approximate light atoms / 1,000 |
| --- | ---: | ---: |
| Axis | 8.081% | 81 |
| r = 6 cm | 7.861% | 79 |
| Wall, r = 12 cm | 7.227% | 72 |

Feed is 7.59%. Guide axis/wall links, adjacent buttons, range-arrow input, and
plot Home/End all synchronized the sample while retaining time = 1 s. Species
density selected the 3D density layer and reported light axis/wall values
0.6817/1.411 times its mean, heavy 0.6369/1.488 times its mean. Density is
normalized separately for each species; these are not composition percentages.

The deployed equilibrium example showed only its selected case: no spin gives
1/1; spinning gives 5.09/6.68; warmer gives 2.26/2.58 wall/axis density ratios.
Buttons updated `aria-pressed` and visible curves together. The shared graph scale
was unchanged. The example was checked in the standalone reader as well as the
embedded guide.

Responsive checks covered desktop 1280 px, constrained desktop 900 px, and phone
390/320 px widths. No document horizontal overflow was observed. Axis/wall targets
remained 44 px tall. At 900 px, a 292 px scene used a 276 × 209 px playback panel,
compared with the old 260 × 235.5 px wrapped panel. The mobile guide shortcut
opened the single results sheet with the sampled-location heading visible.
Browser error logs were empty for both the app and standalone guide.

Local screenshot evidence:

- `/private/tmp/mass-spinner-composition-deployed-desktop.jpg`
- `/private/tmp/mass-spinner-composition-deployed-mobile.jpg`
- `/private/tmp/mass-spinner-density-deployed-desktop.jpg`
- `/private/tmp/mass-spinner-density-deployed-mobile.jpg`

These checks qualify the changed interpretation and controls; they do not establish
experimental accuracy or demonstrate a realizable lithium operating point.
