"use client";

import { QrImage } from "@/components/QrImage";
import { PAVILION_QR_PATH, PRIZE_MESSAGE } from "@/lib/prize-pass";
import { useI18n } from "@/components/I18nProvider";

export function PrizePass({
  name,
  eventTitle,
  prize,
  passPath,
}: {
  name: string;
  eventTitle: string;
  prize: string;
  passPath: string;
}) {
  const { tx } = useI18n();
  return (
    <div className="space-y-3 text-center">
      <div className="flex justify-center">
        <QrImage path={PAVILION_QR_PATH} alt={tx("Pavilyon karekodu")} size={168} />
      </div>
      <p className="font-semibold text-[#0B1C33]">{tx(PRIZE_MESSAGE)}</p>
      <div>
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-sm text-[#3E6A88]">{eventTitle}</p>
        {prize ? <p className="text-sm font-semibold text-[#0077C2]">{tx(prize)}</p> : null}
      </div>
      <div className="flex justify-center">
        <QrImage path={passPath} alt={tx("Kişiye özel karekod")} size={88} />
      </div>
      <p className="text-xs text-[#3E6A88]">{tx("Bu kod bir kez okutulur.")}</p>
    </div>
  );
}
