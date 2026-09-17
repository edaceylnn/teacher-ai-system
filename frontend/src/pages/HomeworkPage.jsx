import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import AssessmentEntryPanel from "../components/AssessmentEntryPanel";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";
import { assignedLessonsForClassroom } from "../utils/permissions";

function todayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function homeworkStatus(assessment, summary, studentCount) {
  if (studentCount > 0 && summary.completedCount >= studentCount) {
    return { label: "Tamamlandı", className: "badge-success" };
  }
  if (assessment.date < todayIsoDate()) {
    return { label: "Süresi Geçti", className: "badge-warning" };
  }
  return { label: "Aktif", className: "badge-neutral" };
}

export default function HomeworkPage({
  activeAssessmentId,
  assessmentRecordsDraft,
  assessments,
  classroomOptions,
  closeAssessmentEntry,
  curriculumOutcomes,
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
  const [openMenuId, setOpenMenuId] = useState(null);
  useCloseOnOutsideClick(openMenuId !== null, () => setOpenMenuId(null));
  const [homeworkSummaries, setHomeworkSummaries] = useState({});

  // Madde 6: bu sınıfta atanmış olduğun dersler dışındakiler burada da
  // görünmemeli.
  const lessons = useMemo(
    () => assignedLessonsForClassroom(teacherAssignments, Number(selectedClassroomId), allVisibleLessons),
    [teacherAssignments, selectedClassroomId, allVisibleLessons],
  );
  const lessonById = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons]);
  const outcomeById = useMemo(
    () => new Map(curriculumOutcomes.map((outcome) => [outcome.id, outcome])),
    [curriculumOutcomes],
  );
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

  useEffect(() => {
    let isCancelled = false;
    async function loadHomeworkSummaries() {
      if (!selectedClassroomId || !homeworkAssessments.length) {
        setHomeworkSummaries({});
        return;
      }
      const entries = await Promise.all(
        homeworkAssessments.map(async (assessment) => {
          const records = await api.listAssessmentRecords(assessment.id);
          const completedCount = records.filter((record) => record.is_completed).length;
          const scores = records
            .map((record) => (record.score === null || record.score === undefined ? null : Number(record.score)))
            .filter((score) => score !== null && !Number.isNaN(score));
          const averageScore = scores.length
            ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
            : null;
          return [assessment.id, { completedCount, averageScore }];
        }),
      );
      if (!isCancelled) setHomeworkSummaries(Object.fromEntries(entries));
    }
    loadHomeworkSummaries().catch(() => {
      if (!isCancelled) setHomeworkSummaries({});
    });
    return () => {
      isCancelled = true;
    };
  }, [homeworkAssessments, selectedClassroomId]);

  function openEditAssessment(assessment) {
    setEditingAssessment(assessment);
    setAssessmentEditForm({
      title: assessment.title,
      description: assessment.description || "",
      date: assessment.date,
      curriculum_outcome_id: assessment.curriculum_outcome_id ? String(assessment.curriculum_outcome_id) : "",
    });
    setActiveModal("editAssessment");
    setOpenMenuId(null);
  }

  return (
    <div className="wide-page homework-page">
      <section className="homework-header">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Ödevler</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Sınıf ve ders seçip ödev oluştur, ödev kontrolünde tüm sınıfın tamamlanma/puan durumunu tek seferde gir.
          </p>
        </div>
        <Button
          disabled={!selectedClassroomId}
          onClick={() => {
            setAssessmentForm((form) => ({
              ...form,
              classroom_id: selectedClassroomId ? String(selectedClassroomId) : "",
              lesson_id: "",
              curriculum_outcome_id: "",
              assessment_type: "odev",
              title: "",
              description: "",
              date: "",
            }));
            setActiveModal("newHomework");
          }}
          size="md"
          variant="primary"
        >
          <Icon name="assignment_add" /> Ödev Ekle
        </Button>
      </section>

      <section className="homework-toolbar" aria-label="Ödev filtreleri">
        <label htmlFor="homework-classroom">
          <span>Sınıf</span>
          <select
            className="filter-select"
            id="homework-classroom"
            onChange={(event) => {
              setSelectedClassroomId(event.target.value ? Number(event.target.value) : null);
              setLessonFilter("");
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
        <label htmlFor="homework-lesson">
          <span>Ders</span>
          <select
            className="filter-select"
            disabled={!selectedClassroomId}
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
        </label>
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
        <section className="homework-list-panel">
          <div className="homework-list-head">
            <div>
              <h2>Ödevler</h2>
              <p>Ödev teslim, eksik ve puan durumlarını hızlıca takip et.</p>
            </div>
            <span>{filteredHomeworks.length} kayıt</span>
          </div>
          <ul className="homework-list">
            {filteredHomeworks.map((assessment) => {
              const summary = homeworkSummaries[assessment.id] || { completedCount: 0, averageScore: null };
              const outcome = outcomeById.get(assessment.curriculum_outcome_id);
              const missingCount = Math.max(students.length - summary.completedCount, 0);
              const status = homeworkStatus(assessment, summary, students.length);
              return (
              <li className="homework-row" key={assessment.id}>
                <div className="homework-main">
                  <div className="homework-icon">
                    <Icon name="assignment" />
                  </div>
                  <div className="min-w-0">
                    <p className="homework-title">{assessment.title}</p>
                    <p className="homework-meta">
                      <span>{lessonById.get(assessment.lesson_id)?.name || "-"}</span>
                      <span>•</span>
                      <span>Teslim: {assessment.date}</span>
                      {outcome && (
                        <>
                          <span>•</span>
                          <span>{outcome.code || "Kazanım"} · {outcome.outcome_text}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="homework-stats">
                  <span><b>{summary.completedCount}</b> tamamlayan</span>
                  <span><b>{missingCount}</b> eksik</span>
                  <span><b>{summary.averageScore ?? "-"}</b> ort.</span>
                  <span className={`badge ${status.className}`}>{status.label}</span>
                </div>
                <div className="homework-actions">
                  <Button
                    aria-label={`${assessment.title} için ödev kontrolü`}
                    onClick={() => {
                      openAssessmentForEntry(assessment);
                      setOpenMenuId(null);
                    }}
                    size="sm"
                    variant="primary"
                  >
                    Ödev Kontrolü
                  </Button>
                  <div className="student-row-menu">
                    <button
                      aria-expanded={openMenuId === assessment.id}
                      aria-label={`${assessment.title} ödev işlemleri`}
                      className="student-row-menu-button"
                      onClick={() => setOpenMenuId((current) => (current === assessment.id ? null : assessment.id))}
                      type="button"
                    >
                      •••
                    </button>
                    {openMenuId === assessment.id && (
                      <div className="student-row-menu-popover">
                        <button onClick={() => openEditAssessment(assessment)} type="button">Düzenle</button>
                        <button
                          className="danger"
                          onClick={() => {
                            handleDeleteAssessment(assessment.id);
                            setOpenMenuId(null);
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
            );
            })}
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
