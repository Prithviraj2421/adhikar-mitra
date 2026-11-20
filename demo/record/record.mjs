// Records every scene against the running app (default http://localhost:3000, use the production build: npm run demo).
// Usage: node demo/record/record.mjs [--only s03,s04]
import fs from "node:fs";
import { BASE, BUILD } from "./lib.mjs";
import * as S from "./scenes.mjs";

const onlyArg = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] ?? ""; // e.g. --only=s03,s04
const only = onlyArg.split(",").filter(Boolean);
const want = (id) => only.length === 0 || only.some((o) => id.startsWith(o));

const up = await fetch(`${BASE}/en/login`).then((r) => r.ok).catch(() => false);
if (!up) {
  console.error(`The app is not running at ${BASE}. Start it with:  npm run demo   (then re-run this script)`);
  process.exit(1);
}
fs.mkdirSync(BUILD, { recursive: true });

console.log("Preparing demo states (not recorded)…");
const st = await S.states();

const plan = [
  ["s02", () => S.problem()],
  ["s03", () => S.ask()],
  ["s04", () => S.map(st.ramesh)],
  ["s05", () => S.explain(st.ramesh)],
  ["s06", () => S.unlock(st.ramesh)],
  ["s07", () => S.track(st.ramesh)],
  ["s08", () => S.proactive()],
  ["s09", () => S.sahayak(st.sahayak)],
  ["s10", () => S.ngo(st.admin)],
];
for (const [id, run] of plan) {
  if (!want(id)) continue;
  console.log(`Recording ${id}…`);
  await run();
}
console.log("Done. Raw clips are in", BUILD);
