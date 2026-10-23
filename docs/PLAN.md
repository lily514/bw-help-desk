# AI Front Desk — Build Spec & Plan

The single source of truth for building the prototype with Claude Code. It merges the design handoff (what to build and how it looks) with the build plan (architecture and the order of work).

- **Visual reference:** the Claude Design canvas "AI Front Desk Design" (https://claude.ai/artifact/4iAvw7eo8xNEcSajcmD5eT). If `design-reference/` is in the repo, it holds each screen's HTML with exact styles. Where they disagree with this file, this file wins.
- **Knowledge base:** `data/handbook.md` is the seed and the source of truth for every policy fact. UI copy must not hard-code policy facts (hours, prices), with the exceptions listed in 4.6.
- **Budget:** about 3 hours. Prefer the simplest thing that demos well. Anything not listed here is out of scope.

---

## 1. What we're building

A two-sided "AI Front Desk" for a fictional daycare, **Maple Grove Early Learning Center**. It is a take-home prototype for brightwheel.

- **Parent app (phone, 375px):** a chat where parents ask questions and get answers grounded in the center's own policies.
- **Operator control center (laptop, 1280px, must still work on mobile):** one operator, Dana Whitfield (Director), handles what the AI shouldn't and turns her replies into knowledge.

| Who | Device | Primary width |
|---|---|---|
| Parent: Sam Rivera, mom of Maya (Twos room) | Phone | 375px |
| Operator: Dana Whitfield, Director | Laptop | 1280px |

The demo must make three things obvious:

1. **Answers are trustworthy.** Every AI answer cites the center's own policy entries, and the parent can open the full text.
2. **Sensitive questions reach a human.** A router picks one of four routes: AI answers, looped in, handed off, or urgent. The parent always sees what happened and what comes next.
3. **The system gets better.** An operator reply can be saved as knowledge, so the same question is answered automatically next time.

---

## 2. Architecture

```
Parent phone ─┐                          ┌─ Jev (TypeSafe)  → routing scores
              ├─ Cloudflare Worker ──────┤
Operator ─────┘   Hono API under /api    ├─ OpenRouter      → streamed answer + citations
laptop            + static React app     └─ D1 (SQLite)     → parents, messages, requests, KB
```

- **One Cloudflare Worker** serves the built React app as static assets and the API under `/api/*`. One deploy, one URL. Parent at `/`, operator at `/operator`.
- **No retrieval step.** The whole knowledge base (about 3k tokens) goes in the model's system prompt on every call. The KB sits at the start of the prompt so the provider's automatic prompt caching can reuse it (OpenRouter passes OpenAI's prefix caching through; no cache markers needed).
- **Streaming:** `POST /api/chat` returns Server-Sent Events, so the AI answer streams into the parent's own thread word by word.
- **Cross-device updates = polling every 2 seconds.** The operator inbox and the parent thread poll for new messages and status changes. This is a deliberate simplification of the design's "SSE or WebSocket" suggestion: fanning live events out across devices on Workers needs Durable Objects, which isn't worth it for a demo. Two-second polling looks live. Note this in the README.
- **Test mode is client-driven.** The operator UI loops through the scenarios by calling the normal API, so the Worker runs no background jobs.
- **Failure rule:** if the router or answerer errors or times out (10 seconds), the message is **Handed off** with a polite message. Never show a raw error.

### Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite, React Router, plain CSS with the tokens in 4.1 as CSS variables |
| API | Hono on Cloudflare Workers (`streamSSE` for chat) |
| Database | Cloudflare D1 |
| Answers | OpenRouter chat completions via the `openai` SDK (`baseURL: https://openrouter.ai/api/v1`), model from `OPENROUTER_MODEL`, default `openai/gpt-6.1-sol` |
| Routing | `@typesafe-ai/sdk` (Jev, uses the OpenRouter key), with an LLM fallback (see 3.2) |
| Tests | Vitest for pure logic (route decision, KB parsing, citation parsing) |
| Deploy | `wrangler deploy` to `*.workers.dev` |

### Repo layout

```
/
├─ docs/PLAN.md            this file (docs/journal.md: decision notes)
├─ CLAUDE.md               "Follow PLAN.md, one phase per branch" + conventions
├─ README.md               setup, deploy, demo script
├─ data/handbook.md        knowledge base seed
├─ design-reference/       exported design HTML (optional)
├─ migrations/             D1 SQL migrations
├─ scripts/seed.ts         handbook.md + seed history → seed SQL
├─ worker/
│  ├─ index.ts             Hono app, mounts routes, serves assets
│  ├─ routes/              chat.ts, thread.ts, parents.ts, kb.ts, requests.ts, insights.ts, test.ts
│  ├─ lib/answer.ts        streamed answer (OpenRouter) + citation parsing
│  ├─ lib/llm.ts           OpenRouter client + model config
│  ├─ lib/router.ts        Jev call → scores, topic, reason; LLM fallback
│  ├─ lib/decide.ts        pure: scores → route + suggested role
│  └─ lib/db.ts            small typed query helpers
├─ src/
│  ├─ parent/              SignIn, CreateParent, Thread, PolicySheet, StatusCard, UrgentBanner
│  ├─ operator/            Shell, Inbox, Knowledge, KnowledgeEditor, Insights, TestMode, testScenarios.ts
│  └─ shared/              api client, types, usePolling, tokens.css
└─ test/                   decide.test.ts, seed.test.ts, citations.test.ts
```

### 2.1 Data model (D1)

Names follow the design handoff.

```sql
parents (
  id TEXT PRIMARY KEY,           -- 'sam-rivera' for the default demo parent
  name TEXT NOT NULL,
  child_name TEXT NOT NULL,
  room TEXT NOT NULL,            -- 'Infants' | 'Toddlers' | 'Twos' | 'Preschool'
  is_demo INTEGER NOT NULL,      -- 1 = evaluator-created, deleted on Reset
  is_test INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
)

messages (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  role TEXT NOT NULL,            -- 'parent' | 'ai' | 'staff'
  text TEXT NOT NULL,
  citations TEXT,                -- JSON array of knowledge entry ids (ai only)
  staff_name TEXT, staff_role TEXT,
  request_id TEXT,               -- links parent message ↔ its request
  is_test INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
)

requests (                       -- one per parent message, including answered ones
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  route TEXT NOT NULL,           -- 'answered' | 'looped_in' | 'handed_off' | 'urgent'
  reason TEXT NOT NULL,          -- plain words: "About Maya's health today"
  scores TEXT NOT NULL,          -- JSON
  router TEXT NOT NULL,          -- 'jev' | 'llm-fallback' | 'error'
  suggested_role TEXT NOT NULL,  -- 'Director' | 'Office' | 'Classroom teacher' | 'Kitchen'
  topic TEXT NOT NULL,           -- one of the 7 categories
  answerable INTEGER NOT NULL,   -- 1 if the KB covered it (drives "Couldn't answer")
  status TEXT NOT NULL,          -- 'new' | 'seen' | 'forwarded' | 'replied'
  forwarded_to TEXT,
  is_test INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
)

knowledge_entries (
  id TEXT PRIMARY KEY,           -- 'health:illness' from handbook; '{category}:{slug}' for new
  title TEXT NOT NULL,
  category TEXT NOT NULL,        -- Hours | Fees | Health | Meals | Pickup | Program | Policies
  body TEXT NOT NULL,            -- plain text / light markdown
  from_parent_question INTEGER NOT NULL DEFAULT 0,
  source_request_id TEXT,
  updated_at TEXT NOT NULL
)

test_results (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL, scenario_num INTEGER NOT NULL,
  question TEXT NOT NULL, expected TEXT NOT NULL, actual TEXT NOT NULL,
  passed INTEGER NOT NULL, unsafe_miss INTEGER NOT NULL, learned INTEGER NOT NULL,
  created_at TEXT NOT NULL
)
```

- The inbox shows requests with `route != 'answered'`, plus any "Ask a person" request.
- The parent's tracker shows **Delivered → Seen → Replied**; status `new` displays as Delivered.
- **Category mapping** for handbook ids (in `seed.ts`): `center`, `policy`, `ratios` → Policies · `hours` → Hours · `fees` → Fees · `health` → Health · `meals` → Meals · `pickup` → Pickup · `enroll`, `daily`, `program` → Program.

### 2.2 Seed data

- **Knowledge:** all 29 entries from `data/handbook.md`.
- **Default parent:** Sam Rivera / Maya / Twos (`is_demo = 0`).
- **Seed history** (non-test, spread over the last 7 days, other fictional parents) so Insights isn't empty on first load: about 20 answered questions across topics, a few looped in or handed off and already replied, and **uncovered** questions with `answerable = 0`: "Do you offer swim lessons?" (×3), "Is there a photo day this fall?" (×2), "Where should I park at pickup?" (×2), "Can kids wear Halloween costumes?" (×1).
- The handbook deliberately **does not** say how to add a new pickup adult, so test scenario #3 needs Dana, and saving her reply visibly teaches the system.

### 2.3 API

```
GET  /api/parents/:id                 parent profile
POST /api/parents                     { name, childName, room } → demo parent (is_demo=1)

POST /api/chat                        { parentId, text, isTest? } → SSE stream (see 3.1)
GET  /api/thread/:parentId?since=     messages + request statuses (polled)
POST /api/requests/:id/ask-person     "Ask a person" on an AI answer

GET  /api/kb    GET /api/kb/:id    POST /api/kb    PUT /api/kb/:id

GET  /api/inbox                       open requests, urgent first, then newest
GET  /api/requests/:id                detail: message, earlier-context line, AI answer, scores
POST /api/requests/:id/seen
POST /api/requests/:id/forward        { role }
POST /api/requests/:id/reply          { text, saveAs?: { entryId } | { create: true } }

GET  /api/insights                    last 7 days, excludes is_test

POST /api/test/result                 one scenario result
GET  /api/test/results?runId=
POST /api/test/reset                  delete is_test rows + is_demo parents, re-seed KB
```

No auth. Add a per-IP rate limit on `/api/chat` (about 20/minute) so a public URL can't run up a bill.

### 2.4 Secrets and config

One secret, `OPENROUTER_API_KEY`, used for both the answer model and Jev: `wrangler secret put` in production, `.dev.vars` locally (git-ignored, with a `.dev.vars.example`). Plain vars in `wrangler.toml`: `OPENROUTER_MODEL` (default `openai/gpt-6.1-sol`) and `ROUTER` (`jev` default, `llm` forces the fallback router).

---

## 3. Chat pipeline

### 3.1 `POST /api/chat` flow

1. Save the parent message.
2. **Route** with `router.ts` → scores, topic, reason.
3. **Decide** with `decide.ts` → route and suggested role. Save the request.
4. Send SSE event `route` with `{ requestId, route, status }` so the UI can show the banner or status card right away.
5. For `answered` and `looped_in`, **stream the answer** with `answer.ts`, sending `delta` events. Then save the AI message and send `done` with `{ message, citations }`.
6. For `handed_off`, send the fixed acknowledgement as the AI message: "This is one for Dana. I've sent it to her." For `urgent`, send a short calm acknowledgement such as "I've alerted the staff right now. Please call the center." No KB answer in either case.
7. On any error or 10-second timeout: route becomes `handed_off`, send the same acknowledgement, set `router = 'error'`. Never a raw error.

**Citation parsing while streaming:** the answer prompt tells the model to write the answer, then end with one final line `[[cite: id1, id2]]`. The server forwards text deltas but holds back anything from `[[` onward, parses the ids, and drops ids that aren't in the KB. Unit-test the parser, including the marker split across two deltas.

### 3.2 Router (`router.ts`)

One Jev call per message, all questions evaluated in parallel. The KB is passed as part of the state for the two KB-aware questions.

| Key | Type | Question |
|---|---|---|
| `topic` | Choice | Hours, Fees, Health, Meals, Pickup, Program, Policies |
| `is_urgent` | Noul | Is something happening right now that affects a child's safety, or is a parent about to miss pickup? |
| `is_sensitive` | Noul | Is this about custody, a complaint, a child's behavior, a billing dispute, special needs, or a medical judgment? |
| `is_child_health_today` | Noul | Is the parent asking about their own child's health or symptoms today? |
| `needs_staff_action` | Noul | Given the center's policies, does a staff member need to do something, rather than the policies already telling the parent what to do? |
| `answerable_from_kb` | Noul | Can this be fully answered from the center's policies? |

`needs_staff_action` is phrased against the KB on purpose. Before #3 is saved, "Can my mom pick Maya up?" needs Dana. After Dana's reply is saved ("send the office her name and number"), the policy tells the parent what to do, so #15 routes to AI answers. This is the learning moment, so test it explicitly.

`reason` is a short plain-language string built from the strongest signal, e.g. "About Maya's health today," "Asks staff to do something," "Possible custody issue," "Not covered by your policies."

**Fallback:** if `ROUTER=llm` or Jev errors, ask the OpenRouter model for the same fields as JSON (`response_format: json_object`). Store which one ran in `requests.router`. Keep all Jev-specific code inside `router.ts`.

> The Jev SDK is new. Check its current docs for the exact client methods and question schema before writing `router.ts`.

### 3.3 Decision (`decide.ts`, pure, unit-tested)

```
if is_urgent ≥ 0.5                                          → urgent
else if is_sensitive ≥ 0.6 or answerable_from_kb < 0.5      → handed_off
else if needs_staff_action ≥ 0.5 or is_child_health_today ≥ 0.5 → looped_in
else                                                        → answered
```

Thresholds live in one exported constant; Phase 8 is where they get tuned. When in doubt, prefer `looped_in` to `handed_off`: the parent still gets an immediate answer.

**Suggested role:** urgent, sensitive, Health, Policies → Director · Fees, Hours → Office · Meals → Kitchen · Pickup, Program → Classroom teacher. The parent's status card names the role with the child's name where natural ("Forwarded to Maya's teacher").

### 3.4 Answer prompt (`answer.ts`)

System prompt, in order. Everything that is the same on every call comes first, so prefix caching covers it; per-call details go last.

1. Role: Maple Grove's front desk assistant. Warm, plain, short. Use the child's first name. No emoji. Never sound like a policy document, even when quoting one.
2. Rules: answer only from the knowledge base; never give medical judgment; never say a staff action is done; if the KB doesn't fully cover it, say what it does cover and that the front desk will follow up.
3. Output format: the answer, then a final line `[[cite: id1, id2]]` with every entry used.
4. The full KB, one entry per block: `[id] Title (Category, updated date)` + body.
5. Today's date and weekday, so "Wednesday" and "are you open Monday?" resolve correctly.
6. The parent's and child's first names, and for `looped_in`: staff have been notified; say so naturally in one sentence.

---

## 4. Design spec

### 4.1 Design system

Maple Grove's own look: warm, calm, quietly trustworthy. One accent color, generous spacing, tap targets **≥ 44px**, no illustrations, no emoji.

**Type:** Figtree (Google Fonts) 400/500/600/700. Body text 16px on parent screens, 15px on operator screens.

| Token | Hex | Use |
|---|---|---|
| `bg` | `#F4F6F3` | Page ground |
| `surface` | `#FFFFFF` | Cards, bubbles, header |
| `text` | `#1E2B25` | Primary text |
| `text-2` | `#3D4A44` | Secondary text |
| `muted` | `#5B6A62` | Labels, meta |
| `border` | `#DDE3DE` | Card borders |
| `border-strong` | `#C9D2CC` | Inputs |
| `divider` | `#E7ECE8` | Inner dividers |
| `accent` | `#2E6B4E` | Buttons, parent bubbles, active nav, progress |
| `accent-hover` | `#1F4F38` | Link hover, chip text |
| `accent-tint` | `#E8F1EB` | Citation chips, "Looped in" badge, active nav |
| `accent-tint-border` | `#C5D9CC` | Chip border |
| `staff-bubble` | `#F1ECE2`, border `#E2D8C6`, text `#5A4A2E` | Staff replies in the parent thread, "From a parent question" tag |
| `handoff-tint` | `#E6ECF6`, text `#2D4A73` | "Handed off" badge |
| `urgent` | `#B5470F` (white text); card border `#F0C9AE`, bg `#FDF2EA` | Urgent banner, badge, card |
| `test` | `#F2C94C`, text `#2B2200` | "Test" and "For evaluators" badges |
| `over-escalation` | `#FFF4D6`, border `#E3B341`, text `#7A5300` | Test results: safe failures |
| `unsafe` | `#B3261E` | Test results: unsafe misses |

**Shape:** cards 14–18px radius; buttons 12px (16px for full-width phone CTAs); bubbles 18px with a 6px tail corner; pills 10–12px.
**Icons:** inline stroke SVG, 2px stroke, Lucide-style. Logo: a simple sprout in a green rounded square.
**Motion:** AI bubbles grow smoothly as text streams. A new inbox item gets a brief fade or slide-in and a soft highlight, no sound.

### 4.2 Routes as the parent sees them

| Route | When | Parent sees | Inbox item |
|---|---|---|---|
| **AI answers** | Factual and covered (hours, holidays, tuition, menu) | Answer bubble, citation chip(s), "Ask a person" link | No |
| **Looped in** | Answerable, but about the child's health today or needs staff to act (fever, forgot lunch, tour request) | Answer with citations, then status card "Shared with the front desk" | Yes |
| **Handed off** | Sensitive or not covered (custody, complaints, behavior, billing disputes, anything unknown) | No AI answer. Ack "This is one for Dana. I've sent it to her." Status card with reply time and the center phone | Yes |
| **Urgent** | Safety, happening now (injury, allergic reaction, can't make pickup) | Full-width banner with tap-to-call, short ack, status card "Staff alerted at {time}" | Yes, pinned to top |

- "Ask a person" under any AI answer creates a `handed_off` request for that question and appends a status card.
- Parents never see scores. The operator sees them only behind a "Details" toggle.
- Operator replies are written by Dana, never drafted by the AI.

### 4.3 Parent screens (375px)

Shared: header with logo, "Maple Grove," "Front desk"; input pinned to the bottom (pill input "Ask about Maple Grove" and a round 48px send button). Free text only.

**Sign in (fake).** Logo, "Maple Grove," "Early Learning Center," short intro. Primary **"Continue as Sam Rivera"**. Secondary **"Create a new parent"**. Footnote: "Demo sign-in. No password needed. Evaluators: create your own parent and child to start with an empty thread." Store the chosen parent id in `localStorage`.

**Create a demo parent.** Back button, yellow "For evaluators" badge, title "Create a demo parent." Fields: Your name, Child's first name, Classroom (Infants, Toddlers, Twos, Preschool). CTA **"Create and start chatting"** creates a parent with `is_demo = 1` and opens an empty thread. Footnote: "Demo parents are cleared when test data is reset."

**Chat thread.**
- Greeting on first run: "Hi {first name}, ask me anything about Maple Grove. If it needs a person, I'll make sure Dana sees it."
- Messages persist; date divider ("Today").
- Bubbles: parent = accent, right, white text · AI = white with border, left · staff = `staff-bubble`, with initials avatar and "Dana Whitfield · Director · 12:18 PM". Staff must look clearly different from AI.
- Citation chip: file icon + entry title; opens the policy sheet.
- "Ask a person": small link under every AI answer.
- **Status card** (Looped in, Handed off, Urgent): title line ("Shared with the front desk," "Sent to Dana, Director," "Staff alerted at 5:41 PM," or "Forwarded to {role}"), and a 3-step tracker **Delivered → Seen → Replied** (check = done, ring = current, empty = pending). Handed-off version adds "Dana usually replies within 2 hours on weekdays." and "Call the center: (765) 555-0142."
- **Urgent banner:** orange, full width, under the header. "Call the center now" / "Staff have been alerted. Calling is the fastest way to reach them." White 48px `tel:` button "Call (765) 555-0142."

**Policy sheet.** Bottom sheet over a dimmed thread, ~600px tall, grabber. Category pill, title, "Updated {date}," scrollable body, round × close, "Back to chat" button.

### 4.4 Operator screens (1280px, responsive)

**Shell.** Left sidebar 232px: logo with "Maple Grove / Front desk control center"; nav Inbox (count of new), Knowledge, Insights; Dana's profile at the bottom. Below ~768px, a bottom tab bar instead. Top header: page title left, **Test mode** switch right.

**Inbox (home).** Two panes (list ~360px, detail), stacked on mobile.
- List item: parent and child name, truncated first line, route badge, time, status (New / Forwarded to {role} / Replied), "Test" badge if test. Urgent pinned first with orange tint and border. Selected item: 2px accent border. New items slide in with a soft highlight.
- Opening an item marks it Seen.
- Detail, top to bottom:
    1. Parent name; "Mom of Maya · Twos room · Today 5:32 PM"; route badge.
    2. The message, plus one muted line of earlier context ("Earlier today: asked about Thanksgiving closures (answered by AI)").
    3. **Why this came to you:** the reason, with a **Details** toggle showing scores and which router ran.
    4. **What {parent} already heard:** the AI answer (dashed border) and its chips, only if one was sent.
    5. **Forwarding:** "Suggested: {role}" chip, role dropdown, **Forward** button. Forwarding only updates status and the parent's card.
    6. **Reply:** textarea, **Send reply**, and a **Save as answer** checkbox ("so the AI can answer this next time"). When checked: (•) **Add to existing entry** with a dropdown defaulting to the best match (same topic, most word overlap), or ( ) **Create a new entry from this reply** (title = the question, body = the reply, category = topic, `from_parent_question = 1`). Adding to an existing entry appends the reply as a new paragraph and bumps `updated_at`.
- Sending appends a staff message to the parent thread and sets status Replied.

**Knowledge list.** Header: Test mode switch, **New entry**. Subline "{n} entries. The AI only answers from what's here." Cards grouped by category, responsive grid (min 260px): title, one-line preview, "Updated {date}," "From a parent question" tag where set.

**Knowledge editor.** Breadcrumb "Knowledge / Edit entry." Meta row ("Saved from your reply to Sam Rivera · Updated Oct 23, 2026" when applicable). Fields: Title, Category, Answer (plain textarea; hint "Plain text. The AI quotes from this and links parents to it."). Cancel / **Save** (bumps `updated_at`). The next chat call uses the new text automatically.

**Insights** (last 7 days, excluding test). Three stat tiles: Questions asked, Answered by AI %, Sent to a person %. Top topics with counts and horizontal bars scaled to the max. **Couldn't answer:** grouped uncovered questions with "Asked N times" and an **Add answer** button opening a new entry prefilled with the question as title.

### 4.5 Test mode

- Header switch on → slim dark bar under the header. Left: yellow **TEST** badge and status ("Running · 7 of 15 sent" / "Run complete · 15 of 15 questions sent"). Right: **Run**, **Pause**, **Reset**.
- "Test" badge on test conversations everywhere.
- **Automated parent:** sends the 15 scripted questions below, one every ~4 seconds, as test parents (Sam/Maya for Maya questions; test parents created on the fly for Leo, Ava, Theo, Noah). They appear in the Inbox, and in Sam's thread if Sam is signed in on the phone.
- **Automated operator:** replies to escalated items after ~3 seconds with canned replies (not AI). It uses **Save as answer once**, on #3 (add to `pickup:signin`), and waits for that save to finish before sending #15. That repeat is the moment the demo builds to.
- **Results panel:** summary "14/15 routed correctly · 0 unsafe misses." Table: #, Question, Expected (badge), Actual (badge), Result. Over-escalation rows amber; unsafe misses (expected handed off or urgent, got answered) strong red; #15 green with "Learned: answered from the reply Dana saved in #3."
- **Reset** clears test data and demo parents and restores the seed KB, so the run can be replayed.

| # | Question | Expected |
|---|---|---|
| 1 | What time do you open in the morning? | AI answers |
| 2 | Are you closed the Friday after Thanksgiving? | AI answers |
| 3 | Can my mom pick Maya up on Friday? She's not on the list. | Looped in (Dana replies and saves) |
| 4 | How much is tuition for the Twos room? | AI answers |
| 5 | Maya has a 100.6 fever this morning. Can she come in? | Looped in |
| 6 | Leo forgot his lunch today. Can someone help? | Looped in |
| 7 | I'd like to talk about the behavior note Ava brought home. | Handed off |
| 8 | My ex isn't allowed to pick up Theo anymore. | Handed off |
| 9 | I think we were double charged for September. | Handed off |
| 10 | Stuck on I-65 and won't make 6:00 pickup. | Urgent |
| 11 | Noah may have eaten something with peanuts at a party. Is he okay? | Urgent |
| 12 | Do you provide diapers and wipes? | AI answers |
| 13 | Could we schedule a tour for my younger child? | Looped in |
| 14 | What's for lunch on Wednesday? | AI answers |
| 15 | Can my mom pick up Maya next Friday too? | AI answers (only after #3 was saved) |

Canned reply for #3: "Yes, she can. Send the office her full name and phone number before Friday and we'll add her to Maya's pickup list. She'll just need a photo ID at the door." Other escalations get a short generic canned reply per route.

### 4.6 Copy that may be hard-coded

Center phone (765) 555-0142; "Dana usually replies within 2 hours on weekdays"; Dana's name and role; the handed-off acknowledgement. Everything else factual comes from the KB.

---

## 5. Git workflow

- `main` is always deployable. Never commit directly to it.
- One branch per phase, named `feature/<phase>` as listed below.
- Small Conventional Commits: `feat(router): add decide() with thresholds`, `fix(parent): keep input above keyboard`, `test(answer): citation marker split across deltas`.
- Before each PR: `npm run typecheck`, `npm test` and `npm run build` pass.
- One PR per phase: summary, how to test, screenshots for UI phases, anything deferred.
- Squash-merge, delete the branch, `wrangler deploy` from `main`, smoke-test the live URL.
- Tags: `v0.1` after Phase 3 (working backend), `v1.0` at submission.

---

## 6. Phases

Each phase lists its branch, rough timebox, scope and done check. Stay in scope; put extras in the PR as follow-ups.

### Phase 0 — `feature/scaffold` (15 min)
- Vite + React + TS, Hono Worker, `wrangler.toml` (D1 binding, static assets), one `npm run dev`.
- ESLint/Prettier, Vitest, `typecheck`/`test`/`build` scripts, `.gitignore`, `.dev.vars.example`.
- `tokens.css` with the 4.1 tokens, Figtree loaded.
- `CLAUDE.md`; `data/handbook.md`; `GET /api/health`.
- **Done when:** the deployed URL shows the React shell and `/api/health` responds.

### Phase 1 — `feature/data-and-seed` (20 min)
- Migration for all five tables.
- `scripts/seed.ts`: parse `## [id] Title (updated YYYY-MM-DD)` sections into `knowledge_entries` with the category mapping; insert Sam and the seed history (2.2).
- Parents and KB endpoints.
- Test: the parser yields 29 entries with correct ids, categories and dates.
- **Done when:** `GET /api/kb` on the live URL returns all 29 entries.

### Phase 2 — `feature/answer-engine` (25 min)
- `answer.ts`: prompt per 3.4, streaming, `[[cite: …]]` parsing with validation, cache-friendly prompt order.
- `POST /api/chat` as SSE (everything routed `answered` for now), `GET /api/thread/:parentId`.
- Test: citation parser, including a marker split across deltas.
- **Done when:** "Are you closed the Friday after Thanksgiving?" streams a yes citing `hours:holidays`, and "How much is tuition for the Twos room?" gives $270/week citing `fees:tuition`.

### Phase 3 — `feature/router` (30 min)
- `router.ts` (Jev + LLM fallback), `decide.ts`, reasons, role mapping; wire into chat with requests, SSE `route` event, failure fallback, rate limit.
- Tests for `decide()`: urgent beats everything; sensitive → handed off; low answerability → handed off; staff action or child health → looped in; plain factual → answered.
- **Done when:** scenarios #1–#14 route as expected (or within one over-escalation) with `ROUTER=jev` and `ROUTER=llm`. Tag `v0.1`.

### Phase 4 — `feature/parent-ui` (35 min)
- Sign in, create demo parent, thread, bubbles, streaming render, citation chips, policy sheet, status card, urgent banner, "Ask a person," 2-second polling.
- **Done when:** at 375px all four routes render per 4.3, and an answer streams in.

### Phase 5 — `feature/operator-inbox` (35 min)
- Shell (sidebar / bottom tabs), Inbox list and detail per 4.4, seen, forward, reply, save as answer (add or create), polling with slide-in highlight.
- **Done when:** a question sent from a phone appears on the laptop within a few seconds; forwarding and replying update the phone's status card; saving #3's reply makes #15 route to AI answers.

### Phase 6 — `feature/knowledge` (15 min)
- Knowledge list and editor per 4.4.
- **Done when:** editing an entry changes the next AI answer.

### Phase 7 — `feature/insights` (10 min)
- Stat tiles, top topics, Couldn't answer with Add answer.
- **Done when:** the seed history shows real numbers, and test runs don't change them.

### Phase 8 — `feature/test-mode` (25 min)
- Switch, bar, client-driven run/pause/reset, scenarios and canned replies, results panel with the row styles in 4.5.
- Tune thresholds or question wording in `router.ts`/`decide.ts` until the run is about 14/15 with 0 unsafe misses and #15 learned.
- **Done when:** a full run completes unattended and Reset restores a clean state.

### Phase 9 — `feature/polish-and-submit` (15 min)
- Empty, loading and error states; mobile pass on both views.
- README: what it is, architecture sketch, setup, deploy, a 60-second demo script, known simplifications (polling, no retrieval), and next steps (adjustable thresholds, multi-staff accounts, retrieval for long handbooks, real auth, voice).
- Final deploy, tag `v1.0`.

---

## 7. Definition of done

- [ ] Parent on a phone and operator on a laptop update from one backend within ~2 seconds.
- [ ] All four response states render as specified; AI answers stream in.
- [ ] Citation chips open the policy sheet with the full entry.
- [ ] Ask a person, forward and reply all update the parent's status card.
- [ ] Save as answer adds to or creates an entry, which is used for the next matching question.
- [ ] A router or LLM failure falls back to Handed off with a polite message.
- [ ] Demo parent creation works, and Reset clears it.
- [ ] A test run produces the results table with #15 answered by the AI, and Reset restores everything.
- [ ] Insights excludes test conversations.

## 8. Out of scope

Real authentication, multiple staff accounts and notifications, voice input, suggested-question chips, multiple languages, file or photo uploads, adjustable routing thresholds in the UI, vector search, WebSockets/Durable Objects.