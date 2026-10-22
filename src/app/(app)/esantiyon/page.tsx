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
type Payload = { items: Item[]; staff: boolean; companyId: string | null };

const SPONSOR_CONTACT = {
  questionsEmail: "umut.agyuz@saglik.gov.tr",
  questionsPhone: "+905324574539",
  paymentEmails: ["hande.uysal@ekspoturk.com", "umut.agyuz@saglik.gov.tr"],
};
const SPONSOR_NOTE = "Sorular için umut.agyuz@saglik.gov.tr +905324574539. Ödemeler için hande.uysal@ekspoturk.com ve umut.agyuz@saglik.gov.tr.";

const DAYS = Array.from({ length: 12 }, (_, i) => `2026-11-${String(9 + i).padStart(2, "0")}`);

const RULES: { title: string; body: string }[] = [
  {
    title: "Kim destekler",
    body: SPONSOR_NOTE,
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
  const [drafts, setDrafts] = useState<Record<string, { title: string; detail: string; printNote: string; packagePrice: string; vatRate: string; packageQty: string }>>({});
  const [photos, setPhotos] = useState<Record<string, { file: File; preview: string } | null>>({});
  const [cleared, setCleared] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState({ title: "", detail: "", printNote: "", packagePrice: "", vatRate: "20", packageQty: "" });
  const [freshImage, setFreshImage] = useState<File | null>(null);
  const [claims, setClaims] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<Record<string, { date: string; start: string; end: string }>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (!data) return;
    setDrafts(Object.fromEntries(data.items.map((item) => [item.id, {
      title: item.title,
      detail: item.detail,
      printNote: item.printNote,
      packagePrice: item.packagePrice ? (item.packagePrice / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
      vatRate: String(item.vatRate),
      packageQty: item.packageQty ? String(item.packageQty) : "",
    }])));
    setPhotos((prev) => {
      for (const row of Object.values(prev)) if (row?.preview) URL.revokeObjectURL(row.preview);
      return {};
    });
    setCleared({});
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
    const body = encodeURIComponent(`COP31 Sağlık Pavilionu sponsorluk siparişi\n\n${lines.join("\n") || "Henüz paket alınmadı."}\n`);
    window.location.href = `mailto:${SPONSOR_CONTACT.paymentEmails.join(",")}?subject=${encodeURIComponent("COP31 sponsorluk ödemesi")}&body=${body}`;
  }

  async function createPackage() {
    setBusy("new");
    setError("");
    setSaved("");
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(fresh)) body.set(key, value);
      if (freshImage) body.set("image", freshImage);
      await api("/api/giveaways", { method: "POST", body });
      setFresh({ title: "", detail: "", printNote: "", packagePrice: "", vatRate: "20", packageQty: "" });
      setFreshImage(null);
      setCreating(false);
      setSaved(fresh.title);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt alınamadı");
    } finally {
      setBusy("");
    }
  }

  async function saveItem(item: Item) {
    const draft = drafts[item.id];
    if (!draft?.title.trim()) {
      setError("Paket adı gerekli");
      return;
    }
    setBusy(item.id);
    setError("");
    setSaved("");
    try {
      const body = new FormData();
      body.set("title", draft.title);
      body.set("detail", draft.detail);
      body.set("printNote", draft.printNote);
      body.set("packagePrice", draft.packagePrice);
      body.set("vatRate", draft.vatRate);
      body.set("packageQty", draft.packageQty);
      if (photos[item.id]?.file) body.set("image", photos[item.id]!.file);
      if (cleared[item.id]) body.set("removeImage", "1");
      await api(`/api/giveaways/${item.id}`, { method: "PATCH", body });
      setSaved(draft.title);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt alınamadı");
    } finally {
      setBusy("");
    }
  }

  async function removeItem(item: Item) {
    if (!confirm(tx("Bu sponsorluk paketi listeden kaldırılsın mı?"))) return;
    setBusy(`del-${item.id}`);
    setError("");
    try {
      await api(`/api/giveaways/${item.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi");
    } finally {
      setBusy("");
    }
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
        <p className="booklet-lead">{tx(SPONSOR_NOTE)}</p>
        <p className="text-sm font-semibold text-[#0B1C33]">
          {tx("Sorular için")}{" "}
          <a className="text-[#0077C2] underline" href={`mailto:${SPONSOR_CONTACT.questionsEmail}`}>{SPONSOR_CONTACT.questionsEmail}</a>
          {" · "}
          <a className="text-[#0077C2] underline" href={`tel:${SPONSOR_CONTACT.questionsPhone}`}>{SPONSOR_CONTACT.questionsPhone}</a>
          <br />
          {tx("Ödemeler için")}{" "}
          {SPONSOR_CONTACT.paymentEmails.map((email, index) => (
            <span key={email}>
              {index > 0 ? " · " : null}
              <a className="text-[#0077C2] underline" href={`mailto:${email}`}>{email}</a>
            </span>
          ))}
        </p>
        <div className="no-print flex flex-wrap gap-2">
          <button type="button" className="btn ghost" onClick={() => window.print()}>{tx("Yazdır / PDF")}</button>
          {data.staff ? <span className="badge warn">{tx("Paketi tanımlanmamış")}: {open}</span> : null}
          {data.staff ? <button type="button" className="btn ghost" onClick={orderMail}>{tx("Ödeme notunu gönder")}</button> : null}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="display text-3xl">{tx("Sponsorluk listesi")}</h2>
          {data.staff ? (
            <button type="button" className="btn" onClick={() => setCreating((on) => !on)}>{creating ? tx("Formu kapat") : tx("Yeni paket ekle")}</button>
          ) : null}
        </div>
        <p className="text-sm text-[#3E6A88]">
          {tx(SPONSOR_NOTE)}
        </p>
        {data.staff && creating ? (
          <form className="card p-4 grid md:grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); void createPackage(); }}>
            <label className="text-sm">{tx("Paket adı")} *
              <input className="field mt-1" required value={fresh.title} onChange={(e) => setFresh({ ...fresh, title: e.target.value })} />
            </label>
            <label className="text-sm">{tx("Baskı notu")}
              <input className="field mt-1" value={fresh.printNote} onChange={(e) => setFresh({ ...fresh, printNote: e.target.value })} />
            </label>
            <label className="text-sm md:col-span-2">{tx("Açıklama")}
              <textarea className="field mt-1" rows={2} value={fresh.detail} onChange={(e) => setFresh({ ...fresh, detail: e.target.value })} />
            </label>
            <label className="text-sm">{tx("Paket fiyatı, KDV hariç (₺)")}
              <input className="field mt-1" value={fresh.packagePrice} onChange={(e) => setFresh({ ...fresh, packagePrice: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">{tx("KDV %")}
                <input className="field mt-1" inputMode="numeric" value={fresh.vatRate} onChange={(e) => setFresh({ ...fresh, vatRate: e.target.value.replace(/[^\d]/g, "") })} />
              </label>
              <label className="text-sm">{tx("Paketteki adet")}
                <input className="field mt-1" inputMode="numeric" value={fresh.packageQty} onChange={(e) => setFresh({ ...fresh, packageQty: e.target.value.replace(/[^\d]/g, "") })} />
              </label>
            </div>
            <label className="text-sm md:col-span-2">{tx("Resim")}
              <input className="field mt-1" type="file" accept="image/*" onChange={(e) => setFreshImage(e.target.files?.[0] || null)} />
            </label>
            <button className="btn" disabled={busy === "new"}>{busy === "new" ? tx("Kaydediliyor…") : tx("Paketi ekle")}</button>
          </form>
        ) : null}
        <div className="booklet-grid">
          {data.items.map((item) => {
            const draft = drafts[item.id] || {
              title: item.title,
              detail: item.detail,
              printNote: item.printNote,
              packagePrice: item.packagePrice ? (item.packagePrice / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
              vatRate: String(item.vatRate),
              packageQty: item.packageQty ? String(item.packageQty) : "",
            };
            const shownImage = cleared[item.id] ? "" : photos[item.id]?.preview || item.imagePath;
            const ready = item.packageQty > 0 && item.packagePrice > 0;
            const gross = ready ? Math.round(item.packagePrice * (100 + item.vatRate) / 100) : 0;
            const wanted = Number(claims[item.id] || 0);
            return (
              <article key={item.id} className="booklet-card card">
                {shownImage ? <img src={shownImage} alt={draft.title || item.title} className="booklet-photo" /> : null}
                <div className="p-4 space-y-2">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="badge muted">{item.offerNo ? `${tx("Teklif")} ${item.offerNo} · ` : ""}{item.sku}</span>
                    <strong>{item.packagesTaken.toLocaleString("tr-TR")} {tx("paket alındı")}</strong>
                  </div>
                  {data.staff ? (
                    <div className="space-y-2">
                      <label className="text-xs block">{tx("Paket adı")}
                        <input className="field mt-1" value={draft.title} onChange={(e) => setDrafts({ ...drafts, [item.id]: { ...draft, title: e.target.value } })} />
                      </label>
                      <label className="text-xs block">{tx("Açıklama")}
                        <textarea className="field mt-1" rows={2} value={draft.detail} onChange={(e) => setDrafts({ ...drafts, [item.id]: { ...draft, detail: e.target.value } })} />
                      </label>
                      <label className="text-xs block">{tx("Baskı notu")}
                        <input className="field mt-1" value={draft.printNote} onChange={(e) => setDrafts({ ...drafts, [item.id]: { ...draft, printNote: e.target.value } })} />
                      </label>
                      <label className="text-xs block">{tx("Resim")}
                        <input className="field mt-1" type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          setCleared({ ...cleared, [item.id]: false });
                          setPhotos((prev) => {
                            if (prev[item.id]?.preview) URL.revokeObjectURL(prev[item.id]!.preview);
                            return { ...prev, [item.id]: file ? { file, preview: URL.createObjectURL(file) } : null };
                          });
                        }} />
                      </label>
                      {shownImage ? (
                        <button type="button" className="text-xs text-[#E31C23] underline" onClick={() => {
                          setCleared({ ...cleared, [item.id]: true });
                          setPhotos((prev) => {
                            if (prev[item.id]?.preview) URL.revokeObjectURL(prev[item.id]!.preview);
                            return { ...prev, [item.id]: null };
                          });
                        }}>{tx("Resmi kaldır")}</button>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <h3 className="display text-xl leading-tight">{tx(item.title)}</h3>
                      <p className="text-sm text-[#3E6A88]">{tx(item.detail)}</p>
                      {item.printNote ? <p className="text-xs">{tx("Baskı")}: {tx(item.printNote)}</p> : null}
                    </>
                  )}
                  {ready ? (
                    <p className="text-sm">
                      <strong>1 {tx("paket")} = {item.packageQty.toLocaleString("tr-TR")} {tx("adet")}</strong>
                      <span className="block">{money(item.packagePrice)} · {tx("KDV")} %{item.vatRate}</span>
                      <span className="block">{tx("KDV dahil paket")} {money(gross)}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-[#57534e]">{tx("Paket fiyatı ve adedi henüz belirlenmedi.")}</p>
                  )}
                  <p className="text-xs text-[#57534e]">{tx("Ödemeler için")} {SPONSOR_CONTACT.paymentEmails.join(" · ")}</p>
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
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn" disabled={busy === item.id} onClick={() => void saveItem(item)}>
                          {busy === item.id ? tx("Kaydediliyor…") : tx("Güncelle")}
                        </button>
                        <button type="button" className="btn ghost" style={{ color: "#E31C23" }} disabled={busy === `del-${item.id}`} onClick={() => void removeItem(item)}>
                          {tx("Sil")}
                        </button>
                      </div>
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
