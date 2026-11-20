// Regenerates docs/DATA_SOURCES.md from data/schemes/*.json.
// Run: npm run docs:sources
import fs from "node:fs";
import path from "node:path";

const dir = "data/schemes";
const schemes = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));

const verifyNotes = (node, out = []) => {
  if (node.all) node.all.forEach((n) => verifyNotes(n, out));
  else if (node.any) node.any.forEach((n) => verifyNotes(n, out));
  else if (node.note === "VERIFY") out.push(`${node.id} (${node.field} ${node.op} ${JSON.stringify(node.value)})`);
  return out;
};

let md = `# Data sources and verification status

> All scheme rules were seeded from public knowledge and are **unverified**. Before any demo, a human must compare
> each criterion against the official guideline linked below, fix the JSON in \`data/schemes/\`, then set
> \`verified: true\` and \`lastVerified: "YYYY-MM-DD"\`. Benefit amounts are rough *estimates*, not official figures.
> Adhikar Mitra has no integration with any government system.

| Scheme | Level | Source links | Verified | Last verified | Criteria to VERIFY |
|---|---|---|---|---|---|
`;
for (const s of schemes) {
  const v = [...s.eligibility.all.flatMap((n) => verifyNotes(n)), ...s.eligibility.exclusions.flatMap((n) => verifyNotes(n))];
  md += `| ${s.name.en} (\`${s.id}\`) | ${s.level} | ${s.sourceUrls.map((u) => `<${u}>`).join("<br>")} | ${s.verified ? "yes" : "no"} | ${s.lastVerified ?? "pending"} | ${v.length ? v.join("<br>") : "-"} |\n`;
}
fs.writeFileSync("docs/DATA_SOURCES.md", md);
console.log("wrote docs/DATA_SOURCES.md for", schemes.length, "schemes");
