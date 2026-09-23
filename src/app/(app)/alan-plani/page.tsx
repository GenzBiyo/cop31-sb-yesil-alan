"use client";

import { useApi } from "@/lib/client";
import { useI18n } from "@/components/I18nProvider";

type Zone = { id: string; name: string; description: string; x: number; y: number; w: number; h: number; color: string; companySlug: string };

export default function SpacePage() {
  const { tx } = useI18n();
  const { data } = useApi<Zone[]>("/api/space");
  return (
    <div className="space-y-4">
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <h1 className="display text-4xl">{tx("Alan planı")}</h1>
          <p className="text-[#57534e]">Sağlık Pavilionu şematik yerleşim. Sahne, seminer, deneyim, stant ve backstage.</p>
        </div>
        <a className="btn" href="/api/pdf/alan-plani">Alan planı PDF</a>
      </div>
      <div className="card p-4 overflow-auto">
        <svg viewBox="0 0 100 70" className="w-full min-w-[720px] bg-[#EAF2F8]">
          {(data || []).map((z) => (
            <g key={z.id}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.color} stroke="#1c1917" strokeWidth="0.3" />
              <text x={z.x + 1} y={z.y + 3.2} fill="#fff" fontSize="2.1">{z.name}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(data || []).map((z) => (
          <div key={z.id} className="card p-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 inline-block" style={{ background: z.color }} />
              <strong>{z.name}</strong>
            </div>
            <p className="text-sm text-[#57534e] mt-1">{z.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
