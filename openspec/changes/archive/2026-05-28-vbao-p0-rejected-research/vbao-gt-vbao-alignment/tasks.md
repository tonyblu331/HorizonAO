# Tasks: VBAO GT/Reference Alignment

- [x] Add RED tests proving parity rows expose paper mask metadata separately from production mask metadata.
- [x] Compute `paperExpected` from paper-aligned sample masks instead of production masks.
- [x] Preserve production GPU parity against cosine-weighted scalar output.
- [x] Keep helpers internal; no public export or `VBAONodeOptions` change.
- [x] Run full no-build validation matrix.
- [x] Re-run actual `/vbao-parity` WebGPU route evidence after adding
      paper-popcount debug visibility.
- [x] Archive formula labels showing hardened fixtures currently
      `cosine-matches-gpu`, not `paper-matches-gpu`.
