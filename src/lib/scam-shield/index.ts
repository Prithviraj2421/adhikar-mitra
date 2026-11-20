/**
 * Scam Shield.
 *  - isOfficialUrl(): allowlist on the REAL hostname suffix (so gov.in.example.com fails).
 *  - checkMessage(): heuristics over pasted text. Output explains every reason.
 */
import domains from "@data/official-domains.json";
import scam from "@data/scam-patterns.json";

export type Lang = "en" | "hi" | "mr";
export type Verdict = "SAFE" | "SUSPICIOUS" | "DANGEROUS";

export interface UrlCheck {
  url: string;
  host: string | null;
  official: boolean;
  reasonIds: string[];
}

export function parseHost(raw: string): string | null {
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

const hasPunycode = (host: string) => host.split(".").some((l) => l.startsWith("xn--"));

export function isOfficialHost(host: string | null): boolean {
  if (!host || hasPunycode(host)) return false;
  if (domains.suffixes.some((s) => host.endsWith(s))) return true;
  return domains.hosts.some((h) => host === h || host.endsWith(`.${h}`));
}
export const isOfficialUrl = (url: string) => isOfficialHost(parseHost(url));

export function checkUrl(url: string, claimsOfficial = false): UrlCheck {
  const host = parseHost(url);
  const reasonIds: string[] = [];
  if (!host) return { url, host, official: false, reasonIds: ["not-official"] };
  if (hasPunycode(host)) reasonIds.push("punycode");
  const official = isOfficialHost(host);
  if (!official) {
    if (domains.shorteners.some((s) => host === s || host.endsWith(`.${s}`))) reasonIds.push("shortener");
    else if (/(gov|sarkar|yojana|scheme|pension|mahadbt|ayushman|kisan)/.test(host)) reasonIds.push("fake-official");
    else reasonIds.push("not-official");
    if (claimsOfficial && !reasonIds.includes("fake-official") && !reasonIds.includes("shortener")) reasonIds.push("fake-official");
  }
  return { url, host, official, reasonIds };
}

export interface ScamReason {
  id: string;
  severity: "DANGER" | "WARN" | "INFO";
  text: Record<Lang, string>;
}
export interface ScamResult {
  verdict: Verdict;
  reasons: ScamReason[];
  urls: UrlCheck[];
}

const URL_RE = /((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;

export function extractUrls(text: string): string[] {
  const found = text.match(URL_RE) ?? [];
  return found.map((u) => u.replace(/[),.;]+$/, "")).filter((u) => /\./.test(u));
}

export function checkMessage(text: string): ScamResult {
  const reasons: ScamReason[] = [];
  let claims = false;
  for (const p of scam.patterns) {
    const hit = p.regex.some((r) => new RegExp(r, "iu").test(text));
    if (!hit) continue;
    if (p.id === "claims-official") {
      claims = true;
      continue;
    }
    reasons.push({ id: p.id, severity: p.severity as ScamReason["severity"], text: p.reason as Record<Lang, string> });
  }
  const urls = extractUrls(text).map((u) => checkUrl(u, claims));
  for (const u of urls) {
    for (const id of u.reasonIds) {
      if (reasons.some((r) => r.id === `link:${id}`)) continue;
      const severity = id === "not-official" ? "WARN" : id === "shortener" ? "WARN" : "DANGER";
      reasons.push({ id: `link:${id}`, severity, text: (scam.linkReasons as Record<string, Record<Lang, string>>)[id] });
    }
  }
  const verdict: Verdict = reasons.some((r) => r.severity === "DANGER")
    ? "DANGEROUS"
    : reasons.some((r) => r.severity === "WARN")
      ? "SUSPICIOUS"
      : "SAFE";
  return { verdict, reasons, urls };
}

export const CYBER_HELPLINE = { number: "1930", site: "https://cybercrime.gov.in" } as const;
