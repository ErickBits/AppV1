import { useState } from "react";
import { Link } from "react-router";
import Availability from "./Availability";
import { genreTone, hashString, tone } from "../lib/memphis";

const DECOR = [
  // Different Memphis composition per book, chosen from the title.
  (
    <>
      <span className="absolute -right-4 -top-4 size-16 rounded-full border-3 border-ink bg-yellow" />
      <span className="absolute bottom-6 right-4 h-3 w-14 -rotate-12 rounded-full bg-ink" />
    </>
  ),
  (
    <>
      <span className="absolute -left-3 top-6 size-10 rotate-45 border-3 border-ink bg-pink" />
      <span className="stripes absolute bottom-0 right-0 h-10 w-20 border-l-3 border-t-3 border-ink bg-white" />
    </>
  ),
  (
    <>
      <span className="absolute right-3 top-3 size-8 rounded-full border-[6px] border-ink" />
      <span className="absolute -bottom-6 -left-6 size-20 rounded-full border-3 border-ink bg-teal" />
    </>
  ),
];

/**
 * Book cover. With a real image URL it shows the image; without one (or if the image fails to load,
 * or it is a seeded text placeholder) it draws a Memphis cover: big title, author and shapes.
 * Color and shapes derive from the title, so the admin preview matches the published cover.
 */
export function Cover({ book, className = "", large = false }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const seed = hashString(book.title);
  const t = tone(seed);
  const hasRealImage = book.cover_url && !book.cover_url.includes("placehold.co") && failedUrl !== book.cover_url;
  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-xl border-3 border-ink ${t.bg} ${className}`}>
      {hasRealImage ? (
        <img src={book.cover_url} alt={`Portada de ${book.title}`} loading="lazy" className="size-full object-cover"
          onError={() => setFailedUrl(book.cover_url)} />
      ) : (
        <>
          <div aria-hidden>{DECOR[seed % DECOR.length]}</div>
          <div className={`relative flex h-full flex-col justify-center ${large ? "p-8" : "p-3"} ${t.text}`}>
            <p className={`font-display leading-[1.05] text-balance break-words ${large ? "text-4xl sm:text-5xl" : "text-base sm:text-lg"}`}>
              {book.title || "Título del libro"}
            </p>
            <p className={`mt-2 font-bold uppercase tracking-wider opacity-80 ${large ? "text-sm" : "text-[0.6rem]"}`}>
              {book.author}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function BookCard({ book, index = 0 }) {
  const g = genreTone(book.genre);
  return (
    <Link
      to={`/libros/${book.id}`}
      className="card card-hover group flex animate-pop flex-col p-3"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <Cover book={book} className="transition duration-300 group-hover:-rotate-2 group-hover:scale-[1.02]" />
      <div className="flex flex-1 flex-col px-1 pt-3">
        {book.genre && <span className={`chip self-start ${g.bg} ${g.text}`}>{book.genre}</span>}
        <h3 className="mt-2 text-lg leading-tight">{book.title}</h3>
        <p className="text-sm font-medium text-muted">
          {book.author}{book.year ? ` · ${book.year}` : ""}
        </p>
        <div className="mt-auto pt-3">
          <Availability book={book} compact />
        </div>
      </div>
    </Link>
  );
}
