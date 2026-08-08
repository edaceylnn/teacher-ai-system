import { useState } from "react";
import Icon from "../components/Icon";

export default function LoginPage({ error, onLogin, setError }) {
  const [form, setForm] = useState({
    email: "eda@example.com",
    password: "demo12345",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await onLogin(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Teacher AI</p>
          <h1>Öğretmen Paneli</h1>
          <p className="login-copy">
            Öğrenci verileri artık kullanıcı oturumu ile korunur.
          </p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            E-posta
            <input
              autoComplete="email"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              required
              type="email"
              value={form.email}
            />
          </label>
          <label>
            Parola
            <input
              autoComplete="current-password"
              minLength={8}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              required
              type="password"
              value={form.password}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button
            className="primary-button"
            disabled={isSubmitting}
            type="submit"
          >
            <Icon name="login" />{" "}
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </section>
    </main>
  );
}
