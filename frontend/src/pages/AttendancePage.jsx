import { useEffect, useMemo, useState } from "react";
import AttendanceEntryPanel from "../components/AttendanceEntryPanel";
import Icon from "../components/Icon";
import { assignedLessonsForClassroom } from "../utils/permissions";

function todayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function AttendancePage({
  activeAttendanceSession,
  attendanceRecordsDraft,
  classroomOptions,
  closeAttendanceSession,
  handleMarkAllPresent,
  handleSaveAttendanceRecords,
  isLoadingAttendanceRecords,
  isSavingAttendanceRecords,
  lessons: allVisibleLessons,
  openOrCreateAttendanceSession,
  selectedClassroomId,
  setAttendanceRecordsDraft,
  setSelectedClassroomId,
  students,
  teacherAssignments,
}) {
  const [lessonId, setLessonId] = useState("");
  const [date, setDate] = useState(() => todayIsoDate());

  // Madde 6: bu sınıfta atanmış olduğun dersler dışındakiler burada da
  // görünmemeli.
  const lessons = useMemo(
    () => assignedLessonsForClassroom(teacherAssignments, Number(selectedClassroomId), allVisibleLessons),
    [teacherAssignments, selectedClassroomId, allVisibleLessons],
  );
  const lessonById = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons]);

  // Ders Programı'ndaki hızlı işlem menüsü bir oturumu doğrudan açtığında
  // (bu sayfanın kendi state'ini set etmeden), üstteki filtre buradaki
  // gerçek oturumla senkron kalsın.
  useEffect(() => {
    if (!activeAttendanceSession) return;
    setLessonId(String(activeAttendanceSession.lesson_id));
    setDate(activeAttendanceSession.date);
  }, [activeAttendanceSession]);

  const canOpen = Boolean(selectedClassroomId && lessonId && date);

  function emptyStateMessage() {
    if (!selectedClassroomId) return "Başlamak için bir sınıf seç.";
    if (!lessonId) return "Yoklama açmak için bir ders seç.";
    return "Tarihi seçip \"Yoklama Aç\"a tıkla.";
  }

  return (
    <div className="wide-page">
      <section>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Devamsızlık</h1>
        <p className="mt-1 font-body-md text-body-md text-secondary">
          Sınıf, ders ve tarih seçip yoklama aç, sınıftaki tüm öğrencilerin durumunu tek seferde kaydet.
        </p>
      </section>

      <section className="card p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block font-label-md text-label-md text-secondary" htmlFor="attendance-classroom">
              Sınıf
            </label>
            <select
              className="filter-select"
              id="attendance-classroom"
              onChange={(event) => {
                setSelectedClassroomId(event.target.value ? Number(event.target.value) : null);
                setLessonId("");
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
          </div>
          <div>
            <label className="mb-1 block font-label-md text-label-md text-secondary" htmlFor="attendance-lesson">
              Ders
            </label>
            <select
              className="filter-select"
              id="attendance-lesson"
              onChange={(event) => setLessonId(event.target.value)}
              value={lessonId}
            >
              <option value="">Ders seç</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-label-md text-label-md text-secondary" htmlFor="attendance-date">
              Tarih
            </label>
            <input
              className="w-full"
              id="attendance-date"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </div>
        </div>
        <button
          className="primary-button mt-4"
          disabled={!canOpen}
          onClick={() =>
            openOrCreateAttendanceSession({
              classroomId: selectedClassroomId,
              lessonId: Number(lessonId),
              date,
            })
          }
          type="button"
        >
          <Icon name="fact_check" /> Yoklama Aç
        </button>
      </section>

      {!activeAttendanceSession && (
        <section className="card p-8">
          <p className="empty-note">{emptyStateMessage()}</p>
        </section>
      )}

      {activeAttendanceSession && (
        <AttendanceEntryPanel
          activeSession={activeAttendanceSession}
          attendanceRecordsDraft={attendanceRecordsDraft}
          isLoadingAttendanceRecords={isLoadingAttendanceRecords}
          isSavingAttendanceRecords={isSavingAttendanceRecords}
          lessonName={lessonById.get(activeAttendanceSession.lesson_id)?.name}
          onClose={closeAttendanceSession}
          onMarkAllPresent={handleMarkAllPresent}
          onSave={handleSaveAttendanceRecords}
          setAttendanceRecordsDraft={setAttendanceRecordsDraft}
          students={students}
        />
      )}
    </div>
  );
}
