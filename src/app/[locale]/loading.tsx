import { Logo } from "@/components/fx";

/** Shown instantly while a page loads, so navigation never looks frozen. */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite" aria-label="Loading">
      <div className="bob"><Logo size={64} /></div>
      <div className="h-2 w-44 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
        <div className="h-2 w-1/2 animate-pulse rounded-full" style={{ background: "var(--grad-sun)" }} />
      </div>
    </div>
  );
}
