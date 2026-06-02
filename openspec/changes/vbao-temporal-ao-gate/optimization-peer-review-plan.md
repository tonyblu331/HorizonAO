# VBAO Optimization Peer Review Plan

## Verdict

Optimize the non-temporal product path first. Keep AO-owned temporal history
private and rejected until it beats temporal-off plus same-cost non-temporal
alternatives with guide-copy cost included.

The pasted feedback is useful as performance pressure, but too broad as an
implementation plan. The correct response is to turn each suggestion into an
evidence gate with pass timing, screenshot labels, and a kill criterion.

## Research Anchors

- SSILVB / VBAO: `VBAONode` is Visibility Bitmask AO, not Vector-Based AO. The
  core value is replacing two horizon angles with a sector bitmask so thin
  surfaces can leave visibility behind them.
  Source: https://arxiv.org/abs/2301.11376
- XeGTAO: production AO separates depth prefilter, main AO, and denoise; it
  tunes against ray-traced AO and compares same-cost alternatives.
  Source: https://github.com/GameTechDev/XeGTAO
- CACAO: production AO relies on prepared depth/normal data, depth MIPs,
  generated edge metadata, adaptive sampling, and edge-sensitive blur.
  Source:
  https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/
- SVGF-style temporal denoise: temporal reuse must validate history with motion
  or reprojection plus depth/normal/object consistency, then spatial filtering
  must be variance or confidence aware.
  Source: https://research.nvidia.com/labs/rtr/publication/schied2017spatiotemporal/

## Peer Review Of Current Direction

### What Is Correct

- The temporal gate is rightly in `reject-promotion`.
- Public API promotion is blocked until evidence reaches `candidate`.
- Same-cost alternatives are required; temporal cannot win by only looking
  smoother.
- Pass timing must include temporal AO plus guide-copy passes.
- Full-resolution polish and half-resolution cleanup are internal reconstruction
  stages, not public product knobs.

### What Is Too Weak

- Pass timing alone is not enough. Each row needs cost plus failure attribution:
  `noise`, `stripe`, `edge-bleed`, `thin-gap`, `mud`, `halo`,
  `false-curvature`, and `scale-mismatch`.
- The temporal plan still risks becoming research debt unless it has a hard kill
  rule.
- Spatial graph changes and shader micro-optimizations must be separated so
  results are attributable.

### What To Reject

- Do not rename the project back to GTAO/HBAO. The repo documents SSILVB/VBAO as
  the active line.
- Do not delete half-resolution cleanup or full-resolution polish only because
  the pasted feedback says they are redundant.
- Do not tune temporal history weight before proving that the topology produces
  a quality win.
- Do not assume previous depth, normals, velocity, or object IDs are available
  from the host renderer. `@horizonao/core` is a package-level node.

## Gate Model

Every optimization candidate must answer four questions:

1. What pass or failure label does it target?
2. What same-cost baseline does it compete against?
3. What screenshots, metrics, and pass timings prove the result?
4. What result kills the candidate?

If a candidate cannot answer those, it is not ready to implement.

## Roadmap

### O0: Freeze The Decision Table

Goal: make captured evidence produce decisions, not debate.

Deliverables:

- Add or update benchmark summary fields for:
  - pass timings by label;
  - target inventory by pass;
  - failure labels;
  - row decision: `keep`, `remove`, `merge-candidate`, `reject`,
    `needs-rerun`.
- Add verifier checks that temporal candidate evidence includes guide-copy cost.

Acceptance:

- A row without pass-level timing cannot promote a performance claim.
- A row without failure labels cannot promote a quality claim.

Kill:

- If the collector cannot identify pass labels reliably, stop and fix profiling
  instrumentation before touching AO topology.

### O1: Cost And Failure Attribution

Goal: identify which existing pass costs time or damages image quality.

Matrix:

- Museum and Lab.
- 1280x720 and 1920x1080.
- `off`, `internal`, and same-cost non-temporal rows.
- AO-only and beauty.
- Raw-debug and product where supported.

Required pass buckets:

- raw VBAO;
- half-resolution cleanup;
- JBU resolve;
- full-resolution polish;
- internal temporal AO accumulation;
- temporal depth guide copy;
- temporal normal guide copy;
- total product cost.

Acceptance:

- Every candidate row has screenshots, quality metrics, pass timings, and
  failure labels.
- `internal` temporal is judged after guide-copy cost, not only AO accumulation
  cost.

Kill:

- If internal temporal only matches temporal-off while adding guide-copy cost,
  archive or remove internal temporal instead of tuning it.

### O2: Non-Temporal Product First

Goal: optimize the load-bearing product path before revisiting temporal.

Candidates, one at a time:

- bypass half-resolution cleanup;
- keep cleanup but reduce/filter taps;
- fuse resolve and polish;
- make polish confidence-aware;
- compare more raw samples against current polish cost;
- compare current noise atlas against a frozen alternative.

Acceptance:

- Must improve total time or one target failure label.
- Must not regress `thin-gap`, `edge-bleed`, `halo`, `mud`, or
  `scale-mismatch`.

Kill:

- If a graph reduction saves time but worsens thin geometry or edge labels,
  reject it. This project exists because thin-visibility semantics matter.

### O3: Shader Micro-Optimization

Goal: remove obvious ALU/bandwidth cost without changing product behavior.

Candidates:

- CPU-composed reprojection matrix for private temporal experiments;
- manual 9-tap temporal clamp unroll;
- pre-linearized depth or center-only log-depth conversion experiment;
- early full-mask exit in the raw kernel;
- on-screen/radius rejection cleanup before expensive sample math.

Acceptance:

- Generated shader inspection stays clean.
- Source-contract tests cover the intended structure.
- Timing improves and failure labels do not regress.

Kill:

- If a micro-optimization changes visual labels, demote it to a separate quality
  candidate instead of treating it as a safe optimization.

### O4: Depth Hierarchy / Prepared Depth Experiment

Goal: test the production AO family that XeGTAO and CACAO both lean on.

Scope:

- internal demo/evidence path only;
- linear-depth MIP or min/max depth hierarchy;
- no public option;
- no replacement of required `normalNode`.

Acceptance:

- Larger-radius rows become cheaper or cleaner.
- Contact detail and thin occluders remain intact.

Kill:

- If depth hierarchy improves scale but damages contact detail, keep it as
  experimental only.

### O5: Temporal Revisit

Goal: decide whether AO-owned temporal deserves to survive.

Allowed only after O1 and non-temporal baselines are current.

Candidates:

- packed guide target;
- optional host-provided previous guide hook;
- CPU-composed reprojection matrix;
- temporal stability mask for polish;
- dynamic history weight after validation evidence exists.

Acceptance:

- Beats temporal-off and same-cost non-temporal rows in AO-only and beauty.
- No unresolved `ghosting`, `disocclusion`, `mud`, `thin-gap`, `edge-bleed`, or
  `halo`.
- Guide-copy or host-hook cost is included.

Kill:

- If it adds cost without material quality gain, remove or archive the private
  temporal prototype.

## Immediate Next Slice

Implement O0/O1 before any shader or topology change:

1. Make benchmark summaries emit a decision-ready pass table.
2. Ensure temporal guide-copy timing is separately visible.
3. Add verifier rejection for missing pass buckets.
4. Recapture Museum/Lab rows.
5. Decide keep/remove/merge-candidate per pass.

That is the shortest path to real optimization. Anything else is just moving
complexity around and hoping the screenshot forgives us.
