# ventureCraft

Research assistant for founders in Bengaluru. A founder describes an idea; the system asks clarifying questions, confirms a structured profile, then researches six categories on the live web (TinyFish) and streams results with source URLs.

## Status (work in progress)

Done and tested (`npm test`, `npm run typecheck`):
- `packages/schemas`: Zod schemas for profile, questions, assumptions, leads, competitors, TAM, compliance, funding programs, stream events.
- `apps/api` session layer: state machine, text sanitizing, completeness, question generation (max 5 per round, 2 rounds), answer merging with explicit assumptions, confirm gate, rate limit.

Written but not yet wired or tested (next steps):
- TinyFish Search/Fetch client, Groq client, gather/extract pipeline, six category modules, funding data + eligibility rules + refresh job, orchestrator, SSE stream route, `main.ts`, Playwright E2E.
- BeeAI Framework was evaluated and dropped: v0.1.32 needs zod 3, this repo uses zod 4. Orchestration is plain TypeScript.

## Run

```
npm install
npm test
```

Copy `.env.example` to `.env` and fill in keys. Secrets live only in `.env`.
# bobathon_vencture_craft
