"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { api, useApi, useRealtime } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { COP_DAY_OPTIONS } from "@/lib/cop-days";

type Game = { id: string; title: string; type: string; slug: string };
type Row = {
  id: string;
  gameId: string;
  companyId: string;
  date: string;
  startTime: string;
  endTime: string;
  prize: string;
  prizeQty: number;
  notes: string;
  status: string;
  reviewNote: string;
  company: { id: string; name: string; logoPath?: string };
  game: Game;
  reach: { players: number; winners: number };
};
type Payload = {
  games: Game[];
  companies: { id: string; name: string; logoPath?: string }[];
  sponsorships: Row[];
  taken: { id: string; gameId: string; date: string; startTime: string; endTime: string }[];
};

const GAME_TYPE: Record<string, string> = {
  quiz: "Soru-cevap",
  wheel: "Dijital çark",
  match: "Hafıza / eşleştirme",
  kilo: "Kilo karbon",
  hatira: "Hatıra fotoğrafı",
  plak: "Plak",
};

const BADGE: Record<string, string> = {
  "Onay bekliyor": "warn",
  Onaylandı: "ok",
  Tamamlandı: "muted",
  Reddedildi: "high",
};

const EMPTY = {
  gameId: "",
  companyId: "",
  date: "2026-11-09",
  startTime: "17:00",
  endTime: "18:00",
  prize: "",
  prizeQty: 0,
  notes: "",
};

