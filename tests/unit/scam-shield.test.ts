import { describe, expect, it } from "vitest";
import { checkMessage, isOfficialUrl } from "@/lib/scam-shield";

describe("official hostname matching", () => {
  it.each([
    ["https://pmkisan.gov.in/", true],
    ["https://mahadbt.maharashtra.gov.in/x", true],
    ["https://nsap.nic.in", true],
    ["https://maandhan.in/", true],
    ["https://gov.in.example.com/login", false],
    ["https://pmkisan-gov.in.evil.com", false],
    ["https://xn--pmkisan-9ua.gov.in", false],
    ["https://notgov.in", false],
    ["ftp://pmkisan.gov.in", false],
  ])("%s -> %s", (u, ok) => expect(isOfficialUrl(u)).toBe(ok));
});

const cases: [string, string][] = [
  ["Apply for PM-KISAN at https://pmkisan.gov.in/ . It is free.", "SAFE"],
  ["Pay ₹500 processing fee to get your pension released", "DANGEROUS"],
  ["Share the OTP you received to verify your Ladki Bahin application", "DANGEROUS"],
  ["Install the app from http://sarkari-yojana.in/app.apk to claim subsidy", "DANGEROUS"],
  ["Your yojana benefit is ready, click https://bit.ly/3abcd", "SUSPICIOUS"],
  ["Urgent! Your scheme will be blocked", "SUSPICIOUS"],
  ["प्रोसेसिंग फीस जमा करें और पेंशन पाएँ", "DANGEROUS"],
  ["तुमचा ओटीपी आम्हाला सांगा", "DANGEROUS"],
  ["Check your status at https://pm-kisan-gov-yojana.com/status", "DANGEROUS"],
  ["Meeting at the ward office tomorrow at 10 am", "SAFE"],
];
describe("message heuristics", () => {
  it.each(cases)("%s => %s", (msg, verdict) => expect(checkMessage(msg).verdict).toBe(verdict));
  it("lists reasons", () => {
    const r = checkMessage("Pay ₹500 processing fee and share OTP");
    expect(r.reasons.map((x) => x.id)).toEqual(expect.arrayContaining(["payment", "otp"]));
  });
});
