# SDD Plan: Velocity-Backed VBAO Temporal AO

## Current State

There is a real temporal implementation now. The correct move is not to fight
it, delete it by taste, or promote it by enthusiasm.

Verified source shape:

- `VBAOVelocityTemporalNode` exists in `packages/horizon-ao/src`.
- It is private: `packages/horizon-ao/src/index.ts` does not export it.
- It consumes current AO, current depth/normal, velocity, previous depth, and
  previous normal.
- It owns only AO history, not previous depth/normal guide history.
- It uses Three TRAA velocity convention:

```txt
offsetUv = velocity.xy * vec2(0.5, -0.5)
historyUv = uv - offsetUv
```

Verified evidence shape:

- WebGPU smoke evidence exists for `velocity-internal`.
- The temporal pass emits measurable GPU timing.
- Temporal diagnostics are emitted in benchmark rows and latest stats.
- Target/lifetime inventory, reset evidence, static same-cost evidence, and
  motion/disocclusion evidence are captured in named benchmark artifacts.
- The verifier returns `reject-promotion`, not `candidate`; the velocity lane is
  currently incomplete until diagnostics pass timing is recaptured.

## Decision

Keep velocity-backed temporal as a private candidate line and work with it
properly.

That means:

- do not remove it just because temporal was previously rejected;
- do not add a public temporal API until the gate reaches `candidate`;
- do not hide temporal inside `VBAONodeOptions`;
- do not claim quality improvement from static screenshots alone;
- do keep the captured evidence and diagnostics canonical so future tuning has
  to beat the same gates.

## Product Model

The product shape remains:

```txt
VBAONode
  temporal-free final AO by default

private velocity temporal candidate
  current resolved AO
  + host velocity
  + host previous depth/normal guides
  + private AO history
  -> candidate final AO only after evidence
```

Public API stays unchanged until a separate promotion review proves otherwise.

## Plan

### Phase 1: Contract Reconciliation

Goal: align docs/spec/tests with the fact that private velocity temporal exists.

Tasks:

- Update language that says "runtime internal temporal is absent" to distinguish
  rejected camera-only temporal from current private velocity temporal.
- Keep public `VBAONodeOptions` temporal-free.
- Keep source-contract tests proving no public export exists.

Acceptance:

- `VBAOVelocityTemporalNode` is acknowledged as private runtime candidate code.
- Public API remains temporal-free.
- Camera-only temporal remains rejected.

### Phase 2: Host Ownership Inventory And Reset Evidence

Goal: make the host contract auditable.

Tasks:

- Record previous depth/normal ownership and lifetime.
- Record velocity convention and units.
- Record reset/camera-cut/resize/DPR/device-change behavior.
- Add target inventory for AO history and host guide textures.
- Capture a reset smoke row that proves diagnostics appear after resize or
  camera cut.

Acceptance:

- No temporal evidence row can claim promotion without target/lifetime inventory.
- The host owns previous guide history; VBAO owns only AO history.
- Reset/camera-cut/resize behavior is evidence-backed, not assumed.

### Phase 3: Diagnostics Contract

Goal: keep tuning blocked unless rejection reasons stay visible.

Tasks:

- Maintain diagnostics for rejected history reason:
  - reset;
  - viewport;
  - depth;
  - normal;
  - velocity;
  - clamp.
- Keep diagnostics surfaced in benchmark rows and latest stats.
- Verify resize and explicit reset clear history.

Acceptance:

- Temporal failures are explainable by reason, not only visible as worse
  screenshots.
- Temporal evidence without diagnostics is incomplete.

### Phase 4: Same-Cost Static Matrix

Goal: compare against fair alternatives.

Tasks:

- Capture temporal `off`.
- Capture host temporal.
- Capture host TRAA.
- Capture `velocity-internal`.
- Capture same-cost non-temporal spatial alternative.

Acceptance:

- Rows include screenshots, metrics, pass timings, failure labels, and artifact
  status.
