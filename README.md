# aquascape-studio

Glue repo for the **aquascape-studio** product — a planted-aquarium
design tool with a patented growth-simulation engine.

This repo does **not** contain application code. All code lives in the
nine leaf repos referenced as git submodules under `repos/`. The glue
repo owns:

- `BOOTSTRAP.md`          one-time account + domain + secrets setup
- `repos/`                submodule pins (known-good SHAs for each leaf)
- `e2e/`                  cross-repo end-to-end Playwright tests
- `docs/`                 architecture, ADRs, runbook, patent status

## The 9 leaf repos

| repo                 | role                                  | tech                         |
| -------------------- | ------------------------------------- | ---------------------------- |
| `aquascape-proto`    | gRPC contract (source of truth)       | Protobuf + buf               |
| `aquascape-infra`    | AWS cloud (CDK)                       | TypeScript CDK               |
| `aquascape-botany`   | aquatic-plant knowledge base          | JSON + JS/TS + Python bindings |
| `aquascape-sim`      | growth simulation (patented)          | Python + grpcio + numpy      |
| `aquascape-api`      | edge API                              | Rust + tonic + DynamoDB      |
| `aquascape-ui`       | shared React primitives               | TS + Tailwind                |
| `aquascape-render`   | 3D aquarium renderer                  | three.js + R3F               |
| `aquascape-web`      | web app                               | Next.js 15 + Connect-ES      |
| `aquascape-mobile`   | mobile app                            | Expo / React Native          |

```
       aquascape-proto  ─────► every consumer (as submodule pin)
               │
        ┌──────┴───────┐
        │              │
   aquascape-sim   aquascape-api ───► aquascape-web / aquascape-mobile
                          │                      │
                          └─────► DynamoDB       └─► aquascape-ui + aquascape-render
                                                                     │
                                                              aquascape-botany
```

## Clone & bootstrap

```bash
git clone --recurse-submodules https://github.com/lixiangdapanji/aquascape-studio.git
cd aquascape-studio
```

If you already cloned without recursing:

```bash
npm run submodules:init
```

Update every submodule to its current remote `main` tip:

```bash
npm run submodules:update
```

Then read [`BOOTSTRAP.md`](./BOOTSTRAP.md) for the one-time AWS / GitHub
/ domain setup.

## Why a glue repo?

The application is a polyrepo, not a monorepo. Each leaf repo:

- has its own `main`, CI, release cadence, and AWS deploy role
- pins the `aquascape-proto` SHA it was built against
- publishes its artifact (container image, npm package, or wheel)
- is owned by one agent in the plugin (`sim-agent`, `render-agent`, …)

The glue repo exists so a human can check out **the exact set of SHAs
that pass E2E together** with a single recursive clone, and so that
product-level concerns (E2E, architecture docs, cross-repo runbook,
patent filing) have a home that isn't tied to any single service.

## Where the patent lives

The provisional patent application — the thing that turns this into an
"invention" — is drafted inside `aquascape-sim/docs/patent/`. That's
where the novel algorithm actually is, and USPTO requires the spec and
claims to match the disclosed reduction to practice.

## License

MIT © 2026 Xiaopu
