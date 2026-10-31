import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { PageNav } from "@/components/PageNav";

const sans = localFont({
  src: [
    { path: "../fonts/source-sans-3-latin.woff2", weight: "400 600", style: "normal" },
    { path: "../fonts/source-sans-3-latin-ext.woff2", weight: "400 600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-sans",
});

const display = localFont({
  src: [
    { path: "../fonts/cormorant-garamond-600-latin.woff2", weight: "600", style: "normal" },
    { path: "../fonts/cormorant-garamond-600-latin-ext.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  preload: false,
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Healthy people, healthy planet · COP31 Health Pavilion",
  description: "Climate crisis, carbon and protective public health. Republic of Türkiye Ministry of Health COP31 Antalya Health Pavilion.",
  applicationName: "COP31 Sağlık",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "COP31 Sağlık",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/saglik-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icons/saglik-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/icons/saglik-apple.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#0077C2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <I18nProvider>
          {children}
          <PageNav />
        </I18nProvider>
      </body>
    </html>
  );
}
