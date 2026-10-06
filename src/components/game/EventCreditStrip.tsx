"use client";

import { useApi } from "@/lib/client";

type Credit = { name: string; before: string; after: string; logoPath: string };

export function EventCreditStrip({ tone = "light" }: { tone?: "light" | "wall" }) {
  const { data } = useApi<{ credits: Credit[] }>("/api/public/event-credits");
  const credits = data?.credits || [];
  if (!credits.length) return null;
  return (
    <div className={`event-credits is-${tone}`}>
      {credits.map((row) => (
        <p key={`${row.logoPath}-${row.before}`} className="event-credit">
          <span>{row.before}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.logoPath} alt={row.name || "Sponsor"} />
          {row.after ? <span>{row.after}</span> : null}
        </p>
      ))}
    </div>
  );
}
