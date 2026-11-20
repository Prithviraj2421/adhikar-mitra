export interface HeldDocument {
  id: string;
  documentTypeId: string;
  /** null = household-level document */
  memberId: string | null;
  nameOnDocument?: string;
  dobOnDocument?: string;
  genderOnDocument?: "M" | "F" | "O";
  issuedOn?: string;
  expiresOn?: string | null;
  /** Only the last 4 digits of an Aadhaar number are ever stored. */
  aadhaarLast4?: string;
  status?: "held" | "applied" | "missing";
}
