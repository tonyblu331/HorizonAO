# Tasks: Velocity-Backed VBAO Temporal AO

## Phase 0: Baseline Rejection

- [ ] 0.1 Keep source-contract coverage that runtime internal temporal is absent.
- [ ] 0.2 Record current `reject-promotion` evidence as prerequisite truth.
- [ ] 0.3 Add ADR closeout for the camera-only temporal rejection.
- [ ] 0.4 Confirm no public temporal API appears in package options or README.

## Phase 1: Host Contract

- [x] 1.1 Define velocity, previous depth, previous normal, and reset inputs.
- [x] 1.2 Add demo-only host adapter for velocity and previous guide ownership.
- [x] 1.3 Add benchmark reporting for host temporal-input availability.
- [x] 1.4 Add velocity direction proof for current-UV to previous-UV mapping.
- [ ] 1.5 Record target format/lifetime inventory for host temporal inputs.

## Phase 2: Private Temporal Node

- [x] 2.1 Add private `VBAOVelocityTemporalNode`.
- [x] 2.2 Allocate only one separate `R16F` AO history target.
- [x] 2.3 Reset history on resize, camera cut, first frame, or host reset.
- [x] 2.4 Keep the node out of public exports.
- [x] 2.5 Ensure the node produces complete output or is not merged.

## Phase 3: Validation

- [x] 3.1 Reproject with velocity.
- [x] 3.2 Reject out-of-viewport history.
- [x] 3.3 Reject depth discontinuity.
- [x] 3.4 Reject normal discontinuity.
- [x] 3.5 Reject invalid or missing velocity.
- [x] 3.6 Fall back to current AO on invalid history.

## Phase 4: Clamp And Blend

- [x] 4.1 Clamp previous AO to current 3x3 AO neighborhood.
- [x] 4.2 Blend with private `0.8` base weight.
- [ ] 4.3 Add diagnostics for rejection/reset/history-smear.
- [x] 4.4 Keep all temporal thresholds private.

## Phase 5: Evidence

- [ ] 5.1 Capture temporal off rows.
- [ ] 5.2 Capture host rows.
- [ ] 5.3 Capture host TRAA rows.
- [ ] 5.4 Capture private velocity-backed internal rows.
- [ ] 5.5 Capture same-cost spatial rows.
- [ ] 5.6 Verify screenshots, pass timings, metrics, and failure labels.
- [ ] 5.7 Capture motion/disocclusion rows before candidate verdict.
- [ ] 5.8 Include VRAM/target inventory in evidence summary.

## Phase 6: Decision

- [ ] 6.1 Reject if no material same-cost win.
- [ ] 6.2 Reject if blocking labels appear.
- [ ] 6.3 Mark private candidate only after hard verifier passes.
- [ ] 6.4 Reopen public API only in a separate promotion review.
- [ ] 6.5 Delete private temporal code if it stays unpromotable and adds
  maintenance cost.
