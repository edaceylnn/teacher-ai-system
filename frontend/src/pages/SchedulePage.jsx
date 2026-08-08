import { useMemo } from "react";
import { lessonSlots, schoolWeekDays } from "../constants";
import Icon from "../components/Icon";
import ScheduleSlotRow from "../components/ScheduleSlotRow";

export default function SchedulePage({
  classrooms,
  handleDeleteScheduleEntry,
  lessons,
  scheduleEntries,
  setActiveModal,
  setEditingScheduleEntry,
  setScheduleForm,
}) {
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  const lessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons],
  );
  const entryBySlot = useMemo(() => {
    const next = new Map();
    scheduleEntries.forEach((entry) => {
      next.set(
        `${entry.weekday}:${entry.start_time.slice(0, 5)}:${entry.end_time.slice(0, 5)}`,
        entry,
      );
    });
    return next;
  }, [scheduleEntries]);

  function openSlot(slot, weekday) {
    setScheduleForm({
      classroom_id: "",
      lesson_id: "",
      weekday: String(weekday),
      start_time: slot.start,
      end_time: slot.end,
      location: "",
    });
    setActiveModal("schedule");
  }

  function openEntry(entry) {
    setEditingScheduleEntry(entry);
    setScheduleForm({
      classroom_id: String(entry.classroom_id),
      lesson_id: String(entry.lesson_id),
      weekday: String(entry.weekday),
      start_time: entry.start_time.slice(0, 5),
      end_time: entry.end_time.slice(0, 5),
      location: entry.location || "",
    });
    setActiveModal("editSchedule");
  }

  return (
    <div className="wide-page">
      <section className="hero-card">
        <div>
          <h1>Ders Programı</h1>
          <p>
            Haftalık ders akışını sınıf, ders, saat ve derslik bazında takip et.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setScheduleForm({
              classroom_id: "",
              lesson_id: "",
              weekday: "0",
              start_time: "",
              end_time: "",
              location: "",
            });
            setActiveModal("schedule");
          }}
          type="button"
        >
          <Icon name="add" /> Ders Ekle
        </button>
      </section>

      <section className="school-schedule-card">
        <div className="school-schedule-grid">
          <div className="schedule-grid-head time-head">Saat</div>
          {schoolWeekDays.map((day) => (
            <div className="schedule-grid-head" key={day}>
              {day}
            </div>
          ))}
          {lessonSlots.map((slot) =>
            slot.part === "break" ? (
              <div className="schedule-break-row" key={slot.period}>
                <span>{slot.period}</span>
                <strong>
                  {slot.start} - {slot.end}
                </strong>
              </div>
            ) : (
              <ScheduleSlotRow
                classroomById={classroomById}
                entryBySlot={entryBySlot}
                handleDeleteScheduleEntry={handleDeleteScheduleEntry}
                key={slot.period}
                lessonById={lessonById}
                onOpenEntry={openEntry}
                onOpenSlot={openSlot}
                slot={slot}
              />
            ),
          )}
        </div>
      </section>
    </div>
  );
}
