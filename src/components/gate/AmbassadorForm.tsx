"use client";

import { FormEvent, useMemo, useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Field = {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string;
  help: string;
};

type FormPayload = { intro: string; fields: Field[] };

function optionsOf(field: Field) {
  return field.options.split("\n").map((s) => s.trim()).filter(Boolean);
}

export function AmbassadorForm() {
  const { tx } = useI18n();
  const { data } = useApi<FormPayload>("/api/ambassador/form");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const fields = data?.fields || [];
  const set = (key: string, value: unknown) => setValues((v) => ({ ...v, [key]: value }));

  const toggleMulti = (key: string, option: string) => {
    const current = Array.isArray(values[key]) ? (values[key] as string[]) : [];
    set(key, current.includes(option) ? current.filter((x) => x !== option) : [...current, option]);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("idle");
    try {
      await api("/api/ambassador/apply", { method: "POST", body: JSON.stringify(values) });
      setStatus("ok");
      setMessage("Başvurunuz alındı. Kabul ve diğer bilgilendirmeler e-posta ve telefonunuza iletilecektir.");
    } catch (err) {
      setStatus("err");
      setMessage(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setBusy(false);
    }
  }

  const intro = useMemo(() => (data?.intro || "").split("\n\n"), [data?.intro]);

  if (status === "ok") {
    return (
      <div>
        <h2 className="display text-3xl">{tx("Teşekkürler")}</h2>
        <p className="mt-2 text-sm">{tx(message)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <aside className="text-sm text-[#57534e] border-l-2 border-[#22A34A] pl-3">
        {intro.map((p) => (
          <p key={p.slice(0, 24)} className="mb-2 last:mb-0">{tx(p)}</p>
        ))}
      </aside>
      <form className="space-y-3" onSubmit={onSubmit}>
        {fields.map((field) => (
          <label key={field.id} className="block text-sm">
            <span className="font-semibold">
              {tx(field.label)}
              {field.required ? <span className="text-[#0077C2]"> *</span> : null}
            </span>
            {field.help ? <span className="block text-xs text-[#57534e] font-normal">{tx(field.help)}</span> : null}
            {field.type === "textarea" ? (
              <textarea className="field mt-1" rows={3} required={field.required} onChange={(e) => set(field.key, e.target.value)} />
            ) : field.type === "select" ? (
              <select className="field mt-1" required={field.required} defaultValue="" onChange={(e) => set(field.key, e.target.value)}>
                <option value="" disabled>{tx("Seçin")}</option>
                {optionsOf(field).map((o) => <option key={o} value={o}>{tx(o)}</option>)}
              </select>
            ) : field.type === "multiselect" ? (
              <div className="mt-2 grid sm:grid-cols-2 gap-1">
                {optionsOf(field).map((o) => {
                  const selected = Array.isArray(values[field.key]) && (values[field.key] as string[]).includes(o);
                  return (
                    <button type="button" key={o} className={`text-left px-2 py-1 border text-xs ${selected ? "bg-[#22A34A] text-white border-[#22A34A]" : "border-[#B5DFF2] bg-white"}`} onClick={() => toggleMulti(field.key, o)}>
                      {tx(o)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                className="field mt-1"
                type={field.type === "url" ? "url" : field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
                required={field.required}
                onChange={(e) => set(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
              />
            )}
          </label>
        ))}
        {status === "err" ? <p className="text-sm text-[#0077C2]">{tx(message)}</p> : null}
        <button className="btn w-full justify-center" disabled={busy}>{busy ? tx("Gönderiliyor…") : tx("Elçi başvurumu gönder")}</button>
      </form>
    </div>
  );
}
