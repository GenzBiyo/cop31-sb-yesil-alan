import { PRIZE_MESSAGE } from "@/lib/prize-pass";

export const dynamic = "force-dynamic";

export default function PavilionGiftPage() {
  return (
    <main className="min-h-screen bg-[#EEF8FD] px-5 py-10">
      <div className="max-w-md mx-auto card p-6 space-y-3 text-center">
        <p className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">Sağlık Bakanlığı Pavilyonu</p>
        <h1 className="display text-4xl">Hediyeni almak için ekranı göster</h1>
        <p className="font-semibold">{PRIZE_MESSAGE}</p>
        <p className="text-sm text-[#3E6A88]">Küçük karekod kişiye ve seçtiği etkinliğe özeldir. Bir kez okutulur.</p>
      </div>
    </main>
  );
}
