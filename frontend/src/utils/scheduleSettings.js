import { minutesToTime, timeToMinutes } from "./helpers";

// Single source of truth for the school's daily lesson/break rhythm. This is
// deliberately school-wide (not a per-teacher preference) — see Ayarlar →
// Ders Saatleri — because every teacher's Ders Programı is generated from
// the same timetable. Shaped so it can move to a backend-persisted
// `schoolScheduleSettings` record later without changing its consumers.
export const DEFAULT_SCHEDULE_SETTINGS = {
  dayStartTime: "08:30",
  lessonDuration: 40,
  breakDuration: 15,
  lessonCount: 8,
  lunchBreak: {
    enabled: true,
    afterLesson: 4,
    duration: 40,
  },
};

export const SCHEDULE_SETTINGS_LIMITS = {
  lessonDuration: { min: 10, max: 180 },
  breakDuration: { min: 0, max: 60 },
  lessonCount: { min: 1, max: 12 },
  lunchDuration: { min: 5, max: 120 },
};

const TIME_FORMAT_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const STORAGE_KEY = "teacherAi.schoolScheduleSettings";

// Builds the full daily period list (lessons + teneffüs + öğle arası) from
// the settings above — the same shape the calendar previously hard-coded.
// Every boundary is computed in minutes and converted back with
// minutesToTime/timeToMinutes (utils/helpers.js) rather than string
// concatenation, so the chain stays exact no matter how the inputs change.
export function buildLessonSlots(settings) {
  const { lunchBreak: lunch } = settings;
  const slots = [];
  let cursor = timeToMinutes(settings.dayStartTime);

  for (let lessonNumber = 1; lessonNumber <= settings.lessonCount; lessonNumber += 1) {
    const start = cursor;
    const end = start + settings.lessonDuration;
    const isBeforeLunch = !lunch.enabled || lessonNumber <= lunch.afterLesson;
    slots.push({
      period: `${lessonNumber}. Ders`,
      start: minutesToTime(start),
      end: minutesToTime(end),
      part: isBeforeLunch ? "Sabah" : "Öğleden Sonra",
    });
    cursor = end;

    const isLunchAfterThis = lunch.enabled && lessonNumber === lunch.afterLesson;
    const isLastLesson = lessonNumber === settings.lessonCount;
    if (isLastLesson && !isLunchAfterThis) break;

    const breakLength = isLunchAfterThis ? lunch.duration : settings.breakDuration;
    const breakStart = cursor;
    const breakEnd = breakStart + breakLength;
    slots.push({
      period: isLunchAfterThis ? "Öğle Arası" : "Teneffüs",
      start: minutesToTime(breakStart),
      end: minutesToTime(breakEnd),
      part: "break",
    });
    cursor = breakEnd;
  }

  return slots;
}

// Turkish, user-facing validation messages. Returns an empty array when the
// settings are safe to save/generate a timetable from.
export function validateScheduleSettings(settings) {
  const errors = [];

  if (!TIME_FORMAT_RE.test(settings.dayStartTime || "")) {
    errors.push("Gün başlangıcı için geçerli bir saat girmelisin (ör. 08:30).");
  }

  const lessonDuration = Number(settings.lessonDuration);
  if (!Number.isFinite(lessonDuration) || lessonDuration <= 0) {
    errors.push("Ders süresi 0'dan büyük olmalı.");
  } else if (lessonDuration > SCHEDULE_SETTINGS_LIMITS.lessonDuration.max) {
    errors.push(`Ders süresi en fazla ${SCHEDULE_SETTINGS_LIMITS.lessonDuration.max} dakika olabilir.`);
  }

  const breakDuration = Number(settings.breakDuration);
  if (!Number.isFinite(breakDuration) || breakDuration < 0) {
    errors.push("Teneffüs süresi negatif olamaz.");
  } else if (breakDuration > SCHEDULE_SETTINGS_LIMITS.breakDuration.max) {
    errors.push(`Teneffüs süresi en fazla ${SCHEDULE_SETTINGS_LIMITS.breakDuration.max} dakika olabilir.`);
  }

  const lessonCount = Number(settings.lessonCount);
  if (!Number.isInteger(lessonCount) || lessonCount <= 0) {
    errors.push("Günlük ders sayısı 0'dan büyük olmalı.");
  } else if (lessonCount > SCHEDULE_SETTINGS_LIMITS.lessonCount.max) {
    errors.push(`Günlük ders sayısı en fazla ${SCHEDULE_SETTINGS_LIMITS.lessonCount.max} olabilir.`);
  }

  if (settings.lunchBreak?.enabled) {
    const afterLesson = Number(settings.lunchBreak.afterLesson);
    if (!Number.isInteger(afterLesson) || afterLesson <= 0) {
      errors.push("Öğle arasının kaçıncı dersten sonra olacağını seçmelisin.");
    } else if (Number.isInteger(lessonCount) && afterLesson > lessonCount) {
      errors.push("Öğle arası, günlük ders sayısından sonra olamaz.");
    }

    const lunchDuration = Number(settings.lunchBreak.duration);
    if (!Number.isFinite(lunchDuration) || lunchDuration <= 0) {
      errors.push("Öğle arası süresi 0'dan büyük olmalı.");
    } else if (lunchDuration > SCHEDULE_SETTINGS_LIMITS.lunchDuration.max) {
      errors.push(`Öğle arası süresi en fazla ${SCHEDULE_SETTINGS_LIMITS.lunchDuration.max} dakika olabilir.`);
    }
  }

  return errors;
}

// No backend endpoint for this yet (see project notes) — persisted to
// localStorage for now so the setting survives a reload, behind the same
// function names a future `api.getScheduleSettings()/saveScheduleSettings()`
// pair would use, so swapping the storage layer later touches only this file.
export function loadStoredScheduleSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SCHEDULE_SETTINGS;
    const parsed = JSON.parse(raw);
    return validateScheduleSettings(parsed).length === 0 ? parsed : DEFAULT_SCHEDULE_SETTINGS;
  } catch {
    return DEFAULT_SCHEDULE_SETTINGS;
  }
}

export function persistScheduleSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Best-effort only (e.g. private browsing can throw on write).
  }
}
