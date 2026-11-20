/** Demo notices (SAMPLE-watermarked SVGs in public/demo-assets) and their expected text if OCR is unavailable offline. */
export const SAMPLE_NOTICES = [
  { id: "aadhaar", file: "/demo-assets/notice-aadhaar-seeding-en.svg", text: "Application Status: REJECTED\nScheme: Majhi Ladki Bahin (sample)\nReason: Aadhaar is not seeded with bank account.\nNPCI mapping failed. Please contact your bank." },
  { id: "name", file: "/demo-assets/notice-name-mismatch-hi.svg", text: "आवेदन अस्वीकृत\nकारण: आवेदक का नाम आधार और बैंक खाते में\nमेल नहीं खाता, नाम अलग है।" },
  { id: "income", file: "/demo-assets/notice-income-expired-mr.svg", text: "अर्ज नाकारला\nकारण: उत्पन्नाचा दाखला मुदत संपलेला आहे.\nकृपया नवीन दाखला जोडा." },
] as const;

export const SAMPLE_DOCS = [
  { id: "aadhaar-shanta", file: "/demo-assets/aadhaar-shantabai.svg", text: "Name: Shantabai Ramesh Kamble\nDOB: 14/03/1968\nGender: Female" },
  { id: "passbook-shanta", file: "/demo-assets/passbook-shantabai.svg", text: "Name: Shanta R. Kambale\nDOB: 14/03/1968\nGender: Female" },
  { id: "aadhaar-ramesh", file: "/demo-assets/aadhaar-ramesh.svg", text: "Name: Ramesh Wankhede\nDOB: 10/05/1984\nGender: Male" },
  { id: "land-ramesh", file: "/demo-assets/land-7-12-ramesh.svg", text: "Name: Ramesh Vankhede\nVillage: Sample Village" },
] as const;
