export const DEMO_TEACHER_ID = Number(import.meta.env.VITE_DEMO_TEACHER_ID || 1);

export const TABLE_PAGE_SIZE = 10;

export const attendanceLabels = {
  present: "Var",
  absent: "Yok",
  excused: "Mazeretli",
};

export const monthNames = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export const weekdayOptions = weekDays.map((day, index) => ({
  label: day,
  value: String(index),
}));

export const schoolWeekDays = weekDays.slice(0, 5);

export const schoolWeekdayOptions = weekdayOptions.slice(0, 5);

export const lessonSlots = [
  { period: "1. Ders", start: "08:30", end: "09:10", part: "Sabah" },
  { period: "2. Ders", start: "09:10", end: "09:50", part: "Sabah" },
  { period: "3. Ders", start: "10:00", end: "10:40", part: "Sabah" },
  { period: "4. Ders", start: "10:50", end: "11:30", part: "Sabah" },
  { period: "Öğle Arası", start: "11:30", end: "12:30", part: "break" },
  { period: "5. Ders", start: "12:30", end: "13:10", part: "Öğleden Sonra" },
  { period: "6. Ders", start: "13:20", end: "14:00", part: "Öğleden Sonra" },
  { period: "7. Ders", start: "14:10", end: "14:50", part: "Öğleden Sonra" },
  { period: "8. Ders", start: "15:00", end: "15:40", part: "Öğleden Sonra" },
];

export const scheduleSlotOptions = lessonSlots
  .filter((slot) => slot.part !== "break")
  .map((slot) => ({
    label: `${slot.period} · ${slot.start} - ${slot.end}`,
    value: `${slot.start}|${slot.end}`,
  }));

export const homeworkStatusLabels = {
  assigned: "Atandı",
  completed: "Tamamlandı",
  missing: "Eksik",
  late: "Geç Teslim",
};

export const homeworkStatusOptions = Object.entries(homeworkStatusLabels).map(
  ([value, label]) => ({ label, value }),
);

export const gradeLevelOptions = Array.from({ length: 12 }, (_, index) =>
  String(index + 1),
);

export const sectionOptions = ["A", "B", "C", "D", "E", "F"];

export const emptyStudentForm = {
  first_name: "",
  last_name: "",
  parent_full_name: "",
  parent_phone: "",
  parent_email: "",
  home_address: "",
};

export const emptyStudentEditForm = {
  ...emptyStudentForm,
  observation_notes: "",
};
