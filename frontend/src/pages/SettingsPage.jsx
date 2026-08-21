import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import Toggle from "../components/Toggle";
import { timeToMinutes } from "../utils/helpers";
import {
  SCHEDULE_SETTINGS_LIMITS,
  buildLessonSlots,
  validateScheduleSettings,
} from "../utils/scheduleSettings";

// Only Ders Saatleri is real today. The other three are placeholders so the
// nav doesn't need reshaping when they're built — kept disabled, no behavior.
const SETTINGS_SECTIONS = [
  { id: "general", icon: "tune", label: "Genel", enabled: false },
  { id: "lessonHours", icon: "schedule", label: "Ders Saatleri", enabled: true },
  { id: "schoolInfo", icon: "apartment", label: "Okul Bilgileri", enabled: false },
  { id: "academicCalendar", icon: "event", label: "Akademik Takvim", enabled: false },
];

const inputClass =
  "w-full rounded border border-surface-variant bg-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

export default function SettingsPage({ handleUpdateScheduleSettings, scheduleSettings }) {
  const [activeSection, setActiveSection] = useState("lessonHours");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-background">Ayarlar</h1>
        <p className="mt-2 font-body-lg text-body-lg text-secondary">
          Uygulama ve okul düzeni ayarlarını yönet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <nav className="lg:col-span-1">
          <section className="card flex flex-col gap-1 p-3 shadow-sm">
            {SETTINGS_SECTIONS.map((section) => {
              const isActive = section.id === activeSection;
              return (
                <button
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left font-label-md text-label-md transition-colors ${
                    isActive
                      ? "bg-surface-container-low font-bold text-primary"
                      : section.enabled
                        ? "text-secondary hover:bg-surface-container-low"
                        : "cursor-not-allowed text-secondary/50"
                  }`}
                  disabled={!section.enabled}
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  type="button"
                >
                  <Icon filled={isActive} name={section.icon} />
                  <span className="flex-1">{section.label}</span>
                  {!section.enabled && <span className="badge badge-neutral">Yakında</span>}
                </button>
              );
            })}
          </section>
        </nav>

        <div className="lg:col-span-3">
          {activeSection === "lessonHours" && (
            <LessonHoursSettings onSave={handleUpdateScheduleSettings} scheduleSettings={scheduleSettings} />
          )}
        </div>
      </div>
    </div>
  );
}

function LessonHoursSettings({ onSave, scheduleSettings }) {
  const [draft, setDraft] = useState(scheduleSettings);
  const errors = useMemo(() => validateScheduleSettings(draft), [draft]);
  const isValid = errors.length === 0;
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(scheduleSettings),
    [draft, scheduleSettings],
  );
  const previewSlots = useMemo(() => (isValid ? buildLessonSlots(draft) : []), [draft, isValid]);
  // Pair each lesson with whatever follows it (a break, or nothing for the
  // last lesson) so the preview table's "Sonrası" column can name it.
  const previewRows = useMemo(
    () =>
      previewSlots
        .map((slot, index) => ({ slot, next: previewSlots[index + 1] }))
        .filter(({ slot }) => slot.part !== "break"),
    [previewSlots],
  );

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateLunch(field, value) {
    setDraft((current) => ({
      ...current,
      lunchBreak: { ...current.lunchBreak, [field]: value },
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!isValid || !isDirty) return;
    onSave(draft);
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <section className="card p-8 shadow-sm">
        <h3 className="mb-1 font-headline-md text-headline-md text-on-background">Ders Saatleri</h3>
        <p className="mb-6 font-body-md text-body-md text-secondary">
          Okulunuzun günlük ders, teneffüs ve öğle arası düzenini belirleyin. Buradaki değişiklikler ders
          programına otomatik olarak uygulanır.
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-label-md text-label-md text-on-surface" htmlFor="settings-day-start">
              Gün başlangıcı
            </label>
            <input
              className={inputClass}
              id="settings-day-start"
              onChange={(event) => updateField("dayStartTime", event.target.value)}
              type="time"
              value={draft.dayStartTime}
            />
          </div>

          <div>
            <label
              className="mb-2 block font-label-md text-label-md text-on-surface"
              htmlFor="settings-lesson-duration"
            >
              Standart ders süresi (dakika)
            </label>
            <input
              className={inputClass}
              id="settings-lesson-duration"
              max={SCHEDULE_SETTINGS_LIMITS.lessonDuration.max}
              min={SCHEDULE_SETTINGS_LIMITS.lessonDuration.min}
              onChange={(event) => updateField("lessonDuration", Number(event.target.value))}
              type="number"
              value={draft.lessonDuration}
            />
          </div>

          <div>
            <label
              className="mb-2 block font-label-md text-label-md text-on-surface"
              htmlFor="settings-break-duration"
            >
              Standart teneffüs süresi (dakika)
            </label>
            <input
              className={inputClass}
              id="settings-break-duration"
              max={SCHEDULE_SETTINGS_LIMITS.breakDuration.max}
              min={SCHEDULE_SETTINGS_LIMITS.breakDuration.min}
              onChange={(event) => updateField("breakDuration", Number(event.target.value))}
              type="number"
              value={draft.breakDuration}
            />
          </div>

          <div>
            <label className="mb-2 block font-label-md text-label-md text-on-surface" htmlFor="settings-lesson-count">
              Günlük ders sayısı
            </label>
            <input
              className={inputClass}
              id="settings-lesson-count"
              max={SCHEDULE_SETTINGS_LIMITS.lessonCount.max}
              min={SCHEDULE_SETTINGS_LIMITS.lessonCount.min}
              onChange={(event) => updateField("lessonCount", Number(event.target.value))}
              type="number"
              value={draft.lessonCount}
            />
          </div>
        </div>
      </section>

      <section className="card p-8 shadow-sm">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-background">Öğle Arası</h3>
            <p className="mt-1 font-body-md text-body-md text-secondary">
              Öğle arasını gün ortasında ayrı, daha uzun bir mola olarak planla.
            </p>
          </div>
          <Toggle
            checked={draft.lunchBreak.enabled}
            id="settings-lunch-enabled"
            label="Öğle arası kullanılsın"
            onChange={(checked) => updateLunch("enabled", checked)}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              className={`mb-2 block font-label-md text-label-md ${draft.lunchBreak.enabled ? "text-on-surface" : "text-secondary"}`}
              htmlFor="settings-lunch-after"
            >
              Kaçıncı dersten sonra
            </label>
            <input
              className={inputClass}
              disabled={!draft.lunchBreak.enabled}
              id="settings-lunch-after"
              max={draft.lessonCount}
              min="1"
              onChange={(event) => updateLunch("afterLesson", Number(event.target.value))}
              type="number"
              value={draft.lunchBreak.afterLesson}
            />
          </div>

          <div>
            <label
              className={`mb-2 block font-label-md text-label-md ${draft.lunchBreak.enabled ? "text-on-surface" : "text-secondary"}`}
              htmlFor="settings-lunch-duration"
            >
              Öğle arası süresi (dakika)
            </label>
            <input
              className={inputClass}
              disabled={!draft.lunchBreak.enabled}
              id="settings-lunch-duration"
              max={SCHEDULE_SETTINGS_LIMITS.lunchDuration.max}
              min={SCHEDULE_SETTINGS_LIMITS.lunchDuration.min}
              onChange={(event) => updateLunch("duration", Number(event.target.value))}
              type="number"
              value={draft.lunchBreak.duration}
            />
          </div>
        </div>
      </section>

      <section className="card p-8 shadow-sm">
        <h3 className="mb-1 font-headline-md text-headline-md text-on-background">Program Önizlemesi</h3>
        <p className="mb-6 font-body-md text-body-md text-secondary">
          Kaydetmeden önce yeni zaman çizelgesi burada.
        </p>

        {!isValid ? (
          <p className="form-error">Önizleme için önce yukarıdaki ayarları geçerli değerlerle doldur.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-outline-variant">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="p-3 font-label-md text-label-md uppercase text-secondary">Ders</th>
                  <th className="p-3 font-label-md text-label-md uppercase text-secondary">Başlangıç</th>
                  <th className="p-3 font-label-md text-label-md uppercase text-secondary">Bitiş</th>
                  <th className="p-3 font-label-md text-label-md uppercase text-secondary">Sonrası</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map(({ next, slot }) => (
                  <tr className="border-b border-outline-variant last:border-b-0" key={slot.period}>
                    <td className="p-3 font-body-md text-body-md font-bold text-on-surface">{slot.period}</td>
                    <td className="p-3 font-mono-sm text-mono-sm text-on-surface">{slot.start}</td>
                    <td className="p-3 font-mono-sm text-mono-sm text-on-surface">{slot.end}</td>
                    <td className="p-3 font-mono-sm text-mono-sm text-secondary">
                      {next?.part === "break"
                        ? `${timeToMinutes(next.end) - timeToMinutes(next.start)} dk ${next.period}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {errors.length > 0 && (
        <section className="card border-error/30 bg-error-container/20 p-4">
          <p className="mb-1 font-label-md text-label-md text-error">Kaydetmeden önce düzelt:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {errors.map((message) => (
              <li className="form-error" key={message}>
                {message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex justify-end">
        <button className="primary-button" disabled={!isValid || !isDirty} type="submit">
          <Icon name="save" /> Değişiklikleri Kaydet
        </button>
      </div>
    </form>
  );
}
