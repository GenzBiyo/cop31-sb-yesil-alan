import type { Metadata } from "next";
import Link from "next/link";
import { SpeakerShareCard } from "@/components/speakers/SpeakerShareCard";
import { loadSpeakerShare } from "@/lib/speaker-share-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const speaker = await loadSpeakerShare(id);
  const title = speaker ? `${speaker.name} · Konuşuyorum` : "Konuşuyorum";
  return {
    title,
    description: "COP31 Türkiye Sağlık Bakanlığı Sağlık Pavyonu konuşmacı paylaşım kartı. Antalya, 9–20 Kasım 2026.",
  };
}

export default async function SpeakerSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const speaker = await loadSpeakerShare(id);
  if (!speaker) {
    return (
      <main className="min-h-screen bg-[#EEF8FD] text-[#0B1C33] grid place-items-center px-6">
        <div className="max-w-md text-center space-y-3">
          <p className="text-xs font-bold tracking-[0.22em] text-[#0077C2]">COP31 TÜRKİYE</p>
          <h1 className="display text-4xl">Konuşmacı kartı açılmadı</h1>
          <p className="text-[#3E6A88]">Bu sayfa, onaylanan konuşmacının paylaşım kartıdır.</p>
          <Link className="btn justify-center" href="/konusmacilar">Konuşmacılar</Link>
        </div>
      </main>
    );
  }
  return <SpeakerShareCard speaker={speaker} />;
}
