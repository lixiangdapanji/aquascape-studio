# aquascape-studio — architecture

## Big picture

```
                        ┌───────────────────────────────────────┐
                        │              CloudFront                │
                        │      efferves.live (+ dev./stage.)     │
                        └───────┬──────────────────────┬─────────┘
                                │ /                    │ /grpc/*
                                ▼                      ▼
                        ┌───────────┐           ┌───────────┐
                        │    ALB    │           │    ALB    │
                        └─────┬─────┘           └─────┬─────┘
                              │                       │
                              ▼                       ▼
                   ┌─────────────────┐        ┌─────────────────┐
                   │  webService     │        │  apiService     │
                   │  Next.js 15     │        │  Rust / tonic   │
                   │  port 3000      │        │  port 50051     │
                   └─────────────────┘        └───────┬─────────┘
                                                      │
                                                      │ Cloud Map
                                                      │ aquascape-sim.aquascape.local:50052
                                                      ▼
                                             ┌─────────────────┐
                                             │  simService     │
                                             │  Python grpcio  │
                                             │  port 50052     │
                                             │  internal only  │
                                             └─────────────────┘

                   DynamoDB                         S3
                   ┌─────────────┐          ┌────────────────┐
                   │ scapes      │◀── api ──│ uploads bucket │
                   │ species     │          │ glacier @ 90d  │
                   └─────────────┘          └────────────────┘
```

## Repo boundaries

| Concern                         | Repo                                |
| ------------------------------- | ----------------------------------- |
| gRPC wire format                | `aquascape-proto` (source of truth) |
| AWS cloud (ECS, DDB, CF, R53)   | `aquascape-infra`                   |
| Species data + cultivation rules| `aquascape-botany`                  |
| Growth algorithm (patented)     | `aquascape-sim`                     |
| Edge API                        | `aquascape-api`                     |
| Shared React UI                 | `aquascape-ui`                      |
| 3D renderer                     | `aquascape-render`                  |
| Web app                         | `aquascape-web`                     |
| Mobile app                      | `aquascape-mobile`                  |
| E2E + architecture + runbook    | `aquascape-studio` (this repo)      |

## Contract flow

1. `aquascape-proto` publishes a tagged SHA to `main`.
2. Each consumer repo pins that SHA as a git submodule at `proto/`.
3. Consumer CI runs codegen from the pinned SHA:
   - Rust: `tonic-build` in `build.rs`
   - Python: `grpc_tools.protoc` in `scripts/generate_proto.py`
   - TS (web + mobile): `buf generate` → Connect-ES client
4. Consumers publish their artifact (container / npm / wheel).
5. `aquascape-studio` updates its own submodule pins and runs E2E.

## Why Cloud Map, not ALB, for sim

Sim is an internal-only service. Routing api→sim through the public ALB
would bounce packets out of the private subnets, add a hop's worth of
latency (sim streams frames at ~60 Hz), and leak the surface of the
patented algorithm. Cloud Map gives us a stable DNS name
(`aquascape-sim.aquascape.local:50052`) that resolves only inside the VPC,
with no cost. The api task's SG is the only principal allowed ingress on
the sim SG.

## Data model (scapes)

Scapes is a single DDB table with one GSI:

| pk                         | sk                      | attrs                                                  |
| -------------------------- | ----------------------- | ------------------------------------------------------ |
| `SCAPE#<scape_id>`         | `META`                  | owner_user_id, name, tank_dims, substrate, created_at  |
| `SCAPE#<scape_id>`         | `SNAP#<iso_ts>`         | sim frame (biomass, health, PAR, nutrient reservoir)   |
| `SCAPE#<scape_id>`         | `PLANT#<instance_id>`   | species_id, placement, planted_at                      |
| **GSI: byOwner**           |                         |                                                        |
| owner_user_id              | SCAPE#<scape_id>        | (same attrs — project via GSI to list-by-user)         |

Species table (`aquascape-species-<env>`) is read-only at runtime — it's
populated by `aquascape-botany` publishing a JSON snapshot into DDB via
an infra-side lambda on every botany release. This avoids pulling a
~1 MB JSON on every web/mobile page load.

## Deployment order

Within one environment:

1. `aquascape-proto` (if changed) — lands first so downstream CI has the
   new SHA to pin.
2. `aquascape-botany`, `aquascape-ui`, `aquascape-render` — can run in
   parallel.
3. `aquascape-sim`, `aquascape-api` — need the new proto SHA. Deploy sim
   first so api's health-checks don't flap.
4. `aquascape-web`, `aquascape-mobile` — last, consumers of all of the
   above.
5. `aquascape-studio` — updates submodule pins, opens a PR, and fires
   E2E on merge.

Across environments we promote dev → stage → prod by re-pointing each
leaf's workflow at the next env's deploy role, not by building again.
