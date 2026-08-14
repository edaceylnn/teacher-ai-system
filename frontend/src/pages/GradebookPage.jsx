import { useMemo } from "react";
import Icon from "../components/Icon";
import PaginationControls from "../components/PaginationControls";
import {
  averageOfScores,
  avatarToneFor,
  buildGradesByStudent,
  formatRelativeTime,
  initialsOf,
} from "../utils/helpers";

const LESSON_ICONS = ["calculate", "science", "biotech", "psychology", "history_edu", "functions"];

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
  const gradesByLesson = useMemo(() => {
    return visibleGrades.reduce((acc, grade) => {
      const current = acc.get(grade.lesson_id) || [];
      current.push(grade);
      acc.set(grade.lesson_id, current);
      return acc;
    }, new Map());
  }, [visibleGrades]);
  const gradesByStudent = useMemo(() => buildGradesByStudent(visibleGrades), [visibleGrades]);
  const studentAverages = students
    .map((student) => averageOfScores(gradesByStudent.get(student.id) || []))
    .filter((average) => average !== null);
  const successRate = studentAverages.length
    ? Math.round(
        (studentAverages.filter((average) => average >= 70).length / studentAverages.length) * 100,
      )
    : 0;
  const riskyStudentCount = studentAverages.filter((average) => average < 70).length;
  const selectedStudent = studentById.get(selectedStudentId);

  return (
    <div className="wide-page">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">Not Defteri</h1>
          <p className="font-body-lg text-body-lg text-secondary">
            Öğrenci ders notlarını ve sınıf performansını takip et.
          </p>
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
          <Icon name="edit_document" /> Not Gir
        </button>
      </section>

      <div className="grid grid-cols-1 gap-card-gap lg:grid-cols-12">
        <div className="flex flex-col gap-card-gap lg:col-span-8">
          <section className="card overflow-hidden">
            <div className="section-heading border-b border-outline-variant bg-surface p-6">
              <div>
                <h2>Sınıf Ortalamaları</h2>
                <p className="section-subtext">
                  Bir öğrenciye tıklayarak altta yalnızca onun not kayıtlarını görüntüle.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-surface-container-low font-label-md text-label-md uppercase tracking-wider text-secondary">
                  <tr>
                    <th className="border-b border-outline-variant p-4">Öğrenci</th>
                    {lessons.map((lesson) => (
                      <th className="border-b border-outline-variant p-4 text-right" key={lesson.id}>
                        {lesson.name}
                      </th>
                    ))}
                    <th className="border-b border-outline-variant p-4 text-right">Durum</th>
                  </tr>
                </thead>
                <tbody className="font-mono-sm text-mono-sm text-on-surface">
                  {students.map((student) => (
                    <tr
                      className={`cursor-pointer border-b border-outline-variant/50 transition-colors hover:bg-surface ${
                        student.id === selectedStudentId ? "bg-surface-container-low" : ""
                      }`}
                      key={student.id}
                      onClick={() => {
                        const nextId = student.id === selectedStudentId ? null : student.id;
                        setSelectedStudentId(nextId);
                        setGradeForm((form) => ({ ...form, student_id: nextId ? String(nextId) : "" }));
                      }}
                    >
                      <td className="flex items-center gap-2 p-4 font-medium">
                        <span className={`avatar-circle h-6 w-6 text-xs ${avatarToneFor(student.id)}`}>
                          {initialsOf(student.first_name, student.last_name)}
                        </span>
                        {student.first_name} {student.last_name}
                      </td>
                      {lessons.map((lesson) => (
                        <td className="p-4 text-right" key={lesson.id}>
                          {studentLessonAverages.get(`${student.id}:${lesson.id}`) || "-"}
                        </td>
                      ))}
                      <td className="p-4 text-right">
                        <span className="status-chip">{student.id === selectedStudentId ? "Seçili" : "Seç"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!students.length && <p className="empty-note">Bu sınıfta henüz öğrenci yok.</p>}
          </section>

          <section className="card overflow-hidden">
            <div className="section-heading border-b border-outline-variant bg-surface p-6">
              <h2>
                {selectedStudent
                  ? `${selectedStudent.first_name} ${selectedStudent.last_name} — Not Kayıtları`
                  : "Tüm Not Kayıtları"}
              </h2>
              {selectedStudent && (
                <button className="link-button" onClick={() => setSelectedStudentId(null)} type="button">
                  Tümünü göster
                </button>
              )}
            </div>
            <ul className="divide-y divide-outline-variant/50">
              {gradeRecordPage.items.map((grade) => (
                <li className="flex items-center justify-between p-4 transition-colors hover:bg-surface" key={grade.id}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon name="history_edu" />
                    </div>
                    <div>
                      <p className="font-body-md text-body-md font-medium text-on-surface">
                        {lessonById.get(grade.lesson_id)?.name || "Ders"} — {grade.exam_name}
                      </p>
                      <p className="font-label-md text-label-md text-secondary">
                        {studentById.get(grade.student_id)?.first_name}{" "}
                        {studentById.get(grade.student_id)?.last_name} · Puan: {grade.score}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono-sm text-mono-sm text-secondary">
                      {formatRelativeTime(grade.created_at)}
                    </span>
                    <span className="row-actions mt-1 justify-end">
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
                </li>
              ))}
            </ul>
            {!gradeRecordPage.items.length && (
              <p className="empty-note">
                {selectedStudent ? "Bu öğrenci için henüz not kaydı yok." : "Henüz not kaydı yok."}
              </p>
            )}
            <PaginationControls
              limit={gradeRecordPage.limit}
              offset={gradeRecordOffset}
              setOffset={setGradeRecordOffset}
              total={gradeRecordPage.total}
            />
          </section>
        </div>

        <div className="flex flex-col gap-card-gap lg:col-span-4">
          <section className="card overflow-hidden">
            <div className="section-heading border-b border-outline-variant bg-surface p-6">
              <h2>Aktif Dersler</h2>
              <button className="outline-button compact" onClick={() => setActiveModal("lesson")} type="button">
                <Icon name="add" /> Ders Ekle
              </button>
            </div>
            <div className="p-4">
              <ul className="flex flex-col gap-3">
                {lessons.map((lesson, index) => (
                  <li
                    className="flex items-center justify-between rounded border border-outline-variant/50 p-3 transition-colors hover:bg-surface"
                    key={lesson.id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-on-primary">
                        <Icon name={LESSON_ICONS[index % LESSON_ICONS.length]} className="text-[18px]" />
                      </div>
                      <span className="font-body-md text-body-md font-medium text-on-surface">{lesson.name}</span>
                    </div>
                    <span className="row-actions">
                      <span className="mr-1 rounded bg-surface-container-low px-2 py-1 font-mono-sm text-mono-sm text-secondary">
                        {(gradesByLesson.get(lesson.id) || []).length} kayıt
                      </span>
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
                  </li>
                ))}
                {!lessons.length && <p className="empty-note">Henüz ders yok.</p>}
              </ul>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card">
              <Icon name="trending_up" className="mb-2 text-primary" />
              <div>
                <p className="mb-1 font-label-md text-label-md text-secondary">Genel Başarı Oranı</p>
                <p className="font-headline-lg text-headline-lg text-on-surface">%{successRate}</p>
              </div>
            </div>
            <div className="stat-card">
              <Icon name="warning" className="mb-2 text-error" />
              <div>
                <p className="mb-1 font-label-md text-label-md text-secondary">Riskli Öğrenci</p>
                <p className="font-headline-lg text-headline-lg text-on-surface">{riskyStudentCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
