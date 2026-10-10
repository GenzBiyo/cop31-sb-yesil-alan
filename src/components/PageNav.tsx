"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

/** Up one level, skipping path prefixes that have no page of their own. */
function parentOf(pathname: string) {
  const seg = pathname.split("/").filter(Boolean);
  if (seg[0] === "giris") return "/";
  if (seg[0] === "e" || seg[0] === "g") return "/kesfet";
  if (seg[0] === "sunucu") return "/oyunlar";
  if (seg[0] === "u" && seg[1] === "etiket") return "/u";
  if (seg[0] === "oyun" && seg.length >= 3) return "/oyun";
  seg.pop();
  return "/" + seg.join("/");
}

function hidden(pathname: string) {
  const seg = pathname.split("/").filter(Boolean);
  if (seg.length === 0 || seg[0] === "ekran" || seg[0] === "u") return true;
  return seg[0] === "oyun" && seg.length === 2;
}

export function PageNav() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { tx } = useI18n();
  if (hidden(pathname)) return null;
  const parent = parentOf(pathname);
  function goBack() {
    const here = window.location.pathname;
    if (window.history.length > 1) {
      window.history.back();
      window.setTimeout(() => {
        if (window.location.pathname === here) router.push(parent);
      }, 350);
    } else {
      router.push(parent);
    }
  }
  return (
    <nav className="page-nav no-print" aria-label={tx("Sayfa gezintisi")}>
      <button type="button" onClick={goBack} aria-label={tx("Geri")} title={tx("Bir önceki sayfaya dön")}>
        <ArrowLeft size={17} />
      </button>
      <Link href="/" aria-label={tx("Ana sayfa")} title={tx("Ana sayfa")}>
        <Home size={17} />
      </Link>
    </nav>
  );
}
