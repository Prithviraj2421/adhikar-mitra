import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans";
import "@fontsource-variable/noto-sans-devanagari";
import { APP } from "@/config/app";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP.name} (${APP.nameLocal})`,
  description: APP.tagline,
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#3730a3" };

/**
 * Applies the saved Light / Dark / System choice before first paint, so there is no flash of the wrong theme.
 * The default is Light. Storage can be unavailable (private mode), so everything is wrapped in try/catch.
 */
const THEME_SCRIPT = `(function(){try{var t="light";try{var s=JSON.parse(localStorage.getItem("adhikar-mitra:v1")||"{}");if(s&&s.theme)t=s.theme}catch(e){}
var d=t==="dark"||(t==="system"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
