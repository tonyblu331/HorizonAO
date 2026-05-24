# Tasks: VBAO Pivot (PR-00)

Acceptance board mirrors the locked PR-00 exit gate from the plan.

## Paper

- [x] Write `openspec/changes/vbao-pivot/proposal.md`
- [x] Write `openspec/changes/vbao-pivot/state.yaml`
- [x] Write `openspec/changes/vbao-pivot/tasks.md` (this file)
- [ ] Write `openspec/changes/vbao-pivot/design.md` with slice basis frame, mirrored marching, count-clamped maskRange, both reductions, and locked tier numbers
- [ ] Write `openspec/specs/vbao-node/spec.md` using RFC 2119 + Given/When/Then
- [ ] Write `openspec/adr/ADR-007-vbao-pivot.md`
- [ ] Write `openspec/adr/ADR-008-vbao-ao-only.md`
- [ ] Write `openspec/adr/ADR-009-no-signed-horizon-legacy.md`
- [ ] Write `openspec/adr/ADR-010-normal-required.md`
- [ ] Write `openspec/adr/ADR-011-raw-first-no-denoise.md`

## Source skeleton

- [ ] Create `packages/horizon-ao/src/VBAONode.ts` — class + `vbao(...)` factory in same file
- [ ] Create `packages/horizon-ao/src/vbaoConstants.ts` — sector direction + cosine weight tables, quality tiers, clamp ranges
- [ ] Create `packages/horizon-ao/src/vbaoReference.ts` — signatures + stub bodies
- [ ] Update `packages/horizon-ao/src/index.ts` — export `VBAONode`, `vbao`; drop `parityHarness` from public surface
- [ ] Verify constructor throws `TypeError` when `normalNode` is null
- [ ] Verify `setup()` returns `float(1.0)` placeholder pending PR-02

## Demo scaffold

- [ ] Create `apps/demo/src/evidence/evidenceCameras.ts` with named camera IDs and the row schema

## Archive

- [ ] Move `packages/horizon-ao/src/horizonAoNode.ts` → `packages/horizon-ao/archive/`
- [ ] Move `packages/horizon-ao/src/horizonAoMath.ts` → `packages/horizon-ao/archive/`
- [ ] Move `packages/horizon-ao/src/horizonAoNode.test.ts` → `packages/horizon-ao/archive/`
- [ ] Move `packages/horizon-ao/src/horizonAoMath.test.ts` → `packages/horizon-ao/archive/`
- [ ] Move `packages/horizon-ao/src/parityHarness.ts` to internal or `archive/` (no longer public)
- [ ] Move `openspec/horizonao-final-spec.md` → `openspec/archive/`
- [ ] Move `openspec/horizonao-math-revision-2025.md` → `openspec/archive/`
- [ ] Move `openspec/horizonao-current-shape-roadmap.md` → `openspec/archive/`

## Docs

- [ ] Rewrite `README.md` to describe VBAO and add the R1 historical-repo-name paragraph
- [ ] Rewrite `AGENTS.md` notes that refer to HorizonAO to refer to VBAO

## Verification

- [ ] `pnpm typecheck` passes on skeleton
- [ ] `pnpm typecheck:tsgo` passes on skeleton
- [ ] `pnpm test` passes (existing math tests archived; new tests not added yet)
- [ ] `pnpm lint` passes
- [ ] No active `horizonAo*` source remains in `packages/horizon-ao/src/`
- [ ] No `parityHarness` in the public package surface

## Exit gate (15 items from the plan)

```
[ ] Source exports VBAONode only (class + factory in one file)
[ ] No active signed-horizon source remains in src/
[ ] Repo/package name unchanged under R1
[ ] README explains historical repo name (one paragraph)
[ ] normalNode is required (constructor throws on null)
[ ] SECTOR_COUNT = 32 compile-time
[ ] sectors is NOT accepted in options (readonly documentary getter only)
[ ] Quality tiers have fixed values (Fast 0.5/2/6/32, Balanced 0.5/3/8/32, Quality 1.0/4/10/32)
[ ] Slice basis frame is fully specified
[ ] Mirrored slice marching is specified
[ ] maskRange inclusivity/exclusivity is specified
[ ] WebGPU-first caveat is documented
[ ] evidenceCameras.ts exists with named camera IDs and the row schema
[ ] Public parityHarness export removed
[ ] ADR-007 through ADR-011 written
```
