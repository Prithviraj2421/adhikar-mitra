# Decisions

1. **Scheme catalogue (18).** Central: PM-KISAN, PM-JAY, PMAY-G, PMAY-U, PM Ujjwala, e-Shram, PM-SYM, Atal Pension, PMJJBY, NSAP IGNOAPS, PMMVY.
   Maharashtra: Sanjay Gandhi Niradhar Anudan, Shravanbal, MJPJAY, Majhi Ladki Bahin, Namo Shetkari, MahaDBT post-matric scholarship, BOCW registration.
   Dropped PM Suraksha Bima and PM Fasal Bima to keep coverage across pensions, health, housing, farmers, women, students and informal workers.
2. **Unverified by design.** Every scheme is `verified: false`; uncertain thresholds carry `note: "VERIFY"`. See `DATA_SOURCES.md`.
3. **Household schemes counted once.** `target: HOUSEHOLD` schemes are evaluated against the head (SELF, else oldest member) so totals are not inflated.
4. **Estimated annual value.** One-time benefits (housing) are spread over 5 years; insurance uses a rough premium-equivalent. All are labelled "estimated".
5. **Runtime state.** Citizen and Sahayak state is kept in browser storage for the demo; Prisma/SQLite holds the schema and seed data for admin views and sync.
6. **Tooling.** Vitest 3 + Vite 6 (Vitest 5 needed a Vite peer that npm did not install). Prisma pinned to 6. Dependencies installed with `--legacy-peer-deps`.
7. **Test dates.** Personas are evaluated as of 2026-11-20 (demo "today"); the time-travel slider changes `asOfDate`.
8. **No GitHub push.** The repo URL in the brief is a placeholder; commits stay local until a real remote is provided.
