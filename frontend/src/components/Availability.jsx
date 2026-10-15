const DOT_COLORS = ["bg-pink", "bg-yellow", "bg-teal", "bg-blue", "bg-purple"];

/** Copies as colored dots (filled = free, empty = on loan). */
export default function Availability({ book, compact = false }) {
  const { available_copies: available, total_copies: total } = book;
  const label = available > 0 ? `${available}/${total} ${compact ? "libres" : "disponibles"}` : "Lista de espera";
  return (
    <div className="flex items-center gap-2" aria-label={`${available} de ${total} copias disponibles`}>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`size-3 rounded-full border-2 border-ink ${i < available ? DOT_COLORS[i] : "bg-white"}`}
          />
        ))}
      </span>
      <span className={`whitespace-nowrap text-[0.65rem] font-bold uppercase tracking-wider ${available ? "" : "rounded-full bg-ink px-2 py-0.5 text-yellow"}`}>
        {label}
      </span>
    </div>
  );
}
