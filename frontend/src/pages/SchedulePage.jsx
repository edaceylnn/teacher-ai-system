import { useMemo, useState } from "react";
import { schoolWeekDays } from "../constants";
import { buildScheduleTimeBounds, minutesToTime, timeToMinutes } from "../utils/helpers";
import { canAccessClassSubject, isAdmin } from "../utils/permissions";
import Button from "../components/Button";
import Icon from "../components/Icon";

const PX_PER_HOUR = 96;
const PX_PER_MINUTE = PX_PER_HOUR / 60;
const GUTTER_WIDTH = 64;
const DAY_COLUMN_MIN_WIDTH = 132;
const GRID_MIN_WIDTH = GUTTER_WIDTH + schoolWeekDays.length * DAY_COLUMN_MIN_WIDTH;
const EVENT_TONES = [
  "tone-primary",
  "tone-secondary",
];

function nearestPeriodAt(periods, clickedMinute) {
  return periods.reduce((closest, slot) => {
    const distance = Math.abs(timeToMinutes(slot.start) - clickedMinute);
    const closestDistance = Math.abs(timeToMinutes(closest.start) - clickedMinute);
    return distance < closestDistance ? slot : closest;
  }, periods[0]);
}

function startOfWeek(date) {
  const day = (date.getDay() + 6) % 7;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function formatDayNumber(date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(date);
}

function formatWeekRange(weekStart) {
  const weekEnd = addDays(weekStart, 4);
  return `${formatDayNumber(weekStart)} - ${formatDayNumber(weekEnd)}`;
}

function entriesOverlap(first, second) {
  const firstStart = timeToMinutes(first.start_time.slice(0, 5));
  const firstEnd = timeToMinutes(first.end_time.slice(0, 5));
  const secondStart = timeToMinutes(second.start_time.slice(0, 5));
  const secondEnd = timeToMinutes(second.end_time.slice(0, 5));
  return firstStart < secondEnd && secondStart < firstEnd;
}

export default function SchedulePage({
  classrooms,
  currentTeacher,
  handleDeleteScheduleEntry,
  lessonSlots,
  lessons,
  handleMoveScheduleEntry,
  scheduleEntries,
  setActiveModal,
  setEditingScheduleEntry,
  setQuickActionEntry,
  setScheduleForm,
  teacherAssignments,
}) {
  const [draggingEntryId, setDraggingEntryId] = useState(null);
  const [dragOverWeekday, setDragOverWeekday] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
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
  const conflictEntryIds = useMemo(() => {
    const conflicts = new Set();
    entriesByWeekday.forEach((entries) => {
      entries.forEach((entry, index) => {
        entries.slice(index + 1).forEach((otherEntry) => {
          if (entriesOverlap(entry, otherEntry)) {
            conflicts.add(entry.id);
            conflicts.add(otherEntry.id);
          }
        });
      });
    });
    return conflicts;
  }, [entriesByWeekday]);
  const currentWeekStart = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);
    return weekStart;
  }, [weekOffset]);

  // Madde 9/11: bir sınıfın programını görebilmek (rehber olarak) o dersin
  // branşına yazma yetkisi vermez — hızlı işlem menüsü sadece gerçekten o
  // ders için değerlendirme/yoklama girebilecek öğretmene gösterilir.
  function canActOnEntry(entry) {
    if (isAdmin(currentTeacher)) return true;
    return canAccessClassSubject(teacherAssignments, entry.classroom_id, entry.lesson_id);
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
    <div className="wide-page schedule-page">
      <div className="schedule-header">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Ders Programı</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Haftalık ders akışını sınıf, ders, saat ve derslik bazında takip et. Bir dersi başka bir
            gün/saate taşımak için sürükleyip bırakabilirsin.
          </p>
        </div>
        <div className="schedule-header-actions">
          <div className="schedule-week-nav" aria-label="Hafta navigasyonu">
            <button aria-label="Önceki hafta" onClick={() => setWeekOffset((current) => current - 1)} type="button">
              <Icon name="chevron_left" />
            </button>
            <span className="schedule-week-range">{formatWeekRange(currentWeekStart)}</span>
            <button aria-label="Sonraki hafta" onClick={() => setWeekOffset((current) => current + 1)} type="button">
              <Icon name="chevron_right" />
            </button>
          </div>
          <Button onClick={() => setWeekOffset(0)} size="sm" variant="secondary">
            Bugün
          </Button>
          <Button
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
            size="md"
            variant="primary"
          >
            <Icon name="add" /> Ders Ekle
          </Button>
        </div>
      </div>

      <section className="schedule-calendar-panel">
        {/* Horizontal scroll wrapper: below GRID_MIN_WIDTH the grid keeps its
            per-day minimum instead of squeezing columns/cards illegible. */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: GRID_MIN_WIDTH }}>
            <div
              className="schedule-calendar-head grid"
              style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${schoolWeekDays.length}, 1fr)` }}
            >
              <div className="schedule-timezone">GMT+3</div>
              {schoolWeekDays.map((day, index) => (
                <div className="schedule-day-head" key={day}>
                  <span>{day}</span>
                  <small>{formatDayNumber(addDays(currentWeekStart, index))}</small>
                </div>
              ))}
            </div>

            <div className="schedule-scroll" style={{ height: Math.min(totalHeight, 520) }}>
              <div className="relative" style={{ height: totalHeight }}>
                {/* Time gutter — its own layer, fully separate from the grid
                    lines. Labels never sit on top of a line: the line only
                    spans the day columns (left-[80px] onward), the gutter
                    background covers 0..80px and nothing else is drawn there. */}
                <div className="pointer-events-none absolute inset-0 z-0">
                  <div className="schedule-time-gutter" style={{ width: GUTTER_WIDTH }} />
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
                          className={`schedule-grid-line ${isLessonBoundary ? "lesson-boundary" : ""}`}
                          style={{ left: GUTTER_WIDTH, top }}
                        />
                        <span
                          className={`schedule-time-label ${labelAlignClass}`}
                          style={{ top, width: GUTTER_WIDTH }}
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
                        className="schedule-break-band"
                        key={slot.start}
                        style={{ left: GUTTER_WIDTH, top, height }}
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
                      className={`schedule-day-column ${dragOverWeekday === weekday ? "drag-over" : ""}`}
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
                    const hasConflict = conflictEntryIds.has(entry.id);
                    return (
                      <div
                        className={`schedule-event-card group ${EVENT_TONES[index % EVENT_TONES.length]} ${hasConflict ? "warning" : ""} ${
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
                        {canActOnEntry(entry) && (
                          <button
                            aria-label="Hızlı işlemler"
                            className="schedule-event-action quick"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              setQuickActionEntry(entry);
                              setActiveModal("scheduleQuickActions");
                            }}
                            type="button"
                          >
                            <Icon name="more_vert" className="text-[13px]" />
                          </button>
                        )}
                        <button
                          aria-label="Ders programı kaydını sil"
                          className="schedule-event-action delete"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            handleDeleteScheduleEntry(entry.id);
                          }}
                          type="button"
                        >
                          <Icon name="delete" className="text-[13px]" />
                        </button>
                        <span className="schedule-event-title">
                          {lessonById.get(entry.lesson_id)?.name || "Ders"}
                        </span>
                        <span className="schedule-event-classroom">
                          {classroomById.get(entry.classroom_id)?.name || "Sınıf"}
                        </span>
                        <span className="schedule-event-location">
                          <Icon name="room" className="shrink-0 text-[12px]" /> {entry.location || "Derslik yok"}
                        </span>
                        {hasConflict && <span className="schedule-event-warning">Çakışma</span>}
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
