import { prisma } from "./prisma";

export const CARD_SLOTS = ["elci-tr", "elci-en", "speaker-tr", "speaker-en"] as const;
export type CardSlot = (typeof CARD_SLOTS)[number];

export const CARD_DEFAULTS: Record<CardSlot, string> = {
  "elci-tr": "/brand/elci-kart-tr.jpg",
  "elci-en": "/brand/elci-kart-en.jpg",
  "speaker-tr": "",
  "speaker-en": "",
};

function settingKey(slot: CardSlot) {
  return `card.bg.${slot}`;
}

export function isCardSlot(value: string): value is CardSlot {
  return (CARD_SLOTS as readonly string[]).includes(value);
}

export async function cardBackgrounds() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: CARD_SLOTS.map(settingKey) } },
  });
  const saved = new Map(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(
    CARD_SLOTS.map((slot) => {
      const custom = saved.get(settingKey(slot)) || "";
      return [slot, { url: custom || CARD_DEFAULTS[slot], custom: Boolean(custom) }];
    }),
  ) as Record<CardSlot, { url: string; custom: boolean }>;
}

export async function saveCardBackground(slot: CardSlot, url: string) {
  await prisma.setting.upsert({
    where: { key: settingKey(slot) },
    update: { value: url },
    create: { key: settingKey(slot), value: url },
  });
}

export async function resetCardBackground(slot: CardSlot) {
  await prisma.setting.deleteMany({ where: { key: settingKey(slot) } });
}
