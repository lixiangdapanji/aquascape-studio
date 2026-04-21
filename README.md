# aquascape-studio

A planted-aquarium platform: design a tank in 3D, simulate the plants growing under your light + CO₂ + dosing, share scapes.

> **First time here?** Read [`BOOTSTRAP.md`](./BOOTSTRAP.md) — it walks you through creating the GitHub repo, AWS bootstrap, GoDaddy → Route53 delegation, and the first deploy.

## Stack

- **Web**: Next.js 15 (App Router, RSC) + Tailwind
- **Mobile**: Expo / React Native 0.76 + NativeWind
- **3D**: Three.js + React Three Fiber
- **Sim**: TypeScript, Web Worker on browser, Node CLI for batch
- **Infra**: AWS CDK v2 (TypeScript), us-east-1
- **CI/CD**: GitHub Actions + OIDC (no long-lived AWS keys)
- **Monorepo**: pnpm workspaces + Turborepo

## Layout

```
aquascape-studio/
├── apps/
│   ├── web/              # Next.js 15      (app-agent owns)
│   └── mobile/           # Expo SDK 52     (app-agent owns)
├── packages/
│   ├── ui/               # shared RN+RSC   (app-agent owns)
│   ├── render/           # Three.js + R3F  (render-agent owns)
│   ├── sim/              # growth algo     (sim-agent owns)
│   └── data/             # plants.json     (botany-agent owns)
├── infra/                # AWS CDK         (infra-agent owns)
├── docs/
│   ├── patent/           # provisional patent (sim-agent + patent-drafting skill)
│   ├── plants/           # citations + photos
│   └── agent-log.md      # cross-agent activity
└── .github/workflows/    # CI/CD            (infra-agent owns)
```

## Quick commands

```bash
pnpm install
pnpm dev          # all apps in parallel
pnpm typecheck
pnpm test
pnpm --filter web build
pnpm --filter infra cdk deploy --context env=dev
```

## Contributing

Each subdirectory under `apps/` and `packages/` is owned by exactly one agent. The orchestrator (any Claude session with the `aquascape-studio` plugin installed) reviews PRs and owns shared schemas. See `agents/` in the plugin and `skills/aquascape-workflow` for delegation rules.

## License

MIT © 2026 Xiaopu
