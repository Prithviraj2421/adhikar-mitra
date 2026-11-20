"use client";
/** Visual building blocks: logo mark, orbiting-benefits hero, progress ring, confetti, category styling. */
import type { CSSProperties, ReactNode } from "react";

export const CATEGORY_STYLE: Record<string, { icon: string; grad: string }> = {
  PENSION: { icon: "👵", grad: "linear-gradient(135deg,#7c3aed,#c084fc)" },
  HEALTH: { icon: "🏥", grad: "linear-gradient(135deg,#e11d48,#fb7185)" },
  HOUSING: { icon: "🏠", grad: "linear-gradient(135deg,#0284c7,#38bdf8)" },
  FARMER: { icon: "🌾", grad: "linear-gradient(135deg,#65a30d,#bef264)" },
  WOMEN: { icon: "👩", grad: "linear-gradient(135deg,#db2777,#f9a8d4)" },
  STUDENT: { icon: "🎓", grad: "linear-gradient(135deg,#4338ca,#818cf8)" },
  WORKER: { icon: "👷", grad: "linear-gradient(135deg,#ea580c,#fdba74)" },
  INSURANCE: { icon: "🛡️", grad: "linear-gradient(135deg,#0d9488,#5eead4)" },
  ENERGY: { icon: "🔥", grad: "linear-gradient(135deg,#d97706,#fcd34d)" },
};

export function CategoryBadge({ category, size = 44 }: { category: string; size?: number }) {
  const s = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.PENSION;
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-2xl shadow-md"
      style={{ width: size, height: size, background: s.grad, fontSize: size * 0.5 }}
    >
      {s.icon}
    </span>
  );
}

/** Brand mark: two hands lifting a rising sun. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4338ca" /><stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f97316" /><stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#lg1)" />
      <circle cx="32" cy="27" r="11" fill="url(#lg2)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="32" y1="27" x2="32" y2="10" stroke="#fde68a" strokeWidth="2" strokeLinecap="round"
          transform={`rotate(${a} 32 27) translate(0 -2)`} opacity=".0" />
      ))}
      <path d="M8 44c8 2 14 6 24 6s16-4 24-6c-2 8-10 13-24 13S10 52 8 44z" fill="#fff" opacity=".95" />
      <path d="M14 42c6 1 11 4 18 4s12-3 18-4" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6" />
    </svg>
  );
}

const ORBIT = ["💰", "🏥", "🌾", "🎓", "👩", "🏠", "🛡️", "🔥"];

/** The hero visual: a family home as a rising sun with benefits orbiting it. */
export function HeroOrbit({ size = 300 }: { size?: number }) {
  const r1 = size * 0.36;
  const r2 = size * 0.48;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} aria-hidden>
      <div className="absolute inset-0 rounded-full" style={{ border: "2px dashed rgba(255,255,255,.35)", transform: "scale(.74)" }} />
      <div className="absolute inset-0 rounded-full" style={{ border: "2px dashed rgba(255,255,255,.2)" }} />
      <div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{ width: size * 0.34, height: size * 0.34, background: "var(--grad-sun)", animation: "sunpulse 3.4s ease-in-out infinite", fontSize: size * 0.17 }}
      >
        🏡
      </div>
      {[r1, r2].map((r, ring) => (
        <div
          key={ring} className="orbit-wrap absolute left-1/2 top-1/2"
          style={{ width: 0, height: 0, ["--dur" as string]: `${ring === 0 ? 22 : 34}s`, animationDirection: ring ? "reverse" : "normal" } as CSSProperties}
        >
          {ORBIT.filter((_, i) => i % 2 === ring).map((e, i, arr) => {
            const a = (i / arr.length) * Math.PI * 2 + ring * 0.6;
            return (
              <span
                key={e} className="orbit-item absolute flex items-center justify-center rounded-full shadow-lg"
                style={{
                  left: Math.cos(a) * r - 22, top: Math.sin(a) * r - 22, width: 44, height: 44, fontSize: 22,
                  background: "rgba(255,255,255,.92)", animationDirection: ring ? "reverse" : "normal", ["--dur" as string]: `${ring === 0 ? 22 : 34}s`,
                } as CSSProperties}
              >
                {e}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Animated donut. `value` of `max` is filled. */
export function Ring({
  value, max, size = 76, stroke = 9, color = "#16a34a", children,
}: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const frac = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,120,160,.25)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - frac)}
          style={{ ["--len" as string]: len, animation: "ringfill 1.1s ease-out both" } as CSSProperties}
        />
      </svg>
      <span className="absolute text-center text-sm font-extrabold leading-none">{children}</span>
    </div>
  );
}

/** Confetti burst from a point (or the centre of the screen). Pure DOM + Web Animations; respects reduced motion. */
export function confetti(origin?: { x: number; y: number }, count = 46) {
  if (typeof document === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const x0 = origin?.x ?? window.innerWidth / 2;
  const y0 = origin?.y ?? window.innerHeight * 0.35;
  const colors = ["#f97316", "#fbbf24", "#7c3aed", "#16a34a", "#ec4899", "#38bdf8"];
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    const size = 6 + Math.random() * 8;
    Object.assign(el.style, {
      position: "fixed", left: `${x0}px`, top: `${y0}px`, width: `${size}px`, height: `${size * 0.5}px`, zIndex: "9999",
      background: colors[i % colors.length], borderRadius: "2px", pointerEvents: "none",
    });
    document.body.appendChild(el);
    const ang = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 190;
    el.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist - 60}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${Math.cos(ang) * dist * 1.1}px, ${Math.sin(ang) * dist + 220}px) rotate(${Math.random() * 900}deg)`, opacity: 0 },
      ],
      { duration: 1300 + Math.random() * 700, easing: "cubic-bezier(.2,.7,.3,1)" },
    ).onfinish = () => el.remove();
  }
}
