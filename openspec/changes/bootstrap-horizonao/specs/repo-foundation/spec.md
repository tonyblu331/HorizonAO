# Repo Foundation Specification

## ADDED Requirements

### Requirement: Monorepo Workspace

The repository MUST define a pnpm workspace with separate app and package folders.

#### Scenario: Workspace packages are discoverable

- GIVEN a fresh checkout
- WHEN dependencies are installed with pnpm
- THEN `apps/demo` and `packages/horizon-ao` SHALL be workspace packages

### Requirement: TypeScript 7 Preview

The repository MUST support TypeScript 7 native-preview validation without replacing stable TypeScript required by current tooling.

#### Scenario: TS7 preview runs side-by-side

- GIVEN dependencies are installed
- WHEN `pnpm typecheck:tsgo` is executed
- THEN packages SHALL use `tsgo` for preview validation
- AND stable `typescript` SHALL remain available for Vite, ESLint, and tsdown

### Requirement: License File

The repository MUST include a root `LICENSE.md`.

#### Scenario: GitHub detects project licensing

- GIVEN the project is pushed to GitHub
- WHEN GitHub scans the root
- THEN the license file SHALL be present in a conventional location
