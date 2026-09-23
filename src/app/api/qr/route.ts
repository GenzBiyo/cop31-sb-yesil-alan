import QRCode from "qrcode";

function isLocalHost(value: string) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

function publicOrigin(req: Request) {
  const url = new URL(req.url);
  const query = (url.searchParams.get("origin") || "").replace(/\/$/, "");
  const env = (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = req.headers.get("host");
  const proto = xfProto || url.protocol.replace(":", "") || (host && isLocalHost(host) ? "http" : "https");
  const forwarded = xfHost ? `${proto}://${xfHost}` : "";
  const fromHost = host ? `${proto}://${host}` : url.origin;
  const live = [query, forwarded, fromHost].filter((v) => /^https?:\/\//i.test(v));
  const candidates = [...live, env].filter((v) => /^https?:\/\//i.test(v));
  return live.find((v) => !isLocalHost(v)) || candidates.find((v) => !isLocalHost(v)) || candidates[0] || url.origin;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "/p";
  const origin = publicOrigin(req);
  const target = path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  if (searchParams.get("debug") === "1") {
    return Response.json({ origin, path, target });
  }
  const png = await QRCode.toBuffer(target, { type: "png", width: 240, margin: 1, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
      "X-QR-Url": target,
    },
  });
}
