// Hero illustration: an open book on a stack of books, surrounded by Memphis confetti.
const INK = "#151515";
const s = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round", strokeLinecap: "round" };

export default function HeroArt({ className = "" }) {
  return (
    <svg viewBox="0 0 520 520" className={className} role="img" aria-label="Ilustración: libros apilados con formas geométricas de colores">
      {/* Dot grid behind everything */}
      <g fill={INK} opacity="0.25">
        {Array.from({ length: 36 }, (_, i) => (
          <circle key={i} cx={330 + (i % 6) * 26} cy={300 + Math.floor(i / 6) * 26} r="3.5" />
        ))}
      </g>

      {/* Big sun */}
      <circle cx="290" cy="230" r="170" fill="#ffd23f" {...s} />
      <circle cx="290" cy="230" r="130" fill="none" stroke={INK} strokeWidth="3" strokeDasharray="4 14" className="svg-anim animate-spin-slow" />

      {/* Stack of books */}
      <g className="svg-anim animate-bob">
        <rect x="100" y="392" width="320" height="58" rx="8" fill="#ff5fa2" {...s} />
        <line x1="130" y1="392" x2="130" y2="450" {...s} />
        <line x1="380" y1="405" x2="380" y2="437" {...s} />
        <rect x="128" y="336" width="276" height="56" rx="8" fill="#2ec4b6" {...s} transform="rotate(-3 266 364)" />
        <path d="M160 352 h120" {...s} transform="rotate(-3 266 364)" />
        <rect x="112" y="282" width="296" height="56" rx="8" fill="#8338ec" {...s} transform="rotate(2 260 310)" />
        <circle cx="370" cy="310" r="10" fill="#ffd23f" {...s} transform="rotate(2 260 310)" />

        {/* Open book on top */}
        <path d="M150 272 Q205 236 262 262 L262 150 Q205 124 150 160 Z" fill="#fff" {...s} />
        <path d="M262 262 Q319 236 374 272 L374 160 Q319 124 262 150 Z" fill="#fff" {...s} />
        <g stroke={INK} strokeWidth="4" strokeLinecap="round">
          <path d="M172 178 Q205 160 242 172" />
          <path d="M172 202 Q205 184 242 196" />
          <path d="M172 226 Q205 208 228 216" />
          <path d="M282 172 Q319 160 352 178" />
          <path d="M282 196 Q319 184 352 202" />
        </g>
        {/* Bookmark ribbon */}
        <path d="M300 150 v58 l12 -10 l12 10 v-62" fill="#ff7f3f" {...s} />
      </g>

      {/* Confetti */}
      <polygon points="40,130 112,52 132,150" fill="#ff5fa2" {...s} className="svg-anim animate-float" />
      <path d="M392 64 q18 -28 36 0 t36 0 t36 0" fill="none" stroke="#3a86ff" strokeWidth="10" strokeLinecap="round" className="draw-line animate-draw" />
      <circle cx="472" cy="330" r="24" fill="#2ec4b6" {...s} className="svg-anim animate-float-slow" />
      <path d="M52 300 h20 v-20 h20 v20 h20 v20 h-20 v20 h-20 v-20 h-20 z" fill="#ffd23f" {...s} className="svg-anim animate-spin-slow" />
      <polyline points="24,486 52,458 80,486 108,458 136,486" fill="none" stroke="#8338ec" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M440 470 a34 34 0 0 1 68 0 z" fill="#ff7f3f" {...s} className="svg-anim animate-wiggle" />
      <circle cx="96" cy="230" r="9" fill={INK} />
      <circle cx="460" cy="150" r="9" fill={INK} />
    </svg>
  );
}
