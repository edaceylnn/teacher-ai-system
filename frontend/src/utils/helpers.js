export function buildClassroomName(form) {
  return `${form.grade_level}-${form.section}`;
}

export function classroomToForm(classroom) {
  const [, nameGradeLevel, section] =
    classroom.name.match(/^(\d+)-([A-ZÇĞİÖŞÜ])$/i) || [];
  return {
    grade_level: classroom.grade_level || nameGradeLevel || "",
    section: section?.toLocaleUpperCase("tr") || "",
  };
}

export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const days = Array.from({ length: leadingEmptyDays }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

export function scheduleSlotValue(form) {
  if (!form.start_time || !form.end_time) return "";
  return `${form.start_time}|${form.end_time}`;
}

export function splitScheduleSlot(value) {
  const [start_time = "", end_time = ""] = value.split("|");
  return { start_time, end_time };
}

export function initialsOf(firstName, lastName) {
  return `${(firstName || "").charAt(0)}${(lastName || "").charAt(0)}`.toLocaleUpperCase("tr");
}

const AVATAR_TONES = [
  "bg-primary-container text-on-primary",
  "bg-tertiary-container text-on-tertiary",
  "bg-secondary-container text-on-secondary-container",
];

export function avatarToneFor(id) {
  const index = Math.abs(Number(id) || 0) % AVATAR_TONES.length;
  return AVATAR_TONES[index];
}

export function averageOfScores(scores) {
  if (!scores.length) return null;
  const total = scores.reduce((sum, score) => sum + Number(score), 0);
  return Math.round((total / scores.length) * 10) / 10;
}

export function buildGradesByStudent(grades) {
  return grades.reduce((acc, grade) => {
    const current = acc.get(grade.student_id) || [];
    current.push(Number(grade.score));
    acc.set(grade.student_id, current);
    return acc;
  }, new Map());
}

// Shared performance-tier thresholds so the "durum" badge shown on the
// students list matches the risk logic already used on the dashboard —
// computed from real grades rather than a separately stored, driftable field.
export function performanceStatus(average) {
  if (average === null || average === undefined) {
    return { label: "Not yok", tone: "neutral" };
  }
  if (average < 70) return { label: "Riskli", tone: "danger" };
  if (average >= 85) return { label: "Başarılı", tone: "success" };
  return { label: "Ortalama", tone: "neutral" };
}

export const enrollmentStatusLabels = {
  active: "Aktif",
  reported: "Raporlu",
};

export function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes) {
  const clamped = Math.max(0, Math.round(minutes));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Continuous weekly schedule grid bounds — the exact earliest/latest minute
// across the official period slots plus any real entries that happen to fall
// outside them. Deliberately NOT rounded out to whole hours: the grid's tick
// marks are the real ders/teneffüs boundaries, so padding out to e.g. 08:00
// when the day actually starts at 08:30 would only add an empty, unlabeled
// gap at the top of the grid.
export function buildScheduleTimeBounds(entries, slots) {
  const times = [
    ...slots.flatMap((slot) => [slot.start, slot.end]),
    ...entries.flatMap((entry) => [entry.start_time.slice(0, 5), entry.end_time.slice(0, 5)]),
  ].map(timeToMinutes);
  return {
    startMinutes: Math.min(...times),
    endMinutes: Math.max(...times),
  };
}

export function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dakika önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(dateString).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}
