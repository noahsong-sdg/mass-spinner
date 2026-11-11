# v43 workspace access corrections

Scope: v42 findings 6–9 and the P3 main-landmark finding. Source paths were traced before editing, against `ADVERSARIAL-AUDIT-V42.md`, `v42-ui-source.md` and `v42-liveux.md`. These are interface corrections; no solver, material assumption, qualification threshold or persisted geometry schema changes.

## Selected physical part in Inspect

**Problem:** selecting an extraction electrode showed generic acceleration-gap text while its physical name and assumed material remained outside the visible Inspect window.

**Technical cause:** the viewer supplies the picked engineering mesh name and `userData` to `setupApparatus.select()`. The wrapper writes its persistent `.component-description`, but workspace reparenting moved only its toolbar and the separate generic `#fusion-inspector`. The wrapper also previously left stale precise metadata on generic selections; that callback correction belongs to the representation change.

**Plain cause:** the window displayed the category explanation while leaving the clicked part's description behind in the clipped scene.

**Fix:** relocate the existing apparatus readout beside its toolbar into Inspect. Keep generic role information in a closed `Component role` disclosure below it. No second inspector state or copy of the selected material is introduced. Main integration routes existing Parameters/Results actions to the same primary readout after the wrapper finishes selection.

**Why chosen:** reusing the actual readout preserves its identity, live announcements, selected name, material assumptions and geometry basis. Reconstructing mesh metadata in workspace code would duplicate the representation contract. The generic explanatory paragraph remains available without competing with physical-part metadata.

## Research tensor and distribution access

**Problem:** the second temperature tensor and distribution/convergence disclosure extended beyond the mobile viewport.

**Technical cause:** two `1fr` tracks retained intrinsic minimum widths from fixed-width numeric rows. The viewport clips global horizontal overflow, so a second species outside the visible area could not be recovered by page scrolling.

**Plain cause:** the desktop pair of number blocks remained side by side on a phone.

**Fix:** use zero-minimum desktop tracks and grid children, one column at the existing 740 px breakpoint, and horizontal scrolling on preformatted tensors and the distribution disclosure's tabular content.

**Why chosen:** both species remain separate and legible; true numerical rows retain their spacing and local scrolling. Smaller text, arbitrary wrapping or widening the page would reduce readability or move the accessibility problem elsewhere. Desktop comparison is preserved.

## Dock exclusion and bounded surface disclosure

**Problem:** the dock covered surface timestamps, species metadata and Model info.

**Technical cause:** the surface overlay and dock independently used the same bottom band; the dock's higher stacking layer won. Existing window rails reserved bottom space, but the apparatus overlay did not use that reservation.

**Plain cause:** two controls were placed in the same space.

**Fix:** measure the dock's actual height and computed bottom inset during arrangement and dock resize, publish their sum plus the existing spacing as the shared `--world-bottom`, and position the surface disclosure above that band. Bound the disclosure by remaining viewport height and give it its own vertical scroll. CSS supplies the original reservation until layout can be measured. The reservation is derived from current layout, never restored from saved data.

**Why chosen:** one measured reservation covers changing button availability, text sizing and safe-area positioning. It keeps the full scene and primary dock controls, while scrolling makes short-screen content reachable. A higher z-index would simply cover the dock instead; a fixed additional offset would miss changed text or dock dimensions.

## Persistent named mechanism chooser

**Problem:** Models lost its selected mechanism context when Controls closed, and the chooser's only label was hidden by the window cascade.

**Technical cause:** mechanism identity and parameter-window visibility shared the same reparented container. `display:none` on the label also removed its accessible text.

**Plain cause:** closing settings hid which model was running.

**Fix:** move the original chooser and native label into a persistent Models context area, give the chooser the explicit name `Separation mechanism`, and retain the native label as visually hidden text. Compare remains in Controls. On mobile, geometry provenance uses the next vertical band so it does not overlap the persistent chooser. No second chooser, selection listener or synchronization state is added; other playgrounds hide this context through the existing group rules.

**Why chosen:** native selection behavior, existing listener identity, scenario restoration and parameter updates continue through the original control. A separate status copy would require another synchronization path. Playground navigation already lives beside the brand and needs no change.

