# Tasks: VBAO Directional Visibility Reference

## Phase 1: Bent Normal Reference

- [x] 1.1 Add RED tests for full-open and full-blocked directional masks.
- [x] 1.2 Add RED test for symmetric open sectors producing stable bent direction.
- [x] 1.3 Implement reference bent-normal reconstruction from open sectors.

## Phase 2: Visibility Buckets

- [x] 2.1 Add RED test proving two separated open lobes remain separated.
- [x] 2.2 Implement contiguous open-lobe extraction per slice.
- [x] 2.3 Merge similar lobe directions across slices.
- [x] 2.4 Cap output at two buckets for the first reference pass.

## Phase 3: Evidence And Roadmap

- [x] 3.1 Add debug fixture data for scalar, bent normal, and buckets.
- [x] 3.2 Document uncertainty and failure cases.
- [x] 3.3 Do not expose public directional API until scalar AO evidence is complete.
