import { useState } from "react";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { initialsOf } from "../utils/helpers";

const inputClass =
  "w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30";

export default function ProfilePage({
  currentTeacher,
  handleUpdateTeacherProfile,
  setTeacherProfileForm,
  teacherProfileForm,
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [firstName = "", lastName = ""] = (currentTeacher?.full_name || "").split(" ");
  const joinDate = currentTeacher?.created_at
    ? new Date(currentTeacher.created_at).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })
    : "-";
  const isAdmin = currentTeacher?.role === "admin";
  const isDirty =
    teacherProfileForm.full_name !== (currentTeacher?.full_name || "") ||
    teacherProfileForm.email !== (currentTeacher?.email || "") ||
    teacherProfileForm.password.trim() !== "";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-background">Profil</h1>
        <p className="mt-1 font-body-md text-body-md text-secondary">
          Hesap ayarlarını ve kişisel bilgilerini yönet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <section className="card p-5 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="avatar-circle mb-3 h-20 w-20 border-2 border-surface-container-lowest bg-primary-container text-xl text-on-primary shadow-sm">
                {initialsOf(firstName, lastName)}
              </div>
              <h3 className="font-headline-md text-headline-md text-on-background">
                {currentTeacher?.full_name}
              </h3>
              <p className="mt-0.5 font-body-md text-body-md text-secondary">
                {currentTeacher?.title || "Öğretmen"}
              </p>
              <span className={`badge mt-2.5 ${isAdmin ? "badge-success" : "badge-neutral"}`}>
                {isAdmin ? "Yönetici" : "Öğretmen"}
              </span>

              <div className="mt-5 flex w-full flex-col gap-2.5 border-t border-outline-variant pt-5">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md uppercase text-secondary">Durum</span>
                  <span className="badge bg-primary/10 text-primary">Aktif</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md uppercase text-secondary">Kayıt Tarihi</span>
                  <span className="font-body-md text-body-md text-on-surface">{joinDate}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <form className="flex flex-col gap-5" onSubmit={handleUpdateTeacherProfile}>
            <section className="card p-6 shadow-sm">
              <h3 className="mb-5 font-headline-md text-headline-md text-on-background">Kişisel Bilgiler</h3>
              <div className="flex flex-col gap-5">
                <div>
                  <label className="mb-2 block font-label-md text-label-md text-on-surface" htmlFor="profile-full-name">
                    Ad Soyad
                  </label>
                  <input
                    className={inputClass}
                    id="profile-full-name"
                    onChange={(event) =>
                      setTeacherProfileForm((form) => ({
                        ...form,
                        full_name: event.target.value,
                      }))
                    }
                    required
                    value={teacherProfileForm.full_name}
                  />
                </div>
                <div>
                  <label className="mb-2 block font-label-md text-label-md text-on-surface" htmlFor="profile-email">
                    E-posta Adresi
                  </label>
                  <input
                    className={inputClass}
                    id="profile-email"
                    onChange={(event) =>
                      setTeacherProfileForm((form) => ({
                        ...form,
                        email: event.target.value,
                      }))
                    }
                    required
                    type="email"
                    value={teacherProfileForm.email}
                  />
                </div>
              </div>
            </section>

            <section className="card p-6 shadow-sm">
              <h3 className="mb-5 font-headline-md text-headline-md text-on-background">Güvenlik</h3>
              <label className="mb-2 block font-label-md text-label-md text-on-surface" htmlFor="profile-password">
                Yeni Parola (İsteğe Bağlı)
              </label>
              <div className="relative">
                <input
                  className={`${inputClass} pr-11`}
                  id="profile-password"
                  minLength={8}
                  onChange={(event) =>
                    setTeacherProfileForm((form) => ({
                      ...form,
                      password: event.target.value,
                    }))
                  }
                  placeholder="••••••••"
                  type={isPasswordVisible ? "text" : "password"}
                  value={teacherProfileForm.password}
                />
                <Button
                  aria-label={isPasswordVisible ? "Parolayı gizle" : "Parolayı göster"}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  size="sm"
                  variant="icon"
                >
                  <Icon name={isPasswordVisible ? "visibility_off" : "visibility"} />
                </Button>
              </div>
              <p className="mt-2 font-mono-sm text-mono-sm text-secondary">
                Şifreni değiştirmek istemiyorsan boş bırak. En az 8 karakter, harf ve rakam içermeli.
              </p>

              {teacherProfileForm.password.trim() !== "" && (
                <div className="mt-4">
                  <label
                    className="mb-2 block font-label-md text-label-md text-on-surface"
                    htmlFor="profile-current-password"
                  >
                    Mevcut Parola
                  </label>
                  <input
                    className={inputClass}
                    id="profile-current-password"
                    onChange={(event) =>
                      setTeacherProfileForm((form) => ({
                        ...form,
                        current_password: event.target.value,
                      }))
                    }
                    placeholder="••••••••"
                    required
                    type="password"
                    value={teacherProfileForm.current_password}
                  />
                  <p className="mt-2 font-mono-sm text-mono-sm text-secondary">
                    Parola değişikliğini onaylamak için mevcut parolanı gir.
                  </p>
                </div>
              )}
            </section>

            <div className="flex justify-end">
              <Button disabled={!isDirty} size="md" type="submit" variant="primary">
                <Icon name="save" /> Profili Kaydet
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