export default function GameSponsorsPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Payload>("/api/game-sponsors");
  const { data: me } = useApi<{ role: string; companyId?: string | null }>("/api/auth/me");
  const manager = me?.role === "ADMIN" || me?.role === "SAGLIK";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [view, setView] = useState<"days" | "firms">("days");

  useRealtime((t) => {
    if (t === "agenda") void reload();
  });

  const rows = useMemo(() => data?.sponsorships || [], [data]);
  const pending = rows.filter((r) => r.status === "Onay bekliyor");
  const live = rows.filter((r) => r.status === "Onaylandı" || r.status === "Tamamlandı");

  const byDay = useMemo(
    () =>
      COP_DAY_OPTIONS.map((d) => ({
        ...d,
        rows: rows.filter((r) => r.date === d.date && r.status !== "Reddedildi"),
      })),
    [rows]
  );

  const byFirm = useMemo(() => {
    const map = new Map<string, { name: string; sessions: number; players: number; winners: number; prizes: number; days: Set<string> }>();
    for (const r of live) {
      const cur = map.get(r.companyId) || { name: r.company.name, sessions: 0, players: 0, winners: 0, prizes: 0, days: new Set<string>() };
      cur.sessions += 1;
      cur.players += r.reach.players;
      cur.winners += r.reach.winners;
      cur.prizes += r.prizeQty;
      cur.days.add(r.date);
      map.set(r.companyId, cur);
    }
    return [...map.values()].sort((a, b) => b.sessions - a.sessions);
  }, [live]);

  const formCompany = manager
    ? (data?.companies || []).find((c) => c.id === form.companyId)
    : rows.find((r) => r.companyId === me?.companyId)?.company;
  const takenForForm = (data?.taken || []).filter((t) => t.gameId === form.gameId && t.date === form.date);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/game-sponsors", { method: "POST", body: JSON.stringify(form) });
      setInfo(manager ? tx("Sponsorluk oturumu eklendi.") : tx("Talebiniz Sağlık Bakanlığı onayına gönderildi."));
      setForm({ ...EMPTY, gameId: form.gameId, companyId: form.companyId, date: form.date });
      setShowForm(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Kayıt alınamadı"));
    }
  }

  async function review(row: Row, decision: "approve" | "reject") {
    setError("");
    try {
      await api(`/api/game-sponsors/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ review: decision, reviewNote: notes[row.id] || "" }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("İşlem yapılamadı"));
    }
  }

  async function setStatus(row: Row, status: string) {
    await api(`/api/game-sponsors/${row.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await reload();
  }

  async function remove(row: Row) {
    if (!confirm(tx("Bu sponsorluk oturumu silinsin mi?"))) return;
    await api(`/api/game-sponsors/${row.id}`, { method: "DELETE" });
    await reload();
  }

  const kpis: [string, string, string][] = [
    ["Onaylı oturum", String(rows.filter((r) => r.status === "Onaylandı").length), "#32C45A"],
    ["Onay bekleyen", String(pending.length), "#F5A623"],
    ["Sponsor firma", String(byFirm.length), "#00A3E0"],
    ["Oyuncu (sponsorlu saatlerde)", String(live.reduce((s, r) => s + r.reach.players, 0)), "#0077C2"],
    ["Planlanan ödül", String(live.reduce((s, r) => s + r.prizeQty, 0)), "#E31C23"],
  ];

  if (!me || !data) return <p>{tx("Yükleniyor…")}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-4xl">{tx("Oyun sponsorlukları")}</h1>
          <p className="text-[#57534e]">
            {manager
              ? tx("Hangi gün, hangi saatte, hangi firmanın hangi oyunu katılımcılara oynatacağını buradan planlayın ve onaylayın.")
              : tx("Sponsor olmak istediğiniz oyunu, günü ve saati seçin. Sağlık Bakanlığı onaylayınca takvime işlenir.")}
          </p>
        </div>
        <button type="button" className={showForm ? "btn ghost" : "btn"} onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? tx("Formu kapat") : manager ? tx("Yeni sponsorluk ekle") : tx("Sponsorluk talebi oluştur")}
        </button>
      </div>

      {info ? <p className="text-sm text-[#22A34A]">{info}</p> : null}
      {error ? <p className="text-sm text-[#E31C23]">{error}</p> : null}

      {showForm ? (
        <form className="card p-4 grid md:grid-cols-4 gap-2" onSubmit={submit}>
          <label className="text-sm md:col-span-2">{tx("Oyun")}
            <select className="field mt-1" required value={form.gameId} onChange={(e) => setForm({ ...form, gameId: e.target.value })}>
              <option value="" disabled>{tx("Oyun seçin")}</option>
              {(data?.games || []).map((g) => (
                <option key={g.id} value={g.id}>{g.title} · {tx(GAME_TYPE[g.type] || g.type)}</option>
              ))}
            </select>
          </label>
          {manager ? (
            <label className="text-sm md:col-span-2">{tx("Sponsor firma")}
              <select className="field mt-1" required value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                <option value="" disabled>{tx("Firma seçin")}</option>
                {(data?.companies || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          ) : <div className="md:col-span-2" />}
          <label className="text-sm md:col-span-2">{tx("Gün")}
            <select className="field mt-1" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}>
              {COP_DAY_OPTIONS.map((d) => (
                <option key={d.date} value={d.date}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">{tx("Başlangıç")}
            <input className="field mt-1" type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </label>
          <label className="text-sm">{tx("Bitiş")}
            <input className="field mt-1" type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </label>
          {form.gameId ? (
            <p className="text-xs text-[#57534e] md:col-span-4">
              {takenForForm.length
                ? `${tx("Bu oyun için bu gün dolu saatler")}: ${takenForForm.map((t) => `${t.startTime}–${t.endTime}`).join(", ")}`
                : tx("Bu oyun için bu gün tüm saatler boş.")}
            </p>
          ) : null}
          {formCompany ? (
            <div className="md:col-span-4 flex items-center gap-3">
              <SponsorLogo company={formCompany} canEdit onChange={reload} />
              <p className="text-xs text-[#57534e]">
                {tx("Onaylı saat aralığında oyunun duvar ekranında ve oyuncu telefonlarında “Etkinlik Sponsoru” başlığıyla bu logo büyük olarak gösterilir.")}
              </p>
            </div>
          ) : null}
          <label className="text-sm md:col-span-2">{tx("Ödül / hediye")}
            <input className="field mt-1" placeholder={tx("Örn. termos, bez çanta")} value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} />
          </label>
          <label className="text-sm">{tx("Ödül adedi")}
            <input className="field mt-1" type="number" min={0} value={form.prizeQty} onChange={(e) => setForm({ ...form, prizeQty: Number(e.target.value) })} />
          </label>
          <div />
          <label className="text-sm md:col-span-4">{tx("Not")}
            <textarea className="field mt-1" rows={2} placeholder={tx("Logo, sunucu, özel istekler")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <button className="btn">{manager ? tx("Oturumu ekle") : tx("SB'ye öner")}</button>
        </form>
      ) : null}

      {manager ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {kpis.map(([k, v, accent]) => (
            <div key={k} className="card p-4" style={{ borderLeft: `4px solid ${accent}` }}>
              <div className="text-xs uppercase tracking-[0.14em] text-[#3E6A88]">{tx(k)}</div>
              <div className="display text-3xl mt-1 text-[#0077C2]">{v}</div>
            </div>
          ))}
        </div>
      ) : null}

      {pending.length ? (
        <section className="card p-4 space-y-3" style={{ borderLeft: "4px solid #F5A623" }}>
          <h2 className="display text-2xl">{manager ? tx("Onay bekleyen talepler") : tx("Onay bekleyen taleplerim")}</h2>
          {pending.map((r) => (
            <div key={r.id} className="border border-[#B5DFF2] p-3 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="text-xs text-[#0077C2]">{dayLabel(r.date)} · {r.startTime}–{r.endTime}</div>
                  <div className="font-semibold">{r.game.title} — {r.company.name}</div>
                  <div className="text-sm text-[#57534e]">
                    {r.prize ? `${tx("Ödül")}: ${r.prize}${r.prizeQty ? ` × ${r.prizeQty}` : ""}` : tx("Ödül belirtilmedi")}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </div>
                </div>
                <span className="badge warn">{tx("Onay bekliyor")}</span>
              </div>
              {manager ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <input className="field max-w-sm" placeholder={tx("Firmaya not (isteğe bağlı)")} value={notes[r.id] || ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                  <button className="btn" onClick={() => void review(r, "approve")}>{tx("Onayla")}</button>
                  <button className="btn ghost" onClick={() => void review(r, "reject")}>{tx("Reddet")}</button>
                </div>
              ) : (
                <button className="btn ghost" style={{ color: "#E31C23" }} onClick={() => void remove(r)}>{tx("Talebi geri çek")}</button>
              )}
            </div>
          ))}
        </section>
      ) : null}

      {manager ? (
        <div className="flex gap-2">
          <button className={view === "days" ? "btn" : "btn ghost"} onClick={() => setView("days")}>{tx("Gün gün takvim")}</button>
          <button className={view === "firms" ? "btn" : "btn ghost"} onClick={() => setView("firms")}>{tx("Firma bazında")}</button>
        </div>
      ) : null}

      {view === "firms" && manager ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{tx("Firma")}</th>
                <th>{tx("Oturum")}</th>
                <th>{tx("Gün")}</th>
                <th>{tx("Oyuncu")}</th>
                <th>{tx("Kazanan")}</th>
                <th>{tx("Planlanan ödül")}</th>
              </tr>
            </thead>
            <tbody>
              {byFirm.map((f) => (
                <tr key={f.name}>
                  <td>{f.name}</td>
                  <td>{f.sessions}</td>
                  <td>{f.days.size}</td>
                  <td>{f.players}</td>
                  <td>{f.winners}</td>
                  <td>{f.prizes}</td>
                </tr>
              ))}
              {byFirm.length === 0 ? (
                <tr><td colSpan={6} className="text-sm text-[#57534e]">{tx("Henüz onaylı sponsorluk yok.")}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {byDay.map((d) => (
            <section key={d.date} className="space-y-2">
              <h2 className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">{d.label}</h2>
              {d.rows.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Bu gün sponsorlu oyun yok.")}</p> : null}
              {d.rows.map((r) => (
                <div key={r.id} className="card p-4 flex flex-wrap justify-between gap-3 items-start">
                  <SponsorLogo company={r.company} canEdit={manager || r.companyId === me.companyId} onChange={reload} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-[#0077C2]">{r.startTime}–{r.endTime} · {tx(GAME_TYPE[r.game.type] || r.game.type)}</div>
                    <div className="display text-2xl">{r.game.title}</div>
                    <div className="text-sm text-[#57534e]">
                      {tx("Sponsor")}: <strong>{r.company.name}</strong>
                      {r.prize ? ` · ${r.prize}${r.prizeQty ? ` × ${r.prizeQty}` : ""}` : ""}
                    </div>
                    {r.status !== "Onay bekliyor" ? (
                      <div className="text-xs text-[#57534e] mt-1">{r.reach.players} {tx("oyuncu")} · {r.reach.winners} {tx("kazanan")}</div>
                    ) : null}
                    {r.notes ? <div className="text-xs text-[#57534e] mt-1">{r.notes}</div> : null}
                    {r.reviewNote ? <div className="text-xs text-[#0077C2] mt-1">{tx("SB notu")}: {r.reviewNote}</div> : null}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`badge ${BADGE[r.status] || "muted"}`}>{tx(r.status)}</span>
                    {manager && r.status !== "Onay bekliyor" ? (
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Link className="btn ghost" href={`/sunucu/${r.game.slug}`} target="_blank">{tx("Sunucu ekranı")}</Link>
                        <Link className="btn ghost" href={`/oyun/${r.game.slug}`} target="_blank">{tx("Duvar ekranı")}</Link>
                        {r.status === "Onaylandı" ? (
                          <button className="btn ghost" onClick={() => void setStatus(r, "Tamamlandı")}>{tx("Tamamlandı")}</button>
                        ) : (
                          <button className="btn ghost" onClick={() => void setStatus(r, "Onaylandı")}>{tx("Geri al")}</button>
                        )}
                        <button className="btn ghost" style={{ color: "#E31C23" }} onClick={() => void remove(r)}>{tx("Sil")}</button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </section>
          ))}
          {!manager && rows.some((r) => r.status === "Reddedildi") ? (
            <section className="card p-4 space-y-2">
              <h2 className="display text-2xl">{tx("Reddedilen talepler")}</h2>
              {rows.filter((r) => r.status === "Reddedildi").map((r) => (
                <div key={r.id} className="text-sm">
                  {dayLabel(r.date)} {r.startTime}–{r.endTime} · {r.game.title}
                  {r.reviewNote ? <span className="text-[#57534e]"> — {r.reviewNote}</span> : null}
                </div>
              ))}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SponsorLogo({
  company,
  canEdit,
  onChange,
}: {
  company: { id: string; name: string; logoPath?: string };
  canEdit: boolean;
  onChange: () => Promise<void> | void;
}) {
  const { tx } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setErr("");
    try {
      const body = new FormData();
      body.append("file", file);
      await api(`/api/companies/${company.id}/logo`, { method: "POST", body });
      await onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : tx("Logo yüklenemedi"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 w-32 shrink-0">
      <div className="w-32 h-20 grid place-items-center bg-white border border-[#B5DFF2] rounded-lg p-2">
        {company.logoPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoPath} alt={company.name} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-[11px] text-center text-[#57534e]">{tx("Logo yok")}</span>
        )}
      </div>
      {canEdit ? (
        <label className="text-xs text-[#0077C2] cursor-pointer hover:underline">
          {busy ? tx("Yükleniyor…") : company.logoPath ? tx("Logoyu değiştir") : tx("Logo yükle")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
        </label>
      ) : null}
      {err ? <span className="text-[11px] text-[#E31C23] text-center">{err}</span> : null}
    </div>
  );
}

function dayLabel(date: string) {
  return `${Number(date.slice(8))} Kasım`;
}
