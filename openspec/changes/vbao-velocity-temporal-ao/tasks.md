# Tasks: Velocity-Backed VBAO Temporal AO

## Phase R: Roadmap Reconciliation

- [x] R.1 Verify current private velocity-backed temporal implementation exists.
- [x] R.2 Record that current temporal work should be continued as a private
      candidate, not fought or publicly promoted.
- [x] R.3 Add SDD plan and canonical ultraplan for working properly along the
      implementation.
- [x] R.4 Update stale source-contract language that says runtime temporal is
      absent, while still rejecting camera-only/public temporal.
- [x] R.5 Keep public API/export tests proving no public temporal surface exists.
- [x] R.6 SOAP cleanup: consolidate roadmap content into `ultraplan.md` instead
      of adding another prompt-style planning file.

## Phase 0: Baseline Rejection

- [x] 0.1 Keep source-contract coverage that camera-only temporal is absent and
      velocity-backed temporal remains private.
- [x] 0.2 Record current `reject-promotion` evidence as prerequisite truth.
- [x] 0.3 Add ADR closeout for the camera-only temporal rejection.
- [x] 0.4 Confirm no public temporal API appears in package options or README.

## Phase 1: Host Contract

- [x] 1.1 Define velocity, previous depth, previous normal, and reset inputs.
- [x] 1.2 Add demo-only host adapter for velocity and previous guide ownership.
- [x] 1.3 Add benchmark reporting for host temporal-input availability.
- [x] 1.4 Add velocity direction proof for current-UV to previous-UV mapping.
- [x] 1.5 Record target format/lifetime inventory for host temporal inputs.
  - [x] 1.5a Record AO history target format/lifetime.
  - [x] 1.5b Record host velocity target source, units, and lifetime.
  - [x] 1.5c Record previous depth/normal source, format, and lifetime.
  - [x] 1.5d Record DPR/resize/device/format invalidation behavior.

## Phase 2: Private Temporal Node

- [x] 2.1 Add private `VBAOVelocityTemporalNode`.
- [x] 2.2 Allocate only one separate `R16F` AO history target.
- [x] 2.3 Reset history on first frame and resize.
- [x] 2.6 Wire and verify host reset, camera cut, and device/format reset evidence.
  - [x] 2.6a Define the demo-only camera-cut/reset trigger.
  - [x] 2.6b Capture reset smoke evidence with temporal diagnostics present.
  - [x] 2.6c Ensure verifier/reporting treats reset evidence absence as
        incomplete when required for candidate review.
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
- [x] 4.3 Add diagnostics for rejection/reset/history-smear.
- [x] 4.4 Keep all temporal thresholds private.

## Phase 5: Evidence

- [x] 5.1 Capture temporal off rows.
- [x] 5.2 Capture host rows.
- [x] 5.3 Capture host TRAA rows.
- [x] 5.4 Capture private velocity-backed internal rows.
  - [x] 5.4a Capture one `velocity-internal` smoke row proving temporal
        diagnostics are emitted before the full matrix.
- [x] 5.5 Capture same-cost spatial rows.
- [x] 5.6 Verify screenshots, pass timings, metrics, and failure labels.
- [x] 5.7 Capture motion/disocclusion rows before candidate verdict.
  - [x] 5.7a Capture camera-motion rows.
  - [x] 5.7b Capture object-motion rows.
  - [x] 5.7c Capture disocclusion rows.
  - [x] 5.7d Block candidate on ghosting/disocclusion labels.
- [x] 5.8 Include VRAM/target inventory in evidence summary.

## Phase 6: Decision

- [x] 6.1 Reject if no material same-cost win.
- [x] 6.2 Reject if blocking labels appear.
- [x] 6.3 Do not mark private candidate because the hard verifier did not pass.
- [x] 6.4 Reopen public API only in a separate promotion review.
- [x] 6.5 Defer deletion until the private temporal code stays unpromotable and adds
  maintenance cost.
