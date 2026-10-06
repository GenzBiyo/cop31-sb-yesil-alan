export const MOTES = Array.from({ length: 42 }, (_, i) => ({
  left: `${(i * 17 + 4) % 97}%`,
  delay: `${((i * 11) % 80) / 10}s`,
  duration: `${7 + (i % 9)}s`,
  size: 3 + (i % 6),
}));
