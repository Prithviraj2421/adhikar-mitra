// Builds the final silent, captioned demo video from the raw recordings in demo/build.
// Usage: node demo/make_video.mjs      (record first: node demo/record/record.mjs)
import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { FADE, SCENES } from "./scenes.config.mjs";
import { serveStatic } from "./record/lib.mjs";

const require = createRequire(import.meta.url);
const FFMPEG = require("ffmpeg-static");
const FFPROBE = require("ffprobe-static").path;
const BUILD = "demo/build";
const OUT = "demo/adhikar-mitra-demo.mp4";
const BG = "0xF4F6FA";
fs.mkdirSync(`${BUILD}/clips`, { recursive: true });
fs.mkdirSync(`${BUILD}/qa`, { recursive: true });

const ff = (args, what) => {
  const r = spawnSync(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed (${what}):\n${r.stderr}`);
};

/* ---- team name for the closing card: only if it was really set (not the placeholder) */
const cfg = fs.readFileSync("src/config/app.ts", "utf8");
const team = /team:\s*"([^"]+)"/.exec(cfg)?.[1] ?? "";
const teamName = team && !/[<>]/.test(team) ? team : "";
if (!teamName) console.warn("! Team name is still a placeholder in src/config/app.ts; the closing card omits it.");

/* ---- 1. render cards and frames to PNG (HTML templates in demo/assets) */
const server = await serveStatic(); // serves the card HTML + local fonts
const ROOT = server.url;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
async function render(html, query, out, transparent = false) {
  await page.goto(`${ROOT}/demo/assets/${html}${query ? "?" + query : ""}`);
  await page.waitForTimeout(600);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, omitBackground: transparent });
}
await render("title.html", "", `${BUILD}/title.png`);
await render("closing.html", teamName ? `team=${encodeURIComponent(teamName)}` : "", `${BUILD}/closing.png`);
for (const s of SCENES) {
  if (s.kind === "mobile" || s.kind === "desktop") {
    const q = `step=${encodeURIComponent(s.step ?? "")}&cap=${encodeURIComponent(s.cap ?? "")}`;
    await render(`frame-${s.kind}.html`, q, `${BUILD}/frame-${s.id}.png`, true);
  }
}
await browser.close();
await server.close();

/* ---- 2. one 1920x1080 / 30 fps clip per scene */
const venc = ["-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an"];

function segmentsOf(meta) {
  const start = meta.startMs / 1000;
  const end = meta.endMs / 1000;
  let cur = 1, t = start;
  const out = [];
  for (const s of [...(meta.segments ?? [])].sort((a, b) => a.ms - b.ms)) {
    const at = Math.min(Math.max(s.ms / 1000, start), end);
    if (at > t) { out.push({ a: t, b: at, speed: cur }); t = at; }
    cur = s.speed;
  }
  if (end > t) out.push({ a: t, b: end, speed: cur });
  return out;
}

const timing = [];
for (const s of SCENES) {
  const clip = `${BUILD}/clips/${s.id}.mp4`;
  if (s.kind === "still") {
    ff(["-loop", "1", "-framerate", "30", "-i", `${BUILD}/${s.card}.png`, "-t", String(s.d), "-vf", "format=yuv420p", ...venc, clip], s.id);
    timing.push({ ...s, raw: s.d, effective: s.d, factor: 1 });
    continue;
  }
  const meta = JSON.parse(fs.readFileSync(`${BUILD}/${s.id}.json`, "utf8"));
  const segs = segmentsOf(meta);
  const effective = segs.reduce((n, x) => n + (x.b - x.a) / x.speed, 0);
  // Longer than its slot: speed the whole clip up a little. Shorter: hold the last frame.
  const K = effective > s.d ? s.d / effective : 1;
  const parts = segs.map((x, i) => `[0:v]trim=start=${x.a.toFixed(3)}:end=${x.b.toFixed(3)},setpts=(PTS-STARTPTS)/${x.speed}[p${i}]`).join(";");
  const cat = `${segs.map((_, i) => `[p${i}]`).join("")}concat=n=${segs.length}:v=1:a=0[cat]`;
  const fit = `[cat]setpts=PTS*${K.toFixed(5)},fps=30,tpad=stop_mode=clone:stop_duration=90`;
  let graph, inputs;
  if (s.kind === "mobile") {
    graph = `${parts};${cat};${fit},scale=425:920:flags=lanczos[v];[2:v][v]overlay=344:80[b];[b][1:v]overlay=0:0[o]`;
    inputs = ["-i", `${BUILD}/${s.id}.webm`, "-loop", "1", "-framerate", "30", "-i", `${BUILD}/frame-${s.id}.png`, "-f", "lavfi", "-i", `color=c=${BG}:s=1920x1080:r=30`];
  } else if (s.kind === "desktop") {
    graph = `${parts};${cat};${fit},scale=1600:1000:flags=lanczos[v];[2:v][v]overlay=160:0[b];[b][1:v]overlay=0:0[o]`;
    inputs = ["-i", `${BUILD}/${s.id}.webm`, "-loop", "1", "-framerate", "30", "-i", `${BUILD}/frame-${s.id}.png`, "-f", "lavfi", "-i", `color=c=${BG}:s=1920x1080:r=30`];
  } else {
    graph = `${parts};${cat};${fit},scale=1920:1080:flags=lanczos[o]`;
    inputs = ["-i", `${BUILD}/${s.id}.webm`];
  }
  ff([...inputs, "-filter_complex", graph, "-map", "[o]", "-t", String(s.d), ...venc, clip], s.id);
  timing.push({ ...s, raw: (meta.endMs - meta.startMs) / 1000, effective, factor: K });
  const note = K < 0.62 ? "  <-- fast: consider trimming this scene" : effective < s.d - 0.5 ? `  (held ${(s.d - effective).toFixed(1)}s on the last frame)` : "";
  console.log(`  ${s.id}: raw ${((meta.endMs - meta.startMs) / 1000).toFixed(1)}s -> ${s.d}s (speed x${(1 / K).toFixed(2)})${note}`);
}

/* ---- 3. cross-fade chain + silent audio */
const clips = SCENES.map((s) => `${BUILD}/clips/${s.id}.mp4`);
const inArgs = clips.flatMap((c) => ["-i", c]);
let chain = "";
let prev = "[0:v]";
let acc = SCENES[0].d;
SCENES.slice(1).forEach((s, i) => {
  const offset = acc - FADE;
  const label = i === SCENES.length - 2 ? "[vout]" : `[x${i}]`;
  chain += `${prev}[${i + 1}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}${label};`;
  prev = label;
  acc = offset + s.d;
});
const total = acc;
ff([...inArgs, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-filter_complex", chain.slice(0, -1), "-map", "[vout]", "-map", `${clips.length}:a`,
  "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "96k", "-t", total.toFixed(3), "-movflags", "+faststart", OUT], "concat");

/* ---- 4. storyboard / narrator cue sheet */
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
let at = 0;
const rows = timing.map((s, i) => {
  const start = at;
  at += s.d - (i < timing.length - 1 ? FADE : 0);
  return { ...s, start, end: start + s.d - (i < timing.length - 1 ? FADE : 0) };
});
const md = [
  "# Storyboard / narrator cue sheet",
  "",
  `Final video: \`${OUT}\` · ${mmss(total)} (${total.toFixed(1)} s) · 1920×1080 · 30 fps · silent audio track (no voiceover, no music).`,
  "",
  "The first second (title) and the last seconds (closing card) are still frames so narration can be lined up. Hold times below are the real ones.",
  "",
  "| Start | End | Scene | On screen | Caption on screen |",
  "|---|---|---|---|---|",
  ...rows.map((r) => `| ${mmss(r.start)} | ${mmss(r.end)} | ${r.id} | ${r.what} | ${r.cap ? (r.step ? `${r.step} · ` : "") + r.cap : "(none)"} |`),
  "",
  "Notes for the narrator:",
  "- The Ask scene (s03) simulates the microphone: the on-screen label says so. Say it in your voice-over too.",
  "- The citizen story uses Ramesh Wankhede's family (Ramesh 42, Sunita 38, Priya 16, Rohan 12). Scene s08 switches to Shantabai's household for the 'turns 60' moment.",
  "- Numbers on screen come from the app: PM-KISAN ₹6,000 + Namo Shetkari ₹6,000 + Majhi Ladki Bahin ₹18,000 = ₹30,000 per year (estimated). The headline cash total also includes Priya's estimated scholarship.",
  "",
].join("\n");
fs.writeFileSync("demo/storyboard.md", md);

/* ---- 5. verify */
const probe = spawnSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,width,height,r_frame_rate", "-of", "json", OUT], { encoding: "utf8" });
const info = JSON.parse(probe.stdout);
const v = info.streams.find((x) => x.codec_name === "h264");
const a = info.streams.find((x) => x.codec_name === "aac");
const dur = parseFloat(info.format.duration);
const mb = parseInt(info.format.size, 10) / 1048576;
console.log(`\nVideo: ${OUT}\n  duration ${mmss(dur)} (${dur.toFixed(1)} s) · ${v.width}x${v.height} · ${v.r_frame_rate} fps · ${mb.toFixed(1)} MB · audio: ${a ? a.codec_name + " (silent)" : "none"}`);
const checks = [
  [dur < 178, "duration under 2:58"],
  [v.width === 1920 && v.height === 1080, "1920x1080"],
  [v.r_frame_rate === "30/1", "30 fps"],
  [mb < 150, "under 150 MB"],
];
for (const [ok, label] of checks) console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
// Audio really is silent?
const vol = spawnSync(FFMPEG, ["-hide_banner", "-i", OUT, "-af", "volumedetect", "-vn", "-f", "null", "-"], { encoding: "utf8" });
console.log(`  ${/mean_volume: -91|mean_volume: -inf/.test(vol.stderr) ? "PASS" : "CHECK"}  audio track is silent`);

// QA frames: the middle of every scene, so a human can look at them.
for (const r of rows) {
  ff(["-ss", String(Math.max(0, r.start + Math.min(r.d / 2, 8))), "-i", OUT, "-frames:v", "1", "-vf", "scale=960:-1", `${BUILD}/qa/${r.id}.png`], `qa ${r.id}`);
}
console.log(`QA frames written to ${BUILD}/qa/`);
if (checks.some(([ok]) => !ok)) process.exit(1);
