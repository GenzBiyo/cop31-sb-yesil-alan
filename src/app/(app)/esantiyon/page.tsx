"use client";

import { useEffect, useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Pledge = {
  id: string;
  quantity: number;
  packages: number;
  agreedPrice: number;
  distributeDate: string;
  distributeStart: string;
  distributeEnd: string;
  company: { id: string; name: string };
};
type Item = {
  id: string;
  sku: string;
  offerNo: string;
  title: string;
  detail: string;
  printNote: string;
  quantity: number;
  unitPrice: number;
  packageQty: number;
  packagePrice: number;
  vatRate: number;
  priceNote: string;
  imagePath: string;
  packagesTaken: number;
  pledges: Pledge[];
};
type Supplier = { name: string; email: string; phone: string };
type Payload = { items: Item[]; staff: boolean; companyId: string | null; supplier: Supplier };

const DAYS = Array.from({ length: 12 }, (_, i) => `2026-11-${String(9 + i).padStart(2, "0")}`);

const RULES: { title: string; body: string }[] = [
  {
    title: "Kim destekler",
    body: "Satın almalar bakanlığın anlaşmalı olduğu firma tarafından yapılacaktır. Seçtiğiniz sponsorluk paketi için ilgili tutarı bakanlığın anlaşmalı olduğu firma ile iletişime geçerek firmaya aktarabilirsiniz.",
  },
  {
    title: "Uygun malzeme",
    body: "Geri dönüştürülebilir, yeniden kullanılabilir veya kompostlanabilir malzeme kullanılır. Tohumlu kurşun kalem, tohumlu tükenmez, bambu veya çelik matara, kâğıt su ve pet şişe olmayan su, tohum kartı, bitki kiti, ham bez veya kanvas çanta ve ahşap USB bu kapsamdadır.",
  },
  {
    title: "Dağıtılamaz",
    body: "Pet şişe, tek kullanımlık plastik şişe ve plastik poşet dağıtılamaz. İlaç, kozmetik ve kişisel bakım numunesi, yüksek adetli tek kullanımlık broşür ve paydaş reklamı taşıyan ambalaj da dağıtılamaz.",
  },
  {
    title: "Baskı ve mesaj",
    body: "Ürünün üzerinde kurum logosu olarak yalnızca T.C. Sağlık Bakanlığı logosu yer alabilir. Mesaj, COP31 logosu ile birlikte “Sağlıklı İnsan, Sağlıklı Gezegen” mottosudur. Başka kurum veya paydaş logosu, satış vaadi ve doğrulanmamış sağlık iddiası basılmaz.",
  },
  {
    title: "Su ve ikram",
    body: "Su, kâğıt ambalajda veya pet olmayan geri dönüştürülebilir kapta sunulur. Bardak ve matara yeniden doldurulabilir olur. İkram tek kullanımlık plastik bardakla verilmez. Atıklar ayrıştırılır.",
  },
  {
    title: "Dağıtım yeri",
    body: "Dağıtım, Sağlık Bakanlığının her sponsorluk için yazdığı gün ve saatte, resepsiyon masası ile bilgilendirme ekranının yanından yapılır. Günü belli olmayan kalem çıkmaz.",
  },
];

export default function GiveawayPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Payload>("/api/giveaways");
  const [drafts, setDrafts] = useState<Record<string, { packagePrice: string; vatRate: string; packageQty: string }>>({});
  const [claims, setClaims] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<Record<string, { date: string; start: string; end: string }>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (!data) return;
    setDrafts(Object.fromEntries(data.items.map((item) => [item.id, {
      packagePrice: item.packagePrice ? (item.packagePrice / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
      vatRate: String(item.vatRate),
      packageQty: item.packageQty ? String(item.packageQty) : "",
    }])));
    setClaims(Object.fromEntries(data.items.map((item) => [item.id, "1"])));
    const next: Record<string, { date: string; start: string; end: string }> = {};
    for (const item of data.items) {
      for (const pledge of item.pledges) {
        next[pledge.id] = { date: pledge.distributeDate, start: pledge.distributeStart, end: pledge.distributeEnd };
      }
    }
    setSlots(next);
  }, [data]);

  if (!data) return <p>{tx("Yükleniyor…")}</p>;
  const open = data.items.filter((item) => item.packageQty < 1 || item.packagePrice < 1).length;

  function orderMail() {
    if (!data) return;
    const lines = data.items.flatMap((item) => {
      const packages = item.pledges.reduce((sum, pledge) => sum + pledge.packages, 0);
      if (!packages) return [];
      const pieces = item.pledges.reduce((sum, pledge) => sum + pledge.quantity, 0);
      return [`${item.title} (${item.sku}) — ${packages} paket, ${pieces} adet`];
    });
    const body = encodeURIComponent(`COP31 Sağlık Pavilionu sponsorluk siparişi\n\nSatın alma: ${data.supplier.name}\n\n${lines.join("\n") || "Henüz paket alınmadı."}\n`);
    window.location.href = `mailto:${data.supplier.email}?subject=${encodeURIComponent("COP31 sponsorluk siparişi")}&body=${body}`;
  }

  async function run(key: string, title: string, path: string, body: unknown) {
    setBusy(key);
    setError("");
    setSaved("");
    try {
      await api(path, { method: "PATCH", body: JSON.stringify(body) });
      setSaved(title);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt alınamadı");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="booklet space-y-6">
      <header className="booklet-cover">
        <div className="booklet-logos">
          <img src="/icons/saglik-192.png" alt={tx("T.C. Sağlık Bakanlığı")} className="booklet-sb" />
          <img src="/brand/cop31-turkiye.png" alt={tx("COP31 Türkiye Antalya")} className="booklet-cop" />
        </div>
        <p className="booklet-kicker">{tx("COP31 Yeşil Alan · T.C. Sağlık Bakanlığı Pavilyonu · Antalya 9–20 Kasım 2026")}</p>
        <h1 className="display booklet-title">{tx("Eşantiyon ve İkram Kural Kitapçığı")}</h1>
        <p className="booklet-motto">
          {tx("Sağlıklı İnsan")}
          <br />
          <em>{tx("Sağlıklı Gezegen")}</em>
        </p>
        <p className="booklet-lead">
          {tx("Satın almalar bakanlığın anlaşmalı olduğu firma tarafından yapılacaktır. Seçtiğiniz sponsorluk paketi için ilgili tutarı bakanlığın anlaşmalı olduğu firma ile iletişime geçerek firmaya aktarabilirsiniz.")}
        </p>
        <p className="text-sm font-semibold text-[#0B1C33]">
          {data.supplier.name} · <a className="text-[#0077C2] underline" href={`mailto:${data.supplier.email}`}>{data.supplier.email}</a> · <a className="text-[#0077C2] underline" href={`tel:${data.supplier.phone.replace(/\s/g, "")}`}>{data.supplier.phone}</a>
        </p>
        <div className="no-print flex flex-wrap gap-2">
          <button type="button" className="btn ghost" onClick={() => window.print()}>{tx("Yazdır / PDF")}</button>
          {data.staff ? <span className="badge warn">{tx("Paketi tanımlanmamış")}: {open}</span> : null}
          {data.staff ? <button type="button" className="btn ghost" onClick={orderMail}>{tx("Siparişi Greenstyle’a gönder")}</button> : null}
        </div>
      </header>

      {error ? <p className="text-sm text-[#E31C23]">{tx(error)}</p> : null}
      {saved ? <p className="no-print text-sm text-[#0077C2]">{tx("Kaydedildi")}: {tx(saved)}</p> : null}

      <section className="grid md:grid-cols-2 gap-3">
        {RULES.map((rule) => (
          <article key={rule.title} className="card p-4">
            <h2 className="display text-2xl">{tx(rule.title)}</h2>
            <p className="text-sm text-[#3E6A88] mt-2">{tx(rule.body)}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="display text-3xl">{tx("Sponsorluk listesi")}</h2>
        <p className="text-sm text-[#3E6A88]">
          {tx("Satın almalar bakanlığın anlaşmalı olduğu firma tarafından yapılacaktır. Seçtiğiniz sponsorluk paketi için ilgili tutarı bakanlığın anlaşmalı olduğu firma ile iletişime geçerek firmaya aktarabilirsiniz.")}
        </p>
        <div className="booklet-grid">
          {data.items.map((item) => {
            const draft = drafts[item.id] || {
              packagePrice: item.packagePrice ? (item.packagePrice / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
              vatRate: String(item.vatRate),
              packageQty: item.packageQty ? String(item.packageQty) : "",
            };
            const ready = item.packageQty > 0 && item.packagePrice > 0;
            const gross = ready ? Math.round(item.packagePrice * (100 + item.vatRate) / 100) : 0;
            const wanted = Number(claims[item.id] || 0);
            return (
              <article key={item.id} className="booklet-card card">
                {item.imagePath ? <img src={item.imagePath} alt={tx(item.title)} className="booklet-photo" /> : null}
                <div className="p-4 space-y-2">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="badge muted">{item.offerNo ? `${tx("Teklif")} ${item.offerNo} · ` : ""}{item.sku}</span>
                    <strong>{item.packagesTaken.toLocaleString("tr-TR")} {tx("paket alındı")}</strong>
                  </div>
                  <h3 className="display text-xl leading-tight">{tx(item.title)}</h3>
                  <p className="text-sm text-[#3E6A88]">{tx(item.detail)}</p>
                  {item.printNote ? <p className="text-xs">{tx("Baskı")}: {tx(item.printNote)}</p> : null}
                  {ready ? (
                    <p className="text-sm">
                      <strong>1 {tx("paket")} = {item.packageQty.toLocaleString("tr-TR")} {tx("adet")}</strong>
                      <span className="block">{money(item.packagePrice)} · {tx("KDV")} %{item.vatRate}</span>
                      <span className="block">{tx("KDV dahil paket")} {money(gross)}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-[#57534e]">{tx("Paket fiyatı ve adedi henüz belirlenmedi.")}</p>
                  )}
                  <p className="text-xs text-[#57534e]">{tx("Satın alma")}: {data.supplier.name}</p>
                  {data.staff ? (
                    <div className="space-y-2 pt-2 border-t border-[#D4ECF6]">
                      <label className="text-xs block">{tx("Paket fiyatı, KDV hariç (₺)")}
                        <input className="field mt-1" value={draft.packagePrice} onChange={(e) => setDrafts({ ...drafts, [item.id]: { ...draft, packagePrice: e.target.value } })} />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs block">{tx("KDV %")}
                          <input className="field mt-1" inputMode="numeric" value={draft.vatRate} onChange={(e) => setDrafts({ ...drafts, [item.id]: { ...draft, vatRate: e.target.value.replace(/[^\d]/g, "") } })} />
                        </label>
                        <label className="text-xs block">{tx("Paketteki adet")}
                          <input className="field mt-1" inputMode="numeric" value={draft.packageQty} onChange={(e) => setDrafts({ ...drafts, [item.id]: { ...draft, packageQty: e.target.value.replace(/[^\d]/g, "") } })} />
                        </label>
                      </div>
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={busy === item.id}
                        onClick={() => void run(item.id, item.title, `/api/giveaways/${item.id}`, {
                          packagePrice: draft.packagePrice,
                          vatRate: Number(draft.vatRate),
                          packageQty: Number(draft.packageQty),
                        })}
                      >
                        {busy === item.id ? tx("Kaydediliyor…") : tx("Paketi kaydet")}
                      </button>
                    </div>
                  ) : null}
                  {data.companyId && ready ? (
                    <div className="space-y-1 pt-2">
                      <div className="flex gap-2 items-end">
                        <label className="text-xs block flex-1">{tx("Paket sayısı")}
                          <input className="field mt-1" inputMode="numeric" value={claims[item.id] ?? "1"} onChange={(e) => setClaims({ ...claims, [item.id]: e.target.value.replace(/[^\d]/g, "") })} />
                        </label>
                        <button
                          type="button"
                          className="btn"
                          disabled={busy === `claim-${item.id}`}
                          onClick={() => void run(`claim-${item.id}`, item.title, `/api/giveaways/${item.id}`, { action: "claim", packages: wanted })}
                        >
                          {tx("Paketi al")}
                        </button>
                      </div>
                      {wanted > 0 ? <p className="text-xs">{wanted} {tx("paket")} = {(wanted * item.packageQty).toLocaleString("tr-TR")} {tx("adet")} · {money(gross * wanted)}</p> : null}
                    </div>
                  ) : null}
                  {item.pledges.length > 0 ? (
                    <ul className="space-y-2 pt-2 border-t border-[#D4ECF6] text-sm">
                      {item.pledges.map((pledge) => {
                        const slot = slots[pledge.id] || { date: pledge.distributeDate, start: pledge.distributeStart, end: pledge.distributeEnd };
                        return (
                          <li key={pledge.id} className="space-y-1">
                            <div className="flex justify-between gap-2">
                              <span><strong>{pledge.company.name}</strong> · {pledge.packages || 1} {tx("paket")} · {pledge.quantity.toLocaleString("tr-TR")} {tx("adet")} · {money(Math.round((pledge.agreedPrice || item.packagePrice) * (100 + item.vatRate) / 100) * (pledge.packages || 1))}</span>
                              {!pledge.distributeDate ? (
                                <button type="button" className="text-[#0077C2]" disabled={busy === pledge.id} onClick={() => void run(pledge.id, item.title, `/api/giveaways/${item.id}`, { action: "release", pledgeId: pledge.id })}>
                                  {tx("Vazgeç")}
                                </button>
                              ) : null}
                            </div>
                            {pledge.distributeDate ? (
                              <p className="text-xs text-[#0077C2]">{tx("Dağıtım")}: {pledge.distributeDate.slice(8)} {tx("Kasım")} · {pledge.distributeStart}{pledge.distributeEnd ? `–${pledge.distributeEnd}` : ""}</p>
                            ) : data.staff ? null : <p className="text-xs text-[#57534e]">{tx("Dağıtım günü Sağlık Bakanlığı tarafından yazılacak.")}</p>}
                            {data.staff ? (
                              <div className="grid grid-cols-2 gap-1">
                                <select className="field" value={slot.date} onChange={(e) => setSlots({ ...slots, [pledge.id]: { ...slot, date: e.target.value } })}>
                                  <option value="">{tx("Gün")}</option>
                                  {DAYS.map((day) => <option key={day} value={day}>{Number(day.slice(8))} {tx("Kasım")}</option>)}
                                </select>
                                <input className="field" type="time" value={slot.start} onChange={(e) => setSlots({ ...slots, [pledge.id]: { ...slot, start: e.target.value } })} />
                                <input className="field" type="time" value={slot.end} onChange={(e) => setSlots({ ...slots, [pledge.id]: { ...slot, end: e.target.value } })} />
                                <button
                                  type="button"
                                  className="btn ghost"
                                  disabled={busy === `slot-${pledge.id}`}
                                  onClick={() => void run(`slot-${pledge.id}`, item.title, `/api/giveaways/${item.id}`, {
                                    action: "schedule",
                                    pledgeId: pledge.id,
                                    distributeDate: slot.date,
                                    distributeStart: slot.start,
                                    distributeEnd: slot.end,
                                  })}
                                >
                                  {tx("Günü kaydet")}
                                </button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function money(kurus: number) {
  return (kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}
