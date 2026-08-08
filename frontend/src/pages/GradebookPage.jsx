import { useMemo } from "react";
import Icon from "../components/Icon";
import PaginationControls from "../components/PaginationControls";

export default function GradebookPage({
  gradeRecordOffset,
  gradeRecordPage,
  handleDeleteGrade,
  handleDeleteLesson,
  grades,
  lessons,
  selectedStudentId,
  setActiveModal,
  setEditingGrade,
  setEditingLesson,
  setGradeEditForm,
  setGradeForm,
  setGradeRecordOffset,
  setLessonEditForm,
  setSelectedStudentId,
  students,
}) {
  const currentStudentIds = useMemo(
    () => new Set(students.map((student) => student.id)),
    [students],
  );
  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );
  const lessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons],
  );
  const visibleGrades = useMemo(
    () => grades.filter((grade) => currentStudentIds.has(grade.student_id)),
    [currentStudentIds, grades],
  );
  const studentLessonAverages = useMemo(() => {
    const grouped = visibleGrades.reduce((acc, grade) => {
      const key = `${grade.student_id}:${grade.lesson_id}`;
      const current = acc.get(key) || { total: 0, count: 0 };
      current.total += Number(grade.score);
      current.count += 1;
      acc.set(key, current);
      return acc;
    }, new Map());

    return new Map(
      Array.from(grouped.entries()).map(([key, item]) => [
        key,
        Math.round((item.total / item.count) * 10) / 10,
      ]),
    );
  }, [visibleGrades]);
  const lessonColumns = lessons.length
    ? ` repeat(${lessons.length}, minmax(100px, 1fr))`
    : "";
  const gradebookColumns = `minmax(180px, 1.4fr)${lessonColumns} 100px`;

  return (
    <div className="wide-page">
      <section className="hero-card">
        <div>
          <h1>Not Defteri</h1>
          <p>Öğrenci ders notlarını ve sınıf performansını takip et.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setGradeForm((form) => ({
              ...form,
              student_id: selectedStudentId ? String(selectedStudentId) : "",
            }));
            setActiveModal("grade");
          }}
          type="button"
        >
          <Icon name="upload" /> Not Gir
        </button>
      </section>
      <section className="card record-card">
        <div className="section-heading">
          <h2>Dersler</h2>
          <button
            className="outline-button compact"
            onClick={() => setActiveModal("lesson")}
            type="button"
          >
            <Icon name="add" /> Ders Ekle
          </button>
        </div>
        <div className="lesson-list">
          {lessons.map((lesson) => (
            <div className="lesson-row" key={lesson.id}>
              <strong>{lesson.name}</strong>
              <span className="row-actions">
                <button
                  aria-label={`${lesson.name} dersini düzenle`}
                  className="icon-action"
                  onClick={() => {
                    setEditingLesson(lesson);
                    setLessonEditForm({ name: lesson.name });
                    setActiveModal("editLesson");
                  }}
                  type="button"
                >
                  <Icon name="edit" />
                </button>
                <button
                  aria-label={`${lesson.name} dersini sil`}
                  className="icon-action danger-action"
                  onClick={() => handleDeleteLesson(lesson.id)}
                  type="button"
                >
                  <Icon name="delete" />
                </button>
              </span>
            </div>
          ))}
          {!lessons.length && <p className="empty-note">Henüz ders yok.</p>}
        </div>
      </section>
      <section className="student-table-card gradebook-card">
        <div
          className="gradebook-head"
          style={{ gridTemplateColumns: gradebookColumns }}
        >
          <span>Öğrenci</span>
          {lessons.map((lesson) => (
            <span key={lesson.id}>{lesson.name}</span>
          ))}
          <span>Durum</span>
        </div>
        {students.map((student) => (
          <button
            className={
              student.id === selectedStudentId
                ? "gradebook-row active"
                : "gradebook-row"
            }
            style={{ gridTemplateColumns: gradebookColumns }}
            key={student.id}
            onClick={() => {
              setSelectedStudentId(student.id);
              setGradeForm((form) => ({
                ...form,
                student_id: String(student.id),
              }));
            }}
            type="button"
          >
            <strong>
              {student.first_name} {student.last_name}
            </strong>
            {lessons.map((lesson) => (
              <span key={lesson.id}>
                {studentLessonAverages.get(`${student.id}:${lesson.id}`) || "-"}
              </span>
            ))}
            <span className="status-chip inline">
              {student.id === selectedStudentId ? "Seçili" : "Seç"}
            </span>
          </button>
        ))}
      </section>
      <section className="student-table-card grade-record-card">
        <div className="record-head grade-record-head">
          <span>Öğrenci</span>
          <span>Kayıt</span>
          <span>Ders</span>
          <span>Puan</span>
          <span>İşlem</span>
        </div>
        {gradeRecordPage.items.map((grade) => (
          <div className="record-row grade-record-row" key={grade.id}>
            <strong>
              {studentById.get(grade.student_id)?.first_name}{" "}
              {studentById.get(grade.student_id)?.last_name}
            </strong>
            <strong>{grade.exam_name}</strong>
            <span>{lessonById.get(grade.lesson_id)?.name || "Ders"}</span>
            <span>{grade.score}</span>
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
        {!gradeRecordPage.items.length && (
          <p className="empty-note">Henüz not kaydı yok.</p>
        )}
      </section>
      <PaginationControls
        limit={gradeRecordPage.limit}
        offset={gradeRecordOffset}
        setOffset={setGradeRecordOffset}
        total={gradeRecordPage.total}
      />
    </div>
  );
}
