import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { api } from "../lib/api";
import { genreTone } from "../lib/memphis";
import BookCard from "../components/BookCard";
import Notice from "../components/Notice";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";

const LIMIT = 24;

function GenreChip({ active, onClick, className, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`chip cursor-pointer border-3 px-4 py-1.5 text-sm transition hover:-translate-y-0.5
        ${active ? `${className} shadow-hard-sm -rotate-2` : "bg-white hover:shadow-hard-sm"}`}
    >
      {children}
    </button>
  );
}

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const genre = params.get("genero") ?? "";
  const page = Number(params.get("pagina") ?? 1);

  const [data, setData] = useState(null);
  const [genres, setGenres] = useState([]);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(q);

  useEffect(() => {
    api.genres().then(setGenres).catch(() => {});
  }, []);

  useEffect(() => {
    setError("");
    api.books({ q, genre, page, limit: LIMIT }).then(setData).catch((e) => setError(e.message));
  }, [q, genre, page]);

  const update = (next) => {
    const merged = { q, genero: genre, pagina: String(page), ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v && v !== "1")));
  };

  return (
    <>
      <PageHeader chip="Catálogo" title="Encuentra tu libro" bg="bg-teal">
        {data ? `${data.total} títulos${q || genre ? " coinciden con tu búsqueda" : " esperando a ser leídos"}.` : "Cargando…"}
      </PageHeader>

      <form
        className="mb-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: draft.trim(), pagina: "1" });
        }}
      >
        <label htmlFor="search" className="sr-only">Buscar por título o autor</label>
        <input
          id="search"
          className="field text-lg"
          placeholder="Busca por título o autor…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn-primary shrink-0">Buscar</button>
      </form>

      <div className="mb-10 flex flex-wrap gap-2" role="group" aria-label="Filtrar por sección">
        <GenreChip active={!genre} className="bg-yellow" onClick={() => update({ genero: "", pagina: "1" })}>
          Todas
        </GenreChip>
        {genres.map((g) => {
          const t = genreTone(g);
          return (
            <GenreChip key={g} active={genre === g} className={`${t.bg} ${t.text}`} onClick={() => update({ genero: g, pagina: "1" })}>
              {g}
            </GenreChip>
          );
        })}
      </div>

      <Notice kind="error">{error}</Notice>

      {data && data.items.length === 0 && (
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="stripes mx-auto mb-4 size-16 rounded-full border-3 border-ink" />
          <p className="font-display text-2xl">Nada por aquí…</p>
          <p className="mt-2 font-medium text-muted">Prueba con otro título, autor o sección.</p>
        </div>
      )}

      {data && (
        <div key={`${q}|${genre}|${page}`} className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {data.items.map((book, i) => (
            <BookCard key={book.id} book={book} index={i} />
          ))}
        </div>
      )}

      {data && <Pagination page={page} total={data.total} limit={LIMIT} onChange={(p) => update({ pagina: String(p) })} />}
    </>
  );
}
