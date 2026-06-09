# Research Claim Ledger: VBAO Signal Quality

## Purpose

Classify the research and review claims behind the VBAO signal-quality SDD so
future work starts from verified source truth instead of stale review pressure.

## Claim Classes

| Class | Meaning |
| --- | --- |
| Source truth | Verified in current repo source, tests, spec, ADR, or evidence. |
| Supported research pressure | Supported by external AO literature, but still needs local evidence before implementation. |
| Local evidence gap | Missing or incomplete local proof required before promotion. |
| Rejected shortcut | Conflicts with the chosen product direction. |
| Stale claim | Contradicted by current source/spec/evidence. |

## Ledger

| Claim | Class | Evidence | Local implication | Non-goal |
| --- | --- | --- | --- | --- |
| VBAO should keep visibility-bitmask semantics. | Source truth | `openspec/specs/vbao-node/spec.md`; `packages/horizon-ao/src/VBAONode.ts`; SSILVB paper. | Preserve 32-sector mask construction while hardening signal quality. | Do not pivot to GTAO two-horizon math. |
| Production uses missing cosine weighting. | Stale claim | Spec requires cosine-measure CDF remap, popcount reduction, and projected-normal slice weighting. | Do not add a second cosine sector loop unless a failing fixture and spec change prove it. | Do not treat `vbaoGtVbaoMath.ts` ablations as automatically production-missing logic. |
| Current default is 4 slices. | Stale claim | `vbaoConstants.ts` defaults to 3 slices and 8 samples; quality tiers can use 4 slices. | Talk about default and quality tiers separately. | Do not diagnose default noise from a wrong loop shape. |
| 32 sectors can create boundary/quantization instability. | Supported research pressure | Fixed `u32` sector count; prior evidence around sector-boundary diagnostics. | Add attribution before changing sector count. | Do not move to 64 sectors first. |
| Near-contact thickness can collapse. | Source truth | Live shader clamps `effectiveThickness` with `0.85 * sampleDistance`. | Gate contact fixes against thin-gap and broad-contact fixtures. | Do not tune thickness by screenshot alone. |
| Radius/thickness cap can under-represent broad contact. | Source truth | Live shader caps base thickness with `radius * 0.3`; previous radius/thickness presets were diagnostic only. | Keep thickness/contact as a named candidate family. | Do not add public thickness modes from this SDD. |
| N8AO is smoother and more product-like. | Supported research pressure | ADR-013 and local `n8ao-webgpu` integration. | Use N8AO as product-quality pressure for smoothness, contact strength, haloing, and scale. | Do not call N8AO ground truth. |
| XeGTAO/CACAO prove compute/depth-prep discipline matters. | Supported research pressure | XeGTAO and CACAO references; local depth hierarchy/prefilter experiments. | Evaluate depth prepare/hierarchy and metadata as internal compute candidates. | Do not copy their algorithms or expose new knobs without local gates. |
| Three.js compute APIs are available, but local render-graph integration is unproven. | Local evidence gap | Three `0.184.0` exposes compute APIs and the repo has direct WebGPU readback; no private Three TSL compute candidate has proven storage-texture output consumed by the product graph yet. | Treat Three TSL compute as a candidate that must earn promotion with a private RED/GREEN gate. | Do not classify compute integration as source truth until the local candidate passes. |
| Current reference gate does not fully cover all Phase 2 geometry needs. | Local evidence gap | Canonical drift includes `grazing-normal`; ray-cast fixtures cover thin-gap/contact/corner but not broad wall, grazing surface, or normal-sensitive finite geometry as separate cases. | Add RED reference/report tests before claiming full reference alignment. | Do not promote a runtime candidate while the target reference layer is missing. |
| `missing-reference-observation` should remain visible. | Source truth | `aoProductionReferenceGate.test.ts`; `aoReferenceReport.test.ts`; `EVIDENCE.md`. | Missing product observations block quality claims. | Do not treat absent candidate rows as passes. |
| Temporal accumulation is the first quality fix. | Rejected shortcut | Current spec keeps product temporal-free; temporal gates remain private/evidence-only. | Keep temporal out of this SDD except existing host phase/noise evidence. | Do not add public temporal API. |
| Product polish can hide raw defects. | Source truth | ADR-013 and evidence rows reject generic denoise that adds `mud`, `edge-bleed`, or `thin-gap`. | Raw signal attribution must precede polish promotion. | Do not use smoothing as proof of math correctness. |

## Per-Reference Implications

| Reference | Local implication | Non-goal |
| --- | --- | --- |
| SSILVB / VBAO | Preserve multi-interval visibility-bitmask identity and thin-surface light-passing goal. | Do not promote paper/reference formula without GPU parity and clean visual labels. |
| Activision GTAO | Keep projected-normal/reference discipline and compare against ground-truth-shaped fixtures. | Do not collapse VBAO into a two-horizon estimator. |
| Intel XeGTAO | Treat depth preparation, edge data, denoise separation, and reference tuning as production gates. | Do not port XeGTAO under the VBAO name. |
| AMD CACAO | Evaluate prepare metadata, depth hierarchy, edge values, adaptive quality, and compute suitability. | Do not add CACAO-style complexity before local evidence proves need. |
| Three GTAONode | Preserve Three depth/normal/camera integration shape and compact product API. | Do not inherit public temporal/denoise knobs automatically. |
| N8AO / n8ao-webgpu | Use smoothness, contact readability, and halo/scale behavior as product bar pressure. | Do not use it as physical ground truth or a math target. |

## First Runtime Gate Direction

The first runtime candidate should not be a formula swap, 64-sector expansion,
temporal filter, or compute rewrite. The first target is near-contact thickness
collapse from `0.85 * sampleDistance`, because it directly explains the reported
thin contact signal while preserving the chosen VBAO bitmask identity.

Before that candidate starts, the ray-cast reference layer must add broad wall,
grazing surface, and normal-sensitive finite-geometry rows so contact darkening
cannot pass by closing valid thin gaps or damaging edge behavior.
