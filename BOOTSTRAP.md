# Bootstrap runbook (polyrepo)

Follow these steps **once, in order**. Skip nothing. Wall-clock ~60 min,
of which ~15 is DNS propagation you can walk away from.

Environment locked to your values:
- GitHub user: `lixiangdapanji`
- AWS account: `063418083301`
- Region: `us-east-1`
- Domain: `efferves.live` (registered at GoDaddy)
- Meta-repo: `aquascape-studio` (this repo, glue only)
- Leaf repos: `aquascape-{proto,infra,botany,sim,api,ui,render,web,mobile}` (9 repos)

---

## 0. Prerequisites on your laptop

```bash
# macOS
brew install node awscli gh jq git docker
# Rust toolchain (for aquascape-api)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Python 3.12 (for aquascape-sim)
brew install python@3.12
# buf (for protobuf codegen)
brew install bufbuild/buf/buf

# AWS CLI config (one-time, admin creds for bootstrap ONLY)
aws configure
aws sts get-caller-identity    # must show account 063418083301
```

---

## 1. Create all 10 GitHub repos & push

You're inside the glue repo now. The 9 leaf repos need to exist on GitHub
before we wire submodules. Run this batch (all 10 repos created in one go):

```bash
gh auth login                  # if not already
bash scripts/create-all-repos.sh
```

(That script is emitted in step 11 below — skip if you already ran it.)

---

## 2. Bootstrap CDK into your AWS account

```bash
cd repos/aquascape-infra
npm ci
npx cdk bootstrap aws://063418083301/us-east-1
```

Creates the CDKToolkit stack (S3 + IAM). ~2 min.

---

## 3. Deploy the Bootstrap stack (OIDC + deploy roles trusted by ALL repos)

```bash
# still inside repos/aquascape-infra/
npx cdk deploy AquascapeStudio-Bootstrap
```

Outputs (copy these — you'll paste them into every leaf repo's Secrets):

```
AquascapeStudio-Bootstrap.DeployRoleArn-dev   = arn:aws:iam::063418083301:role/GithubDeployRole-dev
AquascapeStudio-Bootstrap.DeployRoleArn-stage = arn:aws:iam::063418083301:role/GithubDeployRole-stage
AquascapeStudio-Bootstrap.DeployRoleArn-prod  = arn:aws:iam::063418083301:role/GithubDeployRole-prod
```

The trust policy uses `ForAnyValue:StringLike` over all
`aquascape-{infra,api,sim,web,mobile}` repos, so each one can assume the
role **only** when running in the matching Actions environment.

---

## 4. Configure GitHub environments + variables for each deploying repo

Repos that deploy AWS resources: `aquascape-infra`, `aquascape-api`,
`aquascape-sim`, `aquascape-web`, `aquascape-mobile`.

For **each** of those repos:

```bash
REPO=aquascape-api           # repeat for -infra, -sim, -web, -mobile
for env in dev stage prod; do
  gh api -X PUT repos/lixiangdapanji/$REPO/environments/$env
done

gh variable set AWS_DEPLOY_ROLE --repo lixiangdapanji/$REPO \
  --env dev   --body "arn:aws:iam::063418083301:role/GithubDeployRole-dev"
gh variable set AWS_DEPLOY_ROLE --repo lixiangdapanji/$REPO \
  --env stage --body "arn:aws:iam::063418083301:role/GithubDeployRole-stage"
gh variable set AWS_DEPLOY_ROLE --repo lixiangdapanji/$REPO \
  --env prod  --body "arn:aws:iam::063418083301:role/GithubDeployRole-prod"
```

For the non-AWS npm-publishing repos (`aquascape-proto`,
`aquascape-botany`, `aquascape-ui`, `aquascape-render`) only a
`GITHUB_TOKEN` (auto-provided) is needed to publish to GitHub Packages.

Add required reviewers for `prod` in the UI for each repo: **Settings →
Environments → prod → Required reviewers**.

---

## 5. Create the Route53 hosted zone for efferves.live

EdgeStack does `HostedZone.fromLookup`, so the zone must exist first.

