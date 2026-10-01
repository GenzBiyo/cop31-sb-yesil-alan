import { jsonOk } from "@/lib/api";
import { livePanel } from "@/lib/panel-screen";

export const dynamic = "force-dynamic";

export async function GET() {
  const { panel } = await livePanel();
  return jsonOk({ panel }, 200, { "Cache-Control": "no-store" });
}
