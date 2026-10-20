import { subscribeGame } from "@/lib/realtime";
import { sseStream } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return sseStream(req, (send) => subscribeGame((chunk) => send(chunk)));
}
