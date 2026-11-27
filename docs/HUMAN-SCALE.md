# Human scale

The shared 3D viewer's **Human scale** button frames a standing 5′9″ person
beside the current apparatus. Its height is 69 × 0.0254 = **1.7526 metres**.
The mannequin is procedural display geometry, not a detailed anatomical model.

The person retains that height when apparatus dimensions or representations
change. Feet and apparatus share the same world-Y floor plane, independent of
the inspection camera's rolled up-axis. Scale mode uses an upright perspective;
the camera fits both objects, including on narrow screens, above the default
playback panel. User-dragged panel positions remain under user control.
Hiding the person restores an
apparatus close-up. The reference is separate from selectable hardware,
numerical surfaces, solver inputs and model dimensions.

This compares the geometry actually displayed. Illustrative assemblies remain
illustrative: a precisely sized person does not establish as-built machine sizes.

Verification: candidate `812dcf6` passed 1,483 Node tests, 20 Python tests,
all four TypeScript checks, lint, production build and asset/release checks.
Manual browser checks passed on desktop and 390 × 844, including return to
close-up and an eight-pixel gap above playback. Full browser CI passed 15/20:
two scale checks used an ambiguous selector (corrected to exclude the hidden
baseline); three export-wait timeouts remain unqualified by this change.

The export traces showed accepted results after the 30-second test deadline,
not worker errors: the two-CPU software-rendering container was throttled in
97.6% of measured CPU periods. Browser qualification now uses the public runner's
four CPUs with the same 2 GiB memory cap, single test worker and unchanged
deadlines/assertions. Internal camera transactions also draw only once after
OrbitControls applies the final pose, covered by a render-count regression.
The successful previous production artifact is retained when deploying so
already-open tabs can still load their old content-hashed chunks.
