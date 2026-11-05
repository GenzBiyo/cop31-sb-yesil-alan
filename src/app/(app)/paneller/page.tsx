"use client";

import { SessionDesk } from "@/components/SessionDesk";
import { PanelScreenControl } from "@/components/PanelScreenControl";
import { useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

export default function PanelsPage() {
  const { tx } = useI18n();
  const me = useApi<{ role: string; canCreatePanel?: boolean }>("/api/auth/me");
  if (me.loading) return null;
  if (me.data?.role === "ELCI" && !me.data.canCreatePanel) {
    return (
      <div className="card p-6">
        <h1 className="display text-3xl">{tx("Paneller")}</h1>
        <p className="text-[#57534e] mt-2">{tx("Panel oluşturma yetkiniz yok. Sağlık Bakanlığı bu yetkiyi elçi kaydınızdan açabilir.")}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {me.data?.role === "ELCI" ? null : <PanelScreenControl />}
      <SessionDesk mode="panel" />
    </div>
  );
}
