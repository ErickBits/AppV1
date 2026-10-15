import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Cover } from "../components/BookCard";
import Notice from "../components/Notice";
import PageHeader from "../components/PageHeader";

const STATUS = {
  active: { label: "En préstamo", bg: "bg-teal" },
  waiting: { label: "En espera", bg: "bg-yellow" },
  returned: { label: "Devuelto", bg: "bg-white" },
  cancelled: { label: "Cancelado", bg: "bg-white" },
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("es") : "—");

function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user.name, email: user.email, current_password: "", password: "" });
  const [msg, setMsg] = useState({ kind: "info", text: "" });

  async function submit(e) {
    e.preventDefault();
    const payload = { name: form.name, email: form.email };
    if (form.password) Object.assign(payload, { password: form.password, current_password: form.current_password });
    try {
      await updateProfile(payload);
      setForm((f) => ({ ...f, current_password: "", password: "" }));
      setMsg({ kind: "info", text: "Datos actualizados." });
    } catch (err) {
      setMsg({ kind: "error", text: err.message });
    }
  }

  const field = (key, label, props = {}) => (
    <div>
      <label htmlFor={key} className="label">{label}</label>
      <input id={key} className="field" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-5">
      {field("name", "Nombre", { required: true, minLength: 2 })}
      {field("email", "Correo", { type: "email", required: true })}
      <fieldset className="grid gap-5 rounded-xl border-3 border-dashed border-ink p-4">
        <legend className="chip bg-yellow">Cambiar contraseña (opcional)</legend>
        {field("current_password", "Contraseña actual", { type: "password", autoComplete: "current-password", required: Boolean(form.password) })}
        {field("password", "Nueva contraseña", { type: "password", autoComplete: "new-password", minLength: 8 })}
      </fieldset>
      <Notice kind={msg.kind}>{msg.text}</Notice>
      <button className="btn-primary justify-self-start">Guardar cambios</button>
    </form>
  );
}

function Reservations() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => api.myReservations().then(setItems).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn) => {
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!items) return <p className="chip animate-bob bg-yellow">Cargando…</p>;
  if (items.length === 0)
    return (
      <div className="rounded-xl border-3 border-dashed border-ink p-8 text-center">
        <p className="font-display text-xl">Aún no tienes reservas</p>
        <Link to="/catalogo" className="btn-secondary mt-4">Explorar catálogo</Link>
      </div>
    );

  return (
    <>
      <Notice kind="error">{error}</Notice>
      <ul className="grid gap-4">
        {items.map((r, i) => {
          const st = STATUS[r.status];
          return (
            <li key={r.id} className="card card-hover grid animate-pop grid-cols-[3.5rem_1fr] items-center gap-4 p-3 sm:grid-cols-[3.5rem_1fr_auto]"
              style={{ animationDelay: `${i * 60}ms` }}>
              <Cover book={{ title: r.book_title, author: "", cover_url: r.book_cover_url }} className="w-14 rounded-lg [&_p]:text-[0.45rem]" />
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className={`chip ${st.bg}`}>{st.label}</span>
                  {r.status === "waiting" && r.position && <span className="chip bg-pink">#{r.position} en la fila</span>}
                  {r.status === "active" && <span className="chip bg-white">vence {fmt(r.due_at)}</span>}
                </div>
                <Link to={`/libros/${r.book_id}`} className="mt-1 block font-display text-lg leading-tight hover:underline">{r.book_title}</Link>
                <p className="text-sm font-medium text-muted">{r.book_author}</p>
              </div>
              {r.status === "active" && (
                <button className="btn-secondary col-span-2 sm:col-span-1" onClick={() => act(() => api.returnReservation(r.id))}>Devolver</button>
              )}
              {r.status === "waiting" && (
                <button className="btn-ghost col-span-2 sm:col-span-1" onClick={() => act(() => api.cancelReservation(r.id))}>Salir de la fila</button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function Profile() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader chip={user.role === "admin" ? "Administrador" : "Lector"} title={`¡Hola, ${user.name.split(" ")[0]}!`} bg="bg-orange">
        Miembro desde {fmt(user.created_at)}.
      </PageHeader>
      <div className="grid gap-10 lg:grid-cols-[2fr_3fr]">
        <section className="card h-max p-6">
          <h2 className="mb-6 text-2xl">Tus datos</h2>
          <ProfileForm />
        </section>
        <section>
          <h2 className="mb-6 text-3xl">Tus reservas</h2>
          <Reservations />
        </section>
      </div>
    </>
  );
}
