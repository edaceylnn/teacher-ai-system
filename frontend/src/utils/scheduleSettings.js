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

// Backend-persisted now (GET/PUT /school-schedule-settings, school-wide —
// see backend/app/models/schedule_settings.py) so schedule-entry conflict
// checks on the server validate against the same timetable the UI shows,
// instead of a setting only the browser knew about. These adapters translate
// between this file's camelCase shape (unchanged, still what every consumer
// here — buildLessonSlots, validateScheduleSettings, App.jsx — expects) and
// the API's snake_case wire format.
export function fromApiResponse(response) {
  return {
    dayStartTime: response.day_start_time.slice(0, 5),
    lessonDuration: response.lesson_duration_minutes,
    breakDuration: response.break_duration_minutes,
    lessonCount: response.lesson_count,
    lunchBreak: {
      enabled: response.lunch_break_enabled,
      afterLesson: response.lunch_break_after_lesson,
      duration: response.lunch_break_duration_minutes,
    },
  };
}

export function toApiPayload(settings) {
  return {
    day_start_time: settings.dayStartTime,
    lesson_duration_minutes: settings.lessonDuration,
    break_duration_minutes: settings.breakDuration,
    lesson_count: settings.lessonCount,
    lunch_break: {
      enabled: settings.lunchBreak.enabled,
      after_lesson: settings.lunchBreak.afterLesson,
      duration_minutes: settings.lunchBreak.duration,
    },
  };
}
