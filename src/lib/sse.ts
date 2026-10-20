/** Short-lived server-sent streams. A stream that never closes piles up and new pages stop opening. */

const state = globalThis as unknown as { __copSse?: number };
const MAX_OPEN = 24;
const LIFE_MS = 20_000;

function hold() {
  state.__copSse = (state.__copSse || 0) + 1;
}

function release() {
  state.__copSse = Math.max(0, (state.__copSse || 1) - 1);
}

const headers = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export function sseStream(req: Request, attach: (send: (chunk: string) => void) => () => void) {
  if ((state.__copSse || 0) >= MAX_OPEN) {
    return new Response("retry: 8000\nevent: bye\ndata: {}\n\n", { headers });
  }

  hold();
  const encoder = new TextEncoder();
  let unsub = () => {};
  let ping: ReturnType<typeof setInterval> | undefined;
  let life: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let dropped = false;

  const drop = () => {
    if (dropped) return;
    dropped = true;
    release();
  };

  const stop = () => {
    if (closed) return;
    closed = true;
    if (ping) clearInterval(ping);
    if (life) clearTimeout(life);
    unsub();
    drop();
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
      const end = () => {
        stop();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      send(`retry: 20000\nevent: hello\ndata: {"ok":true}\n\n`);
      unsub = attach(send);
      ping = setInterval(() => send(`event: ping\ndata: {}\n\n`), 15000);
      life = setTimeout(() => {
        send(`event: bye\ndata: {}\n\n`);
        end();
      }, LIFE_MS);
      req.signal.addEventListener("abort", end);
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, { headers });
}
