# Test Strategy Specification

## ADDED Requirements

### Requirement: Vertical TDD

New behavior MUST be covered one public behavior at a time.

#### Scenario: Library behavior changes

- GIVEN a new public setting behavior is needed
- WHEN implementation starts
- THEN a failing Vitest test SHALL be added first
- AND implementation SHALL be minimal until the test passes

### Requirement: Canvas E2E Smoke Tests

The demo MUST include Playwright tests that verify routes mount and paint a non-empty canvas.

#### Scenario: Scene route paints pixels

- GIVEN the dev server is running
- WHEN Playwright navigates to each scene route
- THEN the canvas SHALL become visible
- AND sampled pixels SHALL indicate the canvas is not blank
