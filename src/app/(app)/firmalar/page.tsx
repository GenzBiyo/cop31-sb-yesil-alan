"use client";

import Link from "next/link";
import { useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Company = {
  id: string;
  name: string;
  scope: string;
  topic: string;
  participationDates: string;
  contribution: string;
  status: string;
  booth: string;
  rules: { status: string }[];
};

export default function FirmsPage() {
  const { tx } = useI18n();
  const { data } = useApi<Company[]>("/api/companies");
  return (
    <div className="space-y-4">
      <h1 className="display text-4xl">{tx("Private company & paydaşlar")}</h1>
      <p className="text-[#57534e]">{tx("UN, EBRD, EXIM Bank ve firmalar bu listeden yönetilir. Profil, kural ve katkılar firma sayfasındadır.")}</p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{tx("Firma")}</th>
              <th>{tx("Kapsam")}</th>
              <th>{tx("Konu")}</th>
              <th>{tx("Tarih")}</th>
              <th>{tx("Katkı")}</th>
              <th>{tx("Stant")}</th>
              <th>{tx("Durum")}</th>
              <th>{tx("Kurallar")}</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((c) => {
              const done = c.rules.filter((r) => r.status === "Tamamlandı").length;
              return (
                <tr key={c.id}>
                  <td><Link className="text-[#0077C2]" href={`/firmalar/${c.id}`}>{c.name}</Link></td>
                  <td>{c.scope}</td>
                  <td>{c.topic || "—"}</td>
                  <td>{c.participationDates}</td>
                  <td className="max-w-xs">{c.contribution}</td>
                  <td>{c.booth || "—"}</td>
                  <td><span className={`badge ${c.status === "Onaylandı" ? "ok" : "warn"}`}>{c.status}</span></td>
                  <td>{done}/{c.rules.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
