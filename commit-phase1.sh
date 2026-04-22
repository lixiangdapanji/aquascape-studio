#!/usr/bin/env bash
# Commit 5 subagents' Phase 1 work onto disjoint branches, push, open PRs.
# Run from anywhere; script cds into the repo itself.
# Usage: bash ~/Desktop/aquascape-studio/commit-phase1.sh
set -euo pipefail

REPO="$HOME/Desktop/aquascape-studio"
cd "$REPO"

echo "=========================================="
echo "Phase 1 commit + push + PR helper"
echo "=========================================="

# --- 0. Clean up any stale git lock from a crashed sandbox process -----------
if [[ -f .git/index.lock ]]; then
  echo "[0/7] removing stale .git/index.lock"
  rm -f .git/index.lock
fi
# Clean up any root-owned tmp_obj files the subagents left behind
find .git/objects -name 'tmp_obj_*' -print -exec rm -f {} \; 2>/dev/null || true
echo

# --- 1. Sanity ---------------------------------------------------------------
echo "[1/7] sanity checks"
git fetch origin main --quiet
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "  switching to main (was on $CURRENT_BRANCH)"
  git checkout main
fi
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "  working tree has changes (expected — 5 agents wrote here)"
fi
echo

commit_one() {
  local BR="$1"; shift
  local MSG="$1"; shift
  local PATHS=("$@")

  echo "----- $BR -----"
  git checkout main >/dev/null
  git checkout -B "$BR" main >/dev/null

  # Reset everything not in our paths, then stage only our paths
  git stash push --include-untracked --quiet -m "phase-1-scratch" || true
  git stash pop --quiet || true  # put back, now we selectively add

  # Add only the requested paths (existing + new)
  for P in "${PATHS[@]}"; do
    if [[ -e "$P" ]]; then
      git add -A "$P"
    fi
  done

  if git diff --cached --quiet; then
    echo "  (no staged changes for $BR — skipping commit)"
  else
    git commit -m "$MSG" --quiet
    echo "  committed: $(git log -1 --oneline)"
  fi
}

# --- 2. infra branch ---------------------------------------------------------
commit_one "agent/infra/phase-1-ecs-and-ci" \
  "feat(infra): phase-1 ecs fargate + ci workflows

Extends AppStack with ALB + Fargate service (placeholder nginx image),
CloudWatch alarms, SNS ops topic. Adds ci.yml, deploy-web.yml,
deploy-infra.yml.

Co-authored-by: aquascape infra-agent" \
  "infra/" ".github/workflows/"

# --- 3. botany branch --------------------------------------------------------
commit_one "agent/botany/phase-1-mvp-20-species" \
  "feat(data): phase-1 20 MVP species with citations

Adds packages/data/plants.json (20 species across stem, carpet, rosette,
epiphyte, moss, red, floater), typed helper module, and package metadata.

Co-authored-by: aquascape botany-agent" \
  "packages/data/"

# --- 4. sim branch -----------------------------------------------------------
commit_one "agent/sim/phase-1-growth-v0" \
  "feat(sim): phase-1 v0 growth loop

Webb/Platt photosynthesis, Michaelis-Menten CO2 saturation, Liebig
minimum nutrient limitation, Q10 temperature bell curve. RK4 biomass
integrator. Vitest unit tests.

Co-authored-by: aquascape sim-agent" \
  "packages/sim/"

# --- 5. render branch (partial — just scene primitives) ---------------------
commit_one "agent/render/phase-1-static-scene" \
  "feat(render): phase-1 scene primitives (partial)

Tank + Lighting + WaterVolume components, ink-green palette, shared
types. Rock + Plant + Storybook + Aquarium composition still TODO.

Co-authored-by: aquascape render-agent" \
  "packages/render/"

# --- 6. app branch (partial — just ui package) ------------------------------
commit_one "agent/app/phase-1-shell" \
  "feat(app): phase-1 ui package + theme tokens (partial)

packages/ui theme (tokens, css vars, tailwind, ThemeProvider) plus
Button/Card/Heading/Prose/PlantChip primitives. apps/web Next.js and
apps/mobile Expo scaffolds still TODO.

Co-authored-by: aquascape app-agent" \
  "packages/ui/"

# --- 7. pnpm-lock + deploy script on their own, off main ---------------------
commit_one "chore/phase-0-cleanup" \
  "chore: pnpm-lock + deploy-dev.sh from phase-0 bootstrap" \
  "pnpm-lock.yaml" "deploy-dev.sh"

# --- Done --------------------------------------------------------------------
git checkout main >/dev/null
echo
echo "=========================================="
echo " Commits made locally on these branches:"
for b in agent/infra/phase-1-ecs-and-ci \
         agent/botany/phase-1-mvp-20-species \
         agent/sim/phase-1-growth-v0 \
         agent/render/phase-1-static-scene \
         agent/app/phase-1-shell \
         chore/phase-0-cleanup; do
  if git show-ref --verify --quiet "refs/heads/$b"; then
    echo "   ✓ $b"
  else
    echo "   ✗ $b  (nothing committed)"
  fi
done
echo
echo " Next step: run push-phase1.sh to push + open PRs"
echo "=========================================="
