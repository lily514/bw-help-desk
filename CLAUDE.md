# Maple Grove AI Front Desk

Take-home prototype. `docs/PLAN.md` is the build spec and the source of truth; follow it, one phase per branch.

## Workflow

- Branch per phase: `feature/<phase>` (names in PLAN.md §6). Never commit to `main`.
- Stop at the end of each phase for review. Don't push, open PRs, or deploy unless asked.
- Small Conventional Commits (`feat(router): …`, `fix(parent): …`, `test(answer): …`).
- Before handing off a branch: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build` all pass.
- Stay in the phase's scope; list extras as follow-ups.

## Commands

- `npm run dev`: Vite + the Worker (via `@cloudflare/vite-plugin`) at one URL, with local D1.
- `npm run db:reset`: apply migrations and re-seed local D1 (`db:migrate`, `db:seed` separately). Seed SQL is built by `worker/lib/seed.ts` from `data/handbook.md` + `worker/lib/seed-data.ts`.
- `npm test`: Vitest, pure logic only (`test/`).
- `npm run deploy`: build + `wrangler deploy` (deferred for now).

## Conventions

- `worker/`: Hono API, mounted under `/api`. Bindings typed in `worker/env.ts`.
- `src/parent`, `src/operator`, `src/shared`: React. Plain CSS using the variables in `src/shared/tokens.css`; no CSS framework.
- Policy facts (hours, prices) come from the knowledge base (`data/handbook.md` → D1), never hard-coded in UI copy. Exceptions: PLAN.md §4.6.
- Secrets in `.dev.vars` locally (see `.dev.vars.example`). One key, `OPENROUTER_API_KEY`, serves both the answer model and Jev. Model and router mode are `[vars]` in `wrangler.toml`.
- Prettier: no semicolons, single quotes, width 100.
