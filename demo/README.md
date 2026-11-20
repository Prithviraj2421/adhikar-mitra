# Demo video

A silent, captioned screen recording of the real app, under 3 minutes, for the PPT-round submission. Narration is recorded separately over it using [`storyboard.md`](storyboard.md) as the cue sheet.

## Rebuild it

```bash
npm i
npx prisma db push && npm run seed
npm run demo                 # terminal 1: builds and serves http://localhost:3000
npm run demo:record          # terminal 2: records every scene (about 4 minutes)
npm run demo:video           # composes demo/adhikar-mitra-demo.mp4 and rewrites storyboard.md
npm run demo:ppt             # 3 PPT screenshots into docs/screenshots/
```

Or `bash demo/make_video.sh`. Re-record one scene with `npm run demo:record -- --only=s04,s06`.

## Layout
| Path | What |
|---|---|
| `scenes.config.mjs` | The storyboard as data: scene order, target length, caption |
| `record/lib.mjs` | Cursor dot and click ripple, smooth pointer, scene recorder, questionnaire driver |
| `record/scenes.mjs` | One recording per scene |
| `record/ppt-screenshots.mjs` | PPT screenshots (390×844 at 3×) |
| `assets/` | Title, problem and closing cards, phone frame and desktop caption band (HTML) |
| `make_video.mjs` | ffmpeg composition, cross-fades, silent audio, checks, cue sheet |
| `storyboard.md` | Final timings (generated) |
| `FEATURE_CHECK.md`, `DECISIONS.md` | What works, what was fixed, and why |

The final `.mp4` and `build/` are git-ignored. Upload the video to YouTube (unlisted) or Google Drive and link it from the deck.
