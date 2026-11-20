# Requirement traceability

Status: ✅ built and tested · ⚠️ built with a stated limitation (see [DECISIONS](DECISIONS.md) #11)

| PS requirement | Implemented by | Status |
|---|---|---|
| Eligibility questionnaire, central and state schemes | F2 Household Questionnaire (`/questionnaire`), F3 Family Benefit Map (`/benefits`), F4 Explainable Eligibility (`/benefits/[schemeId]`); 11 central + 7 Maharashtra schemes | ✅ |
| Hindi and Marathi, voice and large text | F1 language onboarding, F13 Accessibility and Voice (read-aloud on every screen, voice answers, large-text, high-contrast), trilingual content (en/hi/mr, key-parity test) | ✅ (Marathi voice falls back to Hindi when the device has none) |
| Document checklist and expiry reminders | F5 Document Wallet and Unlock Graph (A) `/documents`; expiry warnings; F7 Notifications (`expiring-doc`, `missing-doc`) | ✅ |
| Step-by-step guide, official links, help centres | F6 Application Guide `/guide/[schemeId]`, F10 Scam Shield "Official ✓" badges (H) via `<SafeLink>`, help-centre map (sample locations) | ✅ |
| Status tracker with SMS reminders | F6 Tracker `/tracker`, F7 Notifications and SMS simulator, `/api/cron/daily`, F9 Rejection Decoder (G) `/decoder` | ✅ (no real SMS unless a provider is configured; no government sync) |
| Admin dashboard for NGOs and local bodies | F12 Benefit Gap Map (I) `/admin`, camp planner, CSV export, F11 Sahayak Mode (E) `/sahayak` with offline sync | ✅ |
| Beyond the PS | F8 Life-Event Engine (F) with time travel `/demo`, F9 Mismatch Detector (G) `/mismatch` | ✅ |

## Acceptance checks (automated)

| Feature | Check | Where |
|---|---|---|
| F2 | "I don't know" gives LIKELY results; follow-up resolves them | verified in browser; engine in `tests/unit/engine.test.ts` |
| F3 | Totals equal the sum of estimates; both personas show expected schemes | `tests/unit/data.test.ts` |
| F4 | LLM off changes only wording (engine decides; `/api/explain` re-runs the engine) | `src/app/api/explain/route.ts`, e2e |
| F5 | Prerequisite chains, cycle rejection, Ramesh's top recommendation is the income certificate | `tests/unit/doc-graph.test.ts`, `tests/unit/data.test.ts` |
| F6/F7 | Every status creates an event and a message; daily check in 3 languages, deduped | `tests/unit/flows.test.ts` |
| F8 | Birthday time travel creates the diff, notification and updated map | `tests/unit/flows.test.ts`, `tests/e2e/demo.spec.ts` |
| F9 | Samples decode to the right reason (real OCR verified in the browser); Shantabai name variation flagged | `tests/unit/mismatch-rejection.test.ts` |
| F10 | 10 test messages get expected verdicts; look-alike hosts rejected | `tests/unit/scam-shield.test.ts` |
| F11 | Interrupted first sync + retry yields exactly one household; verified against the real database | `tests/unit/flows.test.ts`, browser run |
| F12 | Filters update map and charts; camp flow produces simulator messages | `tests/e2e/demo.spec.ts` |
| F13 | axe-core WCAG A/AA, no serious/critical issues on main screens in en/mr/hi; large text ≥ 20 px / buttons ≥ 56 px | `tests/e2e/a11y.spec.ts` |
