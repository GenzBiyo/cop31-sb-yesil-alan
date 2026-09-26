"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  FileDown,
  LayoutDashboard,
  LogOut,
  Map,
  MessageSquare,
  Mic2,
  Sparkles,
  GraduationCap,
  UserPlus,
  Gamepad2,
  Users,
  Trees,
  Trophy,
  BadgeCheck,
  Smartphone,
} from "lucide-react";
import { api, copCountdown, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { AgendaAlerts } from "@/components/AgendaAlerts";

type Me = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SAGLIK" | "FIRMA";
  companyId: string | null;
  title: string;
  unread: number;
  openQa: number;
  pendingAccounts?: number;
  pendingPanels?: number;
  pendingEvents?: number;
};

const NAV = [
  { href: "/dashboard", label: "Özet", icon: LayoutDashboard, roles: ["ADMIN", "SAGLIK", "FIRMA"] },
  { href: "/todos", label: "Hazırlık to-do", icon: ClipboardList, roles: ["ADMIN", "SAGLIK"] },
  { href: "/takvim", label: "Hazırlık takvimi", icon: CalendarDays, roles: ["ADMIN", "SAGLIK"] },
  { href: "/program", label: "COP31 gündem", icon: Sparkles, roles: ["ADMIN", "SAGLIK", "FIRMA"] },
  { href: "/uygulama", label: "Ziyaretçi uygulaması", icon: Smartphone, roles: ["ADMIN", "SAGLIK"] },
  { href: "/solaklar", label: "Solaklar outdoor", icon: Trees, roles: ["ADMIN", "SAGLIK", "FIRMA"] },
  { href: "/elciler", label: "İklim Sağlık Elçileri", icon: GraduationCap, roles: ["ADMIN", "SAGLIK"] },
  { href: "/firmalar", label: "Firmalar", icon: Building2, roles: ["ADMIN", "SAGLIK"] },
  { href: "/hesaplar", label: "Hesap onayları", icon: UserPlus, roles: ["ADMIN"] },
  { href: "/profil", label: "Firma profilim", icon: Building2, roles: ["FIRMA"] },
  { href: "/paneller", label: "Paneller", icon: Mic2, roles: ["ADMIN", "SAGLIK", "FIRMA"] },
  { href: "/etkinlikler", label: "Etkinlikler", icon: Gamepad2, roles: ["ADMIN", "SAGLIK", "FIRMA"] },
  { href: "/sponsorlar", label: "Sponsorlar", icon: BadgeCheck, roles: ["ADMIN"] },
  { href: "/oyunlar", label: "Etkileşim oyunları", icon: Trophy, roles: ["ADMIN", "SAGLIK"] },
  { href: "/katilimcilar", label: "Katılımcılar", icon: Users, roles: ["ADMIN", "SAGLIK"] },
  { href: "/mesajlar", label: "Mesaj kutusu", icon: MessageSquare, roles: ["ADMIN", "SAGLIK", "FIRMA"] },
  { href: "/soru-cevap", label: "Soru-cevap", icon: MessageSquare, roles: ["ADMIN", "SAGLIK", "FIRMA"] },
  { href: "/anonslar", label: "Anonslar", icon: Bell, roles: ["ADMIN", "SAGLIK", "FIRMA"] },
  { href: "/alan-plani", label: "Alan planı", icon: Map, roles: ["ADMIN", "SAGLIK", "FIRMA"] },
  { href: "/dokumanlar", label: "PDF dökümanlar", icon: FileDown, roles: ["ADMIN", "SAGLIK", "FIRMA"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tx, t } = useI18n();
  const [me, setMe] = useState<Me | null>(null);

  const load = useCallback(async () => {
    try {
      const user = await api<Me>("/api/auth/me");
      setMe(user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "Oturum yok" || msg === "Oturum gerekli") router.push("/");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(
    useCallback(
      (type) => {
        if (type === "inbox" || type === "announcement" || type === "qa" || type === "message" || type === "account" || type === "agenda" || type === "panel") void load();
      },
      [load]
    )
  );

  const items = useMemo(() => NAV.filter((n) => me && n.roles.includes(me.role)), [me]);
  const days = copCountdown();
  const roleLabel = me?.role === "ADMIN" ? tx("Admin") : me?.role === "SAGLIK" ? tx("Sağlık Bakanlığı") : tx("Firma");

  return (
    <div className="min-h-screen grid lg:grid-cols-[260px_1fr] bg-[#C7E4F3]">
      <aside className="bg-white text-[#0B1C33] px-3 py-5 border-r border-[#D4ECF6]">
        <Link href="/dashboard" className="block px-2">
          <img src="/brand/cop31-turkiye.png" alt="COP31 Türkiye Antalya" className="w-[168px] h-auto" />
        </Link>
        <p className="px-2 mt-3 text-[10px] tracking-[0.18em] uppercase text-[#0077C2]">{tx("T.C. Sağlık Bakanlığı")}</p>
        <p className="px-2 mt-1 text-sm font-semibold text-[#0077C2]">{tx("Hazırlık masası")}</p>
        <p className="px-2 mt-0.5 text-xs text-[#3E6A88]">{tx("Antalya · 9–20 Kasım 2026")}</p>
        <div className="mx-2 mt-4 bg-[#00A3E0] text-white px-3 py-2">
          <span className="text-xs tracking-[0.12em] uppercase opacity-90">{t("shell.countdown")}</span>
          <div className="display text-3xl leading-none mt-0.5">{t("common.days", { n: days })}</div>
        </div>
        <nav className="mt-5 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className={`sidebar-link ${active ? "active" : ""}`}>
                <Icon size={16} />
                <span className="flex-1">{tx(item.label)}</span>
                {item.href === "/mesajlar" && me && me.unread > 0 ? <span className="badge high">{me.unread}</span> : null}
                {item.href === "/soru-cevap" && me && me.openQa > 0 ? <span className="badge warn">{me.openQa}</span> : null}
                {item.href === "/hesaplar" && me && (me.pendingAccounts || 0) > 0 ? <span className="badge high">{me.pendingAccounts}</span> : null}
                {item.href === "/paneller" && me && (me.pendingPanels || 0) > 0 ? <span className="badge warn">{me.pendingPanels}</span> : null}
                {item.href === "/etkinlikler" && me && (me.pendingEvents || 0) > 0 ? <span className="badge warn">{me.pendingEvents}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 px-2 text-xs text-[#3E6A88]">
          <div className="font-semibold text-[#0B1C33]">{me?.name}</div>
          <div>{roleLabel}</div>
          <div className="opacity-80">{me?.email}</div>
          <button
            className="btn ghost mt-3"
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" });
              router.push("/");
            }}
          >
            <LogOut size={14} /> {tx("Çıkış")}
          </button>
        </div>
      </aside>
      <AgendaAlerts />
      <div className="min-w-0">
        <header className="no-print flex items-center justify-between px-6 py-3 border-b border-[#D4ECF6] bg-white pr-28">
          <div>
            <div className="text-xs tracking-[0.18em] uppercase text-[#00A3E0]">{tx("Sağlık Pavilionu · Yeşil Alan")}</div>
            <div className="text-sm text-[#3E6A88]">{tx("Sağlıklı İnsan, Sağlıklı Gezegen")}</div>
          </div>
          <Link href="/anonslar" className="relative">
            <Bell size={18} />
            {me && me.unread > 0 ? (
              <span className="absolute -top-2 -right-2 badge high">{me.unread}</span>
            ) : null}
          </Link>
        </header>
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
