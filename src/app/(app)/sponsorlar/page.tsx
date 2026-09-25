"use client";

import { FormEvent, useRef, useState } from "react";
import { api, useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";
import { fitLogoFile } from "@/lib/logo-fit";

type Sponsor = {
  id: string;
  name: string;
  logoPath: string;
  url: string;
  sortOrder: number;
  active: boolean;
};

type Brand = {
  mainLogo?: string;
  sponsors?: Sponsor[];
};

export default function SponsorsPage() {
  const { tx } = useI18n();
  const me = useApi<{ role: string }>("/api/auth/me");
  const { data, reload } = useApi<Brand>("/api/sponsors");
  const fileRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const rows = data?.sponsors || [];
  const mainLogo = data?.mainLogo || "/brand/cop31-turkiye.png";

  if (me.data && me.data.role !== "ADMIN") {
    return <p className="text-[#E31C23]">{tx("Yetkiniz yok")}</p>;
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    const raw = fileRef.current?.files?.[0];
    if (!raw) {
      setMsg(tx("Logo dosyası seçin"));
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const file = await fitLogoFile(raw);
      const fd = new FormData();
      fd.append("name", name);
      fd.append("url", url);
      fd.append("file", file);
      await api("/api/sponsors", { method: "POST", body: fd });
      setName("");
      setUrl("");
      if (fileRef.current) fileRef.current.value = "";
      setMsg(tx("Sponsor eklendi. Ana ekranda aynı boyutta döner."));
      await reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : tx("Logo yüklenemedi"));
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await api(`/api/sponsors/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    await reload();
  }

  async function swap(a: number, b: number) {
    const left = rows[a];
    const right = rows[b];
    if (!left || !right) return;
    await api(`/api/sponsors/${left.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: right.sortOrder }) });
    await api(`/api/sponsors/${right.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: left.sortOrder }) });
    await reload();
  }

  async function replaceLogo(id: string, file: File) {
    setBusy(true);
    setMsg("");
    try {
      const fitted = await fitLogoFile(file);
      const fd = new FormData();
      fd.append("file", fitted);
      await api(`/api/sponsors/${id}/logo`, { method: "POST", body: fd });
      setMsg(tx("Logo güncellendi."));
      await reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : tx("Logo yüklenemedi"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(tx("Bu sponsoru silmek istiyor musunuz?"))) return;
    await api(`/api/sponsors/${id}`, { method: "DELETE" });
    await reload();
  }

  async function uploadMain(file: File) {
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api("/api/sponsors/main", { method: "POST", body: fd });
      setMsg(tx("Ana logo güncellendi. Üstte sabit durur, dönmez."));
      await reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : tx("Logo yüklenemedi"));
    } finally {
      setBusy(false);
    }
  }

  async function resetMain() {
    setBusy(true);
    try {
      await api("/api/sponsors/main", { method: "DELETE" });
      setMsg(tx("Ana logo varsayılana döndü."));
      await reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : tx("Logo yüklenemedi"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="display text-4xl">{tx("Etkinlik sponsorları")}</h1>
        <p className="text-[#57534e]">
          {tx("Ana logo üstte sabittir ve dönmez. Sponsor logoları beyaz şeritte aynı boyutta döner.")}
        </p>
      </div>

      <section className="card p-4 space-y-3">
        <h2 className="display text-2xl">{tx("Ana logo")}</h2>
        <p className="text-sm text-[#57534e]">{tx("Ana ekranın en üstünde tek ve sabit durur. Logoyu buradan yükleyin.")}</p>
        <div className="flex flex-wrap items-center gap-4">
          <img className="gate-main-logo is-admin" src={mainLogo} alt={tx("Ana logo")} />
          <div className="flex flex-wrap gap-2">
            <label className="btn">
              {busy ? tx("Yükleniyor…") : tx("Ana logoyu yükle")}
              <input
                ref={mainRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                hidden
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadMain(file);
                }}
              />
            </label>
            <button className="btn ghost" type="button" disabled={busy} onClick={() => void resetMain()}>
              {tx("Varsayılana dön")}
            </button>
          </div>
        </div>
      </section>

      <form className="card p-4 grid gap-3" onSubmit={(e) => void create(e)}>
        <h2 className="display text-2xl">{tx("Yeni sponsor")}</h2>
        <input className="field" required placeholder={tx("Sponsor adı")} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field" placeholder={tx("Web sitesi (isteğe bağlı)")} value={url} onChange={(e) => setUrl(e.target.value)} />
        <label className="text-sm">
          {tx("Logo (PNG, JPG, WebP, SVG)")}
          <input ref={fileRef} className="field mt-1" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" required />
        </label>
        <p className="text-xs text-[#3E6A88]">{tx("Yüklemede logo 640×320 alana ortalanır; ekranda her kutu aynı ölçüdür.")}</p>
        <button className="btn w-fit" disabled={busy} type="submit">
          {busy ? tx("Yükleniyor…") : tx("Ekle ve yayınla")}
        </button>
      </form>

      {msg ? <p className="text-sm text-[#0077C2]">{tx(msg)}</p> : null}

      <div className="space-y-3">
        {rows.length === 0 ? <p className="text-sm text-[#57534e]">{tx("Henüz sponsor yok. Logo ekleyince ana ekranda dönmeye başlar.")}</p> : null}
        {rows.map((s, i) => (
          <div key={s.id} className="card p-4 flex flex-wrap gap-4 items-center">
            <span className="sponsor-tile is-admin">
              <img src={s.logoPath} alt={s.name} />
            </span>
            <div className="min-w-[180px] flex-1">
              <input
                className="field"
                defaultValue={s.name}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== s.name) void patch(s.id, { name: next });
                }}
              />
              <input
                className="field mt-2"
                defaultValue={s.url}
                placeholder={tx("Web sitesi")}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next !== s.url) void patch(s.id, { url: next });
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn ghost" type="button" disabled={i === 0} onClick={() => void swap(i, i - 1)}>
                ↑
              </button>
              <button className="btn ghost" type="button" disabled={i === rows.length - 1} onClick={() => void swap(i, i + 1)}>
                ↓
              </button>
              <button className={s.active ? "btn" : "btn ghost"} type="button" onClick={() => void patch(s.id, { active: !s.active })}>
                {s.active ? tx("Yayında") : tx("Gizli")}
              </button>
              <label className="btn ghost">
                {tx("Logoyu değiştir")}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void replaceLogo(s.id, file);
                  }}
                />
              </label>
              <button className="btn ghost" style={{ color: "#E31C23" }} type="button" onClick={() => void remove(s.id)}>
                {tx("Sil")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
