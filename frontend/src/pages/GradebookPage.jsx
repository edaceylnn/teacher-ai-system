import { useMemo, useState } from "react";
import AssessmentEntryPanel from "../components/AssessmentEntryPanel";
import Icon from "../components/Icon";
import { assignedLessonsForClassroom } from "../utils/permissions";

export default function GradebookPage({
  activeAssessmentId,
  assessmentRecordsDraft,
  assessments,
  classroomOptions,
  closeAssessmentEntry,
  gradeCategoryLabels,
  gradeCategoryOptions,
  handleDeleteAssessment,
  handleDeleteLesson,
  handleSaveAssessmentRecords,
  isLoadingAssessmentRecords,
  isSavingAssessmentRecords,
  lessons: allVisibleLessons,
  openAssessmentForEntry,
  selectedClassroomId,
  setActiveModal,
  setAssessmentEditForm,
  setAssessmentForm,
  setAssessmentRecordsDraft,
  setEditingAssessment,
  setEditingLesson,
  setLessonEditForm,
  setSelectedClassroomId,
  students,
  teacherAssignments,
}) {
  const [lessonFilter, setLessonFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Madde 6: bu sınıfta atanmış olduğun dersler dışındakiler burada da
  // görünmemeli.
  const lessons = useMemo(
    () => assignedLessonsForClassroom(teacherAssignments, Number(selectedClassroomId), allVisibleLessons),
    [teacherAssignments, selectedClassroomId, allVisibleLessons],
  );
  const lessonById = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons]);
  const lessonOptions = useMemo(
    () => lessons.map((lesson) => ({ label: lesson.name, value: String(lesson.id) })),
    [lessons],
  );
  const typeOptions = useMemo(() => [{ label: "Tüm Türler", value: "" }, ...gradeCategoryOptions], [gradeCategoryOptions]);

  const filteredAssessments = useMemo(
    () =>
      assessments.filter(
        (assessment) =>
          (!lessonFilter || String(assessment.lesson_id) === lessonFilter) &&
          (!typeFilter || assessment.assessment_type === typeFilter),
      ),
    [assessments, lessonFilter, typeFilter],
  );
  const assessmentCountByLesson = useMemo(() => {
    const counts = new Map();
    assessments.forEach((assessment) => {
      counts.set(assessment.lesson_id, (counts.get(assessment.lesson_id) || 0) + 1);
    });
    return counts;
  }, [assessments]);

  const activeAssessment = assessments.find((assessment) => assessment.id === activeAssessmentId);

  return (
    <div className="wide-page">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Not Defteri</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Sınıf ve ders seçip değerlendirme oluştur, sınıftaki tüm öğrencilere tek seferde sonuç gir.
          </p>
        </div>
        <button
          className="primary-button"
          disabled={!selectedClassroomId}
          onClick={() => {
            setAssessmentForm((form) => ({
              ...form,
              classroom_id: selectedClassroomId ? String(selectedClassroomId) : "",
              lesson_id: "",
              assessment_type: "sinav",
              title: "",
              description: "",
              date: "",
            }));
            setActiveModal("newAssessment");
          }}
          type="button"
        >
          <Icon name="add_box" /> Yeni Değerlendirme
        </button>
      </section>

      <section className="card p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block font-label-md text-label-md text-secondary" htmlFor="gradebook-classroom">
              Sınıf
            </label>
            <select
              className="filter-select"
              id="gradebook-classroom"
              onChange={(event) => setSelectedClassroomId(event.target.value ? Number(event.target.value) : null)}
              value={selectedClassroomId || ""}
            >
              <option value="">Sınıf seç</option>
              {classroomOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-label-md text-label-md text-secondary" htmlFor="gradebook-lesson">
              Ders
            </label>
            <select
              className="filter-select"
              id="gradebook-lesson"
              onChange={(event) => setLessonFilter(event.target.value)}
              value={lessonFilter}
            >
              <option value="">Tüm Dersler</option>
              {lessonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-label-md text-label-md text-secondary" htmlFor="gradebook-type">
              Değerlendirme Türü
            </label>
            <select
              className="filter-select"
              id="gradebook-type"
              onChange={(event) => setTypeFilter(event.target.value)}
              value={typeFilter}
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-card-gap lg:grid-cols-12">
        <div className="flex flex-col gap-card-gap lg:col-span-8">
          {!selectedClassroomId && (
            <section className="card p-8">
              <p className="empty-note">Başlamak için bir sınıf seç.</p>
            </section>
          )}

          {selectedClassroomId && activeAssessment && (
            <AssessmentEntryPanel
              activeAssessment={activeAssessment}
              assessmentRecordsDraft={assessmentRecordsDraft}
              gradeCategoryLabels={gradeCategoryLabels}
              isLoadingAssessmentRecords={isLoadingAssessmentRecords}
              isSavingAssessmentRecords={isSavingAssessmentRecords}
              lessonName={lessonById.get(activeAssessment.lesson_id)?.name}
              onClose={closeAssessmentEntry}
              onSave={handleSaveAssessmentRecords}
              panelLabel="Toplu Sonuç Girişi"
              setAssessmentRecordsDraft={setAssessmentRecordsDraft}
              students={students}
            />
          )}

          {selectedClassroomId && !activeAssessment && (
            <section className="card overflow-hidden">
              <div className="section-heading border-b border-outline-variant bg-surface-bright p-5">
                <h2>Değerlendirmeler</h2>
              </div>
              <ul className="divide-y divide-outline-variant/50">
                {filteredAssessments.map((assessment) => (
                  <li className="flex items-center justify-between p-4 transition-colors hover:bg-surface" key={assessment.id}>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon name="history_edu" />
                      </div>
                      <div>
                        <p className="font-body-md text-body-md font-medium text-on-surface">
                          {lessonById.get(assessment.lesson_id)?.name || "Ders"} — {assessment.title}{" "}
                          <span className="status-chip">{gradeCategoryLabels[assessment.assessment_type]}</span>
                        </p>
                        <p className="font-label-md text-label-md text-secondary">Tarih: {assessment.date}</p>
                      </div>
                    </div>
                    <span className="row-actions">
                      <button
                        aria-label={`${assessment.title} için sonuç gir`}
                        className="outline-button compact"
                        onClick={() => openAssessmentForEntry(assessment)}
                        type="button"
                      >
                        Sonuç Gir
                      </button>
                      <button
                        aria-label={`${assessment.title} değerlendirmesini düzenle`}
                        className="icon-action"
                        onClick={() => {
                          setEditingAssessment(assessment);
                          setAssessmentEditForm({
                            title: assessment.title,
                            description: assessment.description || "",
                            date: assessment.date,
                          });
                          setActiveModal("editAssessment");
                        }}
                        type="button"
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        aria-label={`${assessment.title} değerlendirmesini sil`}
                        className="icon-action danger-action"
                        onClick={() => handleDeleteAssessment(assessment.id)}
                        type="button"
                      >
                        <Icon name="delete" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              {!filteredAssessments.length && (
                <p className="empty-note">
                  {assessments.length ? "Bu filtreyle eşleşen değerlendirme yok." : "Bu sınıfta henüz değerlendirme yok."}
                </p>
              )}
            </section>
          )}
        </div>

        <div className="flex flex-col gap-card-gap lg:col-span-4">
          <section className="card overflow-hidden">
            <div className="section-heading border-b border-outline-variant bg-surface-bright p-5">
              <h2>Aktif Dersler</h2>
              <button className="outline-button compact" onClick={() => setActiveModal("lesson")} type="button">
                <Icon name="add" /> Ders Ekle
              </button>
            </div>
            <div className="p-4">
              <ul className="flex flex-col gap-3">
                {lessons.map((lesson) => (
                  <li
                    className="flex items-center justify-between rounded border border-outline-variant/50 p-3"
                    key={lesson.id}
                  >
                    <span className="font-body-md text-body-md font-medium text-on-surface">{lesson.name}</span>
                    <span className="row-actions">
                      <span className="rounded bg-surface-container-low px-2 py-1 font-mono-sm text-mono-sm text-secondary">
                        {assessmentCountByLesson.get(lesson.id) || 0} değerlendirme
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
        </div>
      </div>
    </div>
  );
}
