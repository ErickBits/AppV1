// Memphis color tones. Full class strings so Tailwind can detect them statically.
export const TONES = [
  { name: "pink", bg: "bg-pink", text: "text-ink", hex: "#ff5fa2" },
  { name: "yellow", bg: "bg-yellow", text: "text-ink", hex: "#ffd23f" },
  { name: "teal", bg: "bg-teal", text: "text-ink", hex: "#2ec4b6" },
  { name: "blue", bg: "bg-blue", text: "text-white", hex: "#3a86ff" },
  { name: "purple", bg: "bg-purple", text: "text-white", hex: "#8338ec" },
  { name: "orange", bg: "bg-orange", text: "text-ink", hex: "#ff7f3f" },
];

/** Stable tone for any id/index, so a book keeps its color across pages. */
export const tone = (n) => TONES[Math.abs(Number(n) || 0) % TONES.length];

/** Stable non-negative hash of a string (same text → same number, on every device). */
export function hashString(text) {
  let h = 0;
  for (const ch of text ?? "") h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Tone by genre name, so every section has its own color. */
export const genreTone = (genre) => tone(hashString(genre));
