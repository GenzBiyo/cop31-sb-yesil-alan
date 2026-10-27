import Link from "next/link";
import { readElci } from "@/lib/ambassador-access";
import { PrizeScanner } from "@/components/gate/PrizeScanner";

export const dynamic = "force-dynamic";

export default async function ElciGiftPage() {
  const elci = await readElci();
  if (!elci) {
    return (
      <main className="min-h-screen bg-[#EEF8FD] px-5 py-10">
        <div className="max-w-md mx-auto card p-6 space-y-3 text-center">
          <h1 className="display text-3xl">Elçi girişi gerekli.</h1>
          <Link className="btn justify-center" href="/giris/elciler?sekme=giris&next=/elci/hediye">Giriş</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF8FD] px-5 py-8">
      <div className="max-w-md mx-auto space-y-4">
        <div>
          <p className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">İklim Sağlık Elçisi</p>
          <h1 className="display text-3xl">{elci.name}</h1>
          <p className="text-sm text-[#3E6A88]">Kişiye özel kodu okutun. Her kod bir kez hediye verir.</p>
        </div>
        <PrizeScanner />
      </div>
    </main>
  );
}
