"use client";

import { useEffect, useState } from "react";
import { PLAK_SPIN_MS } from "@/lib/plak";

export type PlakTrack = {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  videoId: string;
};

export function PlakReel({
  tracks,
  index,
  startedAt,
  spinning,
}: {
  tracks: PlakTrack[];
  index: number;
  startedAt: string | null;
  spinning: boolean;
}) {
  const [shift, setShift] = useState(0);
  const count = Math.max(tracks.length, 1);
  const card = 168;

  useEffect(() => {
    if (!startedAt || !tracks.length) {
      setShift(index * card);
      return;
    }
    const origin = new Date(startedAt).getTime();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - origin) / PLAK_SPIN_MS);
      const ease = 1 - (1 - t) ** 3;
      const loops = 6 * count + index;
      setShift(loops * card * ease);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [startedAt, index, tracks.length, count, card]);

  const loop = tracks.length ? [...tracks, ...tracks, ...tracks, ...tracks, ...tracks, ...tracks, ...tracks] : [];
  const shown = spinning ? shift : index * card;

  return (
    <div className="plak-window">
      <div className="plak-strip" style={{ transform: `translateX(calc(50% - 84px - ${shown}px))` }}>
        {loop.map((track, i) => (
          <img key={`${track.id}-${i}`} src={track.imageUrl} alt="" />
        ))}
      </div>
    </div>
  );
}

export function PlakPlayer({ videoId }: { videoId: string }) {
  if (!videoId) return null;
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`;
  return (
    <iframe
      className="plak-player"
      src={src}
      title="YouTube"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}
