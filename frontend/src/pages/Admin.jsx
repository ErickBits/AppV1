import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { genreTone } from "../lib/memphis";
import { Cover } from "../components/BookCard";
import Notice from "../components/Notice";
import PageHeader from "../components/PageHeader";

const EMPTY = { title: "", author: "", year: "", genre: "", description: "", cover_url: "", total_copies: 1 };

function toPayload(form) {
  return {
    title: form.title.trim(),
    author: form.author.trim(),
    year: form.year === "" ? null : Number(form.year),
    genre: form.genre.trim() || null,
    description: form.description.trim() || null,
    cover_url: form.cover_url.trim() || null,
    total_copies: Number(form.total_copies),
  };
}

function BookForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial ?? EMPTY);
  const [error, setError] = useState("");
  const editing = Boolean(initial?.id);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      if (editing) await api.updateBook(initial.id, toPayload(form));
      else await api.createBook(toPayload(form));
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  const field = (key, label, { wide = false, ...props } = {}) => (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={`f-${key}`} className="label">{label}</label>
      <input id={`f-${key}`} className="field" value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <form onSubmit={submit} className="card grid animate-pop gap-8 bg-white p-6 lg:grid-cols-[1fr_15rem]">
      <div className="grid content-start gap-5 sm:grid-cols-2">
        <h3 className="text-3xl sm:col-span-2">{editing ? `Editar: ${initial.title}` : "Nuevo título"}</h3>
        {field("title", "Título", { required: true })}
        {field("author", "Autor", { required: true })}
        {field("year", "Año", { type: "number" })}
        {field("genre", "Género")}
        {field("cover_url", "URL de portada (opcional)", { type: "url", wide: true, placeholder: "Vacío = portada generada automáticamente" })}
        <div className="sm:col-span-2">
          <label htmlFor="f-description" className="label">Descripción</label>
          <textarea id="f-description" rows={3} className="field" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label htmlFor="f-copies" className="label">Copias totales (1–5)</label>
          <select id="f-copies" className="field" value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2"><Notice kind="error">{error}</Notice></div>
        <div className="flex gap-3 sm:col-span-2">
          <button className="btn-primary">{editing ? "Guardar" : "Publicar"}</button>
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </div>

      <aside aria-live="polite">
        <p className="label">Vista previa</p>
        <Cover book={{ title: form.title.trim(), author: form.author.trim(), cover_url: form.cover_url.trim() }} className="-rotate-2 shadow-hard" />
        <p className="mt-4 text-sm font-medium text-muted">
          {form.cover_url.trim()
            ? "Se usará la imagen de la URL. Si no carga, se muestra la portada generada."
            : "Sin URL de portada: se genera una automáticamente con el título y el autor."}
        </p>
      </aside>
    </form>
  );
}

export default function Admin() {
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, book = edit
  const [error, setError] = useState("");

  const load = useCallback(() => api.books({ q, limit: 100 }).then(setData).catch((e) => setError(e.message)), [q]);
  useEffect(() => {
    load();
  }, [load]);

  async function remove(book) {
    if (!confirm(`¿Eliminar «${book.title}»? Esta acción no se puede deshacer.`)) return;
    setError("");
    try {
      await api.deleteBook(book.id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <PageHeader
        chip="Panel de control"
        title="Administración"
        bg="bg-purple"
        actions={<button className="btn-secondary" onClick={() => setEditing({})}>+ Nuevo libro</button>}
      />

      {editing && (
        <div className="mb-10">
          <BookForm
            key={editing.id ?? "new"}
            initial={editing.id ? { ...EMPTY, ...editing, year: editing.year ?? "" } : null}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        </div>
      )}

      <input className="field mb-6" aria-label="Filtrar libros" placeholder="Filtrar por título o autor…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Notice kind="error">{error}</Notice>

      <div className="card overflow-x-auto p-2">
        <table className="w-full text-left">
          <thead className="border-b-3 border-ink text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-3 py-3">Título</th>
              <th className="px-3 py-3">Autor</th>
              <th className="px-3 py-3">Género</th>
              <th className="px-3 py-3">Copias</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-ink/15">
            {data?.items.map((b) => (
              <tr key={b.id} className="transition hover:bg-yellow/40">
                <td className="px-3 py-3 font-bold">{b.title}</td>
                <td className="px-3 py-3">{b.author}</td>
                <td className="px-3 py-3">{b.genre && <span className={`chip ${genreTone(b.genre).bg} ${genreTone(b.genre).text}`}>{b.genre}</span>}</td>
                <td className="px-3 py-3 font-bold tabular-nums">{b.available_copies}/{b.total_copies}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <button className="chip mr-2 cursor-pointer bg-teal transition hover:-translate-y-0.5" onClick={() => setEditing(b)}>Editar</button>
                  <button className="chip cursor-pointer bg-pink transition hover:-translate-y-0.5" onClick={() => remove(b)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.total > data.items.length && (
          <p className="mt-4 px-3 pb-2 text-sm font-medium text-muted">Mostrando {data.items.length} de {data.total}. Use el filtro para acotar.</p>
        )}
      </div>
    </section>
  );
}
