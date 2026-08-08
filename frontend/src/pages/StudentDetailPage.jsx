import { useMemo } from "react";
import Icon from "../components/Icon";
import StatCard from "../components/StatCard";

export default function StudentDetailPage({
  attendanceRate,
  gradeAverages,
  overallAverage,
  profile,
  selectedStudent,
  selectedStudentId,
  setActiveModal,
  setActivePage,
  setEditingGrade,
  setEditingStudent,
  setGradeEditForm,
  setGradeForm,
  setStudentEditForm,
  handleDeleteGrade,
}) {
  const gradesByLesson = useMemo(() => {
    if (!profile?.grades?.length) return [];
    const grouped = profile.grades.reduce((acc, grade) => {
      const current = acc.get(grade.lesson_name) || [];
      current.push(grade);
      acc.set(grade.lesson_name, current);
      return acc;
    }, new Map());

    return Array.from(grouped.entries()).map(([lessonName, grades]) => ({
      lessonName,
      grades,
      average:
        Math.round(
          (grades.reduce((sum, grade) => sum + Number(grade.score), 0) /
            grades.length) *
            10,
        ) / 10,
    }));
  }, [profile]);

  if (!selectedStudent || !profile) {
    return (
      <section className="hero-card">
        <div>
          <h1>Öğrenci Detayı</h1>
          <p>Detayları görmek için Öğrencilerim listesinden bir öğrenci seç.</p>
        </div>
        <button
          className="outline-button"
          onClick={() => setActivePage("students")}
          type="button"
        >
          <Icon name="arrow_back" /> Öğrencilere Dön
        </button>
      </section>
    );
  }

  return (
    <div className="wide-page">
      <section className="student-detail-hero">
        <div>
          <button
            className="link-button back-link"
            onClick={() => setActivePage("students")}
            type="button"
          >
            <Icon name="arrow_back" /> Öğrencilere dön
          </button>
          <h1>
            {profile.first_name} {profile.last_name}
          </h1>
          <p>
            {profile.classroom.name} Sınıfı · Öğrenci kayıt no: {profile.id}
          </p>
        </div>
        <div className="student-detail-actions">
          <button
            className="outline-button"
            onClick={() => {
              setEditingStudent(selectedStudent);
              setStudentEditForm({
                first_name: selectedStudent.first_name,
                last_name: selectedStudent.last_name,
                parent_full_name: selectedStudent.parent_full_name || "",
                parent_phone: selectedStudent.parent_phone || "",
                parent_email: selectedStudent.parent_email || "",
                home_address: selectedStudent.home_address || "",
                observation_notes: selectedStudent.observation_notes || "",
              });
              setActiveModal("editStudent");
            }}
            type="button"
          >
            <Icon name="edit" /> Öğrenciyi Düzenle
          </button>
          <button
            className="primary-button"
            onClick={() => {
              setGradeForm((form) => ({
                ...form,
                student_id: String(selectedStudentId),
              }));
              setActiveModal("grade");
            }}
            type="button"
          >
            <Icon name="upload" /> Not Gir
          </button>
        </div>
      </section>

      <section className="student-detail-stats">
        <StatCard
          icon="analytics"
          label="Genel Ortalama"
          trend="Kayıtlı notlar"
          value={overallAverage}
        />
        <StatCard
          icon="menu_book"
          label="Ders Sayısı"
          trend="Not girilen"
          value={gradesByLesson.length}
        />
        <StatCard
          icon="fact_check"
          label="Devam Oranı"
          trend="Seçili öğrenci"
          value={attendanceRate}
        />
      </section>

      <section className="student-detail-grid">
        <div className="detail-main">
          <section className="student-table-card">
            <div className="detail-section-head">
              <h2>Ders ve Notlar</h2>
              <span>{profile.grades.length} kayıt</span>
            </div>
            {gradesByLesson.map((lessonGroup) => (
              <div className="lesson-grade-group" key={lessonGroup.lessonName}>
                <div className="lesson-grade-summary">
                  <strong>{lessonGroup.lessonName}</strong>
                  <span>Ortalama: {lessonGroup.average}</span>
                </div>
                {lessonGroup.grades.map((grade) => (
                  <div className="student-grade-row" key={grade.id}>
                    <span>{grade.exam_name}</span>
                    <strong>{grade.score}</strong>
                    <span className="row-actions">
                      <button
                        aria-label={`${grade.exam_name} notunu düzenle`}
                        className="icon-action"
                        onClick={() => {
                          setEditingGrade(grade);
                          setGradeEditForm({
                            lesson_id: String(grade.lesson_id),
                            exam_name: grade.exam_name,
                            score: String(grade.score),
                          });
                          setActiveModal("editGrade");
                        }}
                        type="button"
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        aria-label={`${grade.exam_name} notunu sil`}
                        className="icon-action danger-action"
                        onClick={() => handleDeleteGrade(grade.id)}
                        type="button"
                      >
                        <Icon name="delete" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {!gradesByLesson.length && (
              <p className="empty-note">Bu öğrenci için henüz not kaydı yok.</p>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <section className="card detail-note-card">
            <div className="detail-section-head">
              <h2>Veli ve İletişim</h2>
            </div>
            <div className="contact-summary-list">
              <span>
                <strong>Veli</strong>
                {profile.parent_full_name || "-"}
              </span>
              <span>
                <strong>Telefon</strong>
                {profile.parent_phone || "-"}
              </span>
              <span>
                <strong>E-posta</strong>
                {profile.parent_email || "-"}
              </span>
              <span>
                <strong>Adres</strong>
                {profile.home_address || "-"}
              </span>
            </div>
          </section>

          <section className="card detail-note-card">
            <div className="detail-section-head">
              <h2>Öğretmen Yorumu</h2>
            </div>
            <p>
              {profile.observation_notes || "Henüz öğretmen yorumu girilmedi."}
            </p>
          </section>

          <section className="card detail-note-card">
            <div className="detail-section-head">
              <h2>Ders Ortalamaları</h2>
            </div>
            <div className="average-chips detail-average-chips">
              {gradeAverages.map((item) => (
                <span key={item.lessonName}>
                  {item.lessonName}: {item.average}
                </span>
              ))}
              {!gradeAverages.length && <p>Henüz ortalama yok.</p>}
            </div>
          </section>

          <section className="card detail-note-card">
            <div className="detail-section-head">
              <h2>Devamsızlık</h2>
            </div>
            <div className="attendance-summary-list">
              <span>Var: {profile.attendance_summary.present}</span>
              <span>Yok: {profile.attendance_summary.absent}</span>
              <span>Mazeretli: {profile.attendance_summary.excused}</span>
              <span>Toplam: {profile.attendance_summary.total}</span>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
