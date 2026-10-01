import { prisma } from "@/lib/prisma";
import { nowLocalKey } from "@/lib/meeting-slots";
import { PENDING, REJECTED } from "@/lib/proposals";

export const PANEL_SCREEN_KEY = "panelScreen";
export const PANEL_SCREEN_MODES = ["auto", "panel", "off"] as const;
export type PanelScreenMode = (typeof PANEL_SCREEN_MODES)[number];
export type PanelScreenSetting = { mode: PanelScreenMode; panelId: string };

/** Minutes before the scheduled start when the screen switches to the panel. */
const LEAD_MINUTES = 10;
const HIDDEN_STATUSES = [PENDING, REJECTED, "İptal"];

export async function readPanelScreen(): Promise<PanelScreenSetting> {
  const row = await prisma.setting.findUnique({ where: { key: PANEL_SCREEN_KEY } });
  try {
    const value = JSON.parse(row?.value || "{}");
    const mode = (PANEL_SCREEN_MODES as readonly string[]).includes(value.mode) ? (value.mode as PanelScreenMode) : "auto";
    return { mode, panelId: mode === "panel" ? String(value.panelId || "") : "" };
  } catch {
    return { mode: "auto", panelId: "" };
  }
}

export async function writePanelScreen(setting: PanelScreenSetting) {
  const value = JSON.stringify(setting);
  await prisma.setting.upsert({ where: { key: PANEL_SCREEN_KEY }, update: { value }, create: { key: PANEL_SCREEN_KEY, value } });
}

function normName(name: string) {
  return name
    .replace(/(Prof|Doç|Dr|Uzm|Op|Av|Müh)\.\s*/gi, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-zçğıöşü\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

async function scheduledPanelId() {
  const now = nowLocalKey();
  const today = now.slice(0, 10);
  const time = now.slice(11, 16);
  const panels = await prisma.panel.findMany({
    where: { date: today, status: { notIn: HIDDEN_STATUSES } },
    select: { id: true, startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });
  const timed = /^\d{2}:\d{2}$/;
  const live = panels.find(
    (p) => timed.test(p.startTime) && timed.test(p.endTime) && addMinutes(p.startTime, -LEAD_MINUTES) <= time && time < p.endTime
  );
  return live?.id || "";
}

export async function livePanel() {
  const setting = await readPanelScreen();
  if (setting.mode === "off") return { setting, panel: null };
  const panelId = setting.mode === "panel" ? setting.panelId : await scheduledPanelId();
  if (!panelId) return { setting, panel: null };
  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
    include: { participants: { include: { person: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!panel) return { setting, panel: null };

  const speakers = await prisma.speaker.findMany({
    where: { status: "Onaylandı" },
    select: { name: true, title: true, organization: true, photoPath: true },
  });
  const byName = new Map(speakers.map((s) => [normName(s.name), s]));
  const people = panel.participants
    .filter((p) => p.confirmed !== "Red" && p.confirmed !== "Reddedildi")
    .map((p) => {
      const match = byName.get(normName(p.person.name));
      return {
        id: p.id,
        name: match?.name || p.person.name,
        role: p.role,
        title: match?.title || p.person.role,
        organization: match?.organization || p.person.organization,
        photoPath: match?.photoPath || "",
      };
    });

  return {
    setting,
    panel: {
      id: panel.id,
      title: panel.title,
      kind: panel.kind,
      topic: panel.topic,
      theme: panel.theme,
      date: panel.date,
      startTime: panel.startTime,
      endTime: panel.endTime,
      location: panel.location,
      people,
    },
  };
}
