import { Tx } from "@/components/I18nProvider";
export default function KesfetLoading() {
  return (
    <main className="min-h-screen p-8" style={{ background: "#00A3E0", color: "#EEF8FD" }}>
      <p className="text-sm"><Tx>Açık alan açılıyor…</Tx></p>
    </main>
  );
}
