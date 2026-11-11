# Current decisions — 2026-11-06

- Public personal project on Cloudflare Workers Static Assets, all computation in the browser. `release/` is the only deployed directory. URL: https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev
- First physics mode is a collisionless prescribed-field Ohkawa/Archimedes rotating filter, with singly charged Ar/Kr. It is not ICR or equilibrium centrifugation. Add other tutorial machines as separate validated modes.
- Vite 8.3.6 + Three.js 0.187 WebGPURenderer, with its built-in WebGL2 backend, and a TypeScript physics worker. A framework adds no needed behavior for this small instrument interface. Metals use an actual reflected studio environment; static polished Blender imagery covers browsers unable to initialize 3D while physics remains independent.
- Blender 3.6.23 ARM CPU rendering is the verified local path; 4.5.15 crashes in Metal initialization. User granted scoped host execution after the container service was inaccessible. No safe-dev controls were changed.
- Boundaries are whole ideal cylinder/source/end planes. Hardware is illustrative, and its aperture/end positions now match the model. Do not imply mesh-resolved collection or calculated glow.
- Numerical validation is necessary but does not establish real plasma validity. Thermal sources, charge states, collisions/charge exchange, electron response, fields, power and experimental validation remain distinct extension tasks. See `web-assets/TUTORIAL-REVIEW.md`.
- Browser policy blocks interactive QA on localhost and the deployed public origin. Deployment and structural checks passed; live GPU appearance/interaction remain unverified here. No policy workaround attempted.
