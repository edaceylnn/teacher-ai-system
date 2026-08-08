import Icon from "../components/Icon";

export default function ProfilePage({
  handleUpdateTeacherProfile,
  setTeacherProfileForm,
  teacherProfileForm,
}) {
  return (
    <div className="wide-page profile-page">
      <section className="hero-card">
        <div>
          <h1>Profil</h1>
          <p>Öğretmen hesabı ve giriş bilgileri.</p>
        </div>
      </section>
      <section className="student-table-card profile-card">
        <form className="profile-form" onSubmit={handleUpdateTeacherProfile}>
          <label>
            Ad soyad
            <input
              onChange={(event) =>
                setTeacherProfileForm((form) => ({
                  ...form,
                  full_name: event.target.value,
                }))
              }
              required
              value={teacherProfileForm.full_name}
            />
          </label>
          <label>
            E-posta
            <input
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
          </label>
          <label>
            Yeni parola
            <input
              minLength={8}
              onChange={(event) =>
                setTeacherProfileForm((form) => ({
                  ...form,
                  password: event.target.value,
                }))
              }
              placeholder="Değiştirmek istemiyorsan boş bırak"
              type="password"
              value={teacherProfileForm.password}
            />
          </label>
          <button className="primary-button" type="submit">
            <Icon name="save" /> Profili Kaydet
          </button>
        </form>
      </section>
    </div>
  );
}
