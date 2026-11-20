# Feature check (done before recording)

Each storyboard beat was exercised in the running production build (`npm run demo`). Status: **working**, **partial** or **missing**.

| Beat | Status | Notes |
|---|---|---|
| Language choice with read-aloud speaker | working | Speaker uses the browser's speech synthesis; a silent video cannot show audio. |
| Consent screen, demo login (OTP 1234) | working | Labelled demo on screen. |
| One question per screen, icons, "I don't know" | working | |
| Voice answer | **working, input simulated in the recording** | The app's real voice flow runs (listening → "I heard …" → confirm). Headless Chromium has no microphone, so the recording replaces only the browser's speech recogniser with a stub that "hears" "गाव". The video shows the label "Voice input simulated for recording". |
| Add family members with presets | working | Spouse / daughter / son presets used. |
| Family Benefit Map with count-up | working | Headline is now **cash only** (see below). |
| "Why?" page with Official ✓ and "rules last verified: pending" | working | PM-KISAN shows ✓ for each condition, with your value vs required. |
| Unlock Graph, "Get this first", step plan | working | Ramesh's top recommendation is the **income certificate** (unlocks Ladki Bahin for Sunita and MJPJAY for Ramesh; moves Priya's scholarship closer). |
| Mismatch Detector: Wankhede vs Vankhede | **was missing, fixed** | The 7/12 extract is a household-level document, so it was not compared with Ramesh's Aadhaar. Household documents are now compared with the head of the family (unit test added). |
| Application guide with Official ✓ link | working | |
| Tracker statuses and Marathi SMS | working | Submitted → Under verification → Rejected; SMS inbox shows Marathi messages. |
| Rejection Decoder on a SAMPLE notice | working | Real on-device OCR (the first run needs internet for language data). |
| Time travel / life event | working | Shown with **Shantabai** (turns 60 → Old Age Pension). Nobody in Ramesh's family crosses a scheme age threshold within a useful time, so this beat switches household. |
| Scam Shield | working | "Pay ₹500 fee + share OTP" → Dangerous, with reasons and the 1930 helpline. |
| Sahayak offline → Pending → Synced, one record | working | The record count is proven by `tests/unit/flows.test.ts` and a database check; the video shows Pending 1 → Synced 1 and pressing sync again leaves it at 1. |
| NGO Benefit Gap Map and camp SMS | working | Labelled "synthetic". Needs internet for map tiles. |

## Numbers versus the deck
- PM-KISAN ₹6,000 + Namo Shetkari ₹6,000 + Majhi Ladki Bahin ₹18,000 = **₹30,000 per year (estimated)**: matches the deck, and is asserted in `tests/unit/data.test.ts`.
- The app's headline for Ramesh's family is **₹38,000**, because it also counts Priya's estimated post-matric scholarship (₹8,000). The deck's ≈ ₹30,000 covers only the three headline schemes. Either update the slide to "about ₹38,000 including Priya's scholarship" or keep "≈ ₹30,000 from three schemes"; the rules engine was **not** changed to force a match.
- Health cover (PM-JAY, MJPJAY) is eligible but is insurance, not cash. It is now listed separately ("+ 6 insurance and service benefits") and is not added into the ₹ headline. Previously the headline mixed in rough ₹ estimates for insurance (₹50,872 for this family).

## Console errors
None from the app on the recorded screens. The OCR library logs harmless "Parameter not found" warnings; the recorder ignores those.
