import { Tx } from "@/components/I18nProvider";
import Link from "next/link";

export default function SolaklarPage() {
  return (
    <main className="min-h-screen bg-[#EEF8FD] px-5 py-16">
      <div className="max-w-xl mx-auto card p-6 space-y-3">
        <p className="text-xs tracking-[0.18em] uppercase text-[#0077C2]"><Tx>COP31 · T.C. Sağlık Bakanlığı</Tx></p>
        <h1 className="display text-4xl"><Tx>Solaklar outdoor iptal</Tx></h1>
        <p><Tx>Solaklar outdoor programının tamamı iptal edilmiştir. Pavyon programı açık programda duruyor.</Tx></p>
        <Link className="btn" href="/p"><Tx>Açık programa git</Tx></Link>
      </div>
    </main>
  );
}
