import { subscribeGame } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`));
      const unsub = subscribeGame((chunk) => {
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
      }, 20000);
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
