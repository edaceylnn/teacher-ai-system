import { useState } from "react";
import Icon from "../components/Icon";
import { api } from "../api";

export default function LoginPage({ error, onLogin, setError }) {
  const [form, setForm] = useState({
    email: "eda@example.com",
    password: "demo12345",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);

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

  async function handleRequestReset(event) {
    event.preventDefault();
    setError("");
    setResetNotice("");
    setIsSendingReset(true);
    try {
      await api.requestPasswordReset(resetEmail);
      setResetNotice(
        "Bu e-posta sistemde kayıtlıysa, sıfırlama bağlantısı gönderildi.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSendingReset(false);
    }
  }

  if (isForgotPasswordMode) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div>
            <p className="eyebrow">Teacher AI</p>
            <h1>Parolamı Unuttum</h1>
            <p className="login-copy">
              E-posta adresini gir, sıfırlama bağlantısı gönderelim.
            </p>
          </div>
          <form className="login-form" onSubmit={handleRequestReset}>
            <label>
              E-posta
              <input
                autoComplete="email"
                onChange={(event) => setResetEmail(event.target.value)}
                required
                type="email"
                value={resetEmail}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            {resetNotice && <p className="login-copy">{resetNotice}</p>}
            <button
              className="primary-button"
              disabled={isSendingReset}
              type="submit"
            >
              <Icon name="mail" />{" "}
              {isSendingReset ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
            </button>
            <button
              className="outline-button full"
              onClick={() => {
                setIsForgotPasswordMode(false);
                setError("");
                setResetNotice("");
              }}
              type="button"
            >
              Girişe dön
            </button>
          </form>
        </section>
      </main>
    );
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
          <button
            className="link-button"
            onClick={() => {
              setIsForgotPasswordMode(true);
              setError("");
              setResetEmail(form.email);
            }}
            type="button"
          >
            Parolamı unuttum
          </button>
        </form>
      </section>
    </main>
  );
}
