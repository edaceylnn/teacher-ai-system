import { useState, useMemo } from "react";
import { attendanceLabels, monthNames, weekDays } from "../constants";
import { buildMonthDays, formatLocalDate } from "../utils/helpers";
import Icon from "../components/Icon";
import PaginationControls from "../components/PaginationControls";
import StudentSearch from "../components/StudentSearch";

const STATUS_DAY_CLASSES = {
  present: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950",
  absent: "border-error/40 bg-error/5",
  excused: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
};

export default function AttendancePage({
  attendanceRecordOffset,
  attendanceRecordPage,
  attendanceRate,
  filteredStudents,
  handleDeleteAttendance,
  isStudentPickerOpen,
  profile,
  searchTerm,
  selectedStudent,
  selectedStudentId,
  setActiveModal,
  setAttendanceEditForm,
  setAttendanceRecordOffset,
  setEditingAttendance,
  setAttendanceForm,
  setIsStudentPickerOpen,
  setSearchTerm,
  setSelectedStudentId,
}) {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const attendanceByDate = useMemo(
    () =>
      new Map(
        (profile?.attendance_records || []).map((attendance) => [
          attendance.date,
          attendance,
        ]),
      ),
    [profile],
  );
  const calendarDays = useMemo(
    () => buildMonthDays(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );

  function changeMonth(direction) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  function handleCalendarDayClick(date) {
    const dateValue = formatLocalDate(date);
    const attendance = attendanceByDate.get(dateValue);

    if (attendance) {
      setEditingAttendance(attendance);
      setAttendanceEditForm({
        date: attendance.date,
        status: attendance.status,
      });
      setActiveModal("editAttendance");
      return;
    }

    setAttendanceForm({
      student_id: selectedStudentId ? String(selectedStudentId) : "",
      date: dateValue,
      status: "present",
    });
    setActiveModal("attendance");
  }

  return (
    <div className="wide-page">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Devamsızlık Takibi</h1>
        <p className="mt-1 font-body-md text-body-md text-secondary">
          Öğrenci devamsızlıklarını takvim üzerinden gir ve takip et.
        </p>
      </div>

      <div className="flex flex-col gap-card-gap lg:flex-row">
        <div className="flex flex-1 flex-col gap-card-gap">
          <section className="card flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <StudentSearch
                filteredStudents={filteredStudents}
                isStudentPickerOpen={isStudentPickerOpen}
                searchTerm={searchTerm}
                selectedStudent={selectedStudent}
                selectedStudentId={selectedStudentId}
                setIsStudentPickerOpen={setIsStudentPickerOpen}
                setSearchTerm={setSearchTerm}
                setSelectedStudentId={setSelectedStudentId}
              />
              <div className="flex items-center gap-2">
                <button
                  aria-label="Önceki ay"
                  className="icon-action border border-outline-variant"
                  onClick={() => changeMonth(-1)}
                  type="button"
                >
                  <Icon name="chevron_left" />
                </button>
                <strong className="font-headline-md text-headline-md text-on-surface">
                  {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
                </strong>
                <button
                  aria-label="Sonraki ay"
                  className="icon-action border border-outline-variant"
                  onClick={() => changeMonth(1)}
                  type="button"
                >
                  <Icon name="chevron_right" />
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-outline-variant">
              <div className="grid grid-cols-7 gap-px bg-outline-variant">
                {weekDays.map((day) => (
                  <div className="bg-surface-container-low py-2 text-center font-label-md text-label-md text-secondary" key={day}>
                    {day}
                  </div>
                ))}
                {calendarDays.map((date, index) =>
                  date ? (
                    <button
                      className={`flex h-24 flex-col items-start justify-start gap-1 bg-surface p-2 text-left transition-colors hover:bg-surface-container-low ${
                        attendanceByDate.has(formatLocalDate(date))
                          ? `border ${STATUS_DAY_CLASSES[attendanceByDate.get(formatLocalDate(date)).status]}`
                          : ""
                      }`}
                      key={formatLocalDate(date)}
                      onClick={() => handleCalendarDayClick(date)}
                      type="button"
                    >
                      <span className="font-label-md text-label-md text-on-surface">{date.getDate()}</span>
                      {attendanceByDate.has(formatLocalDate(date)) && (
                        <strong className="mt-auto font-label-md text-label-md text-on-surface">
                          {attendanceLabels[attendanceByDate.get(formatLocalDate(date)).status]}
                        </strong>
                      )}
                    </button>
                  ) : (
                    <div className="h-24 bg-surface-container-low/40" key={`empty-${index}`} />
                  ),
                )}
              </div>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3 font-label-md text-label-md uppercase tracking-wider text-secondary">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4">
                <span>Seçili Öğrenci Devamsızlıkları</span>
                <span>Tarih</span>
                <span>Durum</span>
                <span>İşlem</span>
              </div>
            </div>
            {attendanceRecordPage.items.map((attendance) => (
              <div
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-outline-variant px-4 py-3 font-body-md text-body-md text-on-surface last:border-b-0"
                key={attendance.id}
              >
                <strong className="font-medium">
                  {selectedStudent
                    ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                    : "Öğrenci"}
                </strong>
                <span>{attendance.date}</span>
                <span>{attendanceLabels[attendance.status]}</span>
                <span className="row-actions">
                  <button
                    aria-label={`${attendance.date} devamsızlık kaydını düzenle`}
                    className="icon-action"
                    onClick={() => {
                      setEditingAttendance(attendance);
                      setAttendanceEditForm({
                        date: attendance.date,
                        status: attendance.status,
                      });
                      setActiveModal("editAttendance");
                    }}
                    type="button"
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    aria-label={`${attendance.date} devamsızlık kaydını sil`}
                    className="icon-action danger-action"
                    onClick={() => handleDeleteAttendance(attendance.id)}
                    type="button"
                  >
                    <Icon name="delete" />
                  </button>
                </span>
              </div>
            ))}
            {!attendanceRecordPage.items.length && (
              <p className="empty-note">
                {selectedStudent ? "Henüz devamsızlık kaydı yok." : "Öğrenci seçilmedi."}
              </p>
            )}
            <PaginationControls
              limit={attendanceRecordPage.limit}
              offset={attendanceRecordOffset}
              setOffset={setAttendanceRecordOffset}
              total={attendanceRecordPage.total}
            />
          </section>
        </div>

        <aside className="card h-fit w-full p-6 lg:w-[320px] lg:shrink-0">
          <h2 className="mb-4 font-headline-md text-headline-md text-on-surface">
            {selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : "Öğrenci seç"}
          </h2>
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-4">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-secondary">Var</span>
                <span className="font-headline-md text-[20px] text-on-surface">
                  {profile?.attendance_summary?.present || 0}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-4">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-secondary">Yok</span>
                <span className="font-headline-md text-[20px] text-error">
                  {profile?.attendance_summary?.absent || 0}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low p-4">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-secondary">Mazeretli</span>
                <span className="font-headline-md text-[20px] text-amber-600 dark:text-amber-400">
                  {profile?.attendance_summary?.excused || 0}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-outline-variant pt-3">
              <span className="font-label-md text-label-md text-secondary">Toplam</span>
              <span className="font-body-md text-body-md text-on-surface">
                {profile?.attendance_summary?.total || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-secondary">Devam Oranı</span>
              <span className="font-body-md text-body-md font-medium text-on-surface">{attendanceRate}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
