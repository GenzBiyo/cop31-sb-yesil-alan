import { subscribe } from "@/lib/realtime";
import { withUser } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const encoder = new TextEncoder();
  let ping: ReturnType<typeof setInterval> | undefined;
  let unsub = () => {};
  let closed = false;

  const stop = () => {
    if (closed) return;
    closed = true;
    if (ping) clearInterval(ping);
    unsub();
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          stop();
        }
      };
      send(`event: hello\ndata: ${JSON.stringify({ ok: true })}\n\n`);
      unsub = subscribe((chunk) => send(chunk));
      ping = setInterval(() => send(`event: ping\ndata: {}\n\n`), 15000);
      req.signal.addEventListener("abort", stop);
    },
    cancel() {
      stop();
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
