# Proposal: VBAO Reconstruction Release Readiness

## Intent

Convert the latest product review into SDD gates for the remaining release blockers. The core contradiction is that full-resolution is the only visually credible product path today, while the intended performance path depends on half-resolution reconstruction that is not yet good enough.

## Scope

### In Scope
- Autopsy half-resolution reconstruction across raw AO, cleanup, JBU resolve, and optional polish stages.
- Fix or formally close the duplicate `vbaoPixel` generated-shader warning.
- Remove small runtime fat that is not required for product execution.
- Add production-build and pass-timing evidence only when explicitly requested, because project rules prohibit production builds by default.
- Fill product fixture/reference observations before any release-candidate quality claim.

### Out of Scope
- Temporal AO history, reprojection, variance clamps, or motion handling.
- Bent AO or additional public denoising/reconstruction nodes.
- Promoting half-resolution by performance alone.
- Changing the default noise source without measured evidence.

## Capabilities

### Modified Capabilities
- `vbao-node`: adds release-readiness gates for reconstruction quality, diagnostics cleanliness, runtime minimalism, production evidence, and product fixture observations.

## Approach

Treat the review as evidence triage, not feature ideation. First isolate where half-resolution fails. Only then tune cleanup/JBU/polish behavior. Keep product API unchanged unless a later SDD proves a public contract is necessary.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `apps/demo/scripts/*` | Modified | Capture per-stage half-resolution artifacts and pass timings. |
| `apps/demo/src/scenes/*` | Modified if needed | Expose debug-only stage captures without changing product defaults. |
| `packages/horizon-ao/src/VBAONode.ts` | Modified | Fix duplicate shader names and possibly extract internal helpers. |
| `packages/horizon-ao/src/vbaoSampling.ts` | Modified | Keep runtime sampling product-focused; move candidates if proven safe. |
| `packages/horizon-ao/src/__tests__/*` | Modified | Add source contracts for diagnostics, pass graph, and runtime boundary. |
| `packages/horizon-ao/reference/*` | Modified | Add product fixture observations and reference/report support. |
| `EVIDENCE.md` | Modified | Record reconstruction labels, pass timings, product fixture observations, and release blockers. |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Half-res failures are caused by multiple stages | High | Capture each stage independently before tuning. |
| Debug capture paths leak into public API | Medium | Keep capture switches internal/demo-only and assert exports. |
| Production build evidence conflicts with project rule | Medium | Do not run build unless the user explicitly asks. |
| Noise/runtime cleanup changes visual output accidentally | Medium | Require before/after evidence and source-contract tests. |

## Success Criteria

- [ ] Half-resolution failure source is identified with per-stage evidence.
- [ ] Half-resolution is either promoted with evidence or explicitly demoted for release.
- [ ] Full-resolution evidence has no persistent noise or edge-bleed blocker labels, or those labels are documented as release blockers.
- [ ] Duplicate `vbaoPixel` warnings no longer reproduce, or a concrete upstream blocker is documented.
- [ ] Runtime sampling candidates are trimmed or moved outside product runtime where safe.
- [ ] Product fixture observations exist for release-quality claims.
- [ ] Production build status is explicitly recorded when the user authorizes it.
