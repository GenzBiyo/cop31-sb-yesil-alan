"use client";

import { useI18n } from "@/components/I18nProvider";

export function resolveQuestionVideo(url?: string | null, path?: string | null) {
  if (path) return { kind: "file" as const, src: path };
  const raw = String(url || "").trim();
  if (!raw) return { kind: "none" as const, src: "" };
  const yt = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/i);
  if (yt) return { kind: "youtube" as const, src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1` };
  const vm = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return { kind: "vimeo" as const, src: `https://player.vimeo.com/video/${vm[1]}` };
  return { kind: "file" as const, src: raw };
}

export function QuestionVideo({
  url,
  path,
  title,
  compact,
}: {
  url?: string | null;
  path?: string | null;
  title?: string;
  compact?: boolean;
}) {
  const media = resolveQuestionVideo(url, path);
  if (media.kind === "none") return null;
  return (
    <div className={`q-video ${compact ? "is-compact" : ""}`}>
      {media.kind === "file" ? (
        <video src={media.src} controls playsInline className="q-video-el" />
      ) : (
        <iframe
          src={media.src}
          title={title || "Question video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="q-video-el"
        />
      )}
    </div>
  );
}

const LETTER_BG = ["#0077C2", "#22A34A", "#00A3E0", "#E31C23"];

export function QuestionOptions({
  options,
  correctIndex,
  reveal,
  size = "md",
}: {
  options: string[];
  correctIndex?: number | null;
  reveal?: boolean;
  size?: "md" | "xl";
}) {
  const { tx } = useI18n();
  return (
    <div className={`q-opts ${size === "xl" ? "is-xl" : ""}`}>
      {options.map((o, i) => {
        const win = Boolean(reveal && correctIndex === i);
        return (
          <div key={`${i}-${o}`} className={`q-opt ${win ? "is-correct" : ""}`} style={{ animationDelay: `${i * 70}ms` }}>
            <span className="q-letter" style={{ background: win ? "#22A34A" : LETTER_BG[i % LETTER_BG.length] }}>
              {String.fromCharCode(65 + i)}
            </span>
            <span className="q-opt-text">{tx(o)}</span>
            {win ? <span className="q-opt-tag">{tx("Doğru")}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
