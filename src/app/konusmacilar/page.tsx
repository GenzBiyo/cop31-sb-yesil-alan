"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { MOTES } from "@/components/gate/motes";
import { useI18n } from "@/components/I18nProvider";
import { SpeakerAvatar, SpeakerRail, useSpeakers } from "@/components/speakers";

export default function SpeakersPage() {
  const { tx } = useI18n();
  const { data, loading } = useSpeakers();
  const speakers = data?.speakers || [];
  const [open, setOpen] = useState<string | null>(null);

  return (
    <main className="gate-root is-open" style={{ height: "auto", minHeight: "100dvh", overflow: "auto" }}>
      <div className="gate-kenburns" />
      <div className="gate-aurora" />
      <div className="gate-vignette" />
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="gate-mote"
          style={{ left: m.left, width: m.size, height: m.size, animationDelay: m.delay, animationDuration: m.duration }}
        />
      ))}
      <SpeakerRail />
      <div className="relative z-10 max-w-6xl mx-auto px-5 py-10 w-full">
        <Link href="/" className="text-xs tracking-[0.2em] uppercase opacity-80 underline underline-offset-4">{tx("← Kapılara dön")}</Link>
        <p className="gate-kicker mt-8">{tx("COP31 Sağlık Pavilionu")}</p>
        <h1 className="gate-slogan text-left">{tx("Konuşmacılar")}</h1>
        <p className="gate-lead text-left mx-0">
          {tx("Pavilyonda panel ve konuşmalara katılacak konuşmacılar. Karta basınca özgeçmiş açılır.")}
        </p>

        {loading && !data ? <p className="mt-8 text-sm">{tx("Yükleniyor…")}</p> : null}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-10">
          {speakers.map((s) => (
            <article key={s.id} id={s.id} className="speaker-card">
              <button type="button" className="text-left w-full" onClick={() => setOpen((id) => (id === s.id ? null : s.id))}>
                <SpeakerAvatar name={s.name} photoPath={s.photoPath} size={120} />
                <h2 className="display text-2xl mt-3 leading-tight">{s.name}</h2>
                {s.title ? <p className="text-sm font-semibold text-[#0077C2]">{s.title}</p> : null}
                {s.organization ? <p className="text-sm text-[#3E6A88]">{s.organization}</p> : null}
                {s.summary ? <p className="text-sm mt-2 text-[#0B1C33]">{s.summary}</p> : null}
              </button>
              {open === s.id && s.bio ? <p className="text-sm mt-3 whitespace-pre-line text-[#0B1C33] border-t border-[#DCE8F0] pt-3">{s.bio}</p> : null}
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                {s.bio ? (
                  <button type="button" className="underline text-[#0077C2]" onClick={() => setOpen((id) => (id === s.id ? null : s.id))}>
                    {open === s.id ? tx("Özgeçmişi kapat") : tx("Özgeçmiş")}
                  </button>
                ) : null}
                {s.linkedin ? (
                  <a href={s.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#0077C2] underline">
                    <ExternalLink size={14} /> LinkedIn
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {!loading && speakers.length === 0 ? <p className="mt-8 text-sm">{tx("Konuşmacılar yakında açıklanacak.")}</p> : null}
      </div>
    </main>
  );
}
