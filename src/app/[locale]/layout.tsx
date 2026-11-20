import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { LocaleProvider } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/core";

export function generateStaticParams() {
  return [{ locale: "mr" }, { locale: "hi" }, { locale: "en" }];
}

export default function LocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  return (
    <LocaleProvider locale={params.locale}>
      <Shell>{children}</Shell>
    </LocaleProvider>
  );
}
