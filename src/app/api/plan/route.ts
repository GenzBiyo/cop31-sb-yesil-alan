import { jsonOk, withUser } from "@/lib/api";
import { loadDayPlan } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const days = await loadDayPlan();
  return jsonOk({ days });
}
