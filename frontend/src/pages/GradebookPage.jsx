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
  const [openAssessmentMenuId, setOpenAssessmentMenuId] = useState(null);
  const [openLessonMenuId, setOpenLessonMenuId] = useState(null);

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

  function openEditAssessment(assessment) {
    setEditingAssessment(assessment);
    setAssessmentEditForm({
      title: assessment.title,
      description: assessment.description || "",
      date: assessment.date,
    });
    setActiveModal("editAssessment");
    setOpenAssessmentMenuId(null);
  }

  function openEditLesson(lesson) {
    setEditingLesson(lesson);
    setLessonEditForm({ name: lesson.name });
    setActiveModal("editLesson");
    setOpenLessonMenuId(null);
  }

  return (
    <div className="wide-page gradebook-page">
      <section className="gradebook-header">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Not Defteri</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Değerlendirme oluştur, sınav/quiz/performans/ödev sonuçlarını tek yerden işle.
          </p>
        </div>
        <button
          className="primary-button compact"
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

      <section className="gradebook-toolbar" aria-label="Not defteri filtreleri">
        <label htmlFor="gradebook-classroom">
          <span>Sınıf</span>
          <select
            className="filter-select"
            id="gradebook-classroom"
            onChange={(event) => {
              setSelectedClassroomId(event.target.value ? Number(event.target.value) : null);
              setLessonFilter("");
              setTypeFilter("");
            }}
            value={selectedClassroomId || ""}
          >
            <option value="">Sınıf seç</option>
            {classroomOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="gradebook-lesson">
          <span>Ders</span>
          <select
            className="filter-select"
            disabled={!selectedClassroomId}
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
        </label>
        <label htmlFor="gradebook-type">
          <span>Tür</span>
          <select
            className="filter-select"
            disabled={!selectedClassroomId}
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
        </label>
      </section>

      <div className="grid grid-cols-1 gap-card-gap lg:grid-cols-12">
        <div className="flex flex-col gap-card-gap lg:col-span-9">
          {!selectedClassroomId && (
            <section className="card">
              <div className="empty-state">
                <span className="empty-state-icon">
                  <Icon name="school" />
                </span>
                <h3>Sınıf seçimi bekleniyor</h3>
                <p>Değerlendirmeleri ve toplu sonuç girişini görmek için bir sınıf seç.</p>
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
              panelLabel="Toplu Sonuç Girişi"
              setAssessmentRecordsDraft={setAssessmentRecordsDraft}
              students={students}
            />
          )}

          {selectedClassroomId && !activeAssessment && (
            <section className="gradebook-list-panel">
              <div className="gradebook-list-head">
                <div>
                  <h2>Değerlendirmeler</h2>
                  <p>Sınav, quiz, performans ve ödev kayıtları.</p>
                </div>
                <span>{filteredAssessments.length} kayıt</span>
              </div>
              <ul className="gradebook-assessment-list">
                {filteredAssessments.map((assessment) => (
                  <li className="gradebook-assessment-row" key={assessment.id}>
                    <div className="gradebook-assessment-main">
                      <div className="gradebook-assessment-icon">
                        <Icon name="history_edu" />
                      </div>
                      <div className="min-w-0">
                        <p className="gradebook-assessment-title">
                          <span>{lessonById.get(assessment.lesson_id)?.name || "Ders"}</span>
                          <span aria-hidden="true">—</span>
                          <span>{assessment.title}</span>
                        </p>
                        <p className="gradebook-assessment-meta">
                          <span>{gradeCategoryLabels[assessment.assessment_type]}</span>
                          <span>•</span>
                          <span>{assessment.date}</span>
                        </p>
                      </div>
                    </div>
                    <div className="gradebook-row-actions">
                      <button
                        aria-label={`${assessment.title} için sonuç gir`}
                        className="primary-button compact"
                        onClick={() => {
                          openAssessmentForEntry(assessment);
                          setOpenAssessmentMenuId(null);
                        }}
                        type="button"
                      >
                        Sonuç Gir
                      </button>
                      <div className="student-row-menu">
                        <button
                          aria-expanded={openAssessmentMenuId === assessment.id}
                          aria-label={`${assessment.title} değerlendirme işlemleri`}
                          className="student-row-menu-button"
                          onClick={() =>
                            setOpenAssessmentMenuId((current) => (current === assessment.id ? null : assessment.id))
                          }
                          type="button"
                        >
                          •••
                        </button>
                        {openAssessmentMenuId === assessment.id && (
                          <div className="student-row-menu-popover">
                            <button onClick={() => openEditAssessment(assessment)} type="button">Düzenle</button>
                            <button
                              className="danger"
                              onClick={() => {
                                handleDeleteAssessment(assessment.id);
                                setOpenAssessmentMenuId(null);
                              }}
                              type="button"
                            >
                              Sil
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
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

        <div className="flex flex-col gap-card-gap lg:col-span-3">
          <section className="gradebook-lessons-panel">
            <div className="gradebook-lessons-head">
              <div>
                <h2>Aktif Dersler</h2>
                <p>{lessons.length} ders</p>
              </div>
              <button className="outline-button compact" onClick={() => setActiveModal("lesson")} type="button">
                <Icon name="add" /> Ders Ekle
              </button>
            </div>
            <div>
              <ul className="gradebook-lesson-list">
                {lessons.map((lesson) => (
                  <li
                    className="gradebook-lesson-row"
                    key={lesson.id}
                  >
                    <div>
                      <span>{lesson.name}</span>
                      <small>
                        {assessmentCountByLesson.get(lesson.id) || 0} değerlendirme
                      </small>
                    </div>
                    <div className="student-row-menu">
                      <button
                        aria-expanded={openLessonMenuId === lesson.id}
                        aria-label={`${lesson.name} ders işlemleri`}
                        className="student-row-menu-button"
                        onClick={() => setOpenLessonMenuId((current) => (current === lesson.id ? null : lesson.id))}
                        type="button"
                      >
                        •••
                      </button>
                      {openLessonMenuId === lesson.id && (
                        <div className="student-row-menu-popover">
                          <button onClick={() => openEditLesson(lesson)} type="button">Düzenle</button>
                          <button
                            className="danger"
                            onClick={() => {
                              handleDeleteLesson(lesson.id);
                              setOpenLessonMenuId(null);
                            }}
                            type="button"
                          >
                            Sil
                          </button>
                        </div>
                      )}
                    </div>
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
