// Generates SAMPLE-watermarked demo documents (SVG) into public/demo-assets.
// Everything here is synthetic. Run: npm run assets
import fs from "node:fs";

const OUT = "public/demo-assets";
fs.mkdirSync(OUT, { recursive: true });
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function doc(file, title, lines, { w = 900, h = 560 } = {}) {
  const body = lines
    .map((t, i) => `<text x="40" y="${130 + i * 46}" font-size="28" fill="#111">${esc(t)}</text>`)
    .join("\n  ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Noto Sans, Noto Sans Devanagari, Nirmala UI, Arial, sans-serif">
  <rect width="${w}" height="${h}" fill="#fff"/><rect x="8" y="8" width="${w - 16}" height="${h - 16}" fill="none" stroke="#999" stroke-width="3"/>
  <text x="40" y="60" font-size="30" font-weight="700" fill="#222">${esc(title)}</text>
  <text x="40" y="92" font-size="18" fill="#a00">SAMPLE - SYNTHETIC DOCUMENT, NOT REAL</text>
  ${body}
  <text x="${w / 2}" y="${h / 2 + 40}" font-size="120" font-weight="800" fill="#cc0000" fill-opacity="0.13" text-anchor="middle" transform="rotate(-22 ${w / 2} ${h / 2})">SAMPLE</text>
</svg>`;
  fs.writeFileSync(`${OUT}/${file}`, svg);
}

// Three rejection notices (en / hi / mr)
doc("notice-aadhaar-seeding-en.svg", "Application Status Notice", [
  "Application Status: REJECTED",
  "Scheme: Majhi Ladki Bahin (sample)",
  "Applicant: Shantabai Kamble",
  "Reason: Aadhaar is not seeded with bank account.",
  "NPCI mapping failed. Please contact your bank.",
]);
doc("notice-name-mismatch-hi.svg", "आवेदन स्थिति सूचना", [
  "आवेदन अस्वीकृत",
  "योजना: नमूना योजना (सैंपल)",
  "कारण: आवेदक का नाम आधार और बैंक खाते में",
  "मेल नहीं खाता, नाम अलग है।",
  "कृपया नाम सुधार करवाएँ।",
]);
doc("notice-income-expired-mr.svg", "अर्ज स्थिती सूचना", [
  "अर्ज नाकारला",
  "योजना: नमुना योजना (सॅम्पल)",
  "कारण: उत्पन्नाचा दाखला मुदत संपलेला आहे.",
  "कृपया नवीन दाखला जोडा.",
]);

// Two sample document sets
doc("aadhaar-shantabai.svg", "Aadhaar (SAMPLE)", [
  "Name: Shantabai Ramesh Kamble", "DOB: 14/03/1968", "Gender: Female", "XXXX XXXX 4821",
]);
doc("passbook-shantabai.svg", "Bank Passbook (SAMPLE)", [
  "Name: Shanta R. Kambale", "DOB: 14/03/1968", "Gender: Female", "Account: XXXXXX1234",
]);
doc("aadhaar-ramesh.svg", "Aadhaar (SAMPLE)", [
  "Name: Ramesh Wankhede", "DOB: 10/05/1984", "Gender: Male", "XXXX XXXX 7710",
]);
doc("land-7-12-ramesh.svg", "7/12 Extract (SAMPLE)", [
  "Name: Ramesh Vankhede", "Village: Sample Village", "Area: 1.8 acres",
]);
console.log("demo assets written to", OUT);
