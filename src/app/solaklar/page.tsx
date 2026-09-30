import Link from "next/link";

export default function SolaklarPage() {
  return (
    <main className="min-h-screen bg-[#EEF8FD] px-5 py-16">
      <div className="max-w-xl mx-auto card p-6 space-y-3">
        <p className="text-xs tracking-[0.18em] uppercase text-[#0077C2]">COP31 · T.C. Sağlık Bakanlığı</p>
        <h1 className="display text-4xl">Solaklar outdoor iptal</h1>
        <p>Solaklar outdoor programının tamamı iptal edilmiştir. Pavyon programı açık programda duruyor.</p>
        <Link className="btn" href="/p">Açık programa git</Link>
      </div>
    </main>
  );
}
