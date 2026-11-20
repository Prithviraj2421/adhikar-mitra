import type { L10n } from "@/lib/eligibility/types";

export const STATUSES = [
  "NOT_STARTED", "DOCUMENTS_READY", "SUBMITTED", "UNDER_VERIFICATION", "APPROVED", "PAYMENT_RECEIVED", "REJECTED",
] as const;
export type AppStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<AppStatus, L10n> = {
  NOT_STARTED: { en: "Not started", hi: "शुरू नहीं हुआ", mr: "सुरू झाले नाही" },
  DOCUMENTS_READY: { en: "Documents ready", hi: "दस्तावेज़ तैयार", mr: "कागदपत्रे तयार" },
  SUBMITTED: { en: "Submitted", hi: "जमा किया", mr: "सादर केले" },
  UNDER_VERIFICATION: { en: "Under verification", hi: "जाँच में", mr: "पडताळणीत" },
  APPROVED: { en: "Approved", hi: "स्वीकृत", mr: "मंजूर" },
  PAYMENT_RECEIVED: { en: "Payment received", hi: "भुगतान मिला", mr: "रक्कम मिळाली" },
  REJECTED: { en: "Rejected", hi: "अस्वीकृत", mr: "नाकारले" },
};

export interface AppEvent {
  from: AppStatus | null;
  to: AppStatus;
  note?: string;
  at: string; // ISO date
}
export interface Application {
  id: string;
  schemeId: string;
  memberId: string;
  status: AppStatus;
  referenceNumber?: string;
  submittedOn?: string;
  deadline?: string;
  nextAction?: string;
  updatedOn: string;
  events: AppEvent[];
}

export function newApplication(schemeId: string, memberId: string, at: string): Application {
  return {
    id: `app-${schemeId}-${memberId}`, schemeId, memberId, status: "NOT_STARTED", updatedOn: at,
    events: [{ from: null, to: "NOT_STARTED", at }],
  };
}

const NEXT_ACTION: Record<AppStatus, L10n | null> = {
  NOT_STARTED: { en: "Collect the documents", hi: "दस्तावेज़ इकट्ठा करें", mr: "कागदपत्रे गोळा करा" },
  DOCUMENTS_READY: { en: "Submit the application", hi: "आवेदन जमा करें", mr: "अर्ज सादर करा" },
  SUBMITTED: { en: "Wait for verification; keep your reference number", hi: "जाँच की प्रतीक्षा करें; संदर्भ क्रमांक रखें", mr: "पडताळणीची वाट पाहा; संदर्भ क्रमांक जपा" },
  UNDER_VERIFICATION: { en: "Answer any office queries quickly", hi: "कार्यालय के प्रश्नों का जल्दी उत्तर दें", mr: "कार्यालयाच्या प्रश्नांना लवकर उत्तर द्या" },
  APPROVED: { en: "Check that your bank account is ready for payment", hi: "भुगतान के लिए बैंक खाता तैयार रखें", mr: "रकमेसाठी बँक खाते तयार ठेवा" },
  PAYMENT_RECEIVED: null,
  REJECTED: { en: "Decode the rejection and fix the reason", hi: "अस्वीकृति का कारण समझें और सुधारें", mr: "नाकारण्याचे कारण समजून दुरुस्त करा" },
};
export const nextActionFor = (s: AppStatus) => NEXT_ACTION[s];

/** Moves an application to a new status, appending a history event. The user updates this themselves: there is no government sync. */
export function moveStatus(app: Application, to: AppStatus, at: string, note?: string): Application {
  if (app.status === to) return app;
  return {
    ...app,
    status: to,
    updatedOn: at,
    submittedOn: to === "SUBMITTED" ? at : app.submittedOn,
    nextAction: undefined, // cleared: the UI shows the localized default for the new status unless the user writes their own
    events: [...app.events, { from: app.status, to, at, note }],
  };
}
