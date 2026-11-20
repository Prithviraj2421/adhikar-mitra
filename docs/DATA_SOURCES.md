# Data sources and verification status

> All scheme rules were seeded from public knowledge and are **unverified**. Before any demo, a human must compare
> each criterion against the official guideline linked below, fix the JSON in `data/schemes/`, then set
> `verified: true` and `lastVerified: "YYYY-MM-DD"`. Benefit amounts are rough *estimates*, not official figures.
> Adhikar Mitra has no integration with any government system.

| Scheme | Level | Source links | Verified | Last verified | Criteria to VERIFY |
|---|---|---|---|---|---|
| Atal Pension Yojana (`atal-pension`) | CENTRAL | <https://www.pfrda.org.in/><br><https://www.npscra.nsdl.co.in/scheme-details.php> | no | pending | age-range (member.age between [18,40]) |
| Construction Worker Welfare Registration (BOCW) (`bocw-registration`) | STATE | <https://mahabocw.in/> | no | pending | age-range (member.age between [18,60]) |
| e-Shram registration (`e-shram`) | CENTRAL | <https://eshram.gov.in/> | no | pending | age-range (member.age between [16,59]) |
| Mukhyamantri Majhi Ladki Bahin Yojana (`ladki-bahin`) | STATE | <https://ladakibahin.maharashtra.gov.in/> | no | pending | age-range (member.age between [21,65])<br>income (household.annualIncomeINR lte 250000)<br>resident (household.yearsResidentInMaharashtra gte 15) |
| Post-Matric Scholarship (MahaDBT) (`mahadbt-postmatric`) | STATE | <https://mahadbt.maharashtra.gov.in/> | no | pending | caste (member.casteCategory in ["SC","ST","OBC","VJNT","SBC"])<br>income (household.annualIncomeINR lte 250000) |
| Mahatma Jyotiba Phule Jan Arogya Yojana (`mjpjay`) | STATE | <https://www.jeevandayee.gov.in/> | no | pending | income (household.annualIncomeINR lte 100000)<br>resident (household.yearsResidentInMaharashtra gte 15) |
| Namo Shetkari Mahasanman Nidhi (`namo-shetkari`) | STATE | <https://nsmny.mahait.org/> | no | pending | - |
| Indira Gandhi National Old Age Pension (NSAP) (`nsap-ignoaps`) | CENTRAL | <https://nsap.nic.in/> | no | pending | age (member.age gte 60)<br>bpl (household.rationCardType in ["AAY","BPL"]) |
| PM-KISAN Samman Nidhi (`pm-kisan`) | CENTRAL | <https://pmkisan.gov.in/> | no | pending | - |
| PM Shram Yogi Maan-dhan (`pm-sym`) | CENTRAL | <https://maandhan.in/> | no | pending | age-range (member.age between [18,40])<br>monthly-income (household.annualIncomeINR lte 180000) |
| PM Ujjwala Yojana (`pm-ujjwala`) | CENTRAL | <https://www.pmuy.gov.in/> | no | pending | age (member.age gte 18)<br>ration (household.rationCardType in ["AAY","BPL","PHH"]) |
| PM Awas Yojana – Gramin (`pmay-g`) | CENTRAL | <https://pmayg.nic.in/> | no | pending | - |
| PM Awas Yojana – Urban (`pmay-u`) | CENTRAL | <https://pmaymis.gov.in/> | no | pending | income (household.annualIncomeINR lte 600000) |
| Ayushman Bharat PM-JAY (`pmjay`) | CENTRAL | <https://pmjay.gov.in/><br><https://beneficiary.nha.gov.in/> | no | pending | ration (household.rationCardType in ["AAY","BPL","PHH"]) |
| PM Jeevan Jyoti Bima Yojana (`pmjjby`) | CENTRAL | <https://jansuraksha.gov.in/> | no | pending | age-range (member.age between [18,50]) |
| PM Matru Vandana Yojana (`pmmvy`) | CENTRAL | <https://pmmvy.wcd.gov.in/> | no | pending | age (member.age gte 19) |
| Sanjay Gandhi Niradhar Anudan Yojana (`sgny`) | STATE | <https://sjsa.maharashtra.gov.in/> | no | pending | age-cap (member.age lt 65)<br>income (household.annualIncomeINR lte 50000)<br>resident (household.yearsResidentInMaharashtra gte 15) |
| Shravanbal Seva Rajya Nivruttivetan Yojana (`shravanbal`) | STATE | <https://sjsa.maharashtra.gov.in/> | no | pending | age (member.age gte 65)<br>income (household.annualIncomeINR lte 50000)<br>resident (household.yearsResidentInMaharashtra gte 15) |
