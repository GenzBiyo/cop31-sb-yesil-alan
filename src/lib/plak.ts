export const PLAK_SPIN_MS = 5200;
export const SHARE_TAGS = "#COP31SaglikBakanligi #SaglikliInsanSaglikliGezegen";

export function youtubeId(raw: string) {
  const text = raw.trim();
  if (/^[\w-]{11}$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0]?.slice(0, 11) || "";
    const watch = url.searchParams.get("v");
    if (watch) return watch.slice(0, 11);
    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) => part === "shorts" || part === "embed" || part === "live");
    if (marker >= 0 && parts[marker + 1]) return parts[marker + 1].slice(0, 11);
  } catch {
    return "";
  }
  return "";
}

export async function describeTrack(rawUrl: string) {
  const videoId = youtubeId(rawUrl);
  if (!videoId) throw new Error("YouTube Music bağlantısı okunamadı");
  const watch = `https://www.youtube.com/watch?v=${videoId}`;
  let title = "Parça";
  let artist = "";
  let imageUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`);
    if (res.ok) {
      const data = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
      if (data.title) title = data.title.slice(0, 140);
      if (data.author_name) artist = data.author_name.slice(0, 80);
      if (data.thumbnail_url) imageUrl = data.thumbnail_url;
    }
  } catch {
    /* kapak adresi yedekte kalır */
  }
  return { url: rawUrl.trim().slice(0, 300), videoId, title, artist, imageUrl };
}

export function plakMotion(view: string, startedAt: Date | string | null, index: number, now = Date.now()) {
  let at = startedAt ? new Date(startedAt).getTime() : 0;
  let landed = index;
  try {
    const parsed = JSON.parse(view) as { plak?: { startedAt?: string; index?: number } };
    if (parsed.plak?.startedAt) at = new Date(parsed.plak.startedAt).getTime();
    if (typeof parsed.plak?.index === "number") landed = parsed.plak.index;
  } catch {
    /* düz metin görünüm */
  }
  const spinning = at > 0 && now - at < PLAK_SPIN_MS;
  return { startedAt: at ? new Date(at).toISOString() : null, index: landed, spinning };
}
