import { useMemo, useState } from "react";
import AssessmentEntryPanel from "../components/AssessmentEntryPanel";
import Icon from "../components/Icon";
import { assignedLessonsForClassroom } from "../utils/permissions";

export default function HomeworkPage({
  activeAssessmentId,
  assessmentRecordsDraft,
  assessments,
  classroomOptions,
  closeAssessmentEntry,
  gradeCategoryLabels,
  handleDeleteAssessment,
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
  setSelectedClassroomId,
  students,
  teacherAssignments,
}) {
  const [lessonFilter, setLessonFilter] = useState("");

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

  // Not Defteri ile aynı `assessments` listesi — burada sadece odev tipine
  // daraltılıyor, ayrı bir veri kaynağı/istek yok.
  const homeworkAssessments = useMemo(
    () => assessments.filter((assessment) => assessment.assessment_type === "odev"),
    [assessments],
  );
  const filteredHomeworks = useMemo(
    () => homeworkAssessments.filter((assessment) => !lessonFilter || String(assessment.lesson_id) === lessonFilter),
    [homeworkAssessments, lessonFilter],
  );

  const activeAssessment = assessments.find(
    (assessment) => assessment.id === activeAssessmentId && assessment.assessment_type === "odev",
  );

  return (
    <div className="wide-page">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Ödevler</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Sınıf ve ders seçip ödev oluştur, ödev kontrolünde tüm sınıfın tamamlanma/puan durumunu tek seferde gir.
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
              assessment_type: "odev",
              title: "",
              description: "",
              date: "",
            }));
            setActiveModal("newHomework");
          }}
          type="button"
        >
          <Icon name="assignment_add" /> Ödev Ekle
        </button>
      </section>

      <section className="rounded-xl bg-surface-container-low/70 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-label-md text-label-md text-secondary" htmlFor="homework-classroom">
              Sınıf
            </label>
            <select
              className="filter-select"
              id="homework-classroom"
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
            <label className="mb-1 block font-label-md text-label-md text-secondary" htmlFor="homework-lesson">
              Ders
            </label>
            <select
              className="filter-select"
              id="homework-lesson"
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
        </div>
      </section>

      {!selectedClassroomId && (
        <section className="card">
          <div className="empty-state">
            <span className="empty-state-icon">
              <Icon name="school" />
            </span>
            <h3>Sınıf seçimi bekleniyor</h3>
            <p>Ödev listesini ve ödev kontrolünü görmek için bir sınıf seç.</p>
          </div>
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
          panelLabel="Ödev Kontrolü"
          setAssessmentRecordsDraft={setAssessmentRecordsDraft}
          students={students}
        />
      )}

      {selectedClassroomId && !activeAssessment && (
        <section className="card overflow-hidden">
          <div className="section-heading p-5 pb-2">
            <h2>Ödevler</h2>
          </div>
          <ul className="divide-y divide-outline-variant/50">
            {filteredHomeworks.map((assessment) => (
              <li className="flex items-center justify-between p-4 transition-colors hover:bg-surface-container-low" key={assessment.id}>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name="assignment" />
                  </div>
                  <div>
                    <p className="font-body-md text-body-md font-medium text-on-surface">{assessment.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 font-label-md text-label-md text-secondary">
                      <span>{lessonById.get(assessment.lesson_id)?.name || "-"}</span>
                      <span className="status-chip">Teslim: {assessment.date}</span>
                    </p>
                  </div>
                </div>
                <span className="row-actions">
                  <button
                    aria-label={`${assessment.title} için ödev kontrolü`}
                    className="primary-button compact"
                    onClick={() => openAssessmentForEntry(assessment)}
                    type="button"
                  >
                    Ödev Kontrolü
                  </button>
                  <button
                    aria-label={`${assessment.title} ödevini düzenle`}
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
                    aria-label={`${assessment.title} ödevini sil`}
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
          {!filteredHomeworks.length && (
            <p className="empty-note">
              {homeworkAssessments.length ? "Bu filtreyle eşleşen ödev yok." : "Bu sınıfta henüz ödev yok."}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
