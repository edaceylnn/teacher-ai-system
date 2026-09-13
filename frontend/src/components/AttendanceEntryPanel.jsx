import Icon from "./Icon";
import { attendanceLabels } from "../constants";
import { avatarToneFor, initialsOf } from "../utils/helpers";

const STATUS_OPTIONS = ["present", "absent", "excused"];

const STATUS_BUTTON_CLASSES = {
  present: "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-600 dark:bg-emerald-600",
  absent: "border-error bg-error text-white",
  excused: "border-amber-500 bg-amber-500 text-white dark:border-amber-600 dark:bg-amber-600",
};

// Şu anki toplu yoklama oturumu için sınıf rosterini gösteren, tekrar
// kullanılabilir panel — Devamsızlık ekranı (ve ileride Ders Programı'ndaki
// "Yoklama Al" hızlı işlemi) aynı bileşeni kullanır.
export default function AttendanceEntryPanel({
  activeSession,
  attendanceRecordsDraft,
  isLoadingAttendanceRecords,
  isSavingAttendanceRecords,
  lessonName,
  onClose,
  onMarkAllPresent,
  onSave,
  setAttendanceRecordsDraft,
  students,
}) {
  if (!activeSession) return null;

  const markedCount = students.filter((student) => attendanceRecordsDraft[student.id]?.status).length;

  function updateStatus(studentId, status) {
    setAttendanceRecordsDraft((draft) => ({
      ...draft,
      [studentId]: { status },
    }));
  }

  return (
    <section className="card overflow-hidden">
      <div className="section-heading flex-wrap gap-3 border-b border-outline-variant bg-surface-bright p-5">
        <div>
          <p className="font-label-md text-label-md uppercase tracking-wider text-secondary">Toplu Yoklama</p>
          <h2>{lessonName || "Ders"} — {activeSession.date}</h2>
          <p className="section-subtext">
            {markedCount}/{students.length} öğrenci işaretlendi
          </p>
        </div>
        <div className="row-actions">
          <button className="outline-button compact" onClick={onMarkAllPresent} type="button">
            <Icon name="done_all" /> Tümünü Var İşaretle
          </button>
          <button className="outline-button compact" onClick={onClose} type="button">
            Kapat
          </button>
          <button
            className="primary-button compact"
            disabled={isSavingAttendanceRecords}
            onClick={onSave}
            type="button"
          >
            <Icon name="save" /> {isSavingAttendanceRecords ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
      {isLoadingAttendanceRecords ? (
        <p className="empty-note">Yükleniyor…</p>
      ) : (
        <ul className="divide-y divide-outline-variant/50">
          {students.map((student) => {
            const status = attendanceRecordsDraft[student.id]?.status || null;
            return (
              <li className="flex items-center justify-between gap-4 p-4" key={student.id}>
                <div className="flex items-center gap-2 font-body-md text-body-md font-medium text-on-surface">
                  <span className={`avatar-circle h-6 w-6 text-xs ${avatarToneFor(student.id)}`}>
                    {initialsOf(student.first_name, student.last_name)}
                  </span>
                  {student.first_name} {student.last_name}
                </div>
                <div className="flex items-center gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      className={`rounded-full border px-3 py-1.5 font-label-md text-label-md transition-colors ${
                        status === option
                          ? STATUS_BUTTON_CLASSES[option]
                          : "border-outline-variant text-secondary hover:bg-surface-container-low"
                      }`}
                      key={option}
                      onClick={() => updateStatus(student.id, option)}
                      type="button"
                    >
                      {attendanceLabels[option]}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!students.length && <p className="empty-note">Bu sınıfta henüz öğrenci yok.</p>}
    </section>
  );
}
