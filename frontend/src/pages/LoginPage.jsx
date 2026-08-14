import { useState } from "react";
import Icon from "../components/Icon";
import { api } from "../api";
import logo from "../assets/teacher-ai-logo.png";

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
      <main className="flex min-h-screen items-center justify-center bg-background p-4 antialiased">
        <div className="w-full max-w-md px-container-padding py-section-margin">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
              <img alt="Teacher AI Logo" className="h-full w-full object-cover" src={logo} />
            </div>
            <p className="eyebrow mb-2 font-label-md text-label-md uppercase tracking-wider text-primary">
              Teacher AI
            </p>
            <h1 className="font-headline-lg text-headline-lg-mobile text-on-surface md:text-headline-lg">
              Parolamı Unuttum
            </h1>
            <p className="login-copy mt-2 text-center font-body-md text-body-md text-secondary">
              E-posta adresini gir, sıfırlama bağlantısı gönderelim.
            </p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
            <form className="flex flex-col gap-6" onSubmit={handleRequestReset}>
              <div className="flex flex-col gap-1.5">
                <label
                  className="font-label-md text-label-md uppercase tracking-wider text-on-surface"
                  htmlFor="forgot-password-email"
                >
                  E-posta
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-outline">
                    mail
                  </span>
                  <input
                    autoComplete="email"
                    className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pl-10 pr-3 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
                    id="forgot-password-email"
                    onChange={(event) => setResetEmail(event.target.value)}
                    required
                    type="email"
                    value={resetEmail}
                  />
                </div>
              </div>
              {error && <p className="form-error">{error}</p>}
              {resetNotice && <p className="login-copy font-body-md text-body-md text-primary">{resetNotice}</p>}
              <button className="primary-button" disabled={isSendingReset} type="submit">
                <Icon name="mail" />
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
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 antialiased">
      <div className="w-full max-w-md px-container-padding py-section-margin">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
            <img alt="Teacher AI Logo" className="h-full w-full object-cover" src={logo} />
          </div>
          <div className="mb-2 flex items-center gap-2">
            <Icon name="neurology" className="text-primary" filled />
            <span className="font-headline-md text-headline-md tracking-tight text-primary">Teacher AI</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg-mobile text-center text-on-surface md:text-headline-lg">
            Öğretmen Paneli
          </h1>
          <p className="login-copy mt-2 text-center font-body-md text-body-md text-secondary">
            Öğrenci verileri artık kullanıcı oturumu ile korunur.
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-container-padding shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label
                className="font-label-md text-label-md uppercase tracking-wider text-on-surface"
                htmlFor="login-email"
              >
                E-posta
              </label>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-outline">
                  mail
                </span>
                <input
                  autoComplete="email"
                  className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pl-10 pr-3 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
                  id="login-email"
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
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="font-label-md text-label-md uppercase tracking-wider text-on-surface"
                  htmlFor="login-password"
                >
                  Parola
                </label>
                <button
                  className="font-label-md text-label-md text-primary transition-colors hover:underline"
                  onClick={() => {
                    setIsForgotPasswordMode(true);
                    setError("");
                    setResetEmail(form.email);
                  }}
                  type="button"
                >
                  Parolamı unuttum
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-outline">
                  lock
                </span>
                <input
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pl-10 pr-3 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary"
                  id="login-password"
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
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" disabled={isSubmitting} type="submit">
              <Icon name="login" />
              {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>
        <div className="mt-8 text-center">
          <p className="font-mono-sm text-mono-sm text-outline">© 2026 Teacher AI. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </main>
  );
}