## Main landmark and current heading

**Problem:** the interactive workspace had no exposed main landmark after the original document main was hidden.

**Technical cause:** the live shell was a `div`. Source tracing also corrects one part of the audit inference: the existing h1 was already moved with `.learning-path`, so its disappearance was not independently established by that source path.

**Plain cause:** assistive navigation could not identify the primary interactive content as the page's main area.

**Fix:** make the live shell `main`, associate it with the existing `#level-title`, move that same visually hidden h1 directly into the live main, and explicitly hide the captured original main. Neutralize the old document-main wide-screen sizing on the fixed workspace shell.

**Why chosen:** one exposed main and the existing dynamically updated h1 give clear semantics without adding visible copy or a parallel navigation system. Window headings remain h2 and all original control identities survive.

**Live initialization correction:** root's deployed browser gate then found literal `null` text before the header. The first implementation queried `#level-title` after moving its `.learning-path` parent into the still-detached top bar. Document queries cannot find nodes in that detached subtree; `append(null, ...)` created a text node. Appending the top bar later restored the real heading, so earlier heading count/name tests passed while missing the stray text. In simple terms, the code looked for the heading after temporarily taking it out of the page. The fix captures the existing heading before any reparenting, then appends that exact node. This preserves the original heading and update behavior without creating fallback text or another heading. The regression checks the real workspace-before-experience initialization order: the first child is that original h1 and there are no direct nonempty text nodes before or after experience/navigation initialization. Existing tests still check one exposed named main and current heading across all playgrounds.

## Verification and limits

`tests/workspace-v43.test.ts` exercises the real workspace DOM and representation callback path for extraction electrode, RF winding, fitting, film and backing; subsequent generic keyboard/dropdown selection; desktop/mobile relocation; the original mechanism change listener; playground navigation and current main/h1; stale stored layout and dock-resize measurements; and actual loaded Research tensors/disclosure with CSS cascade contracts. Existing workspace and Research regressions are included in the requested narrow check.

Requested coordinated offline guest command:

```sh
node --import tsx --test tests/workspace-v43.test.ts tests/workspace-v25.test.ts tests/workspace-inspection-v41.test.ts tests/workspace-layout-v38.test.ts tests/research-controls-v20.test.ts
```

The author read the safe-dev README and ran no project code, dependency installation, VM sync or VM lifecycle command. Root owns the existing guest snapshot and execution receipts. Reopened `scientific/fixes-v43/narrow-2.receipt.json` and its raw log: the combined 110-test batch passed 109 tests and failed one test-only CSS serialization assertion (`repeat(2, minmax(0px, 1fr))` versus equivalent authored spelling). The tested copied source was `/work/home/fix-v43-source`, aggregate `cd7eafb8005ff0d249d325ffe06fa913e7e89046455ad5bc8fab3d8f3e767f2e`, verified before/after. The assertion now normalizes whitespace and zero-length serialization; production code was unchanged by that correction. A rerun and final build/typecheck gates remain pending.

The next combined 51-test batch, `scientific/fixes-v43/narrow-3.receipt.json`/`.log`, passed 49 and failed two. Its workspace failure was another test-only selector serialization comparison (attribute quote spelling), corrected to compare the actual provenance target, both level selectors and top position. The other failure was in the separate main-integration fixture. This copied snapshot was `a37e35155b7bcd91e1b767ecc1df1e582718934ae033c978457f822f74b2d900`, verified before/after; no production workspace changes followed either assertion adjustment.

Reopened `scientific/fixes-v43/narrow-4.receipt.json` and `.log`: all six new workspace tests and existing workspace regressions in this combined batch passed. Overall 102/103 passed; the sole remaining failure was the separate main-integration test's Results-action expectation. Root ran the exact 20-file command recorded in that receipt offline at `/work/home/fix-v43-source`, copied aggregate `1eaaeb7737c1037d421a868853f3dc72728d1450e7cd244a1818d484ba71541c`, verified before/after. This establishes the scoped workspace regressions, while overall final release checks remain pending.

JSDOM verifies DOM and cascade contracts, not GPU appearance, physical mobile behavior, 200% zoom or pixel reachability. Root's deployed browser matrix remains a separate acceptance gate.
