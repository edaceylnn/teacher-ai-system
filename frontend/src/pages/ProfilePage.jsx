import Icon from "../components/Icon";
import { initialsOf } from "../utils/helpers";

export default function ProfilePage({
  currentTeacher,
  handleUpdateTeacherProfile,
  setTeacherProfileForm,
  teacherProfileForm,
}) {
  const [firstName = "", lastName = ""] = (currentTeacher?.full_name || "").split(" ");
  const joinDate = currentTeacher?.created_at
    ? new Date(currentTeacher.created_at).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })
    : "-";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-background">Profil</h1>
        <p className="mt-2 font-body-lg text-body-lg text-secondary">
          Hesap ayarlarını ve kişisel bilgilerini yönet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <section className="card p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className={`avatar-circle mb-4 h-32 w-32 border-4 border-surface-container-lowest text-3xl shadow-sm bg-primary-container text-on-primary`}>
                {initialsOf(firstName, lastName)}
              </div>
              <h3 className="mb-1 font-headline-md text-headline-md text-on-background">
                {currentTeacher?.full_name}
              </h3>
              <p className="font-body-md text-body-md text-secondary">
                {currentTeacher?.title || "Öğretmen"}
              </p>
              <div className="mt-6 w-full border-t border-surface-variant pt-6">
                <div className="mb-3 flex items-center justify-between">
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
          <section className="card p-8 shadow-sm">
            <h3 className="mb-6 border-b border-surface-variant pb-4 font-headline-md text-headline-md text-on-background">
              Kişisel Bilgiler
            </h3>
            <form className="flex flex-col gap-6" onSubmit={handleUpdateTeacherProfile}>
              <div>
                <label className="mb-2 block font-label-md text-label-md text-on-surface" htmlFor="profile-full-name">
                  Ad Soyad
                </label>
                <input
                  className="w-full rounded border border-surface-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
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
                  className="w-full rounded border border-surface-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
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
              <div className="mt-2 border-t border-surface-variant pt-6">
                <h4 className="mb-4 font-headline-md text-headline-md text-on-background">Güvenlik</h4>
                <label className="mb-2 block font-label-md text-label-md text-on-surface" htmlFor="profile-password">
                  Yeni Parola (İsteğe Bağlı)
                </label>
                <input
                  className="w-full rounded border border-surface-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  id="profile-password"
                  minLength={8}
                  onChange={(event) =>
                    setTeacherProfileForm((form) => ({
                      ...form,
                      password: event.target.value,
                    }))
                  }
                  placeholder="••••••••"
                  type="password"
                  value={teacherProfileForm.password}
                />
                <p className="mt-1.5 font-mono-sm text-mono-sm text-secondary">
                  Şifreni değiştirmek istemiyorsan boş bırak.
                </p>
              </div>
              <div className="flex justify-end pt-4">
                <button className="primary-button" type="submit">
                  <Icon name="save" /> Profili Kaydet
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
