# VBAO Denoise Proof Ledger

## Verified Facts

| ID | Fact | Source | Impact |
| --- | --- | --- | --- |
| F-01 | XeGTAO presents AO as separate depth prefilter, main AO, and denoise passes. | Intel GameTechDev XeGTAO README | Model VBAO improvements as pipeline stages, not hidden kernel tweaks. |
| F-02 | XeGTAO uses a 5x5 depth-aware spatial denoise path and can rely on TAA when available. | Intel GameTechDev XeGTAO README | Non-temporal denoise is legitimate, but temporal support is optional and out of scope here. |
| F-03 | XeGTAO defaults its high preset to full resolution with explicit slice/sample counts. | Intel GameTechDev XeGTAO README | Evidence must include full-resolution VBAO before blaming the math. |
| F-04 | XeGTAO discusses thin-occluder artifacts as a depth-buffer height-field limitation. | Intel GameTechDev XeGTAO README | VBAO muddy/thin-gap issues may come from thickness/source geometry, not denoise alone. |
| F-05 | XeGTAO uses Hilbert/R2 sampling and discusses blue-noise tradeoffs. | Intel GameTechDev XeGTAO README | Sampling schedule is an independent quality lever before filtering. |
| F-06 | AMD describes CACAO as optimized AO with multiple quality/performance settings. | AMD GPUOpen FidelityFX CACAO page | VBAO needs measured presets, not a single magic default. |
| F-07 | CACAO repo notes incorrect normals can make AO visibly wrong. | GPUOpen FidelityFX CACAO repository | Evidence must treat normal correctness as a first-class failure cause. |
| F-08 | Local ADR-011 requires raw-first evidence before denoise. | `openspec/adr/ADR-011-raw-first-no-denoise.md` | Denoise cannot bypass the evidence gate. |

## Inferences

| ID | Inference | Confidence | Reasoning |
| --- | --- | --- | --- |
| I-01 | VBAO should copy the pipeline discipline, not the GTAO equation. | High | VBAO's visibility bitmask math is intentionally different; depth prep and denoise are reusable concepts. |
| I-02 | A non-temporal denoise track is valid. | High | XeGTAO documents spatial denoise as usable without TAA, with TAA as an available enhancement. |
| I-03 | Adaptive thickness and denoise are separate fixes. | High | Thin-occluder and height-field artifacts can survive filtering; denoise should not be asked to fix bad blocker intervals. |
| I-04 | Optional VBAO metadata should be proven after a depth/normal baseline. | Medium | Metadata can help, but it adds render-target/API cost and may not beat a simpler edge-aware filter. |
| I-05 | Normal validation belongs in the evidence harness. | High | CACAO's sample normal issue shows that wrong normals can invert or corrupt AO classification. |

## Rejected Shortcuts

| Shortcut | Rejection reason |
| --- | --- |
| Add a `denoise: true` core option now | It hides the failure class and creates a public API before proof. |
| Port XeGTAO under a VBAO label | The math and output contract differ; this would duplicate algorithms rather than align VBAO. |
| Add temporal accumulation first | User specifically asked for proper denoising that is not temporal attached. |
| Tune half-resolution output until it looks acceptable | Full-resolution raw evidence is cheaper and cleaner as the first comparison. |
| Store metadata in the G channel immediately | Metadata must be justified by a formula and screenshot/timing wins. |

## Next Proof Steps

- Finish `vbao-evidence-baseline` and capture rows with failure labels.
- Add a `vbao-spatial-denoise-design` SDD change only if evidence shows `noise`
  or denoise-relevant `edge-bleed`.
- Specify the depth/normal-only formula first.
- Compare against full-resolution raw and higher-sample raw before adding
  metadata-aware filtering.
- Keep adaptive thickness in its own reference-tested change.
