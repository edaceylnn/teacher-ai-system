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
    <section className="card overflow-hidden">
      <div className="section-heading flex-wrap gap-3 border-b border-outline-variant bg-surface-bright p-5">
        <div>
          <p className="font-label-md text-label-md uppercase tracking-wider text-secondary">{panelLabel}</p>
          <h2>
            {lessonName || "Ders"} — {activeAssessment.title}{" "}
            <span className="status-chip">{gradeCategoryLabels[activeAssessment.assessment_type]}</span>
          </h2>
          <p className="section-subtext">
            {activeAssessment.date} · {scoredCount}/{students.length} işlendi
          </p>
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
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-low font-label-md text-label-md uppercase tracking-wider text-secondary">
              <tr>
                <th className="border-b border-outline-variant p-4">Öğrenci</th>
                <th className="border-b border-outline-variant p-4 text-right">Puan</th>
                {showCompletion && (
                  <th className="border-b border-outline-variant p-4 text-right">Tamamlandı</th>
                )}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const draft = assessmentRecordsDraft[student.id] || { score: "", is_completed: false };
                return (
                  <tr className="border-b border-outline-variant/50" key={student.id}>
                    <td className="flex items-center gap-2 p-4 font-body-md text-body-md font-medium text-on-surface">
                      <span className={`avatar-circle h-6 w-6 text-xs ${avatarToneFor(student.id)}`}>
                        {initialsOf(student.first_name, student.last_name)}
                      </span>
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="p-4 text-right">
                      <input
                        className="w-24 text-right"
                        max="100"
                        min="0"
                        onChange={(event) => updateDraftScore(student.id, event.target.value)}
                        step="0.1"
                        type="number"
                        value={draft.score}
                      />
                    </td>
                    {showCompletion && (
                      <td className="p-4 text-right">
                        <div className="flex justify-end">
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
