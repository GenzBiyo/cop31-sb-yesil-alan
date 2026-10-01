"use client";

import { FormEvent, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import {
  dayLabel,
  emptyInput,
  FORM_DAYS,
  FORM_INTRO,
  INTERACTIVE_OPTIONS,
  MINISTRY_UNITS,
  OTHER_UNIT,
  SLOT_MINUTES,
  SLOT_TIMES,
  slotEnd,
  TIME_OF_DAY,
  VIDEO_OPTIONS,
  type MinistryMeeting,
  type MeetingWish,
  type NamedPerson,
  type StakeholderInput,
} from "@/lib/stakeholder-form";

const blankPerson = (): NamedPerson => ({ name: "", title: "" });
const blankMeeting = (): MeetingWish => ({ with: "", topic: "", date: "", timeOfDay: TIME_OF_DAY[0], attendees: [blankPerson()] });

function Question({ label, help, required, children }: { label: string; help?: string; required?: boolean; children: React.ReactNode }) {
  const { tx } = useI18n();
  return (
    <div className="block text-sm">
      <span className="font-semibold">
        {tx(label)}
        {required ? <span className="text-[#0077C2]"> *</span> : null}
      </span>
      {help ? <span className="block text-xs text-[#57534e] font-normal">{tx(help)}</span> : null}
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Choice({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const { tx } = useI18n();
  return (
    <div className="grid gap-1">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          className={`text-left px-3 py-2 border text-sm ${value === o ? "bg-[#0077C2] text-white border-[#0077C2]" : "border-[#B5DFF2] bg-white"}`}
          onClick={() => onChange(o)}
        >
          {tx(o)}
        </button>
      ))}
    </div>
  );
}

function PeopleEditor({ rows, onChange, addLabel }: { rows: NamedPerson[]; onChange: (rows: NamedPerson[]) => void; addLabel: string }) {
  const { tx } = useI18n();
  const set = (i: number, patch: Partial<NamedPerson>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input className="field" placeholder={tx("Ad soyad")} value={p.name} onChange={(e) => set(i, { name: e.target.value })} />
          <input className="field" placeholder={tx("Unvan / görev")} value={p.title} onChange={(e) => set(i, { title: e.target.value })} />
          <button type="button" className="btn ghost px-2" aria-label={tx("Sil")} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" className="btn ghost text-xs" onClick={() => onChange([...rows, blankPerson()])}>
        <Plus size={14} />
        {tx(addLabel)}
      </button>
    </div>
  );
}

type PublicSlot = { date: string; time: string; state: "open" | "booked" | "mine" };

function UnitCalendar({
  unit,
  email,
  days,
  value,
  onPick,
}: {
  unit: string;
  email: string;
  days: string[];
  value: { date: string; time: string };
  onPick: (date: string, time: string) => void;
}) {
  const { tx } = useI18n();
  const { data, loading } = useApi<{ slots: PublicSlot[] }>(
    `/api/public/stakeholder-form?unit=${encodeURIComponent(unit)}&email=${encodeURIComponent(email.trim())}`
  );
  const slots = data?.slots || [];
  const byDay = FORM_DAYS.map((d) => ({ date: d, slots: SLOT_TIMES.map((t) => slots.find((s) => s.date === d && s.time === t)).filter(Boolean) as PublicSlot[] })).filter(
    (d) => d.slots.length
  );
  if (loading && !data) return <p className="text-xs text-[#57534e]">{tx("Takvim yükleniyor…")}</p>;
  if (!byDay.length) {
    return (
      <p className="text-sm border border-[#F5D08A] bg-[#FFF8E8] p-3">
        {unit} {tx("takvimi henüz açılmadı. Talebinizi aşağıya yazın; uygun saat açıldığında Bakanlık sizinle iletişime geçecek.")}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-[#57534e]">
        {tx("Her saat başı bir görüşme, görüşmeler")} {SLOT_MINUTES} {tx("dakika. Gri saatler başka paydaş tarafından alındı.")}
      </p>
      {byDay.map((d) => (
        <div key={d.date} className={`flex flex-wrap items-center gap-1 ${days.length && !days.includes(d.date) ? "opacity-60" : ""}`}>
          <span className="text-xs w-20 font-semibold text-[#0077C2]">{tx(dayLabel(d.date))}</span>
          {d.slots.map((s) => {
            const picked = value.date === s.date && value.time === s.time;
            const taken = s.state === "booked";
            return (
              <button
                type="button"
                key={s.time}
                disabled={taken}
                title={`${s.time}–${slotEnd(s.time)}`}
                className={`px-2 py-1 text-xs border ${
                  picked ? "bg-[#22A34A] text-white border-[#22A34A]" : taken ? "bg-[#EEF1F3] text-[#9AA5AD] border-[#E1E6EA] line-through cursor-not-allowed" : "bg-white border-[#B5DFF2]"
                }`}
                onClick={() => onPick(s.date, s.time)}
              >
                {s.time}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function StakeholderForm() {
  const { tx } = useI18n();
  const { data: meta } = useApi<{ companies: string[] }>("/api/public/stakeholder-form");
  const [form, setForm] = useState<StakeholderInput>(() => ({ ...emptyInput(), speakers: [blankPerson()] }));
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | boolean>(null);

  const set = (patch: Partial<StakeholderInput>) => setForm((f) => ({ ...f, ...patch }));
  const yesNo = (key: keyof StakeholderInput, value: string) => {
    setAnswered((a) => ({ ...a, [key]: true }));
    set({ [key]: value === "Evet" } as Partial<StakeholderInput>);
  };
  const yn = (key: keyof StakeholderInput) => (answered[key] ? (form[key] ? "Evet" : "Hayır") : "");
  const mm = form.ministryMeeting;
  const setMm = (patch: Partial<MinistryMeeting>) => set({ ministryMeeting: { ...mm, ...patch } });
  const setMeeting = (i: number, patch: Partial<MeetingWish>) =>
    set({ meetingRequests: form.meetingRequests.map((m, j) => (j === i ? { ...m, ...patch } : m)) });

  function toggleDay(d: string) {
    set({ days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d] });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const missing = ["speakerWilling", "presentation", "standWanted"].find((k) => !answered[k]);
    if (missing) return setError(tx("Lütfen tüm Evet / Hayır sorularını yanıtlayın."));
    if (!form.videoReady || !form.interactive) return setError(tx("Video ve interaktif etkinlik sorularını yanıtlayın."));
    setBusy(true);
    try {
      const res = await api<{ updated: boolean }>("/api/public/stakeholder-form", { method: "POST", body: JSON.stringify(form) });
      setDone(res.updated);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Gönderilemedi"));
    } finally {
      setBusy(false);
    }
  }

  if (done !== null) {
    return (
      <div>
        <h2 className="display text-3xl">{tx("Teşekkürler")}</h2>
        <p className="mt-2 text-sm">
          {done ? tx("Önceki yanıtınız güncellendi.") : tx("Formunuz alındı.")} {tx("Pavilyon ekibi sizinle e-posta üzerinden iletişime geçecek.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <aside className="text-sm text-[#57534e] border-l-2 border-[#00A3E0] pl-3 space-y-2">
        <p className="font-semibold text-[#0B1C33]">{tx("Lütfen formu 2 Ekim saat 17:00'ye kadar doldurunuz.")}</p>
        <p>{tx(FORM_INTRO)}</p>
        <p className="text-xs">{tx("Aynı e-posta adresiyle tekrar gönderirseniz önceki yanıtınız güncellenir.")}</p>
      </aside>

      <form className="space-y-6" onSubmit={submit}>
        <section className="space-y-3">
          <h3 className="concept-kicker">{tx("Firma bilgileri")}</h3>
          <Question label="E-posta adresi" required>
            <input className="field" type="email" required value={form.email} onChange={(e) => set({ email: e.target.value })} />
          </Question>
          <Question label="Firma adı" required>
            <input className="field" required value={form.companyName} onChange={(e) => set({ companyName: e.target.value })} />
          </Question>
          <div className="grid sm:grid-cols-2 gap-3">
            <Question label="Yetkili adı soyadı">
              <input className="field" value={form.contactName} onChange={(e) => set({ contactName: e.target.value })} />
            </Question>
            <Question label="Telefon">
              <input className="field" type="tel" value={form.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} />
            </Question>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="concept-kicker">{tx("Katılım")}</h3>
          <Question label={`COP31'de firmanızın ana konusu, altını çizmek istediğiniz "ana tema" ne olacaktır?`} required>
            <textarea className="field" rows={3} required value={form.theme} onChange={(e) => set({ theme: e.target.value })} />
          </Question>
          <Question label="COP31'e kaç kişi katılıyorsunuz?" required>
            <input className="field max-w-[8rem]" type="number" min={1} required value={form.headcount || ""} onChange={(e) => set({ headcount: Number(e.target.value) })} />
          </Question>
          <Question label="COP31'e kaç gün katılıyorsunuz? ve hangi günler (9-20 Kasım)" required>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
              {FORM_DAYS.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`px-2 py-1.5 border text-xs ${form.days.includes(d) ? "bg-[#22A34A] text-white border-[#22A34A]" : "border-[#B5DFF2] bg-white"}`}
                  onClick={() => toggleDay(d)}
                >
                  {tx(dayLabel(d))}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#57534e] mt-1">{form.days.length} {tx("gün seçildi")}</p>
          </Question>
        </section>

        <section className="space-y-3">
          <h3 className="concept-kicker">{tx("Panel")}</h3>
          <Question label="Katılım sağladığımız günlerde konumuzla ilgili panel/paneller olursa firma temsilcimiz/lerimiz konuşmacı olabilirler" required>
            <Choice options={["Evet", "Hayır"]} value={yn("speakerWilling")} onChange={(v) => yesNo("speakerWilling", v)} />
          </Question>
          {form.speakerWilling ? (
            <Question label="Firmanızı temsilen katılacak konuşmacılarınızı unvanlarıyla birlikte yazınız." required>
              <PeopleEditor rows={form.speakers} onChange={(speakers) => set({ speakers })} addLabel="Konuşmacı ekle" />
            </Question>
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="concept-kicker">{tx("Sunum ve stand")}</h3>
          <Question label="Ana ekran önü 15 dk firma proje sunumu istiyor musunuz?" required>
            <Choice options={["Evet", "Hayır"]} value={yn("presentation")} onChange={(v) => yesNo("presentation", v)} />
          </Question>
          <Question label="Stand kullanımı istiyor musunuz?" required>
            <Choice options={["Evet", "Hayır"]} value={yn("standWanted")} onChange={(v) => yesNo("standWanted", v)} />
          </Question>
          {form.standWanted ? (
            <Question label="Stand kullanımını kaç gün istiyorsunuz?">
              <input className="field max-w-[12rem]" placeholder={tx("Örn. 4 gün")} value={form.standDays} onChange={(e) => set({ standDays: e.target.value })} />
            </Question>
          ) : null}
          <Question label="Stand kullanımı sırasında arkadaki ekranda döndüreceğiniz videonuz hazır mı?" required>
            <Choice options={VIDEO_OPTIONS} value={form.videoReady} onChange={(videoReady) => set({ videoReady })} />
          </Question>
          <Question label="İnteraktif etkinlik yapmak istiyor musunuz?" required>
            <Choice options={INTERACTIVE_OPTIONS} value={form.interactive} onChange={(interactive) => set({ interactive })} />
          </Question>
        </section>

        <section className="space-y-3">
          <h3 className="concept-kicker">{tx("Sağlık Bakanlığı ile 1-1 toplantı")}</h3>
          <Question label="Sağlık Bakanlığı ile 1-1 toplantı yapmak istiyor musunuz?" required>
            <Choice options={["Evet", "Hayır"]} value={mm.wanted} onChange={(wanted) => setMm({ wanted })} />
          </Question>
          {mm.wanted === "Evet" ? (
            <div className="space-y-3 border border-[#B5DFF2] p-3 bg-[#F7FBFD]">
              <Question label="Hangi birimle görüşmek istiyorsunuz?" required>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                  {[...MINISTRY_UNITS, OTHER_UNIT].map((u) => (
                    <button
                      type="button"
                      key={u}
                      className={`px-2 py-2 border text-sm font-semibold ${mm.unit === u ? "bg-[#0077C2] text-white border-[#0077C2]" : "border-[#B5DFF2] bg-white"}`}
                      onClick={() => setMm({ unit: u, date: "", time: "" })}
                    >
                      {tx(u)}
                    </button>
                  ))}
                </div>
              </Question>
              {mm.unit === OTHER_UNIT ? (
                <Question label="Hangi birim / kişi ile görüşmek istiyorsunuz?" help="Açıklama olarak yazın." required>
                  <textarea className="field" rows={2} value={mm.other} onChange={(e) => setMm({ other: e.target.value })} />
                </Question>
              ) : mm.unit ? (
                <Question label={`${mm.unit} takvimi`} help="Uygun bir saat seçin (9–20 Kasım, 09:00–16:00)." required>
                  <UnitCalendar unit={mm.unit} email={form.email} days={form.days} value={{ date: mm.date, time: mm.time }} onPick={(date, time) => setMm({ date, time })} />
                  {mm.date && mm.time ? (
                    <p className="mt-2 text-sm text-[#22A34A] font-semibold">
                      {tx("Seçilen")}: {tx(dayLabel(mm.date))} · {mm.time}–{slotEnd(mm.time)}
                    </p>
                  ) : null}
                </Question>
              ) : null}
              {mm.unit ? (
                <>
                  <Question label="Toplantı talep eden" help="Ad soyad ve unvan" required>
                    <input className="field" value={mm.requester} onChange={(e) => setMm({ requester: e.target.value })} />
                  </Question>
                  <Question label="Toplantı konusu" required>
                    <input className="field" value={mm.topic} onChange={(e) => setMm({ topic: e.target.value })} />
                  </Question>
                  <Question label="Toplantı talebi" help="Görüşmede ele almak istediğiniz başlıklar">
                    <textarea className="field" rows={3} value={mm.request} onChange={(e) => setMm({ request: e.target.value })} />
                  </Question>
                  <Question label="Toplantıya katılacak kişiler" required>
                    <PeopleEditor rows={mm.attendees} onChange={(attendees) => setMm({ attendees })} addLabel="Katılımcı ekle" />
                  </Question>
                </>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="concept-kicker">{tx("Diğer toplantılar")}</h3>
          <Question label="COP31 süresince pavilyonda diğer kurum ve firmalarla toplantı yapmak istiyor musunuz?" required>
            <Choice
              options={["Evet", "Hayır"]}
              value={form.meetingHost}
              onChange={(meetingHost) =>
                set({ meetingHost, meetingRequests: meetingHost === "Evet" && !form.meetingRequests.length ? [blankMeeting()] : form.meetingRequests })
              }
            />
          </Question>
          <Question label="Size gelen toplantı taleplerine katılmak ister misiniz?" help="Diğer kurum ve firmalar sizinle görüşme talep edebilir." required>
            <Choice options={["Evet", "Hayır"]} value={form.meetingIncoming} onChange={(meetingIncoming) => set({ meetingIncoming })} />
          </Question>
          {form.meetingHost === "Evet" ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold">{tx("Toplantı talepleriniz")}</p>
              {form.meetingRequests.map((m, i) => (
                <div key={i} className="border border-[#B5DFF2] p-3 space-y-2 bg-[#F7FBFD]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.14em] text-[#0077C2]">{tx("Toplantı")} {i + 1}</span>
                    {form.meetingRequests.length > 1 ? (
                      <button type="button" className="text-xs text-[#c2410c]" onClick={() => set({ meetingRequests: form.meetingRequests.filter((_, j) => j !== i) })}>
                        {tx("Kaldır")}
                      </button>
                    ) : null}
                  </div>
                  <Question label="Kiminle görüşmek istiyorsunuz?" help="Kurum, firma veya kişi adı" required>
                    <input className="field" list="stakeholder-orgs" value={m.with} onChange={(e) => setMeeting(i, { with: e.target.value })} />
                  </Question>
                  <Question label="Toplantı konusu" required>
                    <input className="field" value={m.topic} onChange={(e) => setMeeting(i, { topic: e.target.value })} />
                  </Question>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Question label="Tercih ettiğiniz gün">
                      <select className="field" value={m.date} onChange={(e) => setMeeting(i, { date: e.target.value })}>
                        <option value="">{tx("Fark etmez")}</option>
                        {(form.days.length ? form.days : FORM_DAYS).map((d) => (
                          <option key={d} value={d}>{tx(dayLabel(d))}</option>
                        ))}
                      </select>
                    </Question>
                    <Question label="Saat tercihi">
                      <select className="field" value={m.timeOfDay} onChange={(e) => setMeeting(i, { timeOfDay: e.target.value })}>
                        {TIME_OF_DAY.map((t) => <option key={t} value={t}>{tx(t)}</option>)}
                      </select>
                    </Question>
                  </div>
                  <Question label="Toplantıya katılacak kişiler" help="Firmanızdan katılacakları isim isim yazın." required>
                    <PeopleEditor rows={m.attendees} onChange={(attendees) => setMeeting(i, { attendees })} addLabel="Katılımcı ekle" />
                  </Question>
                </div>
              ))}
              <button type="button" className="btn ghost" onClick={() => set({ meetingRequests: [...form.meetingRequests, blankMeeting()] })}>
                <Plus size={15} />
                {tx("Başka toplantı talebi ekle")}
              </button>
              <datalist id="stakeholder-orgs">
                {(meta?.companies || []).map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          ) : null}
        </section>

        {error ? <p className="text-sm text-[#c2410c]">{error}</p> : null}
        <button className="btn w-full justify-center" type="submit" disabled={busy}>
          {busy ? tx("Gönderiliyor…") : tx("Formu gönder")}
        </button>
      </form>
    </div>
  );
}
