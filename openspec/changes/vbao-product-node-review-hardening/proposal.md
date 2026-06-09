# Proposal: VBAO Product Node Review Hardening

## Intent

Convert the pasted product-node review into a source-backed SDD plan. The review
is useful, but it mixes valid current risks with already-gated or deliberately
rejected work. This change separates those categories before any runtime patch.

## Scope

### In Scope

- Contrast pasted claims against current source, specs, and evidence.
- Resolve the half-resolution preset contradiction.
- Plan runtime/debug boundary cleanup only where current source still carries
  evidence-only code.
- Plan comment/constant/API cleanup where source still contradicts the product
  contract.

### Out of Scope

- Runtime behavior changes from this planning change.
- Public temporal, denoise, resolve, polish, benchmark, or velocity APIs.
- Production build commands.
- Reopening rejected resolve/polish fusion without new evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vbao-node`: adds SDD gates for preset/evidence consistency,
  evidence-only pass boundaries, and renderer-state ownership audits.

## Success Criteria

- The pasted review has a current-state contrast.
- Each remaining valid item has an owner phase and an acceptance gate.
- Already-completed or rejected items are not replanned as implementation work.
- The half-resolution default policy is reconciled with current evidence before
  any release-candidate claim.
