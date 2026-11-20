# Demo video decisions

1. **No audio.** The video has a silent AAC track, no voiceover, no music. Captions are only the short scene caption and step number.
2. **Real app only.** Every app screen is recorded from the running production build. Only the title, problem and closing cards are HTML (demo/assets), because they are not app screens.
3. **Simulated voice, labelled.** Headless Chromium has no microphone. The recording script replaces the browser's SpeechRecognition with a stub that "hears" a fixed word; the app's real voice UI runs unchanged. A label "Voice input simulated for recording" is shown on screen.
4. **Deck numbers.** The three headline schemes add up to ₹30,000 as in the deck. The app headline is ₹38,000 because it includes Priya's estimated scholarship; the rules engine was not changed to force a match. See `FEATURE_CHECK.md`.
5. **Headline is cash only.** Insurance and registrations are listed separately because their ₹ figures are rough estimates, not cash. This is an app change made for honesty and to align with the deck ("plus health cover").
6. **Mismatch Detector fix.** Household documents (7/12 extract, ration card) are now compared with the head's documents so Wankhede vs Vankhede is flagged.
7. **Time-travel scene uses Shantabai.** Nobody in Ramesh's family reaches a scheme age threshold soon, so that one beat switches household.
8. **Desktop viewport 1600×1000** (not 1440×900) so the recording fills the 1920×1080 canvas without up-scaling blur. Phone scenes use 390×844.
9. **Phone capture resolution.** The browser screen recorder captures at 1× CSS pixels, so phone clips are 390×844 and shown at 425×920 inside the frame (about 1.09× scale). PPT screenshots are true 3× (1170×2532).
10. **Speed.** Dead time (typing, OCR wait, the offline questionnaire, scrolling) is fast-forwarded with markers in the recording scripts; whole clips are sped up at most about 1.4×. Results are held on screen at normal speed.
11. **Cards and fonts.** Open Sans and Poppins come from local `@fontsource` packages. The card HTML is served from a tiny localhost server because this workspace's folder path is longer than Windows' 260-character limit, which stops Chromium loading fonts from `file://`.
12. **ffmpeg** comes from the `ffmpeg-static` / `ffprobe-static` dev dependencies (no system install needed).
13. **Team name.** `src/config/app.ts` still has the placeholder `<TEAM_NAME>`, so the closing card omits it. Set the real name there and run `npm run demo:video` to add it.
14. **Not committed.** `demo/*.mp4` and `demo/build/` are in `.gitignore`.
