# Design: Evidence-First VBAO Denoise

## Problem Shape

The current visual issue is not "VBAO needs blur." The issue is that the raw
signal is structured and sometimes too dark, while the current generic denoise
can smooth in ways that hide whether the scalar visibility math is correct.

The design target is a non-temporal scalar AO path that stays compatible with
the current public `VBAONodeOptions` surface. Bent normals and visibility
buckets remain a later directional track.

## Root-Cause Hypotheses

1. Structured rotation noise: magic-square rotation can leave visible local
   patterns in the bitmask reduction.
2. Adaptive thickness overreach: the current cap and span scale may turn
   surface continuity into broad darkening on museum-scale geometry.
3. Generic scalar denoise mismatch: Three `DenoiseNode` filters RGB/luma-like
   input, while VBAO has binary sector structure and thin-gap constraints.
4. Missing confidence: a scalar accessibility value does not say whether it came
   from stable sector agreement or a fragile one-sample mask transition.
5. Harness blind spot: split screenshots currently fail visually, so split
   evidence cannot drive decisions until segment pixels are validated.

## Borrowed Ideas With Constraints

### N8AO

Use:
- screen-space radius evidence rows;
- blue-noise rotated denoise taps;
- tangent-plane depth distance;
- normal-dot edge stopping;
- explicit sample/denoise preset comparisons.

Do not use:
- temporal accumulation;
- "smoother means better" as a metric;
- public knobs before evidence.

### XeGTAO

Use:
- R2/Hilbert-style deterministic schedules for spatial stability;
- 5x5 spatial denoise as a baseline candidate;
- depth MIP pressure as a later bandwidth path.

Do not use:
- temporal filter or TAA dependency;
- depth MIP changes before scalar correctness evidence.

### AMD CACAO

Use:
- quality-level thinking: raw samples, adaptive quality, edge-aware blur, and
  bilateral upsampling are separate gates;
- edge-aware blur and bilateral upsampling as design pressure.

Do not use:
- native compute FPS as a browser/WebGPU benchmark claim.

## Candidate Filter

Reference formula for a single center pixel:

```text
weight_i =
  validDepth_i
  * exp(-abs(dot(P_i - P_c, N_c)) / depthSigma)
  * pow(max(0, dot(N_i, N_c)), normalPower)
  * sampleKernelWeight_i

aoOut =
  (ao_c + sum(weight_i * ao_i)) / (1 + sum(weight_i))
```

Rules:
- Background depth contributes zero neighbor weight.
- Depth comparison is tangent-plane distance, not raw depth delta.
- Normal discontinuities must collapse weight to near zero.
- Radius is evidence-only and private in the first implementation.
- AO remains accessibility: `1 = open`, `0 = blocked`.

## VBAO-Specific Escalation

If the scalar filter fails, add metadata before adding more blur:

- `confidence`: stable sector support vs one-sample transition.
- `coverage`: count of observed sectors/samples that influenced the mask.
- `transitionCount`: number of open/blocked lobe boundaries.
- `minBlockerDistance` or normalized blocker span if it can be derived without
  violating current math invariants.

The first practical WebGPU/TSL storage option is an internal RGBA target for
demo evidence: R = accessibility, G/B/A = metadata. This must not change the
public node API until evidence proves it.

## Implementation Order

1. Fix evidence validity: add segment-pixel split smoke and raw/denoised AO
   capture rows.
2. Backtest sampling: run magic-square, R2, Hilbert, and blue-noise-like
   schedules on the same raw AO fixtures.
3. Add pure reference denoise tests.
4. Prototype demo-only spatial denoise with private constants.
5. Compare raw higher samples against raw+denoise.
6. Promote only if screenshots and median/p95 timings support it.

## Gate Outcome

The 2026-05-26 gate matrix rejects production denoise promotion. Generic
`DenoiseNode` reduces visible patterning by adding `mud`, `edge-bleed`, and
`thin-gap` closure. The demo-only `custom-bilateral` candidate follows the
reference depth/normal rules and has acceptable median/p95 timings, but it still
leaves `noise,mud,edge-bleed` in AO-only screenshots.

Next design pressure shifts to depth hierarchy for large-radius sampling and
bitmask confidence metadata for any future filter. More scalar blur is not the
next move.
