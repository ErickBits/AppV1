import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { useAuth } from "../lib/auth";
import { Circle, Cross, Ring, Squiggle, Triangle, Zigzag } from "./Shapes";

function NavItem({ to, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-full border-3 px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition
         ${isActive ? "border-ink bg-yellow shadow-hard-sm" : "border-transparent hover:border-ink hover:bg-white"}`
      }
    >
      {children}
    </NavLink>
  );
}

function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2" aria-label="Inicio">
      <span className="relative grid size-11 place-items-center rounded-xl border-3 border-ink bg-pink shadow-hard-sm transition group-hover:rotate-6">
        <span className="font-display text-xl leading-none">B</span>
        <span className="absolute -right-2 -top-2 size-4 rounded-full border-2 border-ink bg-yellow" />
      </span>
      <span className="font-display text-xl leading-none">
        Biblio<span className="text-purple">Pop</span>
      </span>
    </Link>
  );
}

/** Floating Memphis shapes in the page margins (decorative, wide screens only). */
function BackgroundConfetti() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden 2xl:block" aria-hidden>
      <Triangle color="#ff5fa2" className="absolute left-6 top-40 w-16 animate-float" />
      <Ring color="#2ec4b6" className="absolute left-10 top-[60%] w-20 animate-float-slow" />
      <Squiggle color="#3a86ff" className="absolute left-2 bottom-16 w-28 animate-wiggle" />
      <Cross color="#ffd23f" className="absolute right-8 top-52 w-14 animate-spin-slow" />
      <Circle color="#ff7f3f" className="absolute right-12 top-[55%] w-12 animate-bob" />
      <Zigzag color="#8338ec" className="absolute right-4 bottom-24 w-28 animate-float" />
    </div>
  );
}

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackgroundConfetti />

      <header className="sticky top-0 z-20 border-b-3 border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Logo />
          <button
            className="btn-ghost px-4 py-2 md:hidden"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Cerrar" : "Menú"}
          </button>
          <nav
            id="main-nav"
            onClick={close}
            className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-2 border-b-3 border-ink bg-paper p-4
              md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}
          >
            <NavItem to="/" end>Inicio</NavItem>
            <NavItem to="/catalogo">Catálogo</NavItem>
            {user && <NavItem to="/perfil">Mi cuenta</NavItem>}
            {isAdmin && <NavItem to="/admin">Admin</NavItem>}
            {user ? (
              <button onClick={logout} className="btn-ghost px-4 py-1.5 md:ml-2">Salir</button>
            ) : (
              <>
                <NavItem to="/login">Entrar</NavItem>
                <Link to="/registro" className="btn-primary px-4 py-1.5 md:ml-2">Únete gratis</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-8">
        <Outlet />
      </main>

      <footer className="mt-16 border-t-3 border-ink bg-ink text-paper">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-8">
          <p className="font-display text-lg">
            Biblio<span className="text-pink">Pop</span>
          </p>
          <p className="text-sm text-paper/80">Proyecto universitario · Microservicios en Kubernetes</p>
          <div className="flex gap-2" aria-hidden>
            {["bg-pink", "bg-yellow", "bg-teal", "bg-blue", "bg-purple"].map((c) => (
              <span key={c} className={`size-4 rounded-full border-2 border-paper ${c}`} />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
