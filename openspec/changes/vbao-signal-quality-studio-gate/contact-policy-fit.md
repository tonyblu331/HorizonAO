# Contact Policy Fit

## Decision

Keep the current contact-thickness behavior as the named control for Phase 4.
Do not change shader behavior until a candidate beats the reference gates.

The current control is now named in source:

- `VBAO_CONTACT_THICKNESS_RADIUS_RATIO`
- `VBAO_NEAR_SAMPLE_THICKNESS_RATIO`

These are internal policy constants, not public `VBAONodeOptions`.

## Why This Stays A Control

The policy is empirical and imperfect, but it is load-bearing:

- `radius * ratio` bounds broad base thickness;
- `sampleDist * ratio` bounds near-sample interval length;
- max valid radius depends on base thickness;
- thin-gap and broad-contact behavior are coupled.

Changing one side without reference gates risks trading thinness for halos,
closing valid gaps, or over-darkening broad walls. That would be busywork, not
engineering.

## Gates Before Behavior Changes

Any adaptive or floor candidate must pass:

- scalar VBAO reference tests, including near-contact thickness saturation;
- ray-cast AO rows for thin-gap, contact corner, broad wall, grazing surface,
  and normal-sensitive geometry;
- raw `vbao-raw` vs `vbao-product` report separation;
- product failure labels for `thin-gap`, `edge-bleed`, `mud`, `halo`, and
  `scale-mismatch`.

## Candidate Status

| Candidate | Status | Reason |
| --- | --- | --- |
| Current named control | Kept | Behavior preserved; now testable without source-literal contracts. |
| Adaptive near-sample thickness | Rejected for production | Reference-only evaluation strengthens broad contact but adds sectors to the thin-gap gate. |
| Minimum effective-thickness floor | Rejected for production | Reference-only evaluation strengthens broad contact but also closes the thin-gap gate. |
| Public thickness mode | Rejected for this SDD | No evidence says users need another public knob. |

## Implementation Note

Phase 4.6 is complete for the current control: source-contract tests now assert
the named internal policy constants instead of exact `0.3` / `0.85` shader
literals. The literal values still exist once, at the policy definition.

Phase 4.3 through 4.5 are complete as reference-only evaluation. The scalar
reference now accepts internal candidate policies:

- `adaptive-near-sample`
- `minimum-effective-floor`

Both candidates are rejected by the paired gate in
`vbaoReference.test.ts`: they do not weaken broad contact, but they add occluded
sectors to the thin-gap case. Production `VBAONode` behavior remains unchanged.
