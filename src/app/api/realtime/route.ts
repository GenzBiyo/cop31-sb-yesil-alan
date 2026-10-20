import { subscribe } from "@/lib/realtime";
import { withUser } from "@/lib/api";
import { sseStream } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  return sseStream(req, (send) => subscribe((chunk) => send(chunk)));
}
