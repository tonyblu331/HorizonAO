# SDD Plan: VBAO Receiver Visibility Solver

## Current Truth

HorizonAO already has the bones of the receiver-solver model:

- `VBAONode` is the single public product node.
- The raw kernel uses 32-sector visibility masks.
- Normal input is required.
- Cosine-measure sectorization and projected-normal slice weighting are already
  production contracts.
- Cleanup, resolve, polish, temporal, compute, and directional work are private
  or evidence-gated.
- Release readiness remains incomplete because product rows still carry blocking
  labels and reference observations are missing.
- The product API still exposed low-level math controls too prominently; this
  change starts collapsing that shape around `contact` and `advanced`.

The gap is not that the repo lacks a big idea. The gap is that the big idea is
not yet the organizing architecture.

## Why

The receiver model explains the work better than the post-effect model.

Post-effect thinking asks:

```text
How do we smooth the AO texture?
```

Receiver-solver thinking asks:

```text
Which receiver visibility estimate is trustworthy, compatible, reusable, and
worth reconstructing?
```

That is the correct question for VBAO because the 32-bit mask preserves
visibility distribution. If we throw that semantic away too early, we make the
algorithm look like another screen-space scalar blur.

## What It Replaces

Replace this planning taxonomy:

- raw AO;
- denoise;
- resolve;
- polish;
- temporal;
- bent AO;
- compute experiment.

with this taxonomy:

- estimate;
- validate;
- reconstruct;
- reuse;
- integrate;
- prepare/optimize.

The files do not need to be renamed immediately. The SDD vocabulary and task
ordering should change first, then source refactors follow only where they make
the implementation smaller or clearer.

## Phase 1: Receiver Contract

Goal: define current scalar AO as a receiver state, not as an anonymous texture.

Deliverables:

- proposal/design/ultraplan/tasks/spec delta for receiver-solver shape;
- no runtime code changes;
- glossary for receiver state, receiver estimate, reconstruction, reuse, and
  integration.

Acceptance:

- docs explain why this replaces post-effect thinking;
- public API remains unchanged;
- no release-quality or path-tracing-close claim is added.

## Phase 2: Source Shape Audit

Goal: identify refactors that express receiver ownership without changing math.

Audit:

- `VBAONode.ts` graph creation and raw render target ownership;
- `VBAOEffectPass.ts` reuse across fullscreen passes;
- cleanup/resolve/polish naming and pass responsibilities;
- benchmark-only or evidence-only options that obscure product architecture;
- source tests that pin old post-effect wording instead of receiver contracts.

Acceptance:

- a behavior-preserving refactor list exists;
- every refactor says which concept it clarifies or which duplication it removes;
- no shader formula changes in the same slice.

## Phase 2.5: Product API Collapse

Goal: make the public control model artist-safe before adding more metadata.

Deliverables:

- add `contact` as the primary finite-occluder/contact-density control;
- map `contact` to internal thickness from `radius`;
- move `thickness`, `contrast`, `slices`, `samples`, and `resolutionScale` to
  `advanced` while keeping deprecated aliases;
- stop all named quality presets from defaulting to half-resolution.

Acceptance:

- existing evidence lanes can still override low-level values explicitly;
- product docs/tests no longer present thickness as a peer artist control;
- public metadata/temporal/denoise controls remain absent.

## Phase 3: Receiver Confidence Gate

Goal: make confidence/support the first real receiver-state extension.

Candidate shape:

```text
raw state:
  R = scalar AO
  G = confidence/support
```

First usage:

- drive cleanup strength;
- drive full-res polish strength;
- explain low-confidence raw pixels in evidence rows.

Acceptance:

- RED source/reference tests define confidence semantics before runtime code;
- benchmark rows compare scalar `R16F` control vs private confidence sidecar
  candidate;
- candidate improves a named failure label or reduces pass cost;
- no public option is added.

## Phase 4: Input Preparation And Optimization

Goal: treat depth hierarchy, edge metadata, and compute as receiver input/data
shape tools.

Candidates:

- representative-depth or hierarchy gate for large projected footprints;
- edge metadata for reconstruction compatibility;
- compute candidate only if storage texture or tiled data layout improves a
  named gate.

Acceptance:

- compute is not promoted for elegance;
- every dispatch has timing and target inventory;
- thin occluders and edge labels do not regress.

## Phase 5: Receiver Reuse

Goal: align temporal with receiver-state reuse.

Allowed shape:

```text
current receiver product AO
+ host velocity
+ host previous depth/normal guides
+ private AO history
+ diagnostics
```

Acceptance:

- velocity-backed only;
- motion/disocclusion evidence complete;
- same-cost spatial alternative included;
- public temporal remains blocked until candidate evidence wins.

## Phase 6: Directional Integration

Goal: derive directional information from receiver visibility instead of adding
a separate effect.

Allowed shape:

- reference open-sector buckets;
- bent normal as debug compression;
- no public directional output until scalar gates are stable and a product
  consumer exists.

Acceptance:

- separated visibility lobes stay separated in reference tests;
- scalar AO labels are not worsened or deprioritized.

## Guardrails

- No production build unless explicitly requested.
- No public options for confidence, temporal, mask, denoise, sector count, or
  bent output from this SDD.
- No feature gets rejected merely because it is ambitious; it gets sequenced by
  receiver-state ownership and evidence.
- No feature gets promoted merely because it matches a strong external mental
  model; local evidence still decides.
- No source refactor may hide a shader formula change.

## Skill Routing

The Maquette SDD skills are not domain-correct for HorizonAO, but their gate
discipline applies:

- use the roadmap discipline for phase order and promotion gates;
- use ultraplan discipline for ownership, truth separation, and readiness;
- keep evidence lanes separate: source truth, reference truth, rendered product
  evidence, private candidate evidence, and public product claims.

Implementation work routes to repo-native SDDs:

- product API collapse;
- receiver confidence gate;
- depth hierarchy evidence;
- velocity temporal gate;
- directional visibility reference;
- product node review hardening.

## Verification

Planning-only verification:

```sh
git diff --check -- openspec/changes/vbao-receiver-visibility-solver
```

Implementation phases add focused checks:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
```
