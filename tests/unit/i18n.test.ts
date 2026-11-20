import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/i18n/core";
import { SCHEMES } from "@/lib/data";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import centres from "@data/help-centres.json";
import { OPS } from "@/lib/eligibility/types";

const en = Object.keys(MESSAGES.en).sort();

describe("translations", () => {
  it("en, hi and mr have exactly the same keys", () => {
    expect(Object.keys(MESSAGES.hi).sort()).toEqual(en);
    expect(Object.keys(MESSAGES.mr).sort()).toEqual(en);
  });
  it("no empty values; placeholders match across languages", () => {
    for (const k of en) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
      for (const l of ["en", "hi", "mr"] as const) expect(MESSAGES[l][k].trim(), `${l}:${k}`).not.toBe("");
      expect(ph(MESSAGES.hi[k]), `hi:${k}`).toBe(ph(MESSAGES.en[k]));
      expect(ph(MESSAGES.mr[k]), `mr:${k}`).toBe(ph(MESSAGES.en[k]));
    }
  });
  it("every static t('key') used in source exists", () => {
    const missing: string[] = [];
    const walk = (dir: string) => {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(f.name)) {
          const src = fs.readFileSync(p, "utf8");
          for (const m of src.matchAll(/\b(?:t|translate\([a-z]+,)\s*\(?\s*"([a-zA-Z0-9_.]+)"/g)) if (!MESSAGES.en[m[1]]) missing.push(`${f.name}: ${m[1]}`);
        }
      }
    };
    walk(path.resolve(__dirname, "../../src"));
    expect(missing).toEqual([]);
  });
  it("dynamic key families are complete", () => {
    const need: string[] = [];
    for (const q of Object.values(QUESTIONS)) {
      need.push(`q.${q.id}.title`);
      if (!q.unit) for (const o of q.options ?? []) need.push(`opt.${q.id}.${String(o.value)}`);
    }
    need.push("opt.q_land.0", "opt.q_class.0");
    for (const s of SCHEMES) {
      need.push(`cat.${s.category}`);
      for (const m of s.application.modes) if (m.type === "OFFLINE") m.officeTypes.forEach((o) => need.push(`office.${o}`));
    }
    centres.centres.forEach((c) => need.push(`office.${c.type}`));
    OPS.forEach((o) => need.push(`op.${o}`));
    ["all", "docs", "progress", "visit"].forEach((x) => need.push(`sh.filter.${x}`));
    ["age", "class", "percent", "district", "occupation"].forEach((x) => need.push(`dm.value.${x}`));
    ["DAUGHTER_IN_LAW", "GRANDSON", "PARENT", "CHILD"].forEach((r) => need.push(`opt.q_relation.${r}`));
    expect(need.filter((k) => !MESSAGES.en[k])).toEqual([]);
  });
});
