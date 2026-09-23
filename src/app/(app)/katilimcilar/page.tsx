"use client";

import { useMemo, useState } from "react";
import { formatDate, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Row = {
  id: string;
  createdAt: string;
  score: number;
  prize: string;
  collectedByName: string;
  collectedByRole: string;
  visitor: { fullName: string; email: string; phone: string; organization: string; city: string; visitorType: string };
  event: { title: string; type: string; companyName: string; date: string };
};

export default function ParticipantsPage() {
  const { tx } = useI18n();
  const { data } = useApi<Row[]>("/api/participants");
  const [q, setQ] = useState("");
  const [showContact, setShowContact] = useState(false);
  const rows = useMemo(() => {
    const list = data || [];
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter((r) =>
      `${r.visitor.fullName} ${r.visitor.email} ${r.visitor.organization} ${r.event.title} ${r.event.companyName} ${r.collectedByName}`.toLowerCase().includes(s)
    );
  }, [data, q]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <h1 className="display text-4xl">{tx("Katılımcı defteri")}</h1>
          <p className="text-[#57534e]">QR ve elçi kayıtları Excel benzeri listede. İletişim bilgileri isteğe bağlı açılır.</p>
        </div>
        <a className="btn" href="/api/participants/export">Excel indir</a>
      </div>
      <div className="flex flex-wrap gap-2">
        <input className="field max-w-xs" placeholder="Ara" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={showContact ? "btn" : "btn ghost"} onClick={() => setShowContact((v) => !v)}>
          {showContact ? "İletişimi gizle" : "İletişimi göster"}
        </button>
        <span className="text-sm self-center text-[#57534e]">{rows.length} kayıt</span>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Etkinlik</th>
              <th>Ad</th>
              {showContact ? <th>E-posta</th> : null}
              {showContact ? <th>Telefon</th> : null}
              <th>Kurum / şehir</th>
              <th>Tip</th>
              <th>Elçi</th>
              <th>Puan / hediye</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-xs">{new Date(r.createdAt).toLocaleString("tr-TR")}</td>
                <td>
                  <div>{r.event.title}</div>
                  <div className="text-xs text-[#57534e]">{r.event.companyName} · {formatDate(r.event.date)}</div>
                </td>
                <td>{r.visitor.fullName}</td>
                {showContact ? <td className="text-xs">{r.visitor.email}</td> : null}
                {showContact ? <td className="text-xs">{r.visitor.phone || "—"}</td> : null}
                <td className="text-sm">{r.visitor.organization || "—"}<div className="text-xs">{r.visitor.city}</div></td>
                <td>{r.visitor.visitorType}</td>
                <td className="text-xs">{r.collectedByName || r.collectedByRole}</td>
                <td className="text-sm">{r.score ? `${r.score} puan · ` : ""}{r.prize || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
