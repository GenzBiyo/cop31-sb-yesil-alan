"use client";

import { useEffect, useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Company = { id: string; name: string };
type Item = {
  id: string;
  slug: string;
  kind: string;
  title: string;
  detail: string;
  quantity: number;
  unitPrice: number;
  priceNote: string;
  imagePath: string;
  sourceUrl: string;
  published: boolean;
  companyId: string | null;
  company: Company | null;
};
type Payload = { items: Item[]; companies: Company[]; admin: boolean };

const RULES: { title: string; body: string }[] = [
  {
    title: "Kim destekler",
    body: "Eşantiyon ve ikramlar etkinlik paydaşlarının desteğiyle hazırlanır. Hangi paydaşın hangi kalemi, kaç adet üstleneceğini yalnızca yönetici atar. Paydaş kendi sponsorluğunu seçemez ve adedi değiştiremez.",
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
    body: "Dağıtım, alan planındaki resepsiyon masasından ve soldaki bilgilendirme ekranının yanından yapılır. Kitapçıkta olmayan veya yönetici ataması bulunmayan kalem bu noktalardan çıkmaz.",
  },
];

export default function GiveawayPage() {
  const { tx } = useI18n();
  const { data, reload } = useApi<Payload>("/api/giveaways");
  const [drafts, setDrafts] = useState<Record<string, { companyId: string; quantity: string }>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (!data) return;
    setDrafts(Object.fromEntries(data.items.map((item) => [item.id, { companyId: item.companyId || "", quantity: String(item.quantity) }])));
  }, [data]);

  if (!data) return <p>{tx("Yükleniyor…")}</p>;
  const open = data.items.filter((item) => !item.companyId).length;

  async function save(item: Item) {
    const draft = drafts[item.id];
    if (!draft) return;
    setBusy(item.id);
    setError("");
    setSaved("");
    try {
      await api(`/api/giveaways/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ companyId: draft.companyId || null, quantity: Number(draft.quantity) }),
      });
      setSaved(item.title);
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
          {tx("Pavilyonda dağıtılacak eşantiyon ve ikramlar bu listeyle sınırlıdır. Örnek ürünler geri dönüşümlü malzemedendir. Desteği üstlenecek paydaşı yönetici belirler.")}
        </p>
        <div className="no-print flex flex-wrap gap-2">
          <button type="button" className="btn ghost" onClick={() => window.print()}>{tx("Yazdır / PDF")}</button>
          {data.admin ? <span className="badge warn">{tx("Atanmamış kalem")}: {open}</span> : null}
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
        <h2 className="display text-3xl">{tx("Örnek ürünler")}</h2>
        <p className="text-sm text-[#3E6A88]">
          {tx("Adet ve tutar ürün sayfasından alındı. Görsele, ada veya Satın al düğmesine basınca o ürünün satış sayfası açılır. Aralık varsa bütçe, yayımlanan en yüksek birim fiyattan hesaplanır. KDV hariçtir.")}
        </p>
        <div className="booklet-grid">
          {data.items.map((item) => {
            const draft = drafts[item.id] || { companyId: item.companyId || "", quantity: String(item.quantity) };
            const dirty = draft.companyId !== (item.companyId || "") || Number(draft.quantity) !== item.quantity;
            return (
              <article key={item.id} className="booklet-card card">
                {item.imagePath ? (
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                    <img src={item.imagePath} alt={tx(item.title)} className="booklet-photo" />
                  </a>
                ) : null}
                <div className="p-4 space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="badge muted">{tx(item.kind === "ikram" ? "İkram" : "Eşantiyon")}</span>
                    <strong>{Number(item.quantity).toLocaleString("tr-TR")} {tx("adet")}</strong>
                  </div>
                  <h3 className="display text-xl leading-tight">
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer">{tx(item.title)}</a>
                  </h3>
                  <p className="text-sm text-[#3E6A88]">{tx(item.detail)}</p>
                  <p className="text-sm">
                    {item.unitPrice > 0 ? (
                      <>
                        <strong>{money(item.unitPrice)}</strong> / {tx("adet")}
                        <span className="block">{tx("Toplam")} {money(item.unitPrice * item.quantity)}</span>
                      </>
                    ) : (
                      <strong>{tx("Birim fiyat teklifle")}</strong>
                    )}
                  </p>
                  {item.priceNote ? <p className="text-xs text-[#57534e]">{tx(item.priceNote)}</p> : null}
                  <a className="btn" href={item.sourceUrl} target="_blank" rel="noreferrer">{tx("Satın al")}</a>
                  <p className="text-sm">
                    <span className="text-[#0077C2]">{tx("Destekleyen paydaş")}: </span>
                    {item.company ? <strong>{item.company.name}</strong> : <span className="text-[#57534e]">{tx("Yönetici atayacak")}</span>}
                  </p>
                  {data.admin ? (
                    <div className="booklet-admin space-y-2 pt-2 border-t border-[#D4ECF6]">
                      <label className="text-xs block">
                        {tx("Paydaş")}
                        <select
                          className="field mt-1"
                          value={draft.companyId}
                          onChange={(e) => setDrafts({ ...drafts, [item.id]: { ...draft, companyId: e.target.value } })}
                        >
                          <option value="">{tx("Atanmadı")}</option>
                          {data.companies.map((company) => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs block">
                        {tx("Adet")}
                        <input
                          className="field mt-1"
                          inputMode="numeric"
                          value={draft.quantity}
                          onChange={(e) => setDrafts({ ...drafts, [item.id]: { ...draft, quantity: e.target.value.replace(/[^\d]/g, "") } })}
                        />
                      </label>
                      <button type="button" className="btn ghost" disabled={!dirty || busy === item.id} onClick={() => void save(item)}>
                        {busy === item.id ? tx("Kaydediliyor…") : tx("Atamayı kaydet")}
                      </button>
                    </div>
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
