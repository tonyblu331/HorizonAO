# Change: VBAO Sampling Backtest

## Summary

Add a deterministic sampling backtest layer for VBAO before changing the production sampling schedule. Compare the current magic-square rotation against R2, Hilbert-style, and blue-noise-like deterministic rotations without temporal accumulation.

## Goals

- Add a pure reference sampling abstraction.
- Prove deterministic output for each candidate schedule.
- Measure distribution, noise, stability, cost, and thin-gap preservation.
- Select a production schedule only from evidence rows, not preference.

## Non-Goals

- No temporal accumulation.
- No TAA dependency.
- No denoise pass.
- No public sampling knob.

## Evidence Gate

Sampling changes SHALL NOT replace the current shader path until `EVIDENCE.md` includes benchmark rows and screenshots showing the selected schedule improves noise/stability without losing thin-gap behavior.
