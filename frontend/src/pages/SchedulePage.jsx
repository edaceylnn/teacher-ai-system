import { useMemo, useState } from "react";
import { lessonSlots, schoolWeekDays } from "../constants";
import { buildScheduleTimeBounds, minutesToTime, timeToMinutes } from "../utils/helpers";
import Icon from "../components/Icon";

const PX_PER_HOUR = 80;
const PX_PER_MINUTE = PX_PER_HOUR / 60;
const EVENT_TONES = [
  "border-primary-fixed-dim bg-primary-fixed text-on-primary-fixed",
  "border-secondary-fixed-dim bg-secondary-fixed text-on-secondary-fixed",
];
const PERIODS = lessonSlots.filter((slot) => slot.part !== "break");

function nearestPeriodAt(clickedMinute) {
  return PERIODS.reduce((closest, slot) => {
    const distance = Math.abs(timeToMinutes(slot.start) - clickedMinute);
    const closestDistance = Math.abs(timeToMinutes(closest.start) - clickedMinute);
    return distance < closestDistance ? slot : closest;
  }, PERIODS[0]);
}

export default function SchedulePage({
  classrooms,
  handleDeleteScheduleEntry,
  lessons,
  handleMoveScheduleEntry,
  scheduleEntries,
  setActiveModal,
  setEditingScheduleEntry,
  setScheduleForm,
}) {
  const [draggingEntryId, setDraggingEntryId] = useState(null);
  const [dragOverWeekday, setDragOverWeekday] = useState(null);
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  const lessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons],
  );
  const { startMinutes, endMinutes } = useMemo(
    () => buildScheduleTimeBounds(scheduleEntries, lessonSlots),
    [scheduleEntries],
  );
  const totalHeight = (endMinutes - startMinutes) * PX_PER_MINUTE;
  // Gutter marks follow the real ders/teneffüs boundaries (not round hours),
  // so the axis reads e.g. 08:30, 09:10, 09:25… matching the period grid.
  const timeMarks = useMemo(() => {
    const times = new Set([startMinutes, endMinutes]);
    lessonSlots.forEach((slot) => {
      times.add(timeToMinutes(slot.start));
      times.add(timeToMinutes(slot.end));
    });
    return Array.from(times)
      .filter((minute) => minute >= startMinutes && minute <= endMinutes)
      .sort((a, b) => a - b);
  }, [startMinutes, endMinutes]);
  const lessonStartMinutes = useMemo(
    () => new Set(PERIODS.map((slot) => timeToMinutes(slot.start))),
    [],
  );
  const breakBands = lessonSlots.filter((slot) => slot.part === "break");
  const entriesByWeekday = useMemo(() => {
    const grouped = new Map();
    scheduleEntries.forEach((entry) => {
      const list = grouped.get(entry.weekday) || [];
      list.push(entry);
      grouped.set(entry.weekday, list);
    });
    return grouped;
  }, [scheduleEntries]);

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

  function openSlotAt(weekday, offsetY) {
    const clickedMinute = startMinutes + offsetY / PX_PER_MINUTE;
    const nearestPeriod = nearestPeriodAt(clickedMinute);
    setScheduleForm({
      classroom_id: "",
      lesson_id: "",
      weekday: String(weekday),
      start_time: nearestPeriod?.start || "",
      end_time: nearestPeriod?.end || "",
      location: "",
    });
    setActiveModal("schedule");
  }

  function handleDropOnDay(event, weekday) {
    event.preventDefault();
    setDragOverWeekday(null);
    const entryId = Number(event.dataTransfer.getData("text/plain"));
    const entry = scheduleEntries.find((item) => item.id === entryId);
    if (!entry || !handleMoveScheduleEntry) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickedMinute = startMinutes + (event.clientY - rect.top) / PX_PER_MINUTE;
    const nearestPeriod = nearestPeriodAt(clickedMinute);
    if (
      entry.weekday === weekday &&
      entry.start_time.slice(0, 5) === nearestPeriod.start &&
      entry.end_time.slice(0, 5) === nearestPeriod.end
    ) {
      return;
    }

    handleMoveScheduleEntry(entry, {
      weekday,
      start_time: nearestPeriod.start,
      end_time: nearestPeriod.end,
    });
  }

  return (
    <div className="wide-page">
      <section className="hero-card">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Ders Programı</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Haftalık ders akışını sınıf, ders, saat ve derslik bazında takip et. Bir dersi başka bir
            gün/saate taşımak için sürükleyip bırakabilirsin.
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

      <section className="card flex flex-col overflow-hidden">
        <div
          className="grid border-b border-outline-variant bg-surface-container-lowest"
          style={{ gridTemplateColumns: `80px repeat(${schoolWeekDays.length}, 1fr)` }}
        >
          <div className="flex items-end justify-end p-3 font-mono-sm text-mono-sm text-secondary">GMT+3</div>
          {schoolWeekDays.map((day) => (
            <div className="flex flex-col items-center justify-center border-l border-outline-variant p-3" key={day}>
              <span className="font-label-md text-label-md uppercase text-secondary">{day}</span>
            </div>
          ))}
        </div>

        <div className="relative overflow-y-auto bg-surface-container-lowest" style={{ height: Math.min(totalHeight, 560) }}>
          <div className="relative" style={{ height: totalHeight }}>
            {/* Ders/teneffüs gridlines — one tick per period or break
                boundary (not round hours), so the axis reads the real school
                timetable (08:30, 09:10, 09:25…). 0-height rows with a top
                border keep the line exactly at the calculated offset; the
                time label is a separately positioned, vertically-centered
                overlay so its own line-height can't push the line out of
                place. */}
            <div className="pointer-events-none absolute inset-0 z-0">
              {timeMarks.map((minute) => {
                const isLessonBoundary = lessonStartMinutes.has(minute);
                // The first/last marks sit exactly at the grid's top/bottom
                // edge — centering their label on the line would push half
                // of the text outside the scroll container and clip it, so
                // those two are aligned to sit fully inside instead.
                const labelAlignClass =
                  minute === startMinutes
                    ? "top-0"
                    : minute === endMinutes
                      ? "bottom-0"
                      : "top-0 -translate-y-1/2";
                return (
                  <div
                    className={`absolute left-0 right-0 border-t ${isLessonBoundary ? "border-outline-variant" : "border-outline-variant/40"}`}
                    key={minute}
                    style={{ top: (minute - startMinutes) * PX_PER_MINUTE }}
                  >
                    <span
                      className={`absolute left-0 w-[80px] ${labelAlignClass} pr-2 text-right font-mono-sm text-mono-sm ${
                        isLessonBoundary ? "font-semibold text-on-surface" : "text-secondary"
                      }`}
                    >
                      {minutesToTime(minute)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Break bands */}
            <div className="pointer-events-none absolute inset-0 z-[5]">
              {breakBands.map((slot) => {
                const top = (timeToMinutes(slot.start) - startMinutes) * PX_PER_MINUTE;
                const height = (timeToMinutes(slot.end) - timeToMinutes(slot.start)) * PX_PER_MINUTE;
                return (
                  <div
                    className="absolute left-[80px] right-0 flex items-center justify-center bg-surface-variant/50 font-label-md text-label-md uppercase tracking-widest text-secondary"
                    key={slot.start}
                    style={{ top, height }}
                  >
                    {slot.period}
                  </div>
                );
              })}
            </div>

            {/* Day columns */}
            <div
              className="absolute inset-0 z-10 grid"
              style={{ gridTemplateColumns: `80px repeat(${schoolWeekDays.length}, 1fr)` }}
            >
              <div />
              {schoolWeekDays.map((day, weekday) => (
                <div
                  className={`relative border-l border-outline-variant transition-colors ${
                    dragOverWeekday === weekday ? "bg-primary/5" : ""
                  }`}
                  key={day}
                  onClick={(event) => {
                    if (event.target !== event.currentTarget) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    openSlotAt(weekday, event.clientY - rect.top);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (dragOverWeekday !== weekday) setDragOverWeekday(weekday);
                  }}
                  onDragLeave={() => setDragOverWeekday((current) => (current === weekday ? null : current))}
                  onDrop={(event) => handleDropOnDay(event, weekday)}
                >
                  {(entriesByWeekday.get(weekday) || []).map((entry, index) => {
                    const entryStart = timeToMinutes(entry.start_time.slice(0, 5));
                    const entryEnd = timeToMinutes(entry.end_time.slice(0, 5));
                    return (
                      <div
                        className={`group absolute left-1 right-1 flex cursor-grab flex-col justify-center gap-px overflow-hidden rounded-md border px-2 py-1 shadow-sm transition-colors active:cursor-grabbing ${EVENT_TONES[index % EVENT_TONES.length]} ${
                          draggingEntryId === entry.id ? "opacity-40" : ""
                        }`}
                        draggable
                        key={entry.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          openEntry(entry);
                        }}
                        onDragEnd={() => setDraggingEntryId(null)}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", String(entry.id));
                          event.dataTransfer.effectAllowed = "move";
                          setDraggingEntryId(entry.id);
                        }}
                        style={{
                          top: (entryStart - startMinutes) * PX_PER_MINUTE + 2,
                          height: Math.max((entryEnd - entryStart) * PX_PER_MINUTE - 4, 44),
                        }}
                      >
                        <button
                          aria-label="Ders programı kaydını sil"
                          className="absolute right-1 top-1 hidden items-center rounded bg-black/10 p-0.5 text-current hover:text-error group-hover:flex"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            handleDeleteScheduleEntry(entry.id);
                          }}
                          type="button"
                        >
                          <Icon name="delete" className="text-[13px]" />
                        </button>
                        <span className="truncate pr-4 font-label-md text-label-md font-bold leading-tight">
                          {lessonById.get(entry.lesson_id)?.name || "Ders"}
                        </span>
                        <span className="truncate font-mono-sm text-mono-sm leading-tight opacity-80">
                          {classroomById.get(entry.classroom_id)?.name || "Sınıf"}
                        </span>
                        <span className="flex items-center gap-1 truncate font-mono-sm text-mono-sm leading-tight opacity-80">
                          <Icon name="room" className="shrink-0 text-[12px]" /> {entry.location || "Derslik yok"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
