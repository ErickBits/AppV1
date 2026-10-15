import { Link } from "react-router";
import { useAuth } from "../lib/auth";
import HeroArt from "../components/HeroArt";
import Reveal from "../components/Reveal";
import { Circle, Cross, Dots, HalfCircle, Ring, Squiggle, Triangle, WaveDivider, Zigzag } from "../components/Shapes";

const icon = { fill: "none", stroke: "#151515", strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" };

const FEATURES = [
  {
    title: "Explora el catálogo",
    text: "Más de 100 títulos, de García Márquez a Asimov. Busca por título o autor y filtra por sección.",
    bg: "bg-pink",
    rotate: "-rotate-2",
    svg: (
      <>
        <circle cx="28" cy="28" r="15" {...icon} fill="#fff" />
        <path d="M39 39 L54 54" {...icon} strokeWidth="7" />
      </>
    ),
  },
  {
    title: "Reserva al instante",
    text: "Si hay copias libres, el libro es tuyo en un clic durante 14 días. Sin papeleo ni filas.",
    bg: "bg-yellow",
    rotate: "rotate-1",
    svg: <path d="M18 10 h28 v44 l-14 -11 l-14 11 z" {...icon} fill="#ff5fa2" />,
  },
  {
    title: "Lista de espera",
    text: "¿No quedan copias? Te formamos en la cola y ves tu posición en tiempo real.",
    bg: "bg-teal",
    rotate: "-rotate-1",
    svg: (
      <>
        <path d="M18 10 h28 M18 54 h28" {...icon} />
        <path d="M21 10 q0 17 11 22 q-11 5 -11 22 M43 10 q0 17 -11 22 q11 5 11 22" {...icon} fill="#ffd23f" />
      </>
    ),
  },
  {
    title: "Devoluciones en cadena",
    text: "Cuando alguien devuelve un libro, pasa directo al siguiente de la cola. Nadie se queda esperando de más.",
    bg: "bg-blue",
    rotate: "rotate-2",
    svg: (
      <>
        <path d="M14 32 a18 18 0 0 1 32 -11" {...icon} />
        <path d="M50 32 a18 18 0 0 1 -32 11" {...icon} />
        <path d="M46 10 v11 h-11 M18 54 v-11 h11" {...icon} />
      </>
    ),
  },
  {
    title: "Tu perfil",
    text: "Revisa tus préstamos, fechas de devolución y reservas en espera. Actualiza tus datos cuando quieras.",
    bg: "bg-orange",
    rotate: "-rotate-2",
    svg: (
      <>
        <circle cx="32" cy="22" r="11" {...icon} fill="#fff" />
        <path d="M12 56 q20 -30 40 0" {...icon} fill="#2ec4b6" />
      </>
    ),
  },
  {
    title: "Panel de administración",
    text: "Los administradores agregan, editan y retiran títulos y deciden cuántas copias (1–5) tiene cada uno.",
    bg: "bg-purple",
    rotate: "rotate-1",
    svg: (
      <>
        <path d="M14 50 l4 -13 l26 -26 l9 9 l-26 26 z" {...icon} fill="#ffd23f" />
        <path d="M38 17 l9 9" {...icon} />
      </>
    ),
  },
];

const STEPS = [
  { n: "1", title: "Crea tu cuenta", text: "Solo nombre, correo y contraseña. Tarda 20 segundos.", bg: "bg-pink" },
  { n: "2", title: "Elige un libro", text: "Recorre el catálogo, mira la disponibilidad y abre el que te guste.", bg: "bg-yellow" },
  { n: "3", title: "Reserva o haz fila", text: "Llévatelo ahora o asegura tu lugar en la lista de espera.", bg: "bg-teal" },
];

const STATS = [
  { value: "100+", label: "títulos", bg: "bg-yellow" },
  { value: "1–5", label: "copias por libro", bg: "bg-mint" },
  { value: "14", label: "días de préstamo", bg: "bg-pink" },
  { value: "24/7", label: "abierta siempre", bg: "bg-teal" },
];

const MARQUEE = ["Lee", "Reserva", "Haz fila", "Devuelve", "Repite", "Descubre"];

function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="relative -mx-4 overflow-hidden border-y-3 border-ink bg-yellow py-3 sm:-mx-8" aria-hidden>
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap font-display text-2xl uppercase">
        {[...items, ...items].map((w, i) => (
          <span key={i} className="flex items-center gap-8">
            {w}
            <span className={`inline-block size-5 border-3 border-ink ${["bg-pink rotate-45", "bg-teal rounded-full", "bg-purple"][i % 3]}`} />
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-24">
      {/* ---------- Hero ---------- */}
      <section className="relative grid items-center gap-10 lg:grid-cols-2">
        <div className="relative z-10">
          <span className="chip animate-pop bg-mint">✦ Biblioteca virtual</span>
          <h1 className="mt-5 animate-pop text-5xl leading-[0.95] sm:text-7xl" style={{ animationDelay: "80ms" }}>
            Tu próximo libro
            <span className="relative mx-2 inline-block">
              <span className="relative z-10">favorito</span>
              <span className="absolute inset-x-[-6px] bottom-1 -z-0 h-5 -rotate-1 rounded bg-pink sm:h-7" aria-hidden />
            </span>
            te está esperando.
          </h1>
          <Squiggle color="#3a86ff" className="mt-4 w-40 animate-pop" />
          <p className="mt-6 max-w-lg animate-pop text-lg font-medium sm:text-xl" style={{ animationDelay: "160ms" }}>
            Explora, reserva y haz fila desde cualquier lugar. Cuando no quedan copias, te guardamos el lugar y te
            avisamos en tu perfil cuando sea tu turno.
          </p>
          <div className="mt-8 flex animate-pop flex-wrap gap-4" style={{ animationDelay: "240ms" }}>
            <Link to="/catalogo" className="btn-primary px-8 py-3 text-base">Explorar catálogo →</Link>
            {user ? (
              <Link to="/perfil" className="btn-secondary px-8 py-3 text-base">Mis reservas</Link>
            ) : (
              <Link to="/registro" className="btn-secondary px-8 py-3 text-base">Crear cuenta</Link>
            )}
          </div>
        </div>

        <div className="relative">
          <HeroArt className="mx-auto w-full max-w-lg drop-shadow-[8px_8px_0_rgba(21,21,21,0.15)]" />
          <Triangle color="#2ec4b6" className="absolute -left-2 top-4 hidden w-12 animate-wiggle sm:block" />
        </div>
      </section>

      <Marquee />

      {/* ---------- Features ---------- */}
      <section>
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="chip bg-yellow">¿Qué puedes hacer aquí?</span>
          <h2 className="mt-4 text-4xl sm:text-5xl">Todo lo de una biblioteca, sin la fila.</h2>
          <Zigzag color="#ff5fa2" className="mx-auto mt-4 w-36" />
        </Reveal>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 120}>
              <article className={`card card-hover group h-full p-6 ${f.rotate} hover:rotate-0`}>
                <div className={`grid size-20 place-items-center rounded-2xl border-3 border-ink ${f.bg} shadow-hard-sm transition duration-300 group-hover:-rotate-6 group-hover:scale-110`}>
                  <svg viewBox="0 0 64 64" className="size-12" aria-hidden>{f.svg}</svg>
                </div>
                <h3 className="mt-5 text-2xl">{f.title}</h3>
                <p className="mt-2 font-medium text-muted">{f.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <WaveDivider />

      {/* ---------- How it works ---------- */}
      <section className="relative">
        <Dots className="absolute -top-6 right-0 hidden w-28 opacity-60 md:block" />
        <Reveal>
          <span className="chip bg-pink">Cómo funciona</span>
          <h2 className="mt-4 text-4xl sm:text-5xl">Tres pasos. Cero complicaciones.</h2>
        </Reveal>
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 150} className="relative">
              <div className="flex items-start gap-4">
                <span className={`grid size-16 shrink-0 place-items-center rounded-full border-3 border-ink ${s.bg} font-display text-3xl shadow-hard-sm animate-bob`}
                  style={{ animationDelay: `${i * 400}ms` }}>
                  {s.n}
                </span>
                <div>
                  <h3 className="text-2xl">{s.title}</h3>
                  <p className="mt-1 font-medium text-muted">{s.text}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <svg viewBox="0 0 80 30" className="absolute -right-8 top-4 hidden w-16 md:block" aria-hidden>
                  <path d="M4 15 q18 -14 36 0 t32 0" fill="none" stroke="#151515" strokeWidth="4" strokeLinecap="round" />
                  <path d="M64 6 l10 9 l-10 9" fill="none" stroke="#151515" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------- Waitlist explainer ---------- */}
      <section className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="relative order-2 lg:order-1">
          <div className="card rotate-1 bg-mint p-6">
            <p className="label">Cien años de soledad · 1 copia</p>
            <ul className="mt-4 space-y-3">
              {[
                { who: "Ana", state: "En préstamo", bg: "bg-pink" },
                { who: "Beto", state: "En espera · #1", bg: "bg-yellow" },
                { who: "Carla", state: "En espera · #2", bg: "bg-white" },
              ].map((r, i) => (
                <li key={r.who} className={`flex items-center justify-between rounded-xl border-3 border-ink ${r.bg} px-4 py-3 shadow-hard-sm animate-pop`}
                  style={{ animationDelay: `${300 + i * 200}ms` }}>
                  <span className="flex items-center gap-3 font-bold">
                    <span className="grid size-9 place-items-center rounded-full border-3 border-ink bg-white font-display">{r.who[0]}</span>
                    {r.who}
                  </span>
                  <span className="chip bg-white">{r.state}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-bold">↳ Ana devuelve → el libro pasa directo a Beto.</p>
          </div>
          <Circle color="#ff7f3f" className="absolute -right-4 -top-6 w-14 animate-float" />
          <HalfCircle color="#8338ec" className="absolute -bottom-6 -left-4 w-20 animate-wiggle" />
        </Reveal>
        <Reveal delay={150} className="order-1 lg:order-2">
          <span className="chip bg-teal">La cola inteligente</span>
          <h2 className="mt-4 text-4xl sm:text-5xl">¿Se agotó? Te guardamos el lugar.</h2>
          <p className="mt-4 text-lg font-medium text-muted">
            Cada libro tiene entre 1 y 5 copias. Si están todas prestadas, entras a la lista de espera en orden de
            llegada. Cuando alguien devuelve su copia, se asigna automáticamente al primero de la fila, sin que
            nadie se adelante.
          </p>
        </Reveal>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 100}>
            <div className={`card card-hover ${s.bg} p-6 text-center ${i % 2 ? "rotate-1" : "-rotate-1"}`}>
              <p className="font-display text-5xl">{s.value}</p>
              <p className="mt-1 text-sm font-bold uppercase tracking-wider">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </section>

      {/* ---------- CTA ---------- */}
      <Reveal>
        <section className="card relative overflow-hidden bg-purple px-6 py-14 text-center text-white sm:px-12">
          <Ring color="#ffd23f" className="absolute -left-8 -top-8 w-32 animate-spin-slow" />
          <Cross color="#2ec4b6" className="absolute bottom-6 right-8 w-14 animate-wiggle" />
          <Triangle color="#ff5fa2" className="absolute -bottom-4 left-16 w-16 animate-float" />
          <h2 className="relative text-4xl sm:text-6xl">¿Listo para leer?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg font-medium text-white/90">
            Abre el catálogo, encuentra tu próxima historia y resérvala en segundos.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/catalogo" className="btn-secondary px-8 py-3 text-base">Ver catálogo</Link>
            {!user && <Link to="/registro" className="btn-ghost px-8 py-3 text-base">Registrarme</Link>}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
