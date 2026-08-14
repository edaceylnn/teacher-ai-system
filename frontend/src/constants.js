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

// MEB'in okullarda ders/teneffüs sürelerine ilişkin genelgesine göre:
// standart ders süresi 40 dakika, teneffüsler en az 15 dakika, öğle arası
// en az 40 dakikadır (bkz. meb.gov.tr "Okullarda Derslerin Başlama ve Bitiş
// Saatlerine İlişkin Genelge"). Kesin saatler il/okul bazında değişebildiği
// için burada bu asgari sürelere uyan tipik bir tam gün programı kullanılır.
export const lessonSlots = [
  { period: "1. Ders", start: "08:30", end: "09:10", part: "Sabah" },
  { period: "Teneffüs", start: "09:10", end: "09:25", part: "break" },
  { period: "2. Ders", start: "09:25", end: "10:05", part: "Sabah" },
  { period: "Teneffüs", start: "10:05", end: "10:20", part: "break" },
  { period: "3. Ders", start: "10:20", end: "11:00", part: "Sabah" },
  { period: "Teneffüs", start: "11:00", end: "11:15", part: "break" },
  { period: "4. Ders", start: "11:15", end: "11:55", part: "Sabah" },
  { period: "Öğle Arası", start: "11:55", end: "12:35", part: "break" },
  { period: "5. Ders", start: "12:35", end: "13:15", part: "Öğleden Sonra" },
  { period: "Teneffüs", start: "13:15", end: "13:30", part: "break" },
  { period: "6. Ders", start: "13:30", end: "14:10", part: "Öğleden Sonra" },
  { period: "Teneffüs", start: "14:10", end: "14:25", part: "break" },
  { period: "7. Ders", start: "14:25", end: "15:05", part: "Öğleden Sonra" },
  { period: "Teneffüs", start: "15:05", end: "15:20", part: "break" },
  { period: "8. Ders", start: "15:20", end: "16:00", part: "Öğleden Sonra" },
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
