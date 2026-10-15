import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { genreTone } from "../lib/memphis";
import Availability from "../components/Availability";
import { Cover } from "../components/BookCard";
import Notice from "../components/Notice";
import { Cross, Dots, Squiggle } from "../components/Shapes";

export default function BookDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.book(id).then(setBook).catch((e) => setError(e.message));
  }, [id]);

  async function reserve() {
    if (!user) return navigate("/login", { state: { from: `/libros/${id}` } });
    setBusy(true);
    setError("");
    try {
      const r = await api.reserve(book.id);
      setMessage(
        r.status === "active"
          ? `¡Es tuyo! Devuélvelo antes del ${new Date(r.due_at).toLocaleDateString("es")}.`
          : `No quedan copias: estás en la posición #${r.position} de la lista de espera.`,
      );
      setBook(await api.book(id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !book) return <Notice kind="error">{error}</Notice>;
  if (!book) return <p className="chip mx-auto block w-max animate-bob bg-yellow">Cargando…</p>;

  const available = book.available_copies > 0;
  const g = genreTone(book.genre);

  return (
    <article className="grid gap-12 md:grid-cols-[2fr_3fr]">
      <div className="relative mx-auto w-full max-w-sm animate-pop">
        <Dots className="absolute -left-6 -top-6 w-24 opacity-50" />
        <div className="relative -rotate-2 rounded-xl shadow-hard-lg transition duration-300 hover:rotate-0">
          <Cover book={book} large />
        </div>
        <Cross color="#ffd23f" className="absolute -bottom-6 -right-4 w-16 animate-spin-slow" />
      </div>

      <div className="animate-pop" style={{ animationDelay: "120ms" }}>
        <Link to="/catalogo" className="chip bg-white transition hover:bg-yellow">← Volver al catálogo</Link>
        <div className="mt-6 flex flex-wrap gap-2">
          {book.genre && <span className={`chip ${g.bg} ${g.text}`}>{book.genre}</span>}
          {book.year && <span className="chip bg-white">{book.year}</span>}
        </div>
        <h1 className="mt-4 text-5xl leading-[0.95] text-balance sm:text-6xl">{book.title}</h1>
        <p className="mt-3 text-2xl font-bold">por {book.author}</p>
        <Squiggle color="#ff5fa2" className="mt-4 w-36" />
        {book.description && <p className="mt-6 text-lg font-medium leading-relaxed">{book.description}</p>}

        <div className={`card mt-10 grid gap-4 p-6 ${available ? "bg-mint" : "bg-yellow"}`}>
          <Availability book={book} />
          <p className="font-medium">
            {available
              ? "Préstamo inmediato por 14 días."
              : "Todas las copias están prestadas. Únete a la lista de espera: cuando alguien lo devuelva, pasa directo al primero de la fila."}
          </p>
          <button className={`${available ? "btn-primary" : "btn-ghost"} justify-self-start px-8 py-3 text-base`} disabled={busy} onClick={reserve}>
            {busy ? "Un momento…" : available ? "Reservar ahora" : "Unirme a la lista de espera"}
          </button>
          <Notice kind="error">{error}</Notice>
          <Notice>{message}</Notice>
        </div>
      </div>
    </article>
  );
}
