# VBAO Denoise Research Claim

## Claim

VBAO should add a non-temporal spatial denoise design only after the evidence
baseline proves which failure class is dominant. The first denoise candidate
must be depth/normal-aware and may consume VBAO-specific confidence metadata,
but it must not change the core `VBAONode` scalar accessibility contract.

## Why

The current visual complaint is "muddy, weird, noisy." Those are different
failure modes. A denoiser can reduce noise, but it can also hide bad thickness,
wash thin gaps, or create edge bleed. XeGTAO and CACAO both show that production
AO quality comes from a pipeline, not only from the occlusion equation:

- stable source depth/normal inputs
- an AO pass with explicit sampling policy
- a spatial filter or blur path with edge information
- evidence-backed quality/performance presets

So the next design must separate kernel correctness from presentation filtering.
Concepts first, code second. Otherwise we tune soup until the screenshots stop
complaining, and that is not engineering.

## Sources

- Intel GameTechDev XeGTAO README: documents a three-pass pipeline
  (`PrefilterDepths`, `MainPass`, `Denoise`), full-resolution high preset, 5x5
  depth-aware spatial denoising, Hilbert/R2 sampling, and thin-occluder notes.
- AMD GPUOpen FidelityFX CACAO page: describes CACAO as an RDNA-optimized AO
  implementation with multiple quality/performance settings.
- GPUOpen FidelityFX CACAO repository: describes CACAO as highly optimized
  adaptive sampling AO and notes a sample issue where incorrect mesh normals
  make AO incorrect.
- Local ADR-011: raw-first/no-denoise policy.
- Local `vbao-evidence-baseline`: evidence matrix and failure labels.

## In Scope

- Research conclusion for a future `vbao-spatial-denoise-design` change.
- Non-temporal, spatial-only denoise equation and acceptance gates.
- Input signals to test: raw AO, depth, normal, optional confidence metadata.
- Rejection criteria for muddy/edge-bleeding filters.

## Out Of Scope

- Temporal accumulation.
- TAA dependency.
- Motion vectors.
- Public `VBAONodeOptions` knobs.
- A renamed XeGTAO/CACAO preset.
- Any change to scalar output semantics: `1` remains open and `0` remains
  blocked.

## Candidate Equation

For pixel `p`, candidate spatial denoise:

```text
A_filtered(p) =
  sum(q in N(p)) W(p, q) * A_raw(q)
  -----------------------------------
        sum(q in N(p)) W(p, q)

W(p, q) =
  K_spatial(|p - q|)
* K_depth(|z_p - z_q|)
* K_normal(1 - dot(n_p, n_q))
* K_confidence(c_p, c_q)
```

Where:

- `A_raw` is raw VBAO accessibility.
- `z` is view-space depth or linear depth.
- `n` is the supplied normal.
- `c` is optional VBAO confidence metadata, such as mask coverage or transition
  density.
- There is no history term and no temporal reprojection.

The first implementation candidate should set `K_confidence = 1` and prove the
depth/normal-only baseline. Only add confidence metadata if screenshots show a
specific failure that depth/normal filtering cannot solve.

## Acceptance Gates

- Evidence rows must identify `noise`, `mud`, `halo`, `thin-gap`, `edge-bleed`,
  or `scale-mismatch` before denoise work starts.
- Full-resolution raw VBAO must be captured first. If full-res fixes most mud,
  denoise is not the primary fix.
- The filter must reduce `noise` without increasing `edge-bleed` or closing
  `thin-gap` artifacts.
- The filter must be compared against higher-sample raw VBAO, not only against
  the current half-resolution default.
- GPU timings must include raw, depth/normal denoise, and any metadata-aware
  variant.

## Decision

Continue research, but do not implement a core denoiser yet. Finish the evidence
baseline first, then open `vbao-spatial-denoise-design` as a proposal/spec/design
change if the captured failures justify it.