```bash
aws route53 create-hosted-zone \
  --name efferves.live \
  --caller-reference "aquascape-$(date +%s)" \
  --hosted-zone-config Comment="aquascape-studio root zone,PrivateZone=false"

aws route53 list-resource-record-sets \
  --hosted-zone-id $(aws route53 list-hosted-zones-by-name \
    --dns-name efferves.live --query 'HostedZones[0].Id' --output text) \
  --query "ResourceRecordSets[?Type=='NS'] | [0].ResourceRecords[].Value" \
  --output text
```

---

## 6. Delegate GoDaddy → Route53

GoDaddy → My Domains → `efferves.live` → **DNS → Nameservers → Change →
Enter my own nameservers** → paste the four Route53 NS servers (drop the
trailing dot). Save. Wait 5–60 min.

```bash
dig +short NS efferves.live    # should list the 4 Route53 servers
```

---

## 7. First per-env deploy of the infra stacks

```bash
cd repos/aquascape-infra
npx cdk deploy --all --context env=dev --require-approval never
```

Deploys:
- `AquascapeStudio-Network-dev` — VPC + subnets
- `AquascapeStudio-Edge-dev` — ACM cert, CloudFront, Route53 aliases for `dev.efferves.live`
- `AquascapeStudio-App-dev` — ECS cluster, ALB, DDB, ECR, S3 uploads, alarms, budget

~20 min (ACM DNS validation dominates).

Verify: https://dev.efferves.live → CloudFront 503 from ALB (no tasks running yet — containers are published by the leaf repos).

---

## 8. Ship each service

For each of `aquascape-api`, `aquascape-sim`, `aquascape-web`:

```bash
cd repos/aquascape-<service>
git push origin main       # triggers docker build + push to ECR + ECS update
```

Their workflows assume `GithubDeployRole-dev`, push to
`aquascape-<service>-dev` ECR, and bump the Fargate task-def. Wait ~5 min
per service for the health checks to flip green in the ECS console.

For `aquascape-mobile` (Expo): `eas build` + `eas update` are run inside
its own workflow. No ECS involvement.

For the data/UI packages (`aquascape-proto`, `-botany`, `-ui`, `-render`):
each publishes its package to GitHub Packages (scope `@aquascape/*`) on
push to main.

---

## 9. Install the glue repo's E2E deps & run

```bash
cd /path/to/aquascape-studio   # this repo
npm ci
npm run e2e:install
BASE_URL=https://dev.efferves.live npm run e2e
```

The E2E suite spins up a scape, issues a `SimulateScape` stream, and
confirms rendering bindings resolve.

---

## 10. Kick off Phase 2 work

Open a new Claude session with the `aquascape-studio` plugin active:

> Continue aquascape-studio Phase 2. All 9 leaf repos are live and
> dev.efferves.live serves the current tip. Prioritize the sim-agent
> patent draft and the api ↔ sim streaming path.

---

## 11. Appendix — batch repo creation

One-shot batch to create all 10 remotes (this meta-repo + 9 leaves) and
push initial commits. Run once.

See `scripts/create-all-repos.sh`.

---

## Troubleshooting

- **`cdk bootstrap` errors on credentials** — admin user lacks IAM rights. Use `AdministratorAccess` temporarily.
- **`HostedZone.fromLookup` fails** — step 5 or 6 not complete; check `dig NS efferves.live`.
- **ACM cert stuck in "Pending validation" > 1 h** — DNS propagation or wrong NS delegation.
- **Actions deploy role assume fails `sts:AssumeRoleWithWebIdentity`** — the `environment:` in the workflow must match the `sub` claim pattern in `GithubOidc.ts`. Both say `dev/stage/prod`; do not rename without updating both.
- **Sim service ECS task crash-loops** — check CloudWatch log group `/aquascape/sim/dev`. Likely the bundled `plants.json` is missing from the container; rebuild + repush `aquascape-sim`.
- **API can't reach sim** — verify Cloud Map service discovery: `aws servicediscovery list-services` should show `aquascape-sim` in namespace `aquascape.local`. If missing, the sim ECS service didn't register — check `cloudMapOptions` in AppStack.

---

## Rough monthly cost

- **dev, idle, 1 NAT**: ~$45
- **dev, tasks running, light traffic**: ~$110
- **prod, 2 NAT + 2× web + 1× api + 1× sim**: ~$220

The $150 dev budget + $600 prod budget will alarm well before any surprise.
