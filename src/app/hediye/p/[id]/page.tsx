import Link from "next/link";
import { notFound } from "next/navigation";
import { readElci } from "@/lib/ambassador-access";
import { PRIZE_MESSAGE } from "@/lib/prize-pass";
import { redeemPrize } from "@/lib/prize-redeem";

export const dynamic = "force-dynamic";

export default async function PersonalPassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const elci = await readElci();
  const view = await redeemPrize(id, elci);
  if (!view) notFound();

  if (view.state === "login") {
    const next = `/hediye/p/${id}`;
    return (
      <main className="min-h-screen bg-[#EEF8FD] px-5 py-10">
        <div className="max-w-md mx-auto card p-6 space-y-3 text-center">
          <h1 className="display text-4xl">Elçi girişi gerekli.</h1>
          <p>Bu kodu kabul edilen iklim sağlık elçisi okutur. Girişten sonra hediye bir kez teslim edilir.</p>
          <Link className="btn justify-center" href={`/giris/elciler?sekme=giris&next=${encodeURIComponent(next)}`}>Giriş</Link>
        </div>
      </main>
    );
  }

  if (view.state === "thanks") {
    return (
      <main className="min-h-screen bg-[#EEF8FD] px-5 py-10">
        <div className="max-w-md mx-auto card p-6 space-y-3 text-center">
          <p className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">Teslim edildi</p>
          <h1 className="display text-4xl">Teşekkürler</h1>
          <p className="text-lg">{view.fullName}</p>
          <p className="font-semibold">Bu hediye teslim edildi.</p>
          <p className="text-sm text-[#3E6A88]">{view.eventTitle}{view.label ? ` · ${view.label}` : ""}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF8FD] px-5 py-10">
      <div className="max-w-md mx-auto card p-6 space-y-3 text-center">
        <p className="text-xs tracking-[0.16em] uppercase text-[#0077C2]">Hediyeyi verin.</p>
        <h1 className="display text-4xl">{view.fullName}</h1>
        <p className="text-lg">{view.eventTitle}</p>
        <p className="text-xl font-semibold text-[#0077C2]">{view.label}</p>
        <p className="font-semibold">{PRIZE_MESSAGE}</p>
      </div>
    </main>
  );
}
