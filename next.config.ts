import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt",
    "cop31saglikbakanligi.loca.lt",
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.io",
  ],
  async headers() {
    const week = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      { source: "/gate/:path*", headers: week },
      { source: "/brand/:path*", headers: week },
      { source: "/hatira/:path*", headers: week },
      { source: "/icons/:path*", headers: week },
      { source: "/fonts/:path*", headers: week },
    ];
  },
  async rewrites() {
    return [
      { source: "/COP31saglikbakanligi", destination: "/" },
      { source: "/cop31saglikbakanligi", destination: "/" },
    ];
  },
  serverExternalPackages: ["pdfkit", "exceljs", "@prisma/client", "@imgly/background-removal-node", "onnxruntime-node", "sharp", "web-push"],
  transpilePackages: ["@mediapipe/tasks-vision"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
