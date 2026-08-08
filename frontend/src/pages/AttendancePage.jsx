import { useState, useMemo } from "react";
import { attendanceLabels, monthNames, weekDays } from "../constants";
import { buildMonthDays, formatLocalDate } from "../utils/helpers";
import Icon from "../components/Icon";
import PaginationControls from "../components/PaginationControls";
import StudentSearch from "../components/StudentSearch";

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
    <div className="wide-page attendance-page">
      <div className="attendance-title">
        <h1>Devamsızlık Takibi</h1>
      </div>

      <section className="attendance-calendar-layout">
        <div className="attendance-calendar-section">
          <section className="attendance-toolbar">
            <div className="attendance-student-picker">
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
            </div>
            <div className="attendance-toolbar-actions">
              <div className="calendar-controls">
                <button
                  aria-label="Önceki ay"
                  className="icon-action"
                  onClick={() => changeMonth(-1)}
                  type="button"
                >
                  <Icon name="chevron_left" />
                </button>
                <strong>
                  {monthNames[visibleMonth.getMonth()]}{" "}
                  {visibleMonth.getFullYear()}
                </strong>
                <button
                  aria-label="Sonraki ay"
                  className="icon-action"
                  onClick={() => changeMonth(1)}
                  type="button"
                >
                  <Icon name="chevron_right" />
                </button>
              </div>
            </div>
          </section>

          <div className="attendance-calendar-card">
            <div className="calendar-weekdays">
              {weekDays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((date, index) =>
                date ? (
                  <button
                    className={
                      attendanceByDate.has(formatLocalDate(date))
                        ? `calendar-day ${attendanceByDate.get(formatLocalDate(date)).status}`
                        : "calendar-day"
                    }
                    key={formatLocalDate(date)}
                    onClick={() => handleCalendarDayClick(date)}
                    type="button"
                  >
                    <span>{date.getDate()}</span>
                    {attendanceByDate.has(formatLocalDate(date)) && (
                      <strong>
                        {
                          attendanceLabels[
                            attendanceByDate.get(formatLocalDate(date)).status
                          ]
                        }
                      </strong>
                    )}
                  </button>
                ) : (
                  <div className="calendar-day empty" key={`empty-${index}`} />
                ),
              )}
            </div>
          </div>
        </div>

        <aside className="attendance-summary-card">
          <h2>
            {selectedStudent
              ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
              : "Öğrenci seç"}
          </h2>
          <div className="attendance-summary-list">
            <span>Var: {profile?.attendance_summary?.present || 0}</span>
            <span>Yok: {profile?.attendance_summary?.absent || 0}</span>
            <span>Mazeretli: {profile?.attendance_summary?.excused || 0}</span>
            <span>Toplam: {profile?.attendance_summary?.total || 0}</span>
            <span>Devam Oranı: {attendanceRate}</span>
          </div>
        </aside>
      </section>

      <section className="student-table-card attendance-record-card">
        <div className="record-head">
          <span>Seçili Öğrenci Devamsızlıkları</span>
          <span>Tarih</span>
          <span>Durum</span>
          <span>İşlem</span>
        </div>
        {attendanceRecordPage.items.map((attendance) => (
          <div className="record-row" key={attendance.id}>
            <strong>
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
            {selectedStudent
              ? "Henüz devamsızlık kaydı yok."
              : "Öğrenci seçilmedi."}
          </p>
        )}
      </section>
      <PaginationControls
        limit={attendanceRecordPage.limit}
        offset={attendanceRecordOffset}
        setOffset={setAttendanceRecordOffset}
        total={attendanceRecordPage.total}
      />
    </div>
  );
}
