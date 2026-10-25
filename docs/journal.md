# Journal

## Notes about requirements

- Effort ~3 hours
- Lightweight, mobile-friendly

**Parent experience (front desk):**

- Let a parent ask a question (text, voice, guided flow - your choice)
- Provide an answer that is specific to the center and feels trustworthy
- When uncertain or the question is sensitive, handle it gracefully

**Operator experience (control center):**

- Give staff a way to provide or edit the source of truth
- Show what questions are being asked and where the system struggled
- Make it easy to improve the system over time (even if it’s simple)

**Other notes:**

- Response quality and trustworthiness > document parsing
- Create synthetic data

**Scope choice:** breadth, depth, or novelty

**Evaluation:**

- **Scope & completeness:** Did you pick a realistic scope and finish it well?
- **Persuasiveness:** Would this excite a team to fund and build for real?
- **User empathy:** Does it reduce friction and make good decisions on behalf of users?
- **Uniqueness:** Any insight, craft, or implementation detail that stands out?

---

## Questions / decision points in Claude session

- **Language** - python + react/typescript like my most recent hackathon project
- **Hosting**
  - first thought - I don't want to use azure b/c it is connected to work accounts
  - github?
  - cloudflare?
- **Novelty** - I would love to use Jev just for my own experience, we'll use it as a router
- **Language (revisited)** - if I use cloudflare we could do all typescript, I've never done it before but it could help keep scope down?
- **Grounding data**
  - I'm going to feed my daycare handbook to claude and have it create something based on that.
  - Benefit is that I am familiar with their policies so I can act as a SME
  - Don't need robust document
- **Do we need a RAG?** - If the document isn't too big for the context window you could skip the rag part; context stuffing instead would work
- **Experience design** - what does the parent see?
  - fake login, free text chat, one ongoing thread
- **Routing design**
  - in my experience there are questions that need to go to admin and questions that need to go to the teacher
  - probably out of scope. if time may add that layer for "novelty?" maybe just have the ai have a "forward to --- role ---" suggestion
- **What should escalate** - see what jev and claude come up with to start and refine later
- **Testing** - make sure there is an easy way to automate asking/answering a question
- create handoff for claude design

---

## Log

- claude console decided I was suspicious and I got locked out for a few hours. Pivoting to use a different model for chat completions via openrouter
- reorganized the repo structure to the frontend/ & backend/ folder structure that is more familiar to me
- I needed to give more direction about using the jev router, I've never used openrouter or jev before, but it's cool that open router offers access to all these different models with one key, claude didn't have enough info to understand right away. linking to documentation helped because there is a different decisions endpoint that jev has to use. It had to iterate to get jev to pass the routing tests but got it eventually
- claude gathered screenshots after the parent-ui phase completed, I haven't seen that before. It was nice to open them from the command line instead of going to find them in finder
- the conversation thread does get tricky if the parent asks consecutive questions before the admin can get back
- "noul" is a yes/no question type that returns a probability of being yes
- "hono" similar to express, request, response fetch
- "add to existing entry" does not add the "from a parent question" tag, revisit later if desired
- trying to save some time, had phase 8 run concurrently in a worktree branch 
- insights only computes on load and does not update like inbox does, for demo this is fine
- insights come from jev router choices about categories etc when messages are received
- started looking up how the deploy to cloudflare will work
-test script is hard coded, no ui to add test cases
- might consider checking css for duped classes
- the lib backend structure is a little flat for me, I prefer more nesting to put similar things nearby eachother
