# V49 deployed release verification

The final candidate is `drive49d`, served at
https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2 .

- Cloudflare 100% version: `2ec80163-2fd8-424c-8ebe-98a7da3d55ba`.
- Exact tested input manifest (534 entries, 532 host files plus two preserved guest runners): `6e54b38a2782989edf932449bf1a44a52290dd864148e4860132bde7fa66c0eb`.
- Exact checked release (151 files): `369ecb35092ff1774d98b3b37f397b962e342346f6ce745ace3ab9f27501e8c1`.
- All 1,027 tests passed in the offline safe-dev source copy.

Final required commands, all exit 0: `npm test`; `npm run typecheck`;
`npm run build`; `npm run check:site`; `npm run check:assets`;
`node --import tsx scientific/fixes-v43/verify-release-worker.mjs`;
`node --import tsx scripts/verify-fuel-release-v44.mjs`;
`python3 docs/reviews/v42-collision-data-probe.py`.
Source digests were checked before and after every command. The saved collision
probe preserves earlier qualification limits; passing it does not qualify those
experimental collision studies.

The checked release was exported byte-for-byte, deployed from the existing
credential-isolated VM, and verified through Cloudflare's deployment-status API.
The live browser's entry script matches the checked release manifest. Host input
files and all exported release bytes were checked again after browser testing.

Browser evidence is in `scientific/drive49/browser/verification.json` and adjacent
native screenshots. Live checks covered component picking/materials, contextual
field controls, zero-current/pinned controls, synchronized plot time, 320/390 px
layouts, assembly cutaway/ghost/explode, slice selection, and orbiting. The final
camera-only candidate repeated narrow-view and plot/staging checks; earlier
control observations are explicitly labeled drive49c. Its physics/control code
and authored hardware asset are unchanged in drive49d.

The first 320 px candidate cropped the pump connection. The final fit-margin
change corrects that crop, with a viewport/zoom regression and final browser
screenshot `final-mobile-320-comparison.jpg`. The mobile plot window scrolls;
its focused SVG can place the long comparison legend partly above the viewport.
Native scrolling exposes the selector, metrics and full legend.

One browser message-channel error at 22:03:13.980 UTC predates these deployments;
no new application or WebGL errors were observed in final checks. This does not
identify which extension or listener emitted that earlier message.

Blender recipe/artifact SHA256 receipts, editable scenes, complete GLB export,
Cycles proofs and PNG CRC checks are retained under `scientific/drive49/`.
See `DRIVE-ASSEMBLY-V49.md` for equations, limits and per-fix explanations.
