# Maple Grove AI Front Desk

A prototype AI front desk for a fictional daycare, Maple Grove Early Learning Center. It has two views on one backend:

- **Parent help desk** (`/parent`, built for a phone): parents ask questions in a chat. The AI answers from the center's own policies, cites them, and hands anything sensitive to a person.
- **Operator control center** (`/operator`, built for a laptop, works on a phone): Dana, the Director, sees what the AI couldn't handle, forwards or replies, and can save a reply as a new answer so the AI handles the question next time.

Live URL: https://maple-grove-front-desk.lily514.workers.dev

The demo shows three things:

1. **Answers are trustworthy.** Every AI answer cites the policy entries it used, and the parent can open the full text.
2. **Sensitive questions reach a person.** Each message gets one of four routes: AI answers, Looped in, Handed off or Urgent. The parent always sees what happened and what comes next.
3. **It gets better.** A reply saved as an answer is used for the next matching question.

## Architecture

```
Parent phone ─┐                          ┌─ Jev (via OpenRouter) → routing scores
              ├─ Cloudflare Worker ──────┤
Operator ─────┘   Hono API under /api    ├─ OpenRouter chat      → streamed answer + citations
laptop            + static React app     └─ D1 (SQLite)          → parents, messages, inquiries, KB
```

- **One Worker, one URL.** The Worker serves the built React app as static assets and the API under `/api/*`.
- **Chat pipeline** (`POST /api/chat`, Server-Sent Events):
  1. Save the message.
  2. Score it with the router (`backend/ai/router.ts`). Jev answers six questions: topic, urgent, sensitive, child's health today, needs staff action, answerable from the KB. If Jev fails, a chat model answers the same questions as JSON.
  3. Pick a route with `backend/domain/decide.ts`, a pure function covered by unit tests.
  4. Stream the answer from OpenRouter with a final `[[cite: …]]` line. The server holds the marker back, checks each id against the KB and sends the citations with the saved message.
  5. Any error or timeout falls back to Handed off with a polite message. The parent never sees a raw error.
- **No retrieval.** The whole knowledge base (about 3k tokens) goes into every answer prompt, first, so the provider's prefix caching can reuse it.
- **Knowledge base:** `data/handbook.md` is parsed into D1 at seed time (`backend/seed/seed.ts`). The operator edits entries in the Knowledge view. Policy facts are never hard-coded in the UI.
- **Live updates by polling.** The parent thread and the operator inbox poll every 2 seconds.
- **Test mode runs in the browser.** The operator UI plays an automated parent and operator through the normal API, so the Worker runs no background jobs.

Code lives in `backend/` (Worker, layered as described in `backend/README.md`), `frontend/` (React, plain CSS on the tokens in `frontend/src/shared/tokens.css`) and `shared/` (API types). `docs/PLAN.md` is the full spec; `docs/journal.md` has decision notes.

## Local setup

Requires Node 22+ and an [OpenRouter](https://openrouter.ai) API key.

```sh
npm install
cp .dev.vars.example .dev.vars   # add your OPENROUTER_API_KEY
npm run db:reset                 # create local D1 tables, seed the KB and a week of history
npm run dev                      # landing at /, parent at /parent, operator at /operator, API at /api
```

To try the view on a real phone, run `npm run dev -- --host` and open the printed network URL.

Models and router are `[vars]` in `wrangler.toml`: `CHAT_COMPLETION_MODEL`, `ROUTER_MODEL`, and `ROUTER` (`jev`, or `llm` to force the fallback router).

Checks: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.

## Deploy

One time, to create the database and the secret:

```sh
npx wrangler login
npx wrangler d1 create maple-grove                       # copy database_id into wrangler.toml
npx wrangler d1 migrations apply maple-grove --remote
npm run db:seed -- --remote
npx wrangler secret put OPENROUTER_API_KEY
```

Then for each release:

```sh
npm run deploy    # builds the app, then deploys with the generated dist/ config
```

Use `npm run deploy`, not plain `wrangler deploy`: the plain command skips the frontend build.

## 60-second demo

Open `/operator` on a laptop and `/parent` on a phone, or in a narrow browser window. On the phone, tap **Continue as Sam Rivera**.

1. **Trustworthy answer (10s).** Ask _"Are you closed the Friday after Thanksgiving?"_ The answer streams in with a **Holiday Closures** chip. Tap the chip to open the full policy.
2. **Looped in (15s).** Ask _"Maya has a 100.6 fever this morning. Can she come in?"_ Sam gets the illness policy plus a "Shared with the front desk" card. The question slides into the laptop inbox. Open it there, and the phone's tracker moves to **Seen**. Type a reply, and it appears on the phone as a message from Dana.
3. **Urgent (10s).** Ask _"Stuck on I-65 and won't make 6:00 pickup."_ The phone shows an orange call banner, and the item is pinned to the top of the inbox.
4. **It learns (25s).** On the laptop, turn on **Test mode** and press **Run**. Fifteen scripted questions go out about 4 seconds apart, and an automated Dana replies to the ones that need her. On #3 ("Can my mom pick Maya up on Friday?") she saves her reply to the pickup policy, so #15 ("…next Friday too?") is answered by the AI. Open **See results** for the scorecard, then press **Reset** to restore a clean state.

**Insights** shows the past week's real (non-test) traffic, including the questions the knowledge base couldn't answer, each with an **Add answer** button.

## Known simplifications

- **Polling, not push.** Updates across devices use 2-second polling. Pushing live events across devices on Workers needs Durable Objects, which wasn't worth it for a demo. Insights loads once per visit.
- **No retrieval.** The whole knowledge base goes into every prompt. That's fine at about 3k tokens but not for a long handbook.
- **Fake sign-in.** No real auth. The parent picks Sam or creates a demo parent, and the operator view is open to anyone with the URL. A per-IP rate limit on `/api/chat` caps cost.
- **One operator.** Everything goes to Dana. "Forward" updates status and the parent's card but notifies no one.
- **Fixed thresholds.** Routing thresholds are constants in `decide.ts`, tuned against the test script.
- **Hard-coded test script.** The 15 scenarios live in `shared/testScenarios.ts`, and the UI can't add new ones.

## Next steps

- Adjustable routing thresholds in the operator UI.
- Multiple staff accounts, with forwarding that notifies the person it goes to.
- Retrieval (embeddings or keyword search) for long handbooks.
- Real authentication for parents and staff.
- Voice input for parents.
