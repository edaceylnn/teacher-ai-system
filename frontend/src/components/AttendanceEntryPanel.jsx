import Button from "./Button";
import Icon from "./Icon";
import { attendanceLabels } from "../constants";
import { avatarToneFor, initialsOf } from "../utils/helpers";

const STATUS_OPTIONS = ["present", "absent", "excused"];

const STATUS_CLASS_NAMES = {
  present: "present",
  absent: "absent",
  excused: "excused",
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
  const progressPercent = students.length ? Math.round((markedCount / students.length) * 100) : 0;

  function updateStatus(studentId, status) {
    setAttendanceRecordsDraft((draft) => ({
      ...draft,
      [studentId]: { status },
    }));
  }

  function clearDraft() {
    setAttendanceRecordsDraft((draft) => {
      const next = { ...draft };
      students.forEach((student) => {
        next[student.id] = { status: null };
      });
      return next;
    });
  }

  return (
    <section className="attendance-entry-panel">
      <div className="attendance-entry-head">
        <div>
          <p className="font-label-md text-label-md uppercase tracking-wider text-secondary">Toplu Yoklama</p>
          <h2>{lessonName || "Ders"} — {activeSession.date}</h2>
          <div className="attendance-progress" aria-label={`${markedCount}/${students.length} öğrenci işaretlendi`}>
            <p>
              <span>{markedCount}/{students.length} öğrenci işaretlendi</span>
              <span>%{progressPercent}</span>
            </p>
            <div>
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="attendance-actions">
          <Button onClick={onMarkAllPresent} size="sm" variant="secondary">
            <Icon name="done_all" /> Tümünü Var İşaretle
          </Button>
          <Button onClick={clearDraft} size="sm" variant="secondary">
            <Icon name="backspace" /> Temizle
          </Button>
          <Button onClick={onClose} size="sm" variant="secondary">
            Vazgeç
          </Button>
          <Button disabled={isSavingAttendanceRecords} onClick={onSave} size="sm" variant="primary">
            <Icon name="save" /> {isSavingAttendanceRecords ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>
      {isLoadingAttendanceRecords ? (
        <p className="empty-note">Yükleniyor…</p>
      ) : (
        <ul className="attendance-roster-list">
          {students.map((student) => {
            const status = attendanceRecordsDraft[student.id]?.status || null;
            return (
              <li className="attendance-roster-row" key={student.id}>
                <div className="attendance-student-name">
                  <span className={`avatar-circle h-7 w-7 text-[11px] ${avatarToneFor(student.id)}`}>
                    {initialsOf(student.first_name, student.last_name)}
                  </span>
                  {student.first_name} {student.last_name}
                </div>
                <div className="attendance-segmented-control" role="group" aria-label={`${student.first_name} ${student.last_name} yoklama durumu`}>
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      className={`${STATUS_CLASS_NAMES[option]} ${status === option ? "selected" : ""}`}
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
