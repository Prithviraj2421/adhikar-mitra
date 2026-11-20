# Rules engine

Eligibility is decided only by `src/lib/eligibility/engine.ts`. No LLM takes part in the decision.

## Scheme file
`data/schemes/<id>.json`, validated with zod (`SchemeSchema` in `src/lib/eligibility/types.ts`) at load time.
`eligibility.all` is a list of nodes: a leaf `{id, field, op, value, label{en,hi,mr}, askQuestionId?, note?}` or a nested `{all:[...]}` / `{any:[...]}`.
`eligibility.exclusions` are leaves; if one **passes**, the person is excluded.

## Operators
`eq neq lt lte gt gte in notIn between exists`.

## Fields
`member.*`, `household.*`, plus derived `member.age`, `member.isChild` (<18), `member.isSeniorCitizen` (>=60), `household.size`.
A missing/`null`/`"UNKNOWN"` value gives `UNKNOWN`, never `FAIL`.

## Outcome
- All PASS and no exclusion -> `ELIGIBLE`.
- Any FAIL or passed exclusion -> `NOT_ELIGIBLE`.
- Otherwise (UNKNOWNs) -> `LIKELY_ELIGIBLE` with `missingQuestions`.
- If the only failures are minimum-age thresholds -> `futureEligibility.date` (birthday on which the age is reached).
- `all`: FAIL > UNKNOWN > PASS. `any`: PASS > UNKNOWN > FAIL.

## Adding a scheme
1. Add `data/schemes/<id>.json` with `verified: false`, `sourceUrls`, and `note: "VERIFY"` on uncertain criteria.
2. Make sure every id in `requiredDocuments` exists in `data/documents.json`.
3. Add the import in `src/lib/data/index.ts`.
4. Add/adjust a test, then run `npm run docs:sources`.
