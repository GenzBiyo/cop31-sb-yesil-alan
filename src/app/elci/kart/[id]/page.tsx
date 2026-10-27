import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isAmbassadorAccepted } from "@/lib/ambassador-card";
import { AcceptanceCard } from "@/components/ambassador/AcceptanceCard";

export const dynamic = "force-dynamic";

async function loadCard(id: string) {
  if (!/^[a-z0-9]{8,40}$/i.test(id)) return null;
  const app = await prisma.ambassadorApplication.findUnique({
    where: { id },
    select: { fullName: true, school: true, city: true, status: true },
  });
  if (!app || !isAmbassadorAccepted(app.status)) return null;
  return app;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const app = await loadCard(id);
  const title = app ? `${app.fullName} · İklim Sağlık Elçisi` : "İklim Sağlık Elçisi";
  return {
    title,
    description: "COP31 Türkiye Sağlık Bakanlığı İklim Sağlık Elçisi kabul kartı. Antalya, 9–20 Kasım 2026.",
  };
}

export default async function AmbassadorCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await loadCard(id);
  if (!app) {
    return (
      <main className="min-h-screen bg-[#EEF8FD] text-[#0B1C33] grid place-items-center px-6">
        <div className="max-w-md text-center space-y-3">
          <p className="text-xs font-bold tracking-[0.22em] text-[#0077C2]">COP31 TÜRKİYE</p>
          <h1 className="display text-4xl">Tebrik kartı henüz açılmadı</h1>
          <p className="text-[#3E6A88]">
            Kart, başvurunuz kabul edildikten sonra e-postadaki bağlantıyla açılır. Karar bu adrese ayrıca yazılır.
          </p>
        </div>
      </main>
    );
  }
  return <AcceptanceCard name={app.fullName} school={app.school} city={app.city} />;
}
