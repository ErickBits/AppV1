// Memphis geometric confetti. All shapes take className for size/animation/positioning.
const INK = "#151515";

export function Squiggle({ color = "#3a86ff", className = "" }) {
  return (
    <svg viewBox="0 0 160 40" fill="none" className={className} aria-hidden>
      <path d="M6 20 q14 -22 28 0 t28 0 t28 0 t28 0 t28 0" stroke={color} strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

export function Zigzag({ color = "#8338ec", className = "" }) {
  return (
    <svg viewBox="0 0 160 40" fill="none" className={className} aria-hidden>
      <polyline points="6,32 26,8 46,32 66,8 86,32 106,8 126,32 146,8" stroke={color} strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Triangle({ color = "#ff5fa2", className = "" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <polygon points="50,8 94,90 6,90" fill={color} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    </svg>
  );
}

export function Circle({ color = "#ffd23f", className = "" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="42" fill={color} stroke={INK} strokeWidth="6" />
    </svg>
  );
}

export function Ring({ color = "#2ec4b6", className = "" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="36" fill="none" stroke={color} strokeWidth="14" />
    </svg>
  );
}

export function Cross({ color = "#ff7f3f", className = "" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d="M38 8 h24 v30 h30 v24 h-30 v30 h-24 v-30 h-30 v-24 h30 z" fill={color} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    </svg>
  );
}

export function HalfCircle({ color = "#8338ec", className = "" }) {
  return (
    <svg viewBox="0 0 100 56" className={className} aria-hidden>
      <path d="M6 50 a44 44 0 0 1 88 0 z" fill={color} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    </svg>
  );
}

export function Dots({ color = INK, className = "" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={i} cx={14 + (i % 4) * 24} cy={14 + Math.floor(i / 4) * 24} r="5" fill={color} />
      ))}
    </svg>
  );
}

/** Full-width wavy divider between sections. */
export function WaveDivider({ color = INK, className = "" }) {
  return (
    <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className={`w-full h-6 ${className}`} aria-hidden>
      <path d="M0 20 Q 25 0 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20 T 350 20 T 400 20 T 450 20 T 500 20 T 550 20 T 600 20 T 650 20 T 700 20 T 750 20 T 800 20 T 850 20 T 900 20 T 950 20 T 1000 20 T 1050 20 T 1100 20 T 1150 20 T 1200 20"
        fill="none" stroke={color} strokeWidth="5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
