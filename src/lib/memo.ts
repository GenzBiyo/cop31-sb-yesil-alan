type Entry = { at: number; value: unknown };

const g = globalThis as unknown as { __copMemo?: Map<string, Entry> };
if (!g.__copMemo) g.__copMemo = new Map();

export function memoGet<T>(key: string, ttlMs: number): T | undefined {
  const hit = g.__copMemo!.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > ttlMs) {
    g.__copMemo!.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function memoSet<T>(key: string, value: T): T {
  g.__copMemo!.set(key, { at: Date.now(), value });
  return value;
}

export function memoClear(key?: string) {
  if (key) g.__copMemo!.delete(key);
  else g.__copMemo!.clear();
}
