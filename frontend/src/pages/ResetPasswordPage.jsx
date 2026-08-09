import { useState } from "react";
import Icon from "../components/Icon";
import { api } from "../api";

export default function ResetPasswordPage({ token, onDone }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Parolalar eşleşmiyor.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.confirmPasswordReset(token, password);
      setIsDone(true);
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
          <h1>Parolayı Sıfırla</h1>
          <p className="login-copy">
            {isDone
              ? "Parolan güncellendi. Yeni parolanla giriş yapabilirsin."
              : "Hesabın için yeni bir parola belirle."}
          </p>
        </div>
        {isDone ? (
          <button className="primary-button" onClick={onDone} type="button">
            <Icon name="login" /> Giriş sayfasına dön
          </button>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              Yeni parola
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <p className="field-hint">
              En az 8 karakter, en az bir harf ve bir rakam içermeli.
            </p>
            <label>
              Yeni parola (tekrar)
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" disabled={isSubmitting} type="submit">
              <Icon name="login" />{" "}
              {isSubmitting ? "Kaydediliyor..." : "Parolayı Güncelle"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
