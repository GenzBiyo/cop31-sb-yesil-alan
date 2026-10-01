"use client";

import { useI18n } from "@/components/I18nProvider";

export type EventSponsorInfo = { company: string; logo: string; prize?: string; endTime?: string };

export function EventSponsor({ sponsor, size = "wall" }: { sponsor?: EventSponsorInfo | null; size?: "wall" | "phone" }) {
  const { tx } = useI18n();
  if (!sponsor) return null;
  return (
    <div className={`event-sponsor is-${size}`}>
      <div className="event-sponsor-kicker">{tx("Etkinlik Sponsoru")}</div>
      <div className="event-sponsor-plate">
        {sponsor.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sponsor.logo} alt={sponsor.company} />
        ) : (
          <span className="event-sponsor-name">{sponsor.company}</span>
        )}
      </div>
      {sponsor.prize && size === "wall" ? <div className="event-sponsor-prize">{tx("Ödül")}: {sponsor.prize}</div> : null}
    </div>
  );
}
