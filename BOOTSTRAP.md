# Bootstrap runbook

Follow these steps **once, in order**. Skip nothing. Wall-clock ~45 min, ~15 of which is DNS propagation you can walk away from.

Environment locked to your values:
- GitHub user: `lixiangdapanji`
- Repo: `aquascape-studio` (public)
- AWS account: `063418083301`
- Region: `us-east-1`
- Domain: `efferves.live` (registered at GoDaddy)

---

## 0. Prerequisites on your laptop

```bash
# macOS
brew install node pnpm awscli gh jq
corepack enable
corepack prepare pnpm@9.12.0 --activate

# AWS CLI config (one-time)
aws configure       # use an IAM admin user for THIS bootstrap; the app never uses these keys again
aws sts get-caller-identity    # sanity: should show account 063418083301
```

---

## 1. Push this repo to GitHub

```bash
cd aquascape-studio            # the directory this BOOTSTRAP.md lives in
git init -b main
git add -A
git commit -m "chore: phase 0 scaffold from aquascape-studio plugin"

# create + push
gh auth login                  # if not already
gh repo create aquascape-studio --public --source=. --remote=origin --push \
  --description "Aquascape studio: planted-aquarium platform. Built by an agentic Claude plugin."
```

Confirm: https://github.com/lixiangdapanji/aquascape-studio exists and `main` is green on the Actions tab (no red ci run yet because no CI has run — push a trivial PR later to verify).

---

## 2. Install deps

```bash
pnpm install
pnpm typecheck   # should all pass on the placeholders
```

---

## 3. Bootstrap CDK into your AWS account

```bash
cd infra
npx cdk bootstrap aws://063418083301/us-east-1
```

This creates the CDKToolkit stack (S3 bucket + IAM role) that CDK needs. Takes ~2 minutes.

---

## 4. Deploy the Bootstrap stack (OIDC + deploy roles)

```bash
# still inside infra/
npx cdk deploy AquascapeStudio-Bootstrap
```

At the end you'll see outputs like:

```
AquascapeStudio-Bootstrap.OidcDeployRoleArnDev =
  arn:aws:iam::063418083301:role/GithubDeployRole-dev
AquascapeStudio-Bootstrap.OidcDeployRoleArnStage =
  arn:aws:iam::063418083301:role/GithubDeployRole-stage
AquascapeStudio-Bootstrap.OidcDeployRoleArnProd =
  arn:aws:iam::063418083301:role/GithubDeployRole-prod
```

Copy them down.

---

## 5. Configure GitHub environments + variables

```bash
# env-specific role ARN, one per environment
gh api -X PUT repos/lixiangdapanji/aquascape-studio/environments/dev
gh api -X PUT repos/lixiangdapanji/aquascape-studio/environments/stage
gh api -X PUT repos/lixiangdapanji/aquascape-studio/environments/prod

# then set the role variable per environment
gh variable set AWS_DEPLOY_ROLE \
  --env dev   --body "arn:aws:iam::063418083301:role/GithubDeployRole-dev"
gh variable set AWS_DEPLOY_ROLE \
  --env stage --body "arn:aws:iam::063418083301:role/GithubDeployRole-stage"
gh variable set AWS_DEPLOY_ROLE \
  --env prod  --body "arn:aws:iam::063418083301:role/GithubDeployRole-prod"
```

Also add a required reviewer to `prod` via the GitHub UI: **Settings → Environments → prod → Required reviewers** (yourself is fine for now).

---

## 6. Create the Route53 hosted zone for efferves.live

This must exist before any per-env stack deploys (EdgeStack does `HostedZone.fromLookup`).

```bash
aws route53 create-hosted-zone \
  --name efferves.live \
  --caller-reference "aquascape-$(date +%s)" \
  --hosted-zone-config Comment="aquascape-studio root zone,PrivateZone=false"
```

Grab the four NS records it gives you:

```bash
aws route53 list-resource-record-sets \
  --hosted-zone-id $(aws route53 list-hosted-zones-by-name \
    --dns-name efferves.live --query 'HostedZones[0].Id' --output text) \
  --query "ResourceRecordSets[?Type=='NS'] | [0].ResourceRecords[].Value" \
  --output text
```

You'll get four servers like `ns-123.awsdns-45.com.` etc.

---

## 7. Delegate GoDaddy → Route53

Go to GoDaddy → My Domains → `efferves.live` → **DNS** → **Nameservers** → **Change**.
Pick **Enter my own nameservers (advanced)** and paste the four Route53 NS servers (drop the trailing dot).

Save. Propagation takes 5–60 min.

Verify (wait a bit):
```bash
dig +short NS efferves.live
# should list the 4 Route53 servers you just set
```

---

## 8. First per-env deploy

Once DNS is propagated:

```bash
# from repo root
cd infra
npx cdk deploy --all --context env=dev --require-approval never
```

Will deploy:
- `AquascapeStudio-Network-dev` — VPC + subnets
- `AquascapeStudio-Edge-dev` — ACM cert (waits on DNS), CloudFront, Route53 aliases for `dev.efferves.live`
- `AquascapeStudio-App-dev` — ECS cluster (empty), DynamoDB, ECR, S3 uploads bucket, $150/mo budget

Takes ~20 min because ACM DNS validation is slow.

Once it finishes, visit https://dev.efferves.live — should serve the default CloudFront 403 (nothing deployed to the bucket yet; app-agent fills this in Phase 1).

---

## 9. Verify CI path

```bash
git checkout -b ci-smoke
echo "" >> README.md
git commit -am "test: smoke the CI pipeline"
git push -u origin ci-smoke
gh pr create --fill
```

CI should pass. Merge the PR.

---

## 10. Kick off Phase 1

Open a new Claude (Cowork or Code) session with the `aquascape-studio` plugin active and say:

> Build aquascape-studio Phase 1. Repo is at https://github.com/lixiangdapanji/aquascape-studio, dev env is live at dev.efferves.live. Spawn the 5 subagents in parallel.

The `aquascape-workflow` skill will take it from here — open issues per agent, dispatch in worktrees, merge PRs.

---

## Troubleshooting

- **`cdk bootstrap` errors on credentials** → your admin user doesn't have IAM permissions. Use an account root key temporarily, or attach `AdministratorAccess`.
- **`HostedZone.fromLookup` fails during per-env deploy** → step 6 or 7 wasn't completed; check `dig NS efferves.live`.
- **ACM cert stuck in "Pending validation" >1 hr** → DNS propagation, or NS delegation is wrong. Re-check GoDaddy.
- **Actions deploy role assume fails with "Not authorized to perform: sts:AssumeRoleWithWebIdentity"** → the GitHub environment name in the workflow (`environment: dev`) must match the `sub` pattern in `GithubOidc.ts`. Both say `dev` here; don't rename without updating both.
- **Budget alerts don't arrive** → check inbox for `chengxiaopusuperman@gmail.com`, then SPAM, then AWS Budgets console → confirm the subscriber email.

---

## What each number costs you per month (rough)

- **No traffic, dev env, with 1 NAT**: ~$40/month (NAT dominates)
- **After Phase 2 deploy (1 Fargate task, ALB, some CloudFront)**: ~$90/month
- **Prod with 2 NATs + ECS scaled to 2 tasks + light traffic**: ~$180/month

The $150 dev budget alarm will fire before you're surprised.
