import { subscribe } from "@/lib/realtime";
import { withUser } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`));
      const unsub = subscribe((chunk) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          unsub();
        }
      });
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
        } catch {
          clearInterval(ping);
        }
      }, 15000);
      return () => {
        clearInterval(ping);
        unsub();
      };
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
