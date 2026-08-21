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

// The actual daily lesson/break timetable is no longer hard-coded here — it's
// generated from Ayarlar → Ders Saatleri (see utils/scheduleSettings.js,
// App.jsx's `lessonSlots`/`scheduleSlotOptions`) so a teacher can change the
// school's start time, lesson length, etc. and have it apply everywhere.

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
  classroom_id: "",
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
