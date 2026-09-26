type Listener = (chunk: string) => void;

const listeners = new Set<Listener>();
const gameListeners = new Set<Listener>();

export type RealtimeEvent = {
  type: "message" | "qa" | "announcement" | "inbox" | "panel" | "todo" | "agenda" | "account" | "game" | "app";
  payload?: unknown;
};

export function broadcast(event: RealtimeEvent) {
  const chunk = `event: ${event.type}\ndata: ${JSON.stringify(event.payload ?? {})}\n\n`;
  for (const listener of listeners) listener(chunk);
  if (event.type === "game") {
    for (const listener of gameListeners) listener(chunk);
  }
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeGame(listener: Listener) {
  gameListeners.add(listener);
  return () => {
    gameListeners.delete(listener);
  };
}
