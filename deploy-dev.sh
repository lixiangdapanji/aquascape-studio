#!/usr/bin/env bash
# One-shot: wait for DNS → deploy dev → verify.
# Run AFTER you've changed GoDaddy nameservers to the 4 Route53 NS.
# Usage: ~/Desktop/aquascape-studio/deploy-dev.sh
set -euo pipefail

REPO_DIR="$HOME/Desktop/aquascape-studio"
DOMAIN="efferves.live"
EXPECT_NS_SUBSTR="awsdns"

echo "=========================================="
echo "Aquascape Studio — dev env deploy"
echo "=========================================="
echo

# --- Step 1: verify AWS creds -------------------------------------------------
echo "[1/4] Verifying AWS credentials..."
ACCT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)
if [[ "$ACCT" != "063418083301" ]]; then
  echo "  ERROR: AWS CLI is not configured for account 063418083301 (got: $ACCT)"
  echo "  Run: aws configure   and paste the aquascape-bootstrap user's keys."
  exit 1
fi
echo "  OK — account $ACCT"
echo

# --- Step 2: wait for DNS propagation ----------------------------------------
echo "[2/4] Waiting for DNS propagation (checking every 30s)..."
echo "  Looking for 4 NS records on $DOMAIN matching '*$EXPECT_NS_SUBSTR*'"
TRIES=0
MAX_TRIES=120  # 60 min max
while true; do
  NS_OUT=$(dig +short NS "$DOMAIN" 2>/dev/null || true)
  MATCH_COUNT=$(echo "$NS_OUT" | grep -c "$EXPECT_NS_SUBSTR" || true)
  if [[ "$MATCH_COUNT" -ge 4 ]]; then
    echo "  OK — DNS propagated after ${TRIES} checks:"
    echo "$NS_OUT" | sed 's/^/    /'
    break
  fi
  TRIES=$((TRIES + 1))
  if [[ "$TRIES" -ge "$MAX_TRIES" ]]; then
    echo "  TIMEOUT — DNS hasn't propagated after 60 minutes."
    echo "  Current NS records:"
    echo "$NS_OUT" | sed 's/^/    /'
    echo "  Check GoDaddy — you may have mis-typed a nameserver."
    exit 1
  fi
  printf "  (try %d/%d) not yet propagated, waiting 30s...\r" "$TRIES" "$MAX_TRIES"
  sleep 30
done
echo

# --- Step 3: cdk deploy dev env ---------------------------------------------
echo "[3/4] Deploying dev stack (~20 min — ACM cert validation is slow)..."
cd "$REPO_DIR/infra"
npx cdk deploy --all --context env=dev --require-approval never
echo

# --- Step 4: verify --------------------------------------------------------
echo "[4/4] Verifying dev.efferves.live is reachable..."
for i in 1 2 3 4 5; do
  if curl -s -o /dev/null -w "%{http_code}" "https://dev.$DOMAIN" | grep -qE "^(200|403)$"; then
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://dev.$DOMAIN")
    echo "  OK — https://dev.$DOMAIN returns HTTP $CODE"
    echo "  (403 is expected if the bucket is empty — app-agent will fix in Phase 1.)"
    break
  fi
  echo "  (attempt $i/5) not yet reachable, waiting 30s..."
  sleep 30
done
echo

echo "=========================================="
echo " Dev env deploy complete."
echo "=========================================="
echo "Next: start Phase 1 (spawn the 5 subagents in a new Claude session)."
