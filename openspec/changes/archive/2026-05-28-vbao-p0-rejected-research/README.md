# Archived VBAO research/filter changes

Archived on 2026-05-28 during VBAO P0 commit-readiness cleanup.

These change folders are historical/rejected evidence only. They no longer define active product requirements for the current VBAO package.

Current product contract:

- one public `VBAONode` product node;
- `getTextureNode()` returns final product AO;
- `getRawTextureNode()` is debug/readback only;
- cleanup/resolve/polish are lazy internal reconstruction stages;
- no public denoiser toolkit;
- no public high-sample, metadata-aware, SmartDenoiser, or formula-ablation runtime switches.
