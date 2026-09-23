"use client";

import { useEffect, useState } from "react";

function isLocalHost(value: string) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

function pickOrigin() {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const win = typeof window !== "undefined" ? window.location.origin : "";
  if (win && !isLocalHost(win)) return win;
  if (env && !isLocalHost(env)) return env;
  return win || env || "";
}

export function usePublicOrigin() {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(pickOrigin());
  }, []);
  return origin;
}

export function QrImage({ path, alt, size = 140 }: { path: string; alt: string; size?: number }) {
  const origin = usePublicOrigin();
  const src = origin
    ? `/api/qr?path=${encodeURIComponent(path)}&origin=${encodeURIComponent(origin)}`
    : `/api/qr?path=${encodeURIComponent(path)}`;

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="bg-white border border-[#B5DFF2]"
    />
  );
}
