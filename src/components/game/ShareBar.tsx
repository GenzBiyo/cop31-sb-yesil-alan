"use client";

import { SHARE_TAGS } from "@/lib/plak";

async function fileFromImage(src: string) {
  if (!src) return undefined;
  if (src.startsWith("data:")) {
    const res = await fetch(src);
    const blob = await res.blob();
    return new File([blob], "cop31-saglik.jpg", { type: blob.type || "image/jpeg" });
  }
  return undefined;
}

export function ShareBar({ text, image }: { text: string; image?: string }) {
  const caption = `${text}\n${SHARE_TAGS}`;

  async function instagram() {
    const url = window.location.href;
    const file = image ? await fileFromImage(image).catch(() => undefined) : undefined;
    if (navigator.share) {
      try {
        const payload: ShareData = { title: "COP31 Sağlık", text: caption, url };
        if (file && navigator.canShare?.({ files: [file] })) payload.files = [file];
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(`${caption}\n${url}`).catch(() => undefined);
    window.open("https://www.instagram.com/", "_blank", "noopener");
  }

  function twitter() {
    const href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text} ${SHARE_TAGS}`)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(href, "_blank", "noopener,width=560,height=640");
  }

  return (
    <div className="share-bar">
      <button type="button" className="share-ig" onClick={() => void instagram()} aria-label="Instagram’da paylaş">
        <IgIcon />
      </button>
      <button type="button" className="share-x" onClick={twitter} aria-label="X’te paylaş">
        <XIcon />
      </button>
    </div>
  );
}

function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="currentColor" d="M14.7 10.4 21.4 3h-1.6l-5.8 6.4L9.2 3H3.4l7 10-7 7.7h1.6l6.1-6.8 4.9 6.8h5.8l-7.1-10.3Zm-2.2 2.4-.7-1L5.6 4.3h2.4l4.5 6.2.7 1 6 8.2h-2.4l-4.3-6.9Z" />
    </svg>
  );
}
