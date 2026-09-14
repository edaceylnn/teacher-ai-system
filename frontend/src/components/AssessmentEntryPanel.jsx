import Icon from "./Icon";
import Toggle from "./Toggle";
import { avatarToneFor, initialsOf } from "../utils/helpers";

// Shared "bulk record entry" table for one Assessment — used by both Not
// Defteri (Toplu Sonuç Girişi) and Ödevler (Ödev Kontrolü) so the two
// screens read/write the exact same AssessmentRecord data through one UI.
export default function AssessmentEntryPanel({
  activeAssessment,
  assessmentRecordsDraft,
  gradeCategoryLabels,
  isLoadingAssessmentRecords,
  isSavingAssessmentRecords,
  lessonName,
  onClose,
  onSave,
  panelLabel,
  setAssessmentRecordsDraft,
  students,
}) {
  if (!activeAssessment) return null;

  const showCompletion = activeAssessment.assessment_type === "odev";
  const scoredCount = Object.values(assessmentRecordsDraft).filter((entry) =>
    showCompletion ? entry.is_completed : entry.score !== "",
  ).length;
  const progressPercent = students.length ? Math.round((scoredCount / students.length) * 100) : 0;

  function updateDraftScore(studentId, rawValue) {
    let score = rawValue;
    if (score !== "") {
      const numeric = Number(score);
      if (Number.isNaN(numeric)) return;
      score = String(Math.min(100, Math.max(0, numeric)));
    }
    setAssessmentRecordsDraft((draft) => ({
      ...draft,
      [studentId]: { ...(draft[studentId] || { score: "", is_completed: false }), score },
    }));
  }

  function updateDraftCompletion(studentId, isCompleted) {
    setAssessmentRecordsDraft((draft) => ({
      ...draft,
      [studentId]: { ...(draft[studentId] || { score: "", is_completed: false }), is_completed: isCompleted },
    }));
  }

  return (
    <section className="assessment-entry-panel">
      <div className="assessment-entry-head">
        <div>
          <p className="font-label-md text-label-md uppercase tracking-wider text-secondary">{panelLabel}</p>
          <h2 className="assessment-entry-title">
            {lessonName || "Ders"} — {activeAssessment.title}{" "}
            <span className="status-chip">{gradeCategoryLabels[activeAssessment.assessment_type]}</span>
          </h2>
          <div className="assessment-entry-progress" aria-label={`${scoredCount}/${students.length} işlendi`}>
            <p>
              <span>{activeAssessment.date}</span>
              <span>{scoredCount}/{students.length} işlendi</span>
            </p>
            <div>
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="row-actions">
          <button className="outline-button compact" onClick={onClose} type="button">
            Listeye Dön
          </button>
          <button
            className="primary-button compact"
            disabled={isSavingAssessmentRecords}
            onClick={onSave}
            type="button"
          >
            <Icon name="save" /> {isSavingAssessmentRecords ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
      {isLoadingAssessmentRecords ? (
        <p className="empty-note">Yükleniyor…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="assessment-entry-table w-full border-collapse text-left">
            <thead>
              <tr>
                <th>Öğrenci</th>
                <th className="text-right">Puan</th>
                {showCompletion && (
                  <th className="text-right">Ödev Durumu</th>
                )}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const draft = assessmentRecordsDraft[student.id] || { score: "", is_completed: false };
                return (
                  <tr key={student.id}>
                    <td>
                      <span className={`avatar-circle h-6 w-6 text-xs ${avatarToneFor(student.id)}`}>
                        {initialsOf(student.first_name, student.last_name)}
                      </span>
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="text-right">
                      <input
                        className="score-input"
                        max="100"
                        min="0"
                        onChange={(event) => updateDraftScore(student.id, event.target.value)}
                        step="0.1"
                        type="number"
                        value={draft.score}
                      />
                    </td>
                    {showCompletion && (
                      <td className="text-right">
                        <div className="assessment-completion-cell">
                          <span>{draft.is_completed ? "Tamamlandı" : "Eksik"}</span>
                          <Toggle
                            checked={draft.is_completed}
                            id={`completed-${student.id}`}
                            onChange={(checked) => updateDraftCompletion(student.id, checked)}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!students.length && <p className="empty-note">Bu sınıfta henüz öğrenci yok.</p>}
    </section>
  );
}
