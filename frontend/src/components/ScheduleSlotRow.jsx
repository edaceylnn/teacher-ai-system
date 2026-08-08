import { schoolWeekDays } from "../constants";

export default function ScheduleSlotRow({
  classroomById,
  entryBySlot,
  handleDeleteScheduleEntry,
  lessonById,
  onOpenEntry,
  onOpenSlot,
  slot,
}) {
  return (
    <>
      <div className="schedule-time-cell">
        <strong>{slot.period}</strong>
        <span>
          {slot.start} - {slot.end}
        </span>
      </div>
      {schoolWeekDays.map((day, weekday) => {
        const entry = entryBySlot.get(`${weekday}:${slot.start}:${slot.end}`);
        return (
          <button
            className={entry ? "schedule-slot filled" : "schedule-slot"}
            key={`${day}-${slot.period}`}
            onClick={() =>
              entry ? onOpenEntry(entry) : onOpenSlot(slot, weekday)
            }
            type="button"
          >
            {entry ? (
              <>
                <strong>
                  {lessonById.get(entry.lesson_id)?.name || "Ders"}
                </strong>
                <span>
                  {classroomById.get(entry.classroom_id)?.name || "Sınıf"}
                </span>
                <small>{entry.location || "Derslik yok"}</small>
                <span className="schedule-slot-actions">
                  <span className="material-symbols-outlined">edit</span>
                  <span
                    aria-label="Ders programı kaydını sil"
                    className="schedule-delete-action"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteScheduleEntry(entry.id);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </span>
                </span>
              </>
            ) : (
              <span className="empty-slot-text">Ders ekle</span>
            )}
          </button>
        );
      })}
    </>
  );
}
