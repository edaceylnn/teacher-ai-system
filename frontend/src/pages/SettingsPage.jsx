import { useMemo, useState } from "react";
import Button from "../components/Button";
import Icon from "../components/Icon";
import Toggle from "../components/Toggle";
import { timeToMinutes } from "../utils/helpers";
import {
  SCHEDULE_SETTINGS_LIMITS,
  buildLessonSlots,
  validateScheduleSettings,
} from "../utils/scheduleSettings";

const SETTINGS_SECTIONS = [
  { id: "lessonHours", icon: "schedule", label: "Ders Saatleri" },
  { id: "privacy", icon: "privacy_tip", label: "Gizlilik ve Veri" },
];

function NumberField({ disabled, id, label, max, min, onChange, suffix, value }) {
  return (
    <div className={`settings-compact-field ${disabled ? "is-disabled" : ""}`}>
      <span>{label}</span>
      <div className={`settings-number-box ${disabled ? "is-disabled" : ""}`}>
        <input
          className="settings-number-input"
          disabled={disabled}
          id={id}
          max={max}
          min={min}
          onChange={onChange}
          type="number"
          value={value}
        />
        <span className="settings-number-suffix">{suffix}</span>
      </div>
    </div>
  );
}

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
                      : "text-secondary hover:bg-surface-container-low"
                  }`}
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  type="button"
                >
                  <Icon filled={isActive} name={section.icon} />
                  <span className="flex-1">{section.label}</span>
                </button>
              );
            })}
          </section>
        </nav>

        <div className="lg:col-span-3">
          {activeSection === "lessonHours" && (
            <LessonHoursSettings onSave={handleUpdateScheduleSettings} scheduleSettings={scheduleSettings} />
          )}
          {activeSection === "privacy" && <PrivacyDataSettings />}
        </div>
      </div>
    </div>
  );
}

function PrivacyDataSettings() {
  return (
    <div className="flex flex-col gap-6">
      <section className="card p-8 shadow-sm">
        <div className="mb-2 flex items-center gap-3">
          <Icon className="text-primary" name="privacy_tip" />
          <h3 className="font-headline-md text-headline-md text-on-background">
            Öğrenci Verisi ve Yapay Zeka
          </h3>
        </div>
        <p className="font-body-md text-body-md text-secondary">
          Karne yorumu, veli mesajı, eksik konu analizi ve haftalık özet gibi AI destekli çıktılar
          üretilirken, ürettiğin çıktıyla ilgili öğrencinin adı, notları, devamsızlık kayıtları ve
          varsa gözlem notların OpenAI API'sine gönderilir. Bu veri yalnızca ilgili çıktıyı üretmek
          için kullanılır; bir öğrenci veya sınıf için AI çıktısı üretmediğin sürece hiçbir veri
          dışarı gönderilmez.
        </p>
        <p className="mt-4 font-body-md text-body-md text-secondary">
          Bu paylaşım için okulunun veya kurumunun kişisel veri politikasına göre veli/idare
          bilgilendirmesi veya onayı gerekebilir — bu süreci işletmek öğretmenin/kurumun
          sorumluluğundadır.
        </p>
        <div className="mt-6 flex items-start gap-2 rounded border border-outline-variant bg-surface-container-low p-4">
          <Icon className="mt-0.5 text-secondary" name="info" />
          <p className="font-body-md text-body-md text-on-surface">
            AI ile üretilen her çıktı kaydetmeden önce düzenlenebilir; öğrenciyi tanımlayabilecek
            hatalı veya gereksiz ayrıntıları kaydetmeden önce metinden çıkarabilirsin.
          </p>
        </div>
      </section>
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

  const dayEnd = isValid ? previewSlots.at(-1)?.end : null;

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

  function handleCancel() {
    setDraft(scheduleSettings);
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <section className="card p-6 shadow-sm">
        <h3 className="font-headline-md text-headline-md text-on-background">Ders Saatleri</h3>
        <p className="mt-1 font-body-md text-body-md text-secondary">
          Okulunuzun günlük ders, teneffüs ve öğle arası düzenini belirleyin. Buradaki değişiklikler ders
          programına otomatik olarak uygulanır.
        </p>

        <div className="settings-summary-row mt-4">
          <span className="settings-summary-chip">
            <Icon className="text-[16px]" name="wb_twilight" /> Başlangıç <strong>{draft.dayStartTime}</strong>
          </span>
          <span className="settings-summary-chip">
            <Icon className="text-[16px]" name="bedtime" /> Bitiş <strong>{dayEnd || "—"}</strong>
          </span>
          <span className="settings-summary-chip">
            <Icon className="text-[16px]" name="format_list_numbered" /> Toplam{" "}
            <strong>{draft.lessonCount} ders</strong>
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-5">
          <div className="settings-compact-field">
            <span>Gün başlangıcı</span>
            <input
              className="settings-time-input"
              id="settings-day-start"
              onChange={(event) => updateField("dayStartTime", event.target.value)}
              type="time"
              value={draft.dayStartTime}
            />
          </div>

          <NumberField
            id="settings-lesson-duration"
            label="Ders süresi"
            max={SCHEDULE_SETTINGS_LIMITS.lessonDuration.max}
            min={SCHEDULE_SETTINGS_LIMITS.lessonDuration.min}
            onChange={(event) => updateField("lessonDuration", Number(event.target.value))}
            suffix="dakika"
            value={draft.lessonDuration}
          />

          <NumberField
            id="settings-break-duration"
            label="Teneffüs süresi"
            max={SCHEDULE_SETTINGS_LIMITS.breakDuration.max}
            min={SCHEDULE_SETTINGS_LIMITS.breakDuration.min}
            onChange={(event) => updateField("breakDuration", Number(event.target.value))}
            suffix="dakika"
            value={draft.breakDuration}
          />

          <NumberField
            id="settings-lesson-count"
            label="Günlük ders sayısı"
            max={SCHEDULE_SETTINGS_LIMITS.lessonCount.max}
            min={SCHEDULE_SETTINGS_LIMITS.lessonCount.min}
            onChange={(event) => updateField("lessonCount", Number(event.target.value))}
            suffix="ders"
            value={draft.lessonCount}
          />
        </div>

        <div className="settings-lunch-panel mt-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-body-md text-body-md font-semibold text-on-surface">Öğle Arası</p>
              <p className="mt-0.5 font-label-md text-label-md text-secondary">
                Gün ortasında ayrı, daha uzun bir mola planla.
              </p>
            </div>
            <Toggle
              checked={draft.lunchBreak.enabled}
              id="settings-lunch-enabled"
              label="Öğle arası kullanılsın"
              onChange={(checked) => updateLunch("enabled", checked)}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-5">
            <div className={`settings-compact-field ${draft.lunchBreak.enabled ? "" : "is-disabled"}`}>
              <span>Hangi dersten sonra başlasın</span>
              <select
                className="settings-select"
                disabled={!draft.lunchBreak.enabled}
                id="settings-lunch-after"
                onChange={(event) => updateLunch("afterLesson", Number(event.target.value))}
                value={draft.lunchBreak.afterLesson}
              >
                {Array.from({ length: draft.lessonCount }, (_, index) => index + 1).map((lessonNumber) => (
                  <option key={lessonNumber} value={lessonNumber}>
                    {lessonNumber}. ders
                  </option>
                ))}
              </select>
            </div>

            <NumberField
              disabled={!draft.lunchBreak.enabled}
              id="settings-lunch-duration"
              label="Öğle arası süresi"
              max={SCHEDULE_SETTINGS_LIMITS.lunchDuration.max}
              min={SCHEDULE_SETTINGS_LIMITS.lunchDuration.min}
              onChange={(event) => updateLunch("duration", Number(event.target.value))}
              suffix="dakika"
              value={draft.lunchBreak.duration}
            />
          </div>
        </div>
      </section>

      <section className="card p-6 shadow-sm">
        <h3 className="font-headline-md text-headline-md text-on-background">Program Önizlemesi</h3>
        <p className="mt-1 font-body-md text-body-md text-secondary">
          Kaydetmeden önce yeni zaman çizelgesi burada.
        </p>

        {!isValid ? (
          <p className="form-error mt-4">Önizleme için önce yukarıdaki ayarları geçerli değerlerle doldur.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-outline-variant">
            <table className="settings-preview-table w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th>Ders</th>
                  <th>Başlangıç</th>
                  <th>Bitiş</th>
                  <th>Sonrası</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map(({ next, slot }) => {
                  const isLunchNext = next?.period === "Öğle Arası";
                  return (
                    <tr
                      className={`border-b border-outline-variant last:border-b-0 ${isLunchNext ? "is-lunch-row" : ""}`}
                      key={slot.period}
                    >
                      <td className="font-body-md text-body-md font-bold text-on-surface">{slot.period}</td>
                      <td className="font-mono-sm text-mono-sm text-on-surface">{slot.start}</td>
                      <td className="font-mono-sm text-mono-sm text-on-surface">{slot.end}</td>
                      <td className="font-mono-sm text-mono-sm text-secondary">
                        {next?.part === "break" ? (
                          isLunchNext ? (
                            <span className="settings-lunch-chip">
                              <Icon className="text-[13px]" name="restaurant" />
                              {timeToMinutes(next.end) - timeToMinutes(next.start)} dk öğle arası
                            </span>
                          ) : (
                            `${timeToMinutes(next.end) - timeToMinutes(next.start)} dk teneffüs`
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {isDirty && (
        <div className="settings-save-bar">
          <p className="flex items-center gap-2 font-label-md text-label-md text-secondary">
            <Icon className="text-primary" name="info" /> Kaydedilmemiş değişiklikler var.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleCancel} size="md" variant="ghost">
              İptal
            </Button>
            <Button disabled={!isValid} size="md" type="submit" variant="primary">
              <Icon name="save" /> Değişiklikleri Kaydet
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
