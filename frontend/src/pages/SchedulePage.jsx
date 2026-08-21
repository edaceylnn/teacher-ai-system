import { useMemo, useState } from "react";
import { schoolWeekDays } from "../constants";
import { buildScheduleTimeBounds, minutesToTime, timeToMinutes } from "../utils/helpers";
import Icon from "../components/Icon";

// 120px/hour (2px/min) so a standard 40-minute lesson renders ~76px tall —
// enough for the 3-line card (name/classroom/location) to breathe. At the
// old 80px/hour a 40-minute block was only ~49px, too short for that text.
const PX_PER_HOUR = 120;
const PX_PER_MINUTE = PX_PER_HOUR / 60;
// Keep in sync with the `w-[80px]`/`left-[80px]` Tailwind arbitrary values
// below — those are static classes (Tailwind can't read a JS constant), this
// is the same width used in inline styles (grid columns, min-width).
const GUTTER_WIDTH = 80;
const DAY_COLUMN_MIN_WIDTH = 140;
const GRID_MIN_WIDTH = GUTTER_WIDTH + schoolWeekDays.length * DAY_COLUMN_MIN_WIDTH;
const EVENT_TONES = [
  "border-primary-fixed-dim bg-primary-fixed text-on-primary-fixed",
  "border-secondary-fixed-dim bg-secondary-fixed text-on-secondary-fixed",
];

function nearestPeriodAt(periods, clickedMinute) {
  return periods.reduce((closest, slot) => {
    const distance = Math.abs(timeToMinutes(slot.start) - clickedMinute);
    const closestDistance = Math.abs(timeToMinutes(closest.start) - clickedMinute);
    return distance < closestDistance ? slot : closest;
  }, periods[0]);
}

export default function SchedulePage({
  classrooms,
  handleDeleteScheduleEntry,
  lessonSlots,
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
  // Ders Programı's timetable is entirely derived from Ayarlar → Ders
  // Saatleri (lessonSlots, computed by App.jsx from schoolScheduleSettings) —
  // this page never hard-codes period times itself.
  const periods = useMemo(() => lessonSlots.filter((slot) => slot.part !== "break"), [lessonSlots]);
  const { startMinutes, endMinutes } = useMemo(
    () => buildScheduleTimeBounds(scheduleEntries, lessonSlots),
    [scheduleEntries, lessonSlots],
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
  }, [startMinutes, endMinutes, lessonSlots]);
  const lessonStartMinutes = useMemo(
    () => new Set(periods.map((slot) => timeToMinutes(slot.start))),
    [periods],
  );
  const breakBands = useMemo(() => lessonSlots.filter((slot) => slot.part === "break"), [lessonSlots]);
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
    const nearestPeriod = nearestPeriodAt(periods, clickedMinute);
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
    const nearestPeriod = nearestPeriodAt(periods, clickedMinute);
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
        {/* Horizontal scroll wrapper: below GRID_MIN_WIDTH the grid keeps its
            per-day minimum instead of squeezing columns/cards illegible. */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: GRID_MIN_WIDTH }}>
            <div
              className="grid border-b border-outline-variant/70 bg-surface-container-lowest"
              style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${schoolWeekDays.length}, 1fr)` }}
            >
              <div className="flex items-end justify-end p-3 font-mono-sm text-mono-sm text-secondary">GMT+3</div>
              {schoolWeekDays.map((day) => (
                <div className="flex flex-col items-center justify-center border-l border-outline-variant/60 p-3" key={day}>
                  <span className="font-label-md text-label-md uppercase text-secondary">{day}</span>
                </div>
              ))}
            </div>

            <div className="relative overflow-y-auto bg-surface-container-lowest" style={{ height: Math.min(totalHeight, 560) }}>
              <div className="relative" style={{ height: totalHeight }}>
                {/* Time gutter — its own layer, fully separate from the grid
                    lines. Labels never sit on top of a line: the line only
                    spans the day columns (left-[80px] onward), the gutter
                    background covers 0..80px and nothing else is drawn there. */}
                <div className="pointer-events-none absolute inset-0 z-0">
                  <div className="absolute bottom-0 left-0 top-0 w-[80px] bg-surface-container-low/60" />
                  {timeMarks.map((minute) => {
                    const isLessonBoundary = lessonStartMinutes.has(minute);
                    const top = (minute - startMinutes) * PX_PER_MINUTE;
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
                      <div key={minute}>
                        <div
                          className={`absolute left-[80px] right-0 border-t ${isLessonBoundary ? "border-outline-variant/70" : "border-outline-variant/30"}`}
                          style={{ top }}
                        />
                        <span
                          className={`absolute left-0 w-[80px] ${labelAlignClass} pr-2 text-right font-mono-sm text-mono-sm text-secondary`}
                          style={{ top }}
                        >
                          {minutesToTime(minute)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Break bands — span the full Pazartesi–Cuma width (never a
                    single day's column) since teneffüs/öğle arası applies to
                    the whole week at once. */}
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
                  style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${schoolWeekDays.length}, 1fr)` }}
                >
                  <div />
                  {schoolWeekDays.map((day, weekday) => (
                    <div
                      className={`relative border-l border-outline-variant/60 transition-colors ${
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
                        className={`group absolute left-1 right-1 flex cursor-grab flex-col justify-center gap-1 overflow-hidden rounded-md border px-2.5 py-1.5 shadow-sm transition-colors active:cursor-grabbing ${EVENT_TONES[index % EVENT_TONES.length]} ${
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
                          height: Math.max((entryEnd - entryStart) * PX_PER_MINUTE - 4, 56),
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
                        <span className="truncate pr-4 font-label-md text-label-md font-bold leading-snug">
                          {lessonById.get(entry.lesson_id)?.name || "Ders"}
                        </span>
                        <span className="truncate font-mono-sm text-mono-sm leading-snug opacity-80">
                          {classroomById.get(entry.classroom_id)?.name || "Sınıf"}
                        </span>
                        <span className="flex items-center gap-1 truncate font-mono-sm text-mono-sm leading-snug opacity-80">
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
          </div>
        </div>
      </section>
    </div>
  );
}
