// The storyboard as data. `d` is the target length in seconds (the recording is sped up slightly or held on its
// last frame to hit it). Total after 0.3 s cross-fades must stay under 2:58.
export const FADE = 0.3;

export const SCENES = [
  { id: "s01-title", kind: "still", card: "title", d: 6, what: "Title card: Adhikar Mitra · अधिकार मित्र, tagline, YCCE HackKumbh · PS 5" },
  { id: "s02-problem", kind: "card", d: 11, cap: "Eligible families miss benefits they already qualify for", what: "Three stats from the deck animate in: 1.18 crore in Maharashtra slums, 33% of Indian women ever online, 3,000+ schemes" },
  { id: "s03-ask", kind: "mobile", d: 25, step: "1", cap: "Ask once, for the whole family", what: "Pick मराठी, consent, demo login, one-question-per-screen household questionnaire (voice answer simulated and labelled), then the whole family is entered" },
  { id: "s04-map", kind: "mobile", d: 17, step: "2", cap: "Every scheme and its ₹ value", what: "Family Benefit Map in Marathi: cash total counts up, members (Ramesh, Sunita, Priya, Rohan), each scheme with its estimated ₹" },
  { id: "s05-explain", kind: "mobile", d: 13, cap: "Rules from official guidelines decide. AI never does.", what: "PM-KISAN 'Why?' page: each condition ticked with your value against the required value, plain-language explanation, source link with Official ✓" },
  { id: "s06-unlock", kind: "mobile", d: 20, step: "3", cap: "Which document to get first", what: "Documents: 'Get this first: Income certificate', step plan, Unlock Graph with the income-certificate path highlighted, then the Wankhede vs Vankhede mismatch flag" },
  { id: "s07-track", kind: "mobile", d: 24, step: "4", cap: "Track until the money arrives", what: "Application guide with Official ✓ link, tracker moves Submitted → Under verification → Rejected, Marathi SMS inbox, Rejection Decoder reads a SAMPLE notice" },
  { id: "s08-proactive", kind: "mobile", d: 12, cap: "Life-event alerts · Scam Shield", what: "Time travel: Shantabai turns 60 and the Old Age Pension appears with an SMS; Scam Shield marks a 'pay ₹500 fee + OTP' message Dangerous" },
  { id: "s09-sahayak", kind: "desktop", d: 21, cap: "Works offline for NGO helpers", what: "Sahayak dashboard: go offline, add a family (verbal consent), Pending 1; reconnect, Synced 1; sync pressed again: still exactly one" },
  { id: "s10-ngo", kind: "desktop", d: 17, cap: "Shows who is eligible but not reached", what: "Benefit Gap Map of synthetic Nagpur wards, Ward 7 top blocker (income certificate), Plan a camp sends SMS to that ward" },
  { id: "s11-closing", kind: "still", card: "closing", d: 8, what: "Closing card: tagline, GitHub URL, team" },
];
