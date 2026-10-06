import { jsonOk } from "@/lib/api";
import { activeEventCredits, readEventCredits } from "@/lib/event-credits";

export async function GET() {
  const credits = activeEventCredits(await readEventCredits()).map(({ name, before, after, logoPath }) => ({
    name,
    before,
    after,
    logoPath,
  }));
  return jsonOk({ credits }, 200, { "Cache-Control": "public, max-age=15" });
}
