# NovaCEX

A centralized crypto spot exchange built from scratch in TypeScript on Bun. It is a learning and portfolio project: test funds only, no real money.

> **Status: early scaffolding (phase P0).** Only the monorepo skeleton exists so far. Features are added to this README as they are built and tested.

## Planned architecture

```
web ──HTTP──▶ api ──▶ [cmd stream] ──▶ engine ──▶ [events stream] ──┬──▶ persister ──▶ Postgres
 ▲                                                                  └──▶ ws-gateway ──▶ web
 └───────────────────────────── WebSocket ──────────────────────────────────┘
```

| Workspace | Role |
|---|---|
| `apps/api` | REST API, auth, validation; turns requests into engine commands |
| `apps/engine` | Single-threaded deterministic matching engine (balances, order books, fees) |
| `apps/persister` | Writes engine events (orders, fills, ledger, candles) to Postgres |
| `apps/ws-gateway` | WebSocket fan-out of market data and private user updates |
| `apps/web` | React trading UI |
| `packages/shared` | Types, exact bigint number math, market config, schemas |
| `packages/db` | Prisma schema and client |

## Tech stack

Bun · TypeScript (strict) · Bun workspaces + Turborepo · Redis Streams · PostgreSQL + Prisma · React

## Getting started

Requires [Bun](https://bun.sh) 1.3+.

```sh
bun install
bun run typecheck   # typecheck every workspace (via Turborepo)
bun run test        # run every workspace's tests (via Turborepo)
```

## License

MIT
