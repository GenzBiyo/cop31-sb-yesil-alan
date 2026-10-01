import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export const SPEAKER_PENDING = "Onay bekliyor";
export const SPEAKER_APPROVED = "Onaylandı";
export const SPEAKER_REJECTED = "Reddedildi";

const SEEDED_KEY = "speakersSeeded";
const MAX_PHOTO = 5 * 1024 * 1024;

const SEED = [
  { name: "Umut Ağyüz", title: "", organization: "" },
  { name: "Dr. Çağrı Emin Şahin", title: "Sağlığın Geliştirilmesi Genel Müdür Yardımcısı", organization: "T.C. Sağlık Bakanlığı" },
  { name: "Doğan Taşkent", title: "Strateji ve Ar-Ge Direktörü", organization: "Atabay İlaç" },
  { name: "Barış Özyurtlu", title: "CEO", organization: "Berko İlaç" },
  { name: "Haluk Sancak", title: "", organization: "" },
  { name: "Prof. Dr. Ahmet Hacımüftüoğlu", title: "Rektör", organization: "Atatürk Üniversitesi" },
  { name: "Esra Bayraktaroğlu", title: "Genel Müdür Yardımcısı", organization: "Humanis İlaç" },
  { name: "Marc Gates", title: "Global Director", organization: "Astorg (Thermo Fisher)" },
  { name: "Mehmet Üvez", title: "Türkiye Direktör Yardımcısı, Ankara Ofisi Başkanı", organization: "EBRD" },
  { name: "Nihan Yegin Yarayan", title: "Proje Yöneticisi ve Genel Sekreter", organization: "İklim Araştırmaları Derneği" },
];

/** Seeds the first speakers once; later deletions are not undone. */
export async function ensureSpeakers() {
  const flag = await prisma.setting.findUnique({ where: { key: SEEDED_KEY } });
  if (flag) return;
  if ((await prisma.speaker.count()) === 0) {
    await prisma.speaker.createMany({ data: SEED.map((s, i) => ({ ...s, sortOrder: i + 1 })) });
  }
  await prisma.setting.upsert({ where: { key: SEEDED_KEY }, update: { value: "1" }, create: { key: SEEDED_KEY, value: "1" } });
}

export function cleanLinkedin(raw: unknown) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)linkedin\.com$/i.test(parsed.hostname)) throw new Error();
    return parsed.toString();
  } catch {
    throw new Error("LinkedIn adresi linkedin.com ile başlamalı");
  }
}

export async function saveSpeakerPhoto(file: File) {
  if (file.size > MAX_PHOTO) throw new Error("Fotoğraf en fazla 5 MB olabilir");
  if (!(file.type || "").startsWith("image/")) throw new Error("JPG, PNG veya WebP fotoğraf yükleyin");
  const ext = file.type.includes("png") ? "png" : file.type.includes("jpeg") || file.type.includes("jpg") ? "jpg" : "webp";
  const dir = path.join(process.cwd(), "public", "uploads", "speakers");
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/speakers/${filename}`;
}

export function speakerFields(form: FormData) {
  const text = (key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);
  return {
    name: text("name", 120),
    title: text("title", 160),
    organization: text("organization", 160),
    summary: text("summary", 400),
    bio: text("bio", 4000),
    linkedin: cleanLinkedin(form.get("linkedin")),
  };
}
