import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import Notice from "../components/Notice";
import { Circle, Ring, Squiggle, Triangle } from "../components/Shapes";

export function AuthShell({ chip, title, bg = "bg-pink", children, footer }) {
  return (
    <section className="relative mx-auto max-w-md py-6">
      <Triangle color="#ffd23f" className="absolute -left-14 top-10 hidden w-16 animate-float sm:block" />
      <Ring color="#3a86ff" className="absolute -right-16 top-1/3 hidden w-20 animate-float-slow sm:block" />
      <Circle color="#2ec4b6" className="absolute -bottom-2 -left-10 hidden w-12 animate-bob sm:block" />

      <div className="card relative animate-pop overflow-hidden">
        <div className={`${bg} border-b-3 border-ink px-8 py-6`}>
          <span className="chip bg-white">{chip}</span>
          <h1 className="mt-3 text-4xl">{title}</h1>
          <Squiggle color="#151515" className="mt-1 w-24" />
        </div>
        <div className="px-8 py-8">{children}</div>
      </div>
      <p className="mt-8 text-center font-medium">{footer}</p>
    </section>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form);
      navigate(location.state?.from ?? "/catalogo", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      chip="Hola de nuevo"
      title="Entrar"
      bg="bg-yellow"
      footer={<>¿Aún no tienes cuenta? <Link to="/registro" className="font-bold underline decoration-pink decoration-4 underline-offset-4">Únete gratis</Link></>}
    >
      <form onSubmit={submit} className="grid gap-5">
        <div>
          <label htmlFor="email" className="label">Correo electrónico</label>
          <input id="email" type="email" required autoComplete="email" className="field"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label htmlFor="password" className="label">Contraseña</label>
          <input id="password" type="password" required autoComplete="current-password" className="field"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <Notice kind="error">{error}</Notice>
        <button className="btn-primary mt-2 py-3" disabled={busy}>{busy ? "Entrando…" : "Entrar →"}</button>
      </form>
    </AuthShell>
  );
}
