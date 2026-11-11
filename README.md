# Mass Spinner

A personal, interactive 3D playground for plasma mass separation and fusion-related systems.

**[Open the simulator](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev)**

Explore rotating ions, plasma centrifuges, beam–target neutron production, and advanced separator models. Change parameters, inspect components, compare runs, and follow plots alongside the 3D apparatus. The research playground replays recorded offline collision studies.

## Status

Useful for learning mechanisms and exploring tradeoffs. **Not a calibrated Marathon Fusion machine or a qualified predictor of enrichment, throughput, or operating performance.** Hardware geometry is illustrative; outputs depend on each model's stated assumptions.

The research backend includes spatial species, momentum, electrical, and thermal calculations. Selected conservation and numerical-refinement studies pass, but experimental validation remains incomplete. In the latest historical-argon comparison, worst nominal held-out speed error is 18.4%; a simpler comparator achieves 5.9%. Radial-profile and pressure-response failures remain. These research results do not qualify the live defaults, which were unchanged by those studies.

- [Experimental accuracy and remaining barriers](docs/FIRST-ORDER-ACCURACY-V70.md)
- [Thermal refinement and independent checks](docs/LOCAL-THERMAL-REFINEMENT-V69.md)
- [Optical diagnostic research](docs/DIAGNOSTIC-V71.md)
- [Development history](docs/README-HISTORY.md)

## Development

Three.js, TypeScript, Vite, and Blender assets; a static Cloudflare deployment with no application backend.

Use Node.js 22.12+ (24 recommended) in an isolated development environment:

```sh
npm ci
npm run dev
# Checks
npm test
npm run typecheck
npm run build
npm run check:site
npm run check:assets
```

Maintainer checks run in Apple container VMs through `safe-dev`, with copied source. See [third-party notices](THIRD_PARTY_NOTICES.md).