- `velocity-internal` rows include diagnostics.
- Temporal must show a material pattern/noise win without stripe, edge, or
  thin-gap regression.

### Phase 5: Motion And Disocclusion Matrix

Goal: prove temporal does not just win still images.

Tasks:

- Add or use motion/disocclusion scenes.
- Capture camera-motion, object-motion, and disocclusion rows.
- Verify ghosting/disocclusion labels block promotion.

Acceptance:

- No candidate verdict without motion/disocclusion evidence.
- Any ghosting, disocclusion, mud, halo, edge-bleed, or thin-gap regression
  blocks promotion.

### Phase 6: Promotion Decision

Goal: decide, do not drift.

Possible outcomes:

- `reject-promotion`: keep private only, or delete if maintenance cost is not
  justified.
- `private-candidate`: keep internal evidence path, still no public API.
- `promotion-review`: open a separate SDD for public/host integration.

Acceptance:

- Public API changes happen only in a separate review.
- README/product claims change only after `candidate`.

## Guardrails

- No public `temporal` option in this SDD.
- No camera-only temporal resurrection.
- No previous depth/normal guide copies inside `@horizonao/core`.
- No temporal tuning without diagnostics.
- No static-only promotion.
- No production build unless explicitly requested.

## Verification

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
pnpm --filter @horizonao/demo verify:vbao-temporal
git diff --check
```

The bare verifier command is a local convenience check and may return
`incomplete` when `*-latest` files are absent. The `reject-promotion` claim for
this slice uses explicit `VBAO_TEMPORAL_*_JSON` input paths for the named
artifacts below.

Benchmark/evidence commands are phase-specific and must write named artifacts.

## Current Phase Result

Phases 2 through 6 established the velocity-backed evidence lane, but the
current named artifacts are now incomplete under the stricter diagnostics-pass
timing gate. The current result is `reject-promotion` with incomplete
velocity-lane evidence, not a closed candidate-evidence package.

Future work must first recapture velocity-internal, reset, and motion artifacts
with measured `passTimings.diagnostics`; only then should it evaluate blocking
failure labels and same-cost deltas. It should not add public temporal API,
threshold knobs, or new temporal planning files.

## Canonical Execution Contract

The detailed command shape belongs in benchmark scripts and named artifacts, not
as duplicated shell blocks in the SDD. The canonical execution contract is:

| Phase | Capture set | Required evidence | Gate |
| --- | --- | --- | --- |
| Inventory/reset | `velocity-internal` reset smoke | target owner/format/lifetime, reset diagnostics, pass timing | incomplete if lifetime or reset is implicit |
| Static same-cost | off, host, host TRAA, velocity-internal, spatial-ultra | screenshots, metrics, pass timings, failure labels, diagnostics | reject unless material win beats same-cost spatial without regressions |
| Motion/disocclusion | camera-motion, object-motion, disocclusion | motion source label, diagnostics, screenshots, timings, failure labels | reject on ghosting/disocclusion/mud/halo/edge/thin failure |
| Decision | explicit verifier inputs | clean-checkout reproducible inputs | public API still blocked unless a separate promotion SDD opens |

Named artifacts must use stable labels such as:

- `vbao-temporal-reset-smoke`
- `vbao-temporal-off-static`
- `vbao-temporal-host-static`
- `vbao-temporal-host-traa-static`
- `vbao-temporal-velocity-internal-static`
- `vbao-temporal-spatial-ultra-static`
- `vbao-temporal-motion-camera`
- `vbao-temporal-motion-object`
- `vbao-temporal-motion-disocclusion`

The verifier must be run with explicit input paths for any `reject-promotion` or
candidate claim. Default `*-latest` files are local convenience, not canonical
evidence.

Decision rule:

- incomplete evidence -> `incomplete`;
- complete but no material same-cost win -> `reject-promotion`;
- material static win but motion failures -> `reject-promotion`;
- material static win plus clean motion/disocclusion -> private `candidate`;
- public API work -> separate SDD only after private `candidate`.
