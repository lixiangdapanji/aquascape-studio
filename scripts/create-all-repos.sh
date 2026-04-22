#!/usr/bin/env bash
# Create all 10 GitHub repos for aquascape-studio (1 glue + 9 leaves) and
# push their initial commits. Idempotent: skips repos that already exist.
#
# Pre-req:
#   - gh auth login
#   - each ../aquascape-<name> directory exists on disk (sibling to this repo)
#   - each has at least one commit on its local `main` branch
#
# Usage:
#   bash scripts/create-all-repos.sh
#   bash scripts/create-all-repos.sh --dry-run
set -euo pipefail

OWNER="lixiangdapanji"
DRY_RUN="${1:-}"

REPOS=(
  "aquascape-proto:gRPC/Protobuf contract for aquascape-studio. Source of truth; every consumer pins a SHA."
  "aquascape-infra:AWS CDK (TypeScript) for aquascape-studio. ECS Fargate × 3, ALB, DynamoDB, CloudFront, Route53."
  "aquascape-botany:Aquatic-plant knowledge base for aquascape-studio. JSON data + JS/TS + Python bindings."
  "aquascape-sim:Planted-aquarium growth simulation. Patented algorithm. Python + grpcio + numpy."
  "aquascape-api:Edge API for aquascape-studio. Rust + tonic + DynamoDB."
  "aquascape-ui:Shared React UI primitives with the ink-green design system."
  "aquascape-render:3D aquarium renderer. three.js + React Three Fiber."
  "aquascape-web:Web app for aquascape-studio. Next.js 15 + Connect-ES."
  "aquascape-mobile:Mobile app for aquascape-studio. Expo / React Native."
  "aquascape-studio:Glue repo for aquascape-studio. Submodule pins + E2E + docs."
)

# Run from the directory that is the PARENT of all these repos on disk.
# e.g. ~/Desktop/ where aquascape-studio, aquascape-proto, ... all live.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "Operating against sibling repos under: $ROOT"
echo

for entry in "${REPOS[@]}"; do
  name="${entry%%:*}"
  desc="${entry#*:}"
  dir="$ROOT/$name"

  if [ ! -d "$dir/.git" ]; then
    echo "! skipping $name — not a git repo at $dir"
    continue
  fi

  echo "▸ $name"
  pushd "$dir" > /dev/null

  # Ensure we're on main
  if ! git show-ref --verify --quiet refs/heads/main; then
    git checkout -b main 2>/dev/null || git branch -M main
  fi

  # Ensure at least one commit
  if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
    git add -A
    git commit -m "chore: initial scaffold" --allow-empty
  fi

  if [ "$DRY_RUN" = "--dry-run" ]; then
    echo "   (dry run) would: gh repo create $OWNER/$name --public --source=. --push"
    popd > /dev/null
    continue
  fi

  # Create on GitHub (idempotent)
  if gh repo view "$OWNER/$name" >/dev/null 2>&1; then
    echo "   repo already exists on GitHub — ensuring remote + pushing"
    git remote remove origin 2>/dev/null || true
    git remote add origin "https://github.com/$OWNER/$name.git"
    git push -u origin main
  else
    gh repo create "$OWNER/$name" \
      --public \
      --description "$desc" \
      --source=. \
      --remote=origin \
      --push
  fi

  popd > /dev/null
  echo
done

echo "✓ done."
echo
echo "Next: in aquascape-studio, add submodules pointing at each remote:"
echo "  cd $ROOT/aquascape-studio"
echo "  for r in proto infra botany sim api ui render web mobile; do"
echo "    git submodule add https://github.com/$OWNER/aquascape-\$r.git repos/aquascape-\$r"
echo "  done"
echo "  git commit -am 'chore: wire submodules' && git push"
