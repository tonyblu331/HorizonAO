# SDD Plan: VBAO Magic-Number Retirement and Sampling Candidate Placement

## Purpose

Turn the current "magic numbers" into a small set of named, testable policies
without turning the shader into a configurable science project.

This is not about exposing more public options. It is about making the internal
implementation honest: constants that are mathematical invariants stay hard;
constants that are heuristics get named, measured, and either fitted or
rejected.

## Research Inputs

- SSILVB/VBAO paper and CDRIN implementation notes support a 32-sector `u32`
  visibility mask, constant-thickness back interval, no falloff heuristic, and
  popcount reduction.
- The CDRIN code note says the bitmask version counts occupied sectors and
  explicitly does not apply the original GTAO cosine arc integral at that point.
- Current repo source already adds GT-VBAO-style cosine-measure CDF remap and
  projected-normal slice weighting.
- XeGTAO uses reference auto-tuning for heuristic values, x^2 sample spacing
  after tuning around 2.1, depth prefilter/MIP preparation, raw AO plus edge
  metadata, and spatial denoise. It also moved from 64x64 tileable blue noise to
  Hilbert+R2 sampling, with a LUT option because shader Hilbert has measurable
  cost.
- Public Shadertoy/GT-VBAO references exist (`dsGBzW`, `wc2SzR`, `wcsXDN`,
  `3Xfyz8`), but Shadertoy source must be treated as exploratory until exact
  code and license are captured in the repo evidence ledger.
- EA SEED's bitmask talk supports bitmasks as a broad rendering primitive that
  combines well with stochastic algorithms, but it is not a VBAO formula source.

Sources:

- https://arxiv.org/abs/2301.11376
- https://cdrinmatane.github.io/posts/ssaovb-code/
- https://github.com/cdrinmatane/SSRT3
- https://github.com/GameTechDev/XeGTAO
- https://github.com/mrdoob/three.js/issues/29668
- https://forums.unrealengine.com/t/ark-kra-vbao-visibility-bitmask-ambient-occlusion/2705204
- https://arxiv.org/abs/2112.09629
- https://www.ea.com/games/battlefield/news/coverage-bitmasks

## Constant Ledger

| Current value | Current role | Classification | Replacement direction |
| --- | --- | --- | --- |
| `SECTOR_COUNT = 32` | One `u32` visibility mask and native `countOneBits` path. | Algorithmic/platform invariant for v1. | Keep hard; test it as public contract. 64 sectors is a later split-mask candidate only. |
| `VBAO_PHASE_ATLAS_PHASES = 64` | Slice/sample phase budget. | Atlas-layout policy. | Keep private; validate aliases before changing. |
| `VBAO_PHASE_ATLAS_COLUMNS = 8`, rows = `8` | 8x8 phase atlas page layout. | Atlas-layout policy. | Derive rows from phase count; do not expose. |
| `VBAO_PHASE_STRIDE = 16` | Phase addressing budget per slice. | Atlas-layout policy tied to max samples. | Derive from max sample count or explicitly test against clamp range. |
| `VBAO_NOISE_TILE_SIZE = 64` | Spatial repetition period. | Sampling policy. | Candidate: 64 control, 128 atlas, Hilbert+R2 LUT, STBN tile, IGN atlas. |
| Hash weights `0.63`, `0.37`, etc. | Phase-channel decorrelation. | Empirical sampling recipe. | Move behind named generator candidates; do not leave as unlabeled shader policy. |
| Decorrelators `0.754877...`, `0.569840...`, etc. | Per-sample/per-slice jitter offsets. | Empirical sampling recipe. | Replace with named low-discrepancy sequence constants or precomputed atlas data. |
| `stepFrac = t * t` | Near-biased radial sampling. | Supported heuristic. | Keep as `sampleDistributionExponent = 2` candidate; only change by reference/timing gate. |
| `radius * 0.3` | Base thickness cap. | Empirical contact policy. | Fit against ray-cast/reference fixtures; keep internal. |
| `sampleDist * 0.85` | Bounds near-sample back-face interval length. | Empirical contact safety cap. | Replace with named `nearSampleThicknessPolicy`; candidate should derive from sample distance minus pixel/depth safety margin. |
| `1e-5`, `1e-8`, `1e-4` | Numeric stability guards. | Shader safety constants. | Extract names only; do not tune visually. |
| `0.5` texel center/safe texel | Texture sampling convention. | Sampling invariant. | Keep named as texel-center policy. |

## What "Actually Should Be" Means

For this repo, "actual" cannot mean "whatever a paper or Shadertoy snippet
uses." It means:

1. Mathematically required constants are named and pinned.
2. Platform constants are justified by WGSL/WebGPU and generated shader output.
3. Heuristics are fitted against local scalar, GPU-readback, and ray-cast
   reference gates.
4. Sampling schemes are evaluated at the stage where they belong, not injected
   directly into the hot loop as runtime branches.
5. The public API remains small until a user-facing control earns its keep.

That is KISS and YAGNI with discipline. We simplify the architecture first; we
do not add knobs because the code feels uncomfortable.

## Candidate Placement

