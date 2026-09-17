import { useEffect, useMemo, useState } from "react";
import AttendanceEntryPanel from "../components/AttendanceEntryPanel";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
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

  function emptyStateCopy() {
    if (!selectedClassroomId) {
      return {
        icon: "school",
        title: "Yoklama başlatmaya hazır",
        text: "Önce bir sınıf seç; ardından ders ve tarih bilgisiyle tüm sınıfın yoklamasını tek ekranda girebilirsin.",
      };
    }
    if (!lessonId) {
      return {
        icon: "menu_book",
        title: "Ders seçimi bekleniyor",
        text: "Yoklama kayıtlarını ders bazında izlemek için sınıfa atanmış bir ders seç.",
      };
    }
    return {
      icon: "fact_check",
      title: "Yoklama açılabilir",
      text: "Seçili tarih için yoklama oturumunu açıp öğrencilerin durumunu hızlıca kaydedebilirsin.",
    };
  }

  return (
    <div className="wide-page attendance-page">
      <section className="attendance-header">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Devamsızlık</h1>
        <p className="mt-1 font-body-md text-body-md text-secondary">
          Sınıf, ders ve tarih seçip yoklama aç, sınıftaki tüm öğrencilerin durumunu tek seferde kaydet.
        </p>
      </section>

      <section className="attendance-toolbar" aria-label="Yoklama filtreleri">
        <label htmlFor="attendance-classroom">
          <span>Sınıf</span>
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
        </label>
        <label htmlFor="attendance-lesson">
          <span>Ders</span>
          <select
            className="filter-select"
            disabled={!selectedClassroomId}
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
        </label>
        <label htmlFor="attendance-date">
          <span>Tarih</span>
          <input
            id="attendance-date"
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </label>
        <Button
          disabled={!canOpen}
          onClick={() =>
            openOrCreateAttendanceSession({
              classroomId: selectedClassroomId,
              lessonId: Number(lessonId),
              date,
            })
          }
          size="sm"
          variant="primary"
        >
          <Icon name="fact_check" /> Yoklama Aç
        </Button>
      </section>

      {!activeAttendanceSession && (
        <section className="card">
          <EmptyState {...emptyStateCopy()} />
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
