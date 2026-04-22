#!/usr/bin/env bash
# Push all Phase 1 agent branches to origin and open PRs via gh.
# Run AFTER commit-phase1.sh.
# Usage: bash ~/Desktop/aquascape-studio/push-phase1.sh
set -euo pipefail

cd "$HOME/Desktop/aquascape-studio"

BRANCHES=(
  "agent/infra/phase-1-ecs-and-ci|feat(infra): phase-1 ECS Fargate + CI workflows|Adds ALB + Fargate service to AppStack, CloudWatch alarms, SNS ops topic, and ci.yml + deploy-web.yml + deploy-infra.yml. Synthesizes cleanly; does NOT auto-deploy — merge will trigger deploy-infra workflow.|infra,phase-1"
  "agent/botany/phase-1-mvp-20-species|feat(data): 20 MVP species with citations|Adds packages/data/plants.json with 20 freshwater planted-aquarium species (stem, carpet, rosette, epiphyte, moss, red, floater). TODO: docs/plants/citations.bib + LICENSE-AUDIT.md.|data,phase-1"
  "agent/sim/phase-1-growth-v0|feat(sim): v0 growth loop|Webb/Platt photosynthesis, Michaelis-Menten CO2, Liebig minimum, Q10 temperature curve, RK4 integrator, vitest tests. TODO: bench/headless.ts and README.|sim,phase-1"
  "agent/render/phase-1-static-scene|feat(render): scene primitives (PARTIAL)|Tank + Lighting + WaterVolume + palette + types. TODO (before merge): Rock, Plant, <Aquarium> composition, Storybook. **Draft PR** — do not merge yet.|render,phase-1,draft"
  "agent/app/phase-1-shell|feat(app): UI package + theme tokens (PARTIAL)|packages/ui theme + 5 primitives. TODO (before merge): apps/web Next.js scaffold with /, /design, /app routes, Dockerfile, and apps/mobile Expo scaffold. **Draft PR** — do not merge yet.|app,phase-1,draft"
  "chore/phase-0-cleanup|chore: pnpm-lock + deploy-dev.sh|Phase 0 artifacts that weren't committed.|phase-0"
)

echo "Pushing branches and opening PRs..."
echo
for row in "${BRANCHES[@]}"; do
  IFS='|' read -r BR TITLE BODY LABELS <<<"$row"
  if ! git show-ref --verify --quiet "refs/heads/$BR"; then
    echo "  skip $BR (no local branch)"
    continue
  fi
  echo "----- $BR -----"
  git push -u origin "$BR" --quiet
  if [[ "$LABELS" == *"draft"* ]]; then
    gh pr create --base main --head "$BR" --title "$TITLE" --body "$BODY" --draft \
      || echo "  PR create failed (maybe exists) — listing existing:"
  else
    gh pr create --base main --head "$BR" --title "$TITLE" --body "$BODY" \
      || echo "  PR create failed (maybe exists) — listing existing:"
  fi
  gh pr view "$BR" --json url --jq .url 2>/dev/null || true
  echo
done

echo "=========================================="
echo " Done. Open PRs:"
gh pr list --state open --limit 20
echo "=========================================="
