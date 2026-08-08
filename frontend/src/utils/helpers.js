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
