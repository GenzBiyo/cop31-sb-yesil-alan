import { cardBackgrounds } from "@/lib/card-backgrounds";
import { jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const slots = await cardBackgrounds();
  return jsonOk({ slots });
}
