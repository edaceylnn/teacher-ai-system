import { useState } from "react";
import Icon from "../components/Icon";
import { api } from "../api";
import logo from "../assets/teacher-ai-logo.png";

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
    <main className="flex min-h-screen items-center justify-center bg-background p-4 antialiased">
      <div className="w-full max-w-md px-container-padding py-section-margin">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
            <img alt="Teacher AI Logo" className="h-full w-full object-cover" src={logo} />
          </div>
          <p className="mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">Teacher AI</p>
          <h1 className="font-headline-lg text-headline-lg-mobile text-center text-on-surface md:text-headline-lg">
            Parolayı Sıfırla
          </h1>
          <p className="mt-2 text-center font-body-md text-body-md text-secondary">
            {isDone
              ? "Parolan güncellendi. Yeni parolanla giriş yapabilirsin."
              : "Hesabın için yeni bir parola belirle."}
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
          {isDone ? (
            <button className="primary-button full" onClick={onDone} type="button">
              <Icon name="login" /> Giriş sayfasına dön
            </button>
          ) : (
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <label
                  className="font-label-md text-label-md uppercase tracking-wider text-on-surface"
                  htmlFor="reset-password"
                >
                  Yeni parola
                </label>
                <input
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  id="reset-password"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
                <p className="field-hint">En az 8 karakter, en az bir harf ve bir rakam içermeli.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  className="font-label-md text-label-md uppercase tracking-wider text-on-surface"
                  htmlFor="reset-password-confirm"
                >
                  Yeni parola (tekrar)
                </label>
                <input
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  id="reset-password-confirm"
                  minLength={8}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="primary-button" disabled={isSubmitting} type="submit">
                <Icon name="login" />
                {isSubmitting ? "Kaydediliyor..." : "Parolayı Güncelle"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
