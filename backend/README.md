# Backend

The Cloudflare Worker: a Hono API under `/api`. The React app is served as static assets and never reaches this code.

## Layers

```
routes/  →  services/  →  ai/  db/  →  domain/
```

Each folder imports only from folders to its right. API types (the models) live in `../shared/types.ts` because the frontend uses them too.

| Folder      | Role                                                                                                      | Rules                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `routes/`   | Controllers. One Hono sub-app per API area, mounted in `index.ts`.                                        | Parse and validate the request, call one service function, return JSON. No SQL, no business rules.                                        |
| `services/` | Business logic, one file per feature.                                                                     | Coordinates `db/`, `ai/` and `domain/`. Throws `NotFoundError` for a missing record. `index.ts` turns it into a 404.                      |
| `ai/`       | Calls to models through OpenRouter.                                                                       | `router.ts` is the only file that knows about Jev.                                                                                        |
| `db/`       | Repositories over D1, one file per table. `rows.ts` holds row types and mappers.                          | The only code that runs SQL (`.prepare`). Returns API types, not raw rows, except where a service needs a column the API type leaves out. |
| `domain/`   | Pure rules: routing decision, roles, citation parsing, entry suggestion, handbook parsing, insights math. | No I/O, no imports from other layers. This is what `test/` covers.                                                                        |
| `seed/`     | Builds seed SQL from `data/handbook.md` and the synthetic history.                                        | Used by `scripts/seed.ts` and the test-mode reset.                                                                                        |

Also here: `env.ts` (bindings and vars), `migrations/` (D1 schema), `scripts/` (Node scripts you run by hand: `db:seed`, `check:routes`) and `test/` (Vitest).

## Where to find things

| To change…                                | Look in                                                         |
| ----------------------------------------- | --------------------------------------------------------------- |
| An endpoint's path, input or status codes | `routes/<area>.ts`                                              |
| What happens to a parent's message        | `services/chat.ts`                                              |
| Routing thresholds                        | `domain/decide.ts` (`THRESHOLDS`)                               |
| The routing questions or the Jev call     | `ai/router.ts`                                                  |
| The answer prompt                         | `ai/answer.ts`                                                  |
| Reply, forward, seen, "Save as answer"    | `services/requests.ts`, `services/knowledge.ts`                 |
| A query, or a new column                  | `db/<table>.ts`, `db/rows.ts`, then a new file in `migrations/` |
| Test-mode grading and reset               | `services/testMode.ts`, `../shared/testScenarios.ts`            |

## A message, end to end

`POST /api/chat` (`routes/chat.ts`) checks the rate limit and validates the body, then calls `services/chat.ts`:

1. `saveQuestion` saves the parent's message (`db/messages.ts`).
2. `answerQuestion` runs inside the SSE stream:
   1. Scores the question (`ai/router.ts`).
   2. Picks a route (`domain/decide.ts`) and saves the request (`db/requests.ts`).
   3. Sends a `route` event.
   4. For AI answers and Looped in, streams the answer (`ai/answer.ts` with `domain/citations.ts`) as `delta` events.
   5. Saves the AI message and sends `done`.

Any failure becomes a hand-off.
