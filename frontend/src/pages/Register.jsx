import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../lib/auth";
import Notice from "../components/Notice";
import { AuthShell } from "./Login";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(form);
      navigate("/catalogo", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field = (key, label, props) => (
    <div>
      <label htmlFor={key} className="label">{label}</label>
      <input id={key} required className="field" value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <AuthShell
      chip="Nueva cuenta"
      title="Únete gratis"
      bg="bg-pink"
      footer={<>¿Ya tienes cuenta? <Link to="/login" className="font-bold underline decoration-teal decoration-4 underline-offset-4">Entra aquí</Link></>}
    >
      <form onSubmit={submit} className="grid gap-5">
        {field("name", "Nombre completo", { autoComplete: "name", minLength: 2 })}
        {field("email", "Correo electrónico", { type: "email", autoComplete: "email" })}
        {field("password", "Contraseña (mín. 8 caracteres)", { type: "password", autoComplete: "new-password", minLength: 8 })}
        <Notice kind="error">{error}</Notice>
        <button className="btn-secondary mt-2 py-3" disabled={busy}>{busy ? "Creando cuenta…" : "Crear mi cuenta →"}</button>
      </form>
    </AuthShell>
  );
}
