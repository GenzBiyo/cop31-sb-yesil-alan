export const MOTES = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 19 + 6) % 96}%`,
  delay: `${((i * 13) % 90) / 10}s`,
  duration: `${11 + (i % 8)}s`,
  size: 2 + (i % 4),
}));
