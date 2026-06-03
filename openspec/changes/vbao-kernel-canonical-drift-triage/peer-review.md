# Peer Review: VBAO Kernel Canonical Drift Triage

## Verdict

Accept the SDD direction with one correction: the plan should remain explicitly
fixture-first for slice reduction. The pasted review is technically valuable,
but the most tempting recommendation, adding projected-normal/cosine slice
weighting directly to production, currently conflicts with the committed
`vbao-node` spec. That conflict is not a reason to ignore the review. It is a
reason to add the missing fixture before touching `VBAONode.ts`.

## Strengths

- The SDD correctly refuses implementation-by-review. It checks the pasted
  claims against source, specs, and existing gates before editing runtime code.
- It separates already-completed work from new work. In particular,
  `computeVbaoBilateralGeometryWeight` already exists and is required by source
  tests across cleanup, resolve, resolve-polish, and polish.
- It catches the real correctness risk: current drift fixtures are too
  axis-aligned to prove whether uniform slice averaging remains valid for
  grazing normals.
- It treats `sampleDist * 0.85` as load-bearing behavior instead of leaving it
  as anonymous tuning.
- It keeps temporal, denoise controls, and pass fusion out of this SDD. Those
  topics already have separate evidence gates.

## Findings

### P1: Slice Reduction Needs A RED Fixture Before A Formula Change

The current spec says the mask bits already represent cosine-measure chunks and
that slices use a uniform average after CDF remapping. The runtime source matches
that contract with `weightedAccessibility.addAssign(sliceAccessibility)` and
`weightSum.addAssign(float(1))`.

Changing production to `sliceAccessibility * NprojLen` may be correct only if
the current CDF-remapped bitmask is not already carrying the intended weighting
for the tested geometry. Without a non-axis-aligned fixture, the project would
be changing the contract blind.

Resolution: Phase 2 stayed before Phase 3. A multi-slice/non-axis fixture later
failed the uniform contract at warning level, so the runtime candidate moved to
projected-normal weighting with spec, source-contract, shader-inspection, and
raw-kernel evidence updates.

### P1: The SDD Should Make "Selected GT-VBAO Corrections" Non-Negotiable

The pasted review sometimes evaluates the project as if the goal were canonical
GTAO or a full GT-VBAO port. The repo says otherwise: production is a VBAO node
with selected GT-VBAO corrections. That distinction matters because full
canonical alignment can pull in temporal, denoise, directional AO, and
multi-bounce work that is out of scope for the current product.

Action: keep the design language that a research mismatch is not automatically
a product bug. It becomes a bug only when the repo contract or fixture evidence
fails.

### P2: The Thickness Cap Needs A Named Rationale

The paper supports constant thickness and acknowledges that per-pixel thickness
is unknown in a single-layer depth buffer. The repo goes further by clamping
effective thickness to `sampleDist * 0.85`. That may be a good production guard,
but it is not paper-derived as written.

Action: document the failure it prevents, likely near-sample self-blanketing or
full-sector collapse, and keep a test that pins the chosen behavior.

### P2: x² Spacing Is Defensible, But The Reference Mismatch Must Be Owned

The SSILVB paper explicitly mentions exponentially distributing samples around
the shaded pixel to improve detail around nearby objects. The repo's `t * t`
near bias is therefore not automatically suspect. The problem is contract
alignment: if scalar reference code assumes uniform spacing while production
uses x² spacing, comparisons can mislead.

Action: either add reference support for the production schedule or clearly mark
uniform reference rows as formula probes rather than exact production parity.

### P3: Phase Hoisting Is A Good Optimization Spike, Not A Correctness Gate

`sampleNoisePhase(i, j)` inside the inner loop is a plausible ALU cleanup target.
But the phase atlas is tied to thin-sector stochastic coverage, so the spike
must prove it preserves decorrelation.

Action: keep this after correctness gates and require generated shader plus
visual/timing evidence.

## Rejected Suggestions

- Promote internal temporal AO: existing temporal gate rejects promotion.
- Add public denoise controls: conflicts with current product API discipline and
  ADR-011 raw-first policy.
- Fuse resolve and polish inside this SDD: topology evidence belongs to the
  existing pass-topology/reconstruction SDDs.
- Re-extract bilateral math: already done in current source.

## Required Next Step

Add the non-axis-aligned/grazing-normal fixture first. This is the foundation.
Without it, every formula discussion is architecture theater, and vos can do
better than architecture theater.
