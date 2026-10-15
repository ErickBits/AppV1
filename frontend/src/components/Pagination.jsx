export default function Pagination({ page, total, limit, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <nav className="mt-14 flex items-center justify-between gap-4" aria-label="Paginación">
      <button className="btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Anterior
      </button>
      <span className="chip bg-yellow text-sm">
        {page} / {pages}
      </span>
      <button className="btn-ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Siguiente →
      </button>
    </nav>
  );
}
