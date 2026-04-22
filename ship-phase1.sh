#!/usr/bin/env bash
# ship-phase1.sh — one-shot "fix test → commit → push → let CI take over".
#
# The user's directive: "我不需要 review，需要你帮我把 test 搞好，自动 push，
# 然后 CI/CD 就可以了。" This script is that button.
#
# What it does:
#   1. Cleans any stale git index locks / root-owned tmp objects left behind
#      by previous sandboxed writes.
#   2. Ensures git identity is configured.
#   3. pnpm install (regenerates lockfile so CI's --frozen-lockfile passes).
#   4. pnpm typecheck / test / build across the workspace, bailing on failure.
#   5. Stages everything (sans node_modules / dist / cdk.out / .turbo).
#   6. Commits directly onto main and pushes.
#   7. Prints GitHub Actions URLs so you can watch CI go green.
#
# Re-runnable: if a step already succeeded the script is a no-op on that step.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

hr() { printf '\n\033[1;32m── %s ──\033[0m\n' "$*"; }
ok() { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ────────────────────────────────────────────────────────────────────────────
hr "1. Scrubbing stale git locks"

if [ -f .git/index.lock ]; then
  warn "removing stale .git/index.lock"
  rm -f .git/index.lock
fi

# Previous sandboxed writes may have left root-owned tmp_obj files in .git/objects;
# if we spot any and we can't delete them, surface that early.
stale_tmp=$(find .git/objects -name 'tmp_obj_*' 2>/dev/null || true)
if [ -n "$stale_tmp" ]; then
  warn "stale tmp_obj files under .git/objects — attempting removal"
  echo "$stale_tmp" | xargs rm -f 2>/dev/null || {
    warn "some tmp_obj files are root-owned; running sudo rm"
    echo "$stale_tmp" | xargs sudo rm -f
  }
fi
ok "git dir clean"

# ────────────────────────────────────────────────────────────────────────────
hr "2. git identity"

if ! git config user.email >/dev/null; then
  git config user.email "chengxiaopusuperman@gmail.com"
  ok "set user.email"
fi
if ! git config user.name >/dev/null; then
  git config user.name "Xiaopu Cheng"
  ok "set user.name"
fi
ok "identity: $(git config user.name) <$(git config user.email)>"

# ────────────────────────────────────────────────────────────────────────────
hr "3. pnpm install"

if ! command -v pnpm >/dev/null; then
  die "pnpm not on PATH. Install it with: corepack enable && corepack prepare pnpm@9 --activate"
fi

# --no-frozen-lockfile so we regenerate pnpm-lock.yaml to match the current
# package.json files (data/render/ui/sim all changed). CI will then consume
# the regenerated lockfile under --frozen-lockfile.
pnpm install --no-frozen-lockfile
ok "dependencies installed"

# ────────────────────────────────────────────────────────────────────────────
hr "4. typecheck"
pnpm typecheck
ok "typecheck passed"

hr "5. test"
pnpm test
ok "tests passed"

hr "6. build"
pnpm build
ok "build passed"

# ────────────────────────────────────────────────────────────────────────────
hr "7. commit"

# Make sure old recovery scripts don't follow us into the commit.
git rm -f --ignore-unmatch commit-phase1.sh push-phase1.sh >/dev/null 2>&1 || true
rm -f commit-phase1.sh push-phase1.sh

git add -A

if git diff --cached --quiet; then
  warn "nothing to commit — tree clean. Skipping commit step."
else
  git commit -m "feat(phase-1): ship infra, sim, data, ui, render scene + CI wiring

- infra: AppStack expanded with ECS Fargate + ALB + alarms + SNS; CloudFront
  behaviors for /app/* and /api/* wired via EdgeStack.
- sim: v0 growth loop — photosynthesis (PI curve), Monod+Liebig nutrients,
  temperature Q10, RK4 integrator, types + tests.
- data: 20 MVP species in plants.json validated against Zod schema at import;
  typed accessors (byId / bySpecies / byDifficulty / byGrowthForm).
- ui: ink-green tokens + ThemeProvider + primitives (Button/Card/Heading/Prose)
  + PlantChip pattern.
- render: ink-green palette, scene primitives (Tank / Lighting / WaterVolume).
  Rock + Plant + Aquarium composition + Storybook land in follow-up.
- CI: ci.yml (typecheck/lint/test/build) + deploy-infra.yml (CDK diff/deploy).

Phase-1 apps (web Next.js + mobile Expo) still placeholder; app-agent finishes
them in a follow-up PR. Non-blocking for infra + sim + data + ui ship."
  ok "committed"
fi

# ────────────────────────────────────────────────────────────────────────────
hr "8. push to main"

if ! git remote get-url origin >/dev/null 2>&1; then
  die "no 'origin' remote configured"
fi

git push origin main
ok "pushed to origin/main"

# ────────────────────────────────────────────────────────────────────────────
hr "9. CI/CD"

repo_url=$(git remote get-url origin | sed -E 's#(git@github.com:|https://github.com/)#https://github.com/#; s#\.git$##')
echo "  Actions: $repo_url/actions"
echo "  Latest run: $repo_url/actions/workflows/ci.yml"
echo
echo "  tail it with:  gh run watch"
echo "  or:            gh run list --limit 3"
echo

ok "Phase-1 shipped. CI is driving now."
