# Research Claim: Non-Temporal VBAO Noise Hardening

## Claim

For the Museum WebGPU baseline, scalar VBAO can only ship a non-temporal denoise
path if it beats raw higher-sample VBAO on the Pareto frontier: equal or lower
median/p95 frame time at comparable quality, or visibly cleaner AO at comparable
cost, without adding `mud`, `halo`, `edge-bleed`, `thin-gap`, or temporal
dependency.

## Verifier Boundary

- Frozen scene: Museum route, pinned `museumBaseline` camera.
- Frozen resolutions: `1920x1080` and `1280x720`.
- Frozen baselines: Three `GTAONode`, `n8ao-webgpu`, current adaptive VBAO,
  and raw higher-sample VBAO.
- Mutable candidates: VBAO sampling schedule, demo-only spatial denoise,
  bitmask confidence metadata, and private internal constants.
- Forbidden candidate behavior: temporal accumulation, frame-index dependency,
  public API knobs, TAA dependency, screenshot-only wins, or changing the
  benchmark harness to hide failures.

## Baseline / Candidate Family

Baseline A is current adaptive VBAO: 32 sectors, 3 slices, 8 samples per slice,
magic-square rotation, accessibility output, optional generic Three denoise in
the demo.

Baseline B is raw higher-sample VBAO: same kernel and public API, more private
samples/slices only for evidence comparison.

Candidate C is a spatial-only depth/normal-aware denoise pass. Candidate C may
borrow N8AO-style blue-noise rotated disk taps and tangent-plane edge stopping,
but it must filter VBAO accessibility rather than inventing a new AO model.

Candidate D is bitmask-aware denoise metadata: confidence, coverage, sector
transition count, or lobe information. Candidate D is allowed only if generic
spatial filtering fails the edge/thin-gap gates.

## Enemy Terms

- Generic denoise can remove structured noise by smearing real visibility
  discontinuities.
- More raw samples can erase the candidate's claimed win if the denoise pass
  costs too much.
- N8AO's temporal accumulation option is not applicable; this change forbids
  temporal history.
- Beauty screenshots can hide AO-only edge bleeding and thin-gap closure.
- Split composer screenshots are currently suspect because GTAO/VBAO panels can
  render black; split visuals are blocked until segment pixels are verified.
- Social posts, marketplace claims, and Shadertoy demos are hypothesis sources,
  not proof for our WebGPU/TSL implementation.

## Rejection Gates

- Reject if raw AO evidence is not captured before filter code is promoted.
- Reject if raw higher samples match or beat raw+denoise at similar frame time.
- Reject if the denoise creates `edge-bleed`, `halo`, `mud`, or closes
  `thin-gap` fixtures.
- Reject if any candidate depends on frame index, TAA, or history buffers.
- Reject if split-composer comparison is used before per-segment pixels are
  proven non-black.

## Source Pressure

- VBAO paper: visibility bitmasks are valuable because they preserve multiple
  visibility cones; bent-normal compression is secondary.
- CDRIN/SSRT3/Shadertoy-style implementations are useful for mask math pressure,
  but not browser/WebGPU performance proof.
- XeGTAO pressures sampling and bandwidth: Hilbert/R2 schedules, depth MIPs,
  and a 5x5 spatial denoiser before optional temporal filtering.
- AMD CACAO pressures pipeline structure: adaptive quality levels, prepare
  depth/mips, edge-aware blur, and bilateral upsampling.
- N8AO pressures product shape: screen-space radius, blue-noise rotated taps,
  configurable sample/denoise presets, and explicit tradeoffs between halo,
  sharpness, and smoothness.

## Proof Ladder

Current level: SUPPORTED problem statement, OPEN solution.

- SUPPORTED: screenshots show adaptive VBAO has `noise,mud,edge-bleed` in the
  current denoised beauty capture.
- SUPPORTED: N8AO is smoother in the current captures but still shows `halo`.
- SUPPORTED: local N8AO WebGPU code uses blue noise, AO/blur targets,
  tangent-plane distance, normal weighting, and repeated spatial blur.
- OPEN: whether a generic spatial filter can preserve VBAO thin-gap behavior.
- OPEN: whether bitmask confidence metadata is necessary.
- OPEN: whether R2/Hilbert-style schedules reduce enough structured noise before
  any denoise pass is justified.
