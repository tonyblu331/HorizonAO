# Research Audit: Actual SSILVB/VBAO Paper + 2025 Context

## Scope correction

When this change says "paper", it means the actual research paper and implementation literature, not a generic paper-inspired reference. The primary SSILVB/VBAO anchor is Therrien, Levesque, and Gilet, *Screen Space Indirect Lighting with Visibility Bitmask*, arXiv:2301.11376.

## Verified source anchors

| Source | What it says | Repo implication |
| --- | --- | --- |
| SSILVB / VBAO paper — https://arxiv.org/abs/2301.11376 | Visibility bitmask replaces two horizon angles with N binary sectors over a hemisphere slice; goal is thin-surface light passing and better AO/indirect/ambient than prior screen-space horizon methods. | Our `paperExpected` path must be mask/sector based, not just a renamed GTAO/cosine reducer. |
| CDRIN implementation notes — https://cdrinmatane.github.io/posts/ssaovb-code/ | Slices are aligned around view vector; projected normal shifts the horizon interval; visibility-bitmask AO uses popcount accessibility and explicitly does not apply cosine weight in that bitmask branch. | The scalar paper/reference path should include normal shift + front/back horizon interval + popcount. |
| XeGTAO — https://github.com/GameTechDev/XeGTAO | Production GTAO is a pipeline: depth prefilter/MIP, main pass with edge info, spatial denoise; also tuned against ray-traced reference. | A single shader toggle is not production discipline; we need MIP/edge/filter evidence and reference tuning. |
| AMD FidelityFX CACAO — https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/ | CACAO uses depth/normal preparation, MIP/de-interleaving, edge values, adaptive passes, and edge-sensitive blur. | VBAO filter promotion needs edge-aware metadata and must avoid generic blur. |
| NVIDIA NRD — https://github.com/NVIDIA-RTX/NRD | Modern denoisers are guide-signal systems using normal, roughness, viewZ, and motion vectors; NRD is spatiotemporal, but the guide discipline is still relevant. | We should copy signal discipline, not temporal dependency, for the temporal-free gate. |
| Filter-adapted spatiotemporal sampling — https://arxiv.org/abs/2310.15364 | Sampling should be co-designed with the post-filter; it demonstrates AO as one target task. | Stop tuning sample noise independently from the filter. |
| Efficient Stereo-Aware SSAO with Adaptive Computation — https://kevincosner.github.io/publications/Wu2025ESS/ | 2025 SSAO work focuses adaptive computation for stereo consistency, not replacing SSILVB/VBAO. | It strengthens the adaptive/gated-computation direction, but it is not a new VBAO formula. |
| SIGGRAPH 2025 RTR context — https://s2025.siggraph.org/two-decades-of-progress-in-a-frame-siggraphs-advances-in-real-time-rendering-in-games-turns-20/ | The 2025 course framing emphasizes SSAO as foundational and broader modern real-time rendering moving toward neural/global illumination and production constraints. | Treat 2025 as pressure toward evidence and production pipeline rigor, not a direct VBAO successor. |

## Candid audit

- I did not find a verified 2025 SIGGRAPH/arXiv paper that supersedes SSILVB/VBAO specifically as a new visibility-bitmask AO formula.
- The latest relevant 2025 material is adjacent: stereo-aware SSAO adaptive computation and broader real-time/neural GI work.
- Therefore the correct alignment target remains the 2023 SSILVB paper plus author implementation notes, with XeGTAO/CACAO/NRD used as production-pipeline standards.

## Current repo status against actual paper

| Area | Current status | Rating |
| --- | --- | ---: |
| Bitmask sector semantics | Present in shader/reference; now paper/reference mask path is independent in parity reports. | 7/10 |
| Paper popcount branch | Present in scalar reference/comparison and now visible as a demo-only `paper-popcount` GPU debug view. | 7/10 |
| Normal-shift paper behavior | Present in scalar `vbaoPaperReference.ts` and mirrored in the internal `paper-popcount` debug path; still needs `/vbao-parity` GPU readback proof before formula promotion. | 7/10 |
| Constant thickness vs adaptive production | Split is now explicit: paper/reference uses constant thickness; production uses adaptive behavior. | 7/10 |
| Production pipeline discipline | Still behind XeGTAO/CACAO: no real promoted depth hierarchy/filter evidence yet. | 4/10 |
| Evidence rigor | Actual WebGPU Museum screenshots and paper-popcount debug matrix captured; failure labels are now assigned for the captured rows. | 7/10 |

## Actual run screenshots captured

- Raw VBAO AO, 1920x1080: `G:/RWY37/horizon-ao/artifacts/benchmarks/screenshots-vbao-actual-run-denoise-matrix/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png`
- Denoised VBAO beauty, 1920x1080: `G:/RWY37/horizon-ao/artifacts/benchmarks/screenshots-vbao-actual-run/museum__museumBaseline__1920x1080__single__vbao__single__beauty__denoised__magic-square__generic.png`
- Paper-popcount debug, 1920x1080: `G:/RWY37/horizon-ao/artifacts/benchmarks/screenshots-vbao-paper-reference-debug/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__paper-popcount.png`
- Full matrix JSON: `G:/RWY37/horizon-ao/artifacts/benchmarks/ao-vbao-actual-run-denoise-matrix-latest.json`
- Paper debug matrix JSON: `G:/RWY37/horizon-ao/artifacts/benchmarks/ao-vbao-paper-reference-debug-latest.json`
- Contact sheet: `G:/RWY37/horizon-ao/artifacts/analysis/vbao_actual_paper_popcount_contact_sheet.png`

## Screenshot review labels

- Raw VBAO AO: `noise,false-curvature,scale-mismatch`.
- Generic-denoised VBAO beauty: `noise,mud,false-curvature,scale-mismatch`.
- Current production `mask-popcount`: `diagnostic-only,production-mask-popcount,formula-choice-required`.
- Paper/reference `paper-popcount`: `diagnostic-only,paper-popcount,formula-choice-required`.

## GPU readback parity result

The `/vbao-parity` route was probed directly through Chromium/WebGPU after the
paper-popcount debug view was added.

- Artifact: `G:/RWY37/horizon-ao/artifacts/analysis/vbao_parity_route_latest.json`
- Screenshot: `G:/RWY37/horizon-ao/artifacts/analysis/vbao_parity_route_latest.png`
- `fixtures.passed`: `true`
- `maxAbsError`: `0`
- Fixture rows: 12 anchors across `flat-plane`, `two-wall-corner`,
  `two-wall-corner-true-normal`, and `thin-occluder`
- Formula labels: all 12 rows are `cosine-matches-gpu`

Candid interpretation: the current GPU shader is now verified against the
current cosine-weighted production oracle on the hardened fixtures. The
SSILVB-style paper/reference path remains separate and visibly disagrees on the
same anchors. Therefore paper fidelity is still an open implementation choice,
not something we can claim from the production shader.

## Next gates

1. Add a demo/internal SSILVB/reference formula ablation if paper fidelity is
   the next goal. Do not imply that the repo already has a verified live GPU
   implementation of the paper/reference semantics.
2. Compare SSILVB/reference formula output, production cosine output, and
   baselines in Museum screenshots before changing production behavior.
3. Only promote a formula change if fixtures and visual evidence both improve;
   otherwise keep production cosine and document paper-popcount as diagnostic.
