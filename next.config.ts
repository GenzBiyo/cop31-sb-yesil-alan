import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt",
    "cop31saglikbakanligi.loca.lt",
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.io",
  ],
  async rewrites() {
    return [
      { source: "/COP31saglikbakanligi", destination: "/" },
      { source: "/cop31saglikbakanligi", destination: "/" },
    ];
  },
  serverExternalPackages: ["pdfkit", "exceljs", "@prisma/client", "@imgly/background-removal-node", "onnxruntime-node", "sharp"],
  transpilePackages: ["@mediapipe/tasks-vision"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
