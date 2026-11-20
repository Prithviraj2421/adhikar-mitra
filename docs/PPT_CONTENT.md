# PPT content (7-slide template)

Screenshots are in `docs/screenshots/` (mobile 390×844, desktop 1440×900).

## Slide 1: Title
- **Adhikar Mitra (अधिकार मित्र)**
- *Every family's rightful benefits, found, explained and claimed.*
- Problem statement: **Government Welfare Scheme Awareness and Application Assistant** (YCCE HackKumbh · Theme 03 Social Issues · PS 5)
- Screenshot: `04-family-benefit-map-mobile.png`

## Slide 2: Team details
- Team name: `<TEAM_NAME>`
- Members, roles, college, contact: `[add]`
- Mentor (if any): `[add]`

## Slide 3: Idea
- **Problem (one line):** Eligible families miss welfare benefits.
- **Who is affected:** daily-wage workers, women, farmers and senior citizens in urban slums and rural Vidarbha (Nagpur). `[add sourced statistic]`
- **Insight: five gaps, not one:** Discovery · Comprehension · Documents (the biggest blocker) · Process and scams · Follow-through.
- **Solution:** a multilingual (Marathi / Hindi / English), voice-first platform that covers all five gaps.
- **Eight differentiators:** Document Unlock Graph · Household-first Family Benefit Map · Explainable rules engine · Sahayak (helper) mode with offline sync · Life-event triggers · Rejection Decoder + Mismatch Detector · Scam Shield · Benefit Gap Map for NGOs.
- Screenshots: `06b-unlock-graph-desktop.png`, `05-why-eligibility-mobile.png`

## Slide 4: Technical approach
- **Stack:** Next.js (App Router, TypeScript) · Tailwind · Prisma + SQLite (Postgres-ready) · zod · React Flow · Leaflet/OpenStreetMap · Recharts · tesseract.js (on-device OCR) · Web Speech API · Dexie/IndexedDB + service worker · Vitest + Playwright · GitHub Actions. No paid dependency.
- **Architecture diagram:** see `docs/ARCHITECTURE.md` (system diagram).
- **Rules engine:** deterministic three-valued logic (PASS / FAIL / UNKNOWN); rules are JSON with official source links; every criterion explained; an LLM may only rephrase.
- **Doc graph:** documents and schemes as a dependency graph; `score = (value unlocked + 0.3 × value partly progressed) ÷ effort days`; greedy recommended path respecting prerequisites.
- **User flow:** language → consent → questionnaire → Family Benefit Map → Why? → documents path → guide → tracker + SMS → life events → decoder → admin gap map.
- Screenshots: `docs/ARCHITECTURE.md` diagrams; `06-document-unlock-path-mobile.png`

## Slide 5: Feasibility
- **Why it is buildable:** open stack, no paid API required (LLM and SMS are optional); 18 central and Maharashtra schemes seeded as editable JSON; 87+ unit tests and end-to-end tests already run.
- **Risks and mitigations**

| Risk | Mitigation |
|---|---|
| Rule accuracy | Every rule carries source links, `verified: false` until a human checks it; `VERIFY` flags; `DATA_SOURCES.md`; results labelled guidance |
| Low digital access | Sahayak (helper) mode, offline queue, voice and large-text, no login wall |
| OCR accuracy | On-device OCR, always shown as editable text for human confirmation; honest "no match" path |
| Data privacy | Consent first, minimum data, data stays on device, last-4 Aadhaar only, "Delete my data", synthetic demo data |
| Marathi voice support | Falls back to Hindi voice with a notice; tap-to-answer always available |
| Scams | Allow-listed "Official ✓" links, Scam Shield checker, "we never ask for money or OTP" |

## Slide 6: Impact
- **Families:** know what they can get, which document first, and why a rejection happened.
- **Sahayaks (ASHA workers, CSC operators, volunteers):** manage many families from one device, even offline.
- **NGOs and local bodies:** Benefit Gap Map shows under-served wards and the single blocking document; plan targeted camps and notify families.
- **Social and economic benefit:** more eligible households receive entitlements; fewer fees paid to middlemen; faster correction of rejections. `[add sourced statistic]`
- **Measurable indicators:** schemes identified per household · document-to-application time · Benefit Gap Index reduction per ward · share of rejections resolved after decoding. `[add baseline from pilot]`
- Screenshot: `14-benefit-gap-map-desktop.png`

## Slide 7: Demo and submission
- **Demo video outline:** see `docs/DEMO_SCRIPT.md` (about 2:40).
- **Repository:** <https://github.com/Prithviraj2421/adhikar-mitra>
- Run it: `npm i && cp .env.example .env && npx prisma db push && npm run seed && npm run dev`
- Honesty note: synthetic data; rules pending official verification; no government integration.
