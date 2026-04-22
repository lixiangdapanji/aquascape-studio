# ADR 0001 — Polyrepo, not monorepo

**Status:** Accepted (2026-04-22)
**Deciders:** Xiaopu
**Supersedes:** the Phase-0 monorepo scaffold

## Context

Phase 0 shipped as a pnpm + turborepo monorepo with `apps/web`,
`apps/mobile`, `packages/{ui,render,sim,data}`, and `infra/` all in one
tree. Phase 2 added Rust (`aquascape-api`) and Python (`aquascape-sim`)
services plus protobuf contracts. Holding four languages, two
package managers, and three release cadences inside one workspace made
CI slow and the blast radius of a mis-merge product-wide.

## Decision

Split into 9 leaf repos under `lixiangdapanji/aquascape-*` plus one
glue repo (`aquascape-studio`). The glue repo uses git submodules to
pin a known-good SHA per leaf and houses only: E2E tests, the bootstrap
runbook, ADRs, and the architecture doc.

Per-leaf ownership:

- `aquascape-proto`   — orchestrator (contract-breaking changes are product-level)
- `aquascape-infra`   — infra-agent
- `aquascape-botany`  — botany-agent
- `aquascape-sim`     — sim-agent (also owns the patent draft)
- `aquascape-api`     — orchestrator (Rust; no dedicated agent for now)
- `aquascape-ui`      — app-agent
- `aquascape-render`  — render-agent
- `aquascape-web`     — app-agent
- `aquascape-mobile`  — app-agent

## Consequences

Good:
- Each leaf has tiny CI (one language, one Dockerfile).
- Independent release cadences; a botany data push doesn't rebuild the Rust API.
- Compromise blast radius is scoped; a rogue commit in `aquascape-render` can't break the sim pipeline.
- The patent disclosure is confined to `aquascape-sim` and can be filed cleanly.

Bad:
- Nine `gh repo create` + `git remote add` operations during bootstrap — mitigated by `scripts/create-all-repos.sh`.
- Cross-repo refactors need N PRs; acceptable because the proto contract is the only real coupling surface.
- E2E now lives in a 10th place (this repo). We keep it minimal — per-leaf unit tests carry the correctness load.

## Alternatives considered

- **Keep monorepo, split CI per path filter** — doesn't help the language-toolchain friction (cargo vs hatch vs pnpm in one workflow matrix).
- **Nx workspaces** — solves JS/TS but not Rust+Python; same language-boundary problem.
- **Bazel** — overkill for a one-dev product; 6+ week adoption cost.
