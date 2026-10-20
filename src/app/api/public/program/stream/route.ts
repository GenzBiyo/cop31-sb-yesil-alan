import { subscribe } from "@/lib/realtime";
import { sseStream } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return sseStream(req, (send) =>
    subscribe((chunk) => {
      if (chunk.startsWith("event: agenda") || chunk.startsWith("event: panel")) send(chunk);
    })
  );
}