| Candidate | Where it belongs | Why |
| --- | --- | --- |
| Named constants / policy extraction | `vbaoConstants.ts` plus a private `vbaoKernelPolicy.ts` or similar. | Removes unlabeled literals without changing behavior. |
| Current stable hash atlas | CPU atlas generator in `vbaoSampling.ts` / `vbaoNoise.ts`. | Control path; no shader hot-path branch. |
| IGN | First as CPU-baked atlas candidate; procedural shader path only if it beats texture fetch and generated shader inspection. | Cheap and good for interleaved/TAA contexts, but not automatically best for non-temporal raw VBAO. |
| Static STBN | CPU-baked atlas candidate. | Good perceptual/noise theory; needs license/source and raw/product evidence. |
| Hilbert+R2 | Prefer LUT/precomputed atlas candidate before shader arithmetic. | XeGTAO reports shader Hilbert has measurable cost and supports LUT placement. |
| 128x128 tile | CPU-baked atlas candidate with memory/timing row. | Moves repetition frequency, but increases texture size and cache footprint. |
| 64-sector split mask | Private GPU-readback candidate before product shader. | Doubles mask storage and popcount work; only valid if 32-sector attribution proves it. |
| Near-contact thickness policy | Raw kernel candidate after reference fixtures. | It is source-verified as a likely thinness cause. |
| Depth MIP / representative depth | Separate prepare pass or compute candidate. | It belongs before raw AO, not inside the raw loop as repeated extra sampling logic. |
| Sector support/confidence metadata | Raw output sidecar or private compute candidate. | It helps polish distinguish one-hit stochastic sectors from stable occlusion. |
| Edge metadata | Main/raw pass sidecar or resolve input. | It belongs between raw AO and resolve/polish, like XeGTAO/CACAO-style pipelines. |

## SDD Phases

### Phase 1: Constant Source-Contract Ledger

Add source-contract tests that classify each literal as:

- invariant;
- atlas layout;
- numeric guard;
- empirical heuristic;
- candidate-only.

Acceptance:

- No behavior changes.
- Tests fail if `0.85`, `0.3`, tile size, phase count, stride, or sector count
  move without updating the ledger.
- Documentation names why each hard value exists.

### Phase 2: Behavior-Preserving Refactor

Extract private policy names from the raw shader setup without changing emitted
behavior.

Acceptance:

- Same source tests pass.
- Generated shader inspection still shows fixed loop bounds and one `u32`
  `countOneBits` path.
- No public `VBAONodeOptions` fields added.

### Phase 3: Shadertoy / Community Capture

Capture the actual Shadertoy and community code references as evidence cards.

Targets:

- `dsGBzW` baseline VBAO Shadertoy;
- `wc2SzR`, `wcsXDN`, `3Xfyz8` GT-VBAO/distant-light math references;
- three.js SSILVB issue references;
- CDRIN SSRT3 implementation notes;
- Cybereality GLSL implementation.

Acceptance:

- Each captured source records license, author, date, formula claim, and local
  relevance.
- No source is copied into runtime code until license and behavioral fit are
  explicit.

### Phase 4: Sampling Candidate Harness

Move sampling comparisons into a reusable candidate harness.

Candidates:

- current `phase-atlas-stable-hash`;
- IGN atlas;
- static STBN atlas;
- 64x64 Hilbert+R2 LUT atlas;
- 128x128 variants where memory cost is visible;
- same-cost slice/sample changes.

Acceptance:

- Candidates are generated outside the shader hot loop when possible.
- Benchmark labels include atlas dimensions, phase count, phase layout, and
  whether data is CPU-baked, texture-LUT, or procedural.
- Metrics include `patternNoiseScore`, stripe proxy, thin-gap proxy,
  edge-bleed proxy, raw/product screenshots, and GPU timings.

### Phase 5: Contact/Thickness Auto-Tune

Use reference fixtures to fit `radius * 0.3` and `sampleDist * 0.85` replacements.

Candidate family:

- current policy control;
- radius-cap coefficient sweep;
- sample-distance cap coefficient sweep;
- `sampleDist - pixelFootprint` style safety cap;
- minimum effective-thickness floor only where depth/normal confidence says the
  sample is not same-surface.

Acceptance:

- Broad wall/contact gets darker only if valid thin gaps stay open.
- Candidate is rejected if it wins screenshots but loses ray-cast/reference
  fixtures.
- Chosen policy is internal and named.

### Phase 6: Pipeline Placement Gate

Decide whether a candidate belongs in:

- atlas generation;
- depth/normal prepare;
- raw AO;
- metadata sidecar;
- resolve;
- polish;
- benchmark-only archive.

Acceptance:

- Hot-loop changes require proof that upstream placement cannot express the
  same candidate.
- Shader slimmer is a goal, but only after behavior is pinned. DRY does not
  mean abstracting away the math until nobody can audit it.

### Phase 7: Promotion Decision

Promote only candidates that beat the control on a named gate.

Acceptance:

- No "looks better" promotion without reference rows and screenshots.
- Rejected candidates stay documented with measured reasons.
- README claims remain blocked until `EVIDENCE.md` has the final rows.

## First Recommended Slice

Start with:

1. Constant ledger tests.
2. Behavior-preserving policy extraction, including source-test migration away
   from brittle literal matching where needed.
3. Missing contact/reference fixtures.
4. Contact/thickness auto-tune.
5. Sampling candidate harness cleanup.
6. IGN/Hilbert+R2/STBN atlas comparison as CPU-baked candidates.

Do not start with a 64-sector mask, public knobs, or procedural IGN in the raw
shader. That is immediacy talking. The cleaner architecture is to make the
current assumptions visible, then move work out of the hot path unless evidence
proves the hot path is exactly where it belongs.
