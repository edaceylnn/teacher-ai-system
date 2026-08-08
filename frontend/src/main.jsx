import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { api, getAuthToken, setAuthToken } from "./api";
import "./styles.css";

const DEMO_TEACHER_ID = Number(import.meta.env.VITE_DEMO_TEACHER_ID || 1);
const TABLE_PAGE_SIZE = 10;

const attendanceLabels = {
  present: "Var",
  absent: "Yok",
  excused: "Mazeretli",
};
const monthNames = [
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
const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const weekdayOptions = weekDays.map((day, index) => ({
  label: day,
  value: String(index),
}));
const schoolWeekDays = weekDays.slice(0, 5);
const schoolWeekdayOptions = weekdayOptions.slice(0, 5);
const lessonSlots = [
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
const scheduleSlotOptions = lessonSlots
  .filter((slot) => slot.part !== "break")
  .map((slot) => ({
    label: `${slot.period} · ${slot.start} - ${slot.end}`,
    value: `${slot.start}|${slot.end}`,
  }));
const homeworkStatusLabels = {
  assigned: "Atandı",
  completed: "Tamamlandı",
  missing: "Eksik",
  late: "Geç Teslim",
};
const homeworkStatusOptions = Object.entries(homeworkStatusLabels).map(
  ([value, label]) => ({ label, value }),
);

const gradeLevelOptions = Array.from({ length: 12 }, (_, index) =>
  String(index + 1),
);
const sectionOptions = ["A", "B", "C", "D", "E", "F"];
const emptyStudentForm = {
  first_name: "",
  last_name: "",
  parent_full_name: "",
  parent_phone: "",
  parent_email: "",
  home_address: "",
};
const emptyStudentEditForm = {
  ...emptyStudentForm,
  observation_notes: "",
};

function buildClassroomName(form) {
  return `${form.grade_level}-${form.section}`;
}

function classroomToForm(classroom) {
  const [, nameGradeLevel, section] =
    classroom.name.match(/^(\d+)-([A-ZÇĞİÖŞÜ])$/i) || [];
  return {
    grade_level: classroom.grade_level || nameGradeLevel || "",
    section: section?.toLocaleUpperCase("tr") || "",
  };
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthDays(year, month) {
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

function scheduleSlotValue(form) {
  if (!form.start_time || !form.end_time) return "";
  return `${form.start_time}|${form.end_time}`;
}

function splitScheduleSlot(value) {
  const [start_time = "", end_time = ""] = value.split("|");
  return { start_time, end_time };
}

function App() {
  const [authToken, setAuthTokenState] = useState(() => getAuthToken());
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [teacherProfileForm, setTeacherProfileForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(Boolean(authToken));
  const [activePage, setActivePage] = useState("dashboard");
  const [isSidenavCollapsed, setIsSidenavCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [classroomSearchTerm, setClassroomSearchTerm] = useState("");
  const [classroomGradeFilter, setClassroomGradeFilter] = useState("all");
  const [classrooms, setClassrooms] = useState([]);
  const [classroomStudentCounts, setClassroomStudentCounts] = useState({});
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [aiOutputsByStudent, setAiOutputsByStudent] = useState({});
  const [studentDirectoryPage, setStudentDirectoryPage] = useState({
    items: [],
    total: 0,
    limit: TABLE_PAGE_SIZE,
    offset: 0,
  });
  const [studentDirectoryOffset, setStudentDirectoryOffset] = useState(0);
  const [classroomStudentPage, setClassroomStudentPage] = useState({
    items: [],
    total: 0,
    limit: TABLE_PAGE_SIZE,
    offset: 0,
  });
  const [classroomStudentOffset, setClassroomStudentOffset] = useState(0);
  const [lessons, setLessons] = useState([]);
  const [grades, setGrades] = useState([]);
  const [gradeRecordPage, setGradeRecordPage] = useState({
    items: [],
    total: 0,
    limit: TABLE_PAGE_SIZE,
    offset: 0,
  });
  const [gradeRecordOffset, setGradeRecordOffset] = useState(0);
  const [attendanceRecordPage, setAttendanceRecordPage] = useState({
    items: [],
    total: 0,
    limit: TABLE_PAGE_SIZE,
    offset: 0,
  });
  const [attendanceRecordOffset, setAttendanceRecordOffset] = useState(0);
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [homeworkPage, setHomeworkPage] = useState({
    items: [],
    total: 0,
    limit: TABLE_PAGE_SIZE,
    offset: 0,
  });
  const [homeworkOffset, setHomeworkOffset] = useState(0);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [isGeneratingWeeklySummary, setIsGeneratingWeeklySummary] =
    useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [classroomForm, setClassroomForm] = useState({
    grade_level: "",
    section: "",
  });
  const [classroomEditForm, setClassroomEditForm] = useState({
    grade_level: "",
    section: "",
  });
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [studentEditForm, setStudentEditForm] = useState(emptyStudentEditForm);
  const [editingStudent, setEditingStudent] = useState(null);
  const [lessonForm, setLessonForm] = useState({ name: "" });
  const [lessonEditForm, setLessonEditForm] = useState({ name: "" });
  const [editingLesson, setEditingLesson] = useState(null);
  const [gradeForm, setGradeForm] = useState({
    student_id: "",
    lesson_id: "",
    exam_name: "",
    score: "",
  });
  const [gradeEditForm, setGradeEditForm] = useState({
    lesson_id: "",
    exam_name: "",
    score: "",
  });
  const [editingGrade, setEditingGrade] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({
    student_id: "",
    date: "",
    status: "present",
  });
  const [attendanceEditForm, setAttendanceEditForm] = useState({
    date: "",
    status: "present",
  });
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    classroom_id: "",
    lesson_id: "",
    weekday: "0",
    start_time: "",
    end_time: "",
    location: "",
  });
  const [editingScheduleEntry, setEditingScheduleEntry] = useState(null);
  const [homeworkForm, setHomeworkForm] = useState({
    classroom_id: "",
    lesson_id: "",
    title: "",
    description: "",
    due_date: "",
    status: "assigned",
  });
  const [editingHomework, setEditingHomework] = useState(null);

  const selectedClassroom = classrooms.find(
    (classroom) => classroom.id === selectedClassroomId,
  );
  const normalizedAllStudents = allStudents.filter(Boolean);
  const selectedStudent = normalizedAllStudents.find(
    (student) => student.id === selectedStudentId,
  );
  const filteredStudents = normalizedAllStudents.filter((student) =>
    `${student.first_name} ${student.last_name}`
      .toLocaleLowerCase("tr")
      .includes(searchTerm.toLocaleLowerCase("tr")),
  );

  const gradeAverages = useMemo(() => {
    if (!profile?.grades?.length) return [];
    const grouped = profile.grades.reduce((acc, grade) => {
      const current = acc.get(grade.lesson_name) || {
        lessonName: grade.lesson_name,
        total: 0,
        count: 0,
      };
      current.total += Number(grade.score);
      current.count += 1;
      acc.set(grade.lesson_name, current);
      return acc;
    }, new Map());

    return Array.from(grouped.values()).map((item) => ({
      lessonName: item.lessonName,
      average: Math.round((item.total / item.count) * 100) / 100,
    }));
  }, [profile]);

  const overallAverage = useMemo(() => {
    if (!profile?.grades?.length) return "-";
    const total = profile.grades.reduce(
      (sum, grade) => sum + Number(grade.score),
      0,
    );
    return Math.round((total / profile.grades.length) * 10) / 10;
  }, [profile]);

  const attendanceRate = useMemo(() => {
    if (!profile?.attendance_summary?.total) return "-";
    return `%${Math.round((profile.attendance_summary.present / profile.attendance_summary.total) * 100)}`;
  }, [profile]);
  const studentOptions = useMemo(
    () =>
      students.map((student) => ({
        label: `${student.first_name} ${student.last_name}`,
        value: String(student.id),
      })),
    [students],
  );
  const lessonOptions = useMemo(
    () =>
      lessons.map((lesson) => ({
        label: lesson.name,
        value: String(lesson.id),
      })),
    [lessons],
  );
  const classroomOptions = useMemo(
    () =>
      classrooms.map((classroom) => ({
        label: `${classroom.name} Sınıfı`,
        value: String(classroom.id),
      })),
    [classrooms],
  );
  const attendanceStatusOptions = [
    { label: "Var", value: "present" },
    { label: "Yok", value: "absent" },
    { label: "Mazeretli", value: "excused" },
  ];
  const isGradeStudentLocked =
    activeModal === "grade" &&
    activePage === "studentDetail" &&
    selectedStudentId;
  const isAttendanceStudentLocked =
    activeModal === "attendance" &&
    activePage === "studentDetail" &&
    selectedStudentId;
  const teacherId = currentTeacher?.id || DEMO_TEACHER_ID;

  useEffect(() => {
    if (!authToken) {
      setIsCheckingAuth(false);
      return;
    }

    let isActive = true;
    api
      .getCurrentTeacher()
      .then((teacher) => {
        if (isActive) {
          setCurrentTeacher(teacher);
          setTeacherProfileForm({
            full_name: teacher.full_name,
            email: teacher.email,
            password: "",
          });
        }
      })
      .catch(() => {
        setAuthToken(null);
        setAuthTokenState(null);
        if (isActive) setCurrentTeacher(null);
      })
      .finally(() => {
        if (isActive) setIsCheckingAuth(false);
      });

    return () => {
      isActive = false;
    };
  }, [authToken]);

  async function loadInitialData() {
    setIsLoading(true);
    setError("");
    try {
      const [classroomData, lessonData, gradeData] = await Promise.all([
        api.listClassrooms(teacherId),
        api.listLessons(teacherId),
        api.listGrades(),
      ]);
      const studentPages = await Promise.all(
        classroomData.map((classroom) =>
          api.listStudentsPage(classroom.id, { limit: 500, offset: 0 }),
        ),
      );
      const studentCounts = classroomData.reduce((acc, classroom, index) => {
        acc[classroom.id] = studentPages[index].total;
        return acc;
      }, {});
      const allStudentData = studentPages.flatMap((page) => page.items);
      const aiOutputEntries = await Promise.all(
        allStudentData.map(async (student) => [
          student.id,
          await api.listAIOutputs(student.id).catch(() => []),
        ]),
      );
      setClassrooms(classroomData);
      setClassroomStudentCounts(studentCounts);
      setAllStudents(allStudentData);
      setAiOutputsByStudent(Object.fromEntries(aiOutputEntries));
      setLessons(lessonData);
      setGrades(gradeData);
      const schedulePage = await api.listScheduleEntriesPage(teacherId, {
        limit: 500,
        offset: 0,
      });
      setScheduleEntries(schedulePage.items);
      setSelectedClassroomId(
        (current) => current || classroomData[0]?.id || null,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadStudents(classroomId) {
    if (!classroomId) {
      setStudents([]);
      setSelectedStudentId(null);
      setProfile(null);
      return;
    }

    const studentPage = await api.listStudentsPage(classroomId, {
      limit: 500,
      offset: 0,
    });
    const studentData = studentPage.items;
    setStudents(studentData);
    setAllStudents((current) => {
      const otherClassStudents = current.filter(
        (student) => student.classroom_id !== classroomId,
      );
      return [...otherClassStudents, ...studentData].sort(
        (first, second) => first.id - second.id,
      );
    });
    setClassroomStudentCounts((current) => ({
      ...current,
      [classroomId]: studentPage.total,
    }));
    setSelectedStudentId((current) => {
      if (studentData.some((student) => student.id === current)) return current;
      return null;
    });
  }

  async function loadStudentDirectoryPage() {
    const page = await api.listStudentsPage(null, {
      limit: TABLE_PAGE_SIZE,
      offset: studentDirectoryOffset,
      search: searchTerm,
    });
    setStudentDirectoryPage(page);
  }

  async function loadClassroomStudentPage() {
    if (!selectedClassroomId) {
      setClassroomStudentPage({
        items: [],
        total: 0,
        limit: TABLE_PAGE_SIZE,
        offset: 0,
      });
      return;
    }

    const page = await api.listStudentsPage(selectedClassroomId, {
      limit: TABLE_PAGE_SIZE,
      offset: classroomStudentOffset,
    });
    setClassroomStudentPage(page);
  }

  async function loadProfile(studentId) {
    if (!studentId) {
      setProfile(null);
      return;
    }
    setProfile(await api.getStudentProfile(studentId));
  }

  async function loadGrades() {
    setGrades(await api.listGrades());
  }

  async function loadGradeRecordPage() {
    const page = await api.listGradesPage({
      classroomId: selectedClassroomId,
      limit: TABLE_PAGE_SIZE,
      offset: gradeRecordOffset,
    });
    setGradeRecordPage(page);
  }

  async function loadAttendanceRecordPage() {
    if (!selectedStudentId) {
      setAttendanceRecordPage({
        items: [],
        total: 0,
        limit: TABLE_PAGE_SIZE,
        offset: 0,
      });
      return;
    }

    const page = await api.listAttendancePage({
      studentId: selectedStudentId,
      limit: TABLE_PAGE_SIZE,
      offset: attendanceRecordOffset,
    });
    setAttendanceRecordPage(page);
  }

  async function loadScheduleEntries() {
    const page = await api.listScheduleEntriesPage(teacherId, {
      limit: 500,
      offset: 0,
    });
    setScheduleEntries(page.items);
  }

  async function loadHomeworkPage() {
    const page = await api.listHomeworksPage(teacherId, {
      limit: TABLE_PAGE_SIZE,
      offset: homeworkOffset,
    });
    setHomeworkPage(page);
  }

  useEffect(() => {
    if (!currentTeacher) return;
    loadInitialData();
  }, [currentTeacher]);

  useEffect(() => {
    loadStudents(selectedClassroomId).catch((err) => setError(err.message));
    setClassroomStudentOffset(0);
    setGradeRecordOffset(0);
    setSearchTerm("");
  }, [selectedClassroomId]);

  useEffect(() => {
    setAttendanceRecordOffset(0);
    loadProfile(selectedStudentId).catch((err) => setError(err.message));
  }, [selectedStudentId]);

  useEffect(() => {
    if (activePage !== "students") return;
    loadStudentDirectoryPage().catch((err) => setError(err.message));
  }, [activePage, searchTerm, studentDirectoryOffset]);

  useEffect(() => {
    if (activePage !== "classroomDetail") return;
    loadClassroomStudentPage().catch((err) => setError(err.message));
  }, [activePage, selectedClassroomId, classroomStudentOffset]);

  useEffect(() => {
    if (activePage !== "gradebook") return;
    loadGradeRecordPage().catch((err) => setError(err.message));
  }, [activePage, selectedClassroomId, gradeRecordOffset]);

  useEffect(() => {
    if (activePage !== "attendance") return;
    loadAttendanceRecordPage().catch((err) => setError(err.message));
  }, [activePage, selectedStudentId, attendanceRecordOffset]);

  useEffect(() => {
    if (activePage !== "schedule") return;
    loadScheduleEntries().catch((err) => setError(err.message));
  }, [activePage]);

  useEffect(() => {
    if (activePage !== "homework") return;
    loadHomeworkPage().catch((err) => setError(err.message));
  }, [activePage, homeworkOffset]);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  }

  async function runAction(callback) {
    setError("");
    try {
      await callback();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateClassroom(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!classroomForm.grade_level || !classroomForm.section)
        throw new Error("Sınıf düzeyi ve şube seçmelisin.");
      const classroomName = buildClassroomName(classroomForm);
      const created = await api.createClassroom({
        teacher_id: teacherId,
        name: classroomName,
        grade_level: classroomForm.grade_level.trim(),
      });
      setClassrooms((current) => [...current, created]);
      setClassroomStudentCounts((current) => ({ ...current, [created.id]: 0 }));
      setClassroomForm({ grade_level: "", section: "" });
      setSelectedClassroomId(created.id);
      setActiveModal(null);
      showNotice("Sınıf oluşturuldu.");
    });
  }

  async function handleUpdateClassroom(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!editingClassroom) throw new Error("Düzenlenecek sınıf bulunamadı.");
      if (!classroomEditForm.grade_level || !classroomEditForm.section)
        throw new Error("Sınıf düzeyi ve şube seçmelisin.");
      const classroomName = buildClassroomName(classroomEditForm);
      const updated = await api.updateClassroom(editingClassroom.id, {
        name: classroomName,
        grade_level: classroomEditForm.grade_level.trim(),
      });
      setClassrooms((current) =>
        current.map((classroom) =>
          classroom.id === updated.id ? updated : classroom,
        ),
      );
      setClassroomEditForm({ grade_level: "", section: "" });
      setEditingClassroom(null);
      setActiveModal(null);
      showNotice("Sınıf güncellendi.");
    });
  }

  async function handleDeleteClassroom(classroomId) {
    await runAction(async () => {
      const shouldDelete = window.confirm(
        "Bu sınıf silinsin mi? Sınıfa bağlı öğrenciler de silinebilir.",
      );
      if (!shouldDelete) return;

      const nextClassroom = classrooms.find(
        (classroom) => classroom.id !== classroomId,
      );
      await api.deleteClassroom(classroomId);
      setClassrooms((current) =>
        current.filter((classroom) => classroom.id !== classroomId),
      );
      setClassroomStudentCounts((current) => {
        const next = { ...current };
        delete next[classroomId];
        return next;
      });

      if (selectedClassroomId === classroomId) {
        setSelectedClassroomId(nextClassroom?.id || null);
        setActivePage("classrooms");
      }
      showNotice("Sınıf silindi.");
    });
  }

  async function handleCreateStudent(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!selectedClassroomId) throw new Error("Önce bir sınıf seçmelisin.");
      const created = await api.createStudent({
        classroom_id: selectedClassroomId,
        first_name: studentForm.first_name.trim(),
        last_name: studentForm.last_name.trim(),
        parent_full_name: studentForm.parent_full_name.trim() || null,
        parent_phone: studentForm.parent_phone.trim() || null,
        parent_email: studentForm.parent_email.trim() || null,
        home_address: studentForm.home_address.trim() || null,
        observation_notes: null,
      });
      setStudents((current) => [...current, created]);
      setAllStudents((current) => [...current, created]);
      setClassroomStudentCounts((current) => ({
        ...current,
        [selectedClassroomId]: (current[selectedClassroomId] || 0) + 1,
      }));
      setStudentForm(emptyStudentForm);
      setSelectedStudentId(created.id);
      setActiveModal(null);
      await loadClassroomStudentPage();
      await loadStudentDirectoryPage();
      showNotice("Öğrenci eklendi.");
    });
  }

  async function handleUpdateStudent(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!editingStudent) throw new Error("Düzenlenecek öğrenci bulunamadı.");
      const updated = await api.updateStudent(editingStudent.id, {
        first_name: studentEditForm.first_name.trim(),
        last_name: studentEditForm.last_name.trim(),
        parent_full_name: studentEditForm.parent_full_name.trim() || null,
        parent_phone: studentEditForm.parent_phone.trim() || null,
        parent_email: studentEditForm.parent_email.trim() || null,
        home_address: studentEditForm.home_address.trim() || null,
        observation_notes: editingStudent.observation_notes || null,
      });
      setStudents((current) =>
        current.map((student) =>
          student.id === updated.id ? updated : student,
        ),
      );
      setAllStudents((current) =>
        current.map((student) =>
          student.id === updated.id ? updated : student,
        ),
      );
      if (selectedStudentId === updated.id) await loadProfile(updated.id);
      await loadClassroomStudentPage();
      await loadStudentDirectoryPage();
      setStudentEditForm(emptyStudentEditForm);
      setEditingStudent(null);
      setActiveModal(null);
      showNotice("Öğrenci güncellendi.");
    });
  }

  async function handleDeleteStudent(studentId) {
    await runAction(async () => {
      const shouldDelete = window.confirm("Bu öğrenci silinsin mi?");
      if (!shouldDelete) return;

      await api.deleteStudent(studentId);
      const nextStudents = students.filter(
        (student) => student.id !== studentId,
      );
      setStudents(nextStudents);
      setAllStudents((current) =>
        current.filter((student) => student.id !== studentId),
      );
      await loadGrades();
      setClassroomStudentCounts((current) => ({
        ...current,
        [selectedClassroomId]: Math.max(
          (current[selectedClassroomId] || 1) - 1,
          0,
        ),
      }));
      if (selectedStudentId === studentId) {
        setSelectedStudentId(nextStudents[0]?.id || null);
      }
      await loadClassroomStudentPage();
      await loadStudentDirectoryPage();
      showNotice("Öğrenci silindi.");
    });
  }

  async function handleCreateLesson(event) {
    event.preventDefault();
    await runAction(async () => {
      const created = await api.createLesson({
        teacher_id: teacherId,
        name: lessonForm.name.trim(),
      });
      setLessons((current) => [...current, created]);
      setLessonForm({ name: "" });
      setActiveModal(null);
      showNotice("Ders eklendi.");
    });
  }

  async function handleUpdateLesson(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!editingLesson) throw new Error("Düzenlenecek ders bulunamadı.");
      const updated = await api.updateLesson(editingLesson.id, {
        name: lessonEditForm.name.trim(),
      });
      setLessons((current) =>
        current.map((lesson) => (lesson.id === updated.id ? updated : lesson)),
      );
      if (selectedStudentId) await loadProfile(selectedStudentId);
      setLessonEditForm({ name: "" });
      setEditingLesson(null);
      setActiveModal(null);
      showNotice("Ders güncellendi.");
    });
  }

  async function handleDeleteLesson(lessonId) {
    await runAction(async () => {
      const shouldDelete = window.confirm(
        "Bu ders ve bağlı notlar silinsin mi?",
      );
      if (!shouldDelete) return;

      await api.deleteLesson(lessonId);
      setLessons((current) =>
        current.filter((lesson) => lesson.id !== lessonId),
      );
      await loadGrades();
      if (selectedStudentId) await loadProfile(selectedStudentId);
      showNotice("Ders silindi.");
    });
  }

  async function handleCreateGrade(event) {
    event.preventDefault();
    await runAction(async () => {
      const studentId = isGradeStudentLocked
        ? selectedStudentId
        : Number(gradeForm.student_id);
      if (!studentId) throw new Error("Önce bir öğrenci seçmelisin.");
      await api.createGrade({
        student_id: studentId,
        lesson_id: Number(gradeForm.lesson_id),
        exam_name: gradeForm.exam_name.trim(),
        score: gradeForm.score,
      });
      setGradeForm({ student_id: "", lesson_id: "", exam_name: "", score: "" });
      setActiveModal(null);
      setSelectedStudentId(studentId);
      await loadGrades();
      await loadGradeRecordPage();
      await loadProfile(studentId);
      showNotice("Not kaydedildi.");
    });
  }

  async function handleUpdateGrade(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!editingGrade) throw new Error("Düzenlenecek not bulunamadı.");
      await api.updateGrade(editingGrade.id, {
        lesson_id: Number(gradeEditForm.lesson_id),
        exam_name: gradeEditForm.exam_name.trim(),
        score: gradeEditForm.score,
      });
      setGradeEditForm({ lesson_id: "", exam_name: "", score: "" });
      setEditingGrade(null);
      setActiveModal(null);
      await loadGrades();
      await loadGradeRecordPage();
      if (selectedStudentId) await loadProfile(selectedStudentId);
      showNotice("Not güncellendi.");
    });
  }

  async function handleDeleteGrade(gradeId) {
    await runAction(async () => {
      const shouldDelete = window.confirm("Bu not silinsin mi?");
      if (!shouldDelete) return;

      await api.deleteGrade(gradeId);
      await loadGrades();
      await loadGradeRecordPage();
      if (selectedStudentId) await loadProfile(selectedStudentId);
      showNotice("Not silindi.");
    });
  }

  async function handleCreateAttendance(event) {
    event.preventDefault();
    await runAction(async () => {
      const studentId = isAttendanceStudentLocked
        ? selectedStudentId
        : Number(attendanceForm.student_id);
      if (!studentId) throw new Error("Önce bir öğrenci seçmelisin.");
      await api.createAttendance({
        student_id: studentId,
        date: attendanceForm.date,
        status: attendanceForm.status,
      });
      setAttendanceForm({ student_id: "", date: "", status: "present" });
      setActiveModal(null);
      setSelectedStudentId(studentId);
      await loadProfile(studentId);
      await loadAttendanceRecordPage();
      showNotice("Devamsızlık kaydedildi.");
    });
  }

  async function handleUpdateAttendance(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!editingAttendance)
        throw new Error("Düzenlenecek devamsızlık kaydı bulunamadı.");
      await api.updateAttendance(editingAttendance.id, {
        date: attendanceEditForm.date,
        status: attendanceEditForm.status,
      });
      setAttendanceEditForm({ date: "", status: "present" });
      setEditingAttendance(null);
      setActiveModal(null);
      await loadProfile(selectedStudentId);
      await loadAttendanceRecordPage();
      showNotice("Devamsızlık güncellendi.");
    });
  }

  async function handleDeleteAttendance(attendanceId) {
    await runAction(async () => {
      const shouldDelete = window.confirm("Bu devamsızlık kaydı silinsin mi?");
      if (!shouldDelete) return;

      await api.deleteAttendance(attendanceId);
      await loadProfile(selectedStudentId);
      await loadAttendanceRecordPage();
      showNotice("Devamsızlık silindi.");
    });
  }

  async function handleCreateScheduleEntry(event) {
    event.preventDefault();
    await runAction(async () => {
      await api.createScheduleEntry({
        teacher_id: teacherId,
        classroom_id: Number(scheduleForm.classroom_id),
        lesson_id: Number(scheduleForm.lesson_id),
        weekday: Number(scheduleForm.weekday),
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        location: scheduleForm.location.trim() || null,
      });
      setScheduleForm({
        classroom_id: "",
        lesson_id: "",
        weekday: "0",
        start_time: "",
        end_time: "",
        location: "",
      });
      setActiveModal(null);
      await loadScheduleEntries();
      showNotice("Ders programı kaydı eklendi.");
    });
  }

  async function handleUpdateScheduleEntry(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!editingScheduleEntry)
        throw new Error("Düzenlenecek program kaydı bulunamadı.");
      await api.updateScheduleEntry(editingScheduleEntry.id, {
        classroom_id: Number(scheduleForm.classroom_id),
        lesson_id: Number(scheduleForm.lesson_id),
        weekday: Number(scheduleForm.weekday),
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        location: scheduleForm.location.trim() || null,
      });
      setEditingScheduleEntry(null);
      setActiveModal(null);
      await loadScheduleEntries();
      showNotice("Ders programı güncellendi.");
    });
  }

  async function handleDeleteScheduleEntry(entryId) {
    await runAction(async () => {
      await api.deleteScheduleEntry(entryId);
      await loadScheduleEntries();
      showNotice("Ders programı kaydı silindi.");
    });
  }

  async function handleCreateHomework(event) {
    event.preventDefault();
    await runAction(async () => {
      await api.createHomework({
        teacher_id: teacherId,
        classroom_id: Number(homeworkForm.classroom_id),
        lesson_id: Number(homeworkForm.lesson_id),
        title: homeworkForm.title.trim(),
        description: homeworkForm.description.trim() || null,
        due_date: homeworkForm.due_date,
        status: homeworkForm.status,
      });
      setHomeworkForm({
        classroom_id: "",
        lesson_id: "",
        title: "",
        description: "",
        due_date: "",
        status: "assigned",
      });
      setActiveModal(null);
      await loadHomeworkPage();
      showNotice("Ödev eklendi.");
    });
  }

  async function handleUpdateHomework(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!editingHomework) throw new Error("Düzenlenecek ödev bulunamadı.");
      await api.updateHomework(editingHomework.id, {
        classroom_id: Number(homeworkForm.classroom_id),
        lesson_id: Number(homeworkForm.lesson_id),
        title: homeworkForm.title.trim(),
        description: homeworkForm.description.trim() || null,
        due_date: homeworkForm.due_date,
        status: homeworkForm.status,
      });
      setEditingHomework(null);
      setActiveModal(null);
      await loadHomeworkPage();
      showNotice("Ödev güncellendi.");
    });
  }

  async function handleDeleteHomework(homeworkId) {
    await runAction(async () => {
      await api.deleteHomework(homeworkId);
      await loadHomeworkPage();
      showNotice("Ödev silindi.");
    });
  }

  async function handleGenerateWeeklySummary() {
    setIsGeneratingWeeklySummary(true);
    setError("");
    try {
      const summary = await api.generateWeeklySummary(
        teacherId,
        selectedClassroomId,
      );
      setWeeklySummary(summary);
      showNotice("Haftalık AI özeti oluşturuldu.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGeneratingWeeklySummary(false);
    }
  }

  async function handleLogin(credentials) {
    setError("");
    const session = await api.login(credentials);
    setAuthToken(session.access_token);
    setAuthTokenState(session.access_token);
    setCurrentTeacher({
      id: session.teacher_id,
      full_name: session.full_name,
      email: session.email,
    });
    setTeacherProfileForm({
      full_name: session.full_name,
      email: session.email,
      password: "",
    });
    showNotice("Giriş yapıldı.");
  }

  function handleLogout() {
    setAuthToken(null);
    setAuthTokenState(null);
    setCurrentTeacher(null);
    setClassrooms([]);
    setStudents([]);
    setAllStudents([]);
    setAiOutputsByStudent({});
    setLessons([]);
    setGrades([]);
    setScheduleEntries([]);
    setHomeworkPage({ items: [], total: 0, limit: TABLE_PAGE_SIZE, offset: 0 });
    setProfile(null);
    setSelectedClassroomId(null);
    setSelectedStudentId(null);
    setActivePage("dashboard");
  }

  async function handleUpdateTeacherProfile(event) {
    event.preventDefault();
    await runAction(async () => {
      const payload = {
        full_name: teacherProfileForm.full_name.trim(),
        email: teacherProfileForm.email.trim(),
      };
      if (teacherProfileForm.password.trim()) {
        payload.password_hash = teacherProfileForm.password.trim();
      }
      const updated = await api.updateTeacher(currentTeacher.id, payload);
      setCurrentTeacher(updated);
      setTeacherProfileForm({
        full_name: updated.full_name,
        email: updated.email,
        password: "",
      });
      showNotice("Profil güncellendi.");
    });
  }

  const shared = {
    activePage,
    aiOutputsByStudent,
    attendanceRecordOffset,
    attendanceRecordPage,
    allStudents,
    attendanceRate,
    classroomGradeFilter,
    classroomSearchTerm,
    classroomStudentCounts,
    classroomStudentPage,
    classroomStudentOffset,
    classrooms,
    classroomOptions,
    filteredStudents,
    gradeAverages,
    gradeRecordOffset,
    gradeRecordPage,
    grades,
    isStudentPickerOpen,
    homeworkForm,
    homeworkOffset,
    homeworkPage,
    homeworkStatusOptions,
    handleUpdateTeacherProfile,
    isGeneratingWeeklySummary,
    lessonOptions,
    lessons,
    overallAverage,
    profile,
    searchTerm,
    selectedClassroom,
    selectedClassroomId,
    selectedStudent,
    selectedStudentId,
    studentDirectoryOffset,
    studentDirectoryPage,
    setActiveModal,
    setActivePage,
    setAttendanceEditForm,
    setAttendanceRecordOffset,
    setClassroomGradeFilter,
    setClassroomSearchTerm,
    setClassroomEditForm,
    setClassroomStudentOffset,
    setEditingAttendance,
    setEditingClassroom,
    setEditingGrade,
    setEditingHomework,
    setEditingLesson,
    setEditingScheduleEntry,
    setEditingStudent,
    setGradeEditForm,
    setGradeForm,
    setGradeRecordOffset,
    setAttendanceForm,
    setHomeworkForm,
    setHomeworkOffset,
    setIsStudentPickerOpen,
    setLessonEditForm,
    setScheduleForm,
    setSearchTerm,
    setSelectedClassroomId,
    setSelectedStudentId,
    setTeacherProfileForm,
    setStudentDirectoryOffset,
    setStudentEditForm,
    students,
    scheduleEntries,
    scheduleForm,
    teacherProfileForm,
    weeklySummary,
    weekdayOptions,
    handleDeleteAttendance,
    handleDeleteClassroom,
    handleDeleteGrade,
    handleDeleteHomework,
    handleDeleteLesson,
    handleDeleteScheduleEntry,
    handleDeleteStudent,
    handleGenerateWeeklySummary,
  };

  if (isCheckingAuth) {
    return <StatusLine error="" isLoading notice="" />;
  }

  if (!currentTeacher) {
    return (
      <LoginPage error={error} onLogin={handleLogin} setError={setError} />
    );
  }

  return (
    <main>
      <Topbar
        currentTeacher={currentTeacher}
        onLogout={handleLogout}
        onToggleMobileNav={() => setIsMobileNavOpen((current) => !current)}
        setActivePage={setActivePage}
      />
      <Sidebar
        activePage={activePage}
        isCollapsed={isSidenavCollapsed}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        setActiveModal={setActiveModal}
        setActivePage={(page) => {
          setActivePage(page);
          setIsMobileNavOpen(false);
        }}
        toggleCollapsed={() => setIsSidenavCollapsed((current) => !current)}
      />
      {isMobileNavOpen && (
        <div
          className="sidenav-backdrop visible"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      <section className={`page${isSidenavCollapsed ? " collapsed-nav" : ""}`}>
        {activePage === "dashboard" && <DashboardPage {...shared} />}
        {activePage === "classrooms" && <ClassroomsPage {...shared} />}
        {activePage === "classroomDetail" && (
          <ClassroomDetailPage {...shared} />
        )}
        {activePage === "students" && <StudentsPage {...shared} />}
        {activePage === "gradebook" && <GradebookPage {...shared} />}
        {activePage === "studentDetail" && <StudentDetailPage {...shared} />}
        {activePage === "attendance" && <AttendancePage {...shared} />}
        {activePage === "schedule" && <SchedulePage {...shared} />}
        {activePage === "aiReports" && <AIReportsPage {...shared} />}
        {activePage === "profile" && <ProfilePage {...shared} />}
        <StatusLine isLoading={isLoading} notice={notice} error={error} />
      </section>

      {activeModal && (
        <Modal onClose={() => setActiveModal(null)}>
          {activeModal === "classroom" && (
            <FormPanel title="Sınıf Ekle" onSubmit={handleCreateClassroom}>
              <SearchableSelect
                label="Sınıf düzeyi"
                onChange={(value) =>
                  setClassroomForm((form) => ({ ...form, grade_level: value }))
                }
                options={gradeLevelOptions.map((gradeLevel) => ({
                  label: `${gradeLevel}. sınıf`,
                  value: gradeLevel,
                }))}
                placeholder="Sınıf düzeyi ara"
                value={classroomForm.grade_level}
              />
              <SearchableSelect
                label="Şube"
                onChange={(value) =>
                  setClassroomForm((form) => ({ ...form, section: value }))
                }
                options={sectionOptions.map((section) => ({
                  label: `${section} şubesi`,
                  value: section,
                }))}
                placeholder="Şube ara"
                value={classroomForm.section}
              />
              <button className="primary-button" type="submit">
                Sınıfı Kaydet
              </button>
            </FormPanel>
          )}
          {activeModal === "editClassroom" && (
            <FormPanel title="Sınıfı Düzenle" onSubmit={handleUpdateClassroom}>
              <SearchableSelect
                label="Sınıf düzeyi"
                onChange={(value) =>
                  setClassroomEditForm((form) => ({
                    ...form,
                    grade_level: value,
                  }))
                }
                options={gradeLevelOptions.map((gradeLevel) => ({
                  label: `${gradeLevel}. sınıf`,
                  value: gradeLevel,
                }))}
                placeholder="Sınıf düzeyi ara"
                value={classroomEditForm.grade_level}
              />
              <SearchableSelect
                label="Şube"
                onChange={(value) =>
                  setClassroomEditForm((form) => ({ ...form, section: value }))
                }
                options={sectionOptions.map((section) => ({
                  label: `${section} şubesi`,
                  value: section,
                }))}
                placeholder="Şube ara"
                value={classroomEditForm.section}
              />
              <button className="primary-button" type="submit">
                Değişiklikleri Kaydet
              </button>
            </FormPanel>
          )}
          {activeModal === "student" && (
            <FormPanel title="Öğrenci Ekle" onSubmit={handleCreateStudent}>
              <input
                onChange={(event) =>
                  setStudentForm((form) => ({
                    ...form,
                    first_name: event.target.value,
                  }))
                }
                placeholder="Ad"
                required
                value={studentForm.first_name}
              />
              <input
                onChange={(event) =>
                  setStudentForm((form) => ({
                    ...form,
                    last_name: event.target.value,
                  }))
                }
                placeholder="Soyad"
                required
                value={studentForm.last_name}
              />
              <input
                onChange={(event) =>
                  setStudentForm((form) => ({
                    ...form,
                    parent_full_name: event.target.value,
                  }))
                }
                placeholder="Veli ad soyad"
                value={studentForm.parent_full_name}
              />
              <input
                onChange={(event) =>
                  setStudentForm((form) => ({
                    ...form,
                    parent_phone: event.target.value,
                  }))
                }
                placeholder="Veli telefon"
                value={studentForm.parent_phone}
              />
              <input
                onChange={(event) =>
                  setStudentForm((form) => ({
                    ...form,
                    parent_email: event.target.value,
                  }))
                }
                placeholder="Veli e-posta"
                type="email"
                value={studentForm.parent_email}
              />
              <textarea
                onChange={(event) =>
                  setStudentForm((form) => ({
                    ...form,
                    home_address: event.target.value,
                  }))
                }
                placeholder="Öğrenci ev adresi"
                value={studentForm.home_address}
              />
              <button className="primary-button" type="submit">
                Öğrenciyi Kaydet
              </button>
            </FormPanel>
          )}
          {activeModal === "editStudent" && (
            <FormPanel title="Öğrenciyi Düzenle" onSubmit={handleUpdateStudent}>
              <input
                onChange={(event) =>
                  setStudentEditForm((form) => ({
                    ...form,
                    first_name: event.target.value,
                  }))
                }
                placeholder="Ad"
                required
                value={studentEditForm.first_name}
              />
              <input
                onChange={(event) =>
                  setStudentEditForm((form) => ({
                    ...form,
                    last_name: event.target.value,
                  }))
                }
                placeholder="Soyad"
                required
                value={studentEditForm.last_name}
              />
              <input
                onChange={(event) =>
                  setStudentEditForm((form) => ({
                    ...form,
                    parent_full_name: event.target.value,
                  }))
                }
                placeholder="Veli ad soyad"
                value={studentEditForm.parent_full_name}
              />
              <input
                onChange={(event) =>
                  setStudentEditForm((form) => ({
                    ...form,
                    parent_phone: event.target.value,
                  }))
                }
                placeholder="Veli telefon"
                value={studentEditForm.parent_phone}
              />
              <input
                onChange={(event) =>
                  setStudentEditForm((form) => ({
                    ...form,
                    parent_email: event.target.value,
                  }))
                }
                placeholder="Veli e-posta"
                type="email"
                value={studentEditForm.parent_email}
              />
              <textarea
                onChange={(event) =>
                  setStudentEditForm((form) => ({
                    ...form,
                    home_address: event.target.value,
                  }))
                }
                placeholder="Öğrenci ev adresi"
                value={studentEditForm.home_address}
              />
              <button className="primary-button" type="submit">
                Değişiklikleri Kaydet
              </button>
            </FormPanel>
          )}
          {activeModal === "lesson" && (
            <FormPanel title="Ders Ekle" onSubmit={handleCreateLesson}>
              <input
                onChange={(event) =>
                  setLessonForm({ name: event.target.value })
                }
                placeholder="Matematik"
                required
                value={lessonForm.name}
              />
              <button className="primary-button" type="submit">
                Dersi Kaydet
              </button>
            </FormPanel>
          )}
          {activeModal === "editLesson" && (
            <FormPanel title="Dersi Düzenle" onSubmit={handleUpdateLesson}>
              <input
                onChange={(event) =>
                  setLessonEditForm({ name: event.target.value })
                }
                placeholder="Matematik"
                required
                value={lessonEditForm.name}
              />
              <button className="primary-button" type="submit">
                Değişiklikleri Kaydet
              </button>
            </FormPanel>
          )}
          {activeModal === "grade" && (
            <FormPanel title="Not Gir" onSubmit={handleCreateGrade}>
              {isGradeStudentLocked ? (
                <input
                  aria-label="Not girilecek öğrenci"
                  readOnly
                  value={
                    selectedStudent
                      ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                      : ""
                  }
                />
              ) : (
                <SearchableSelect
                  label="Öğrenci"
                  onChange={(value) =>
                    setGradeForm((form) => ({
                      ...form,
                      student_id: value,
                    }))
                  }
                  options={studentOptions}
                  placeholder="Öğrenci ara"
                  value={gradeForm.student_id}
                />
              )}
              <SearchableSelect
                label="Ders"
                onChange={(value) =>
                  setGradeForm((form) => ({
                    ...form,
                    lesson_id: value,
                  }))
                }
                options={lessonOptions}
                placeholder="Ders ara"
                value={gradeForm.lesson_id}
              />
              <input
                onChange={(event) =>
                  setGradeForm((form) => ({
                    ...form,
                    exam_name: event.target.value,
                  }))
                }
                placeholder="1. Yazılı"
                required
                value={gradeForm.exam_name}
              />
              <input
                max="100"
                min="0"
                onChange={(event) =>
                  setGradeForm((form) => ({
                    ...form,
                    score: event.target.value,
                  }))
                }
                placeholder="85"
                required
                type="number"
                value={gradeForm.score}
              />
              <button className="primary-button" type="submit">
                Notu Kaydet
              </button>
            </FormPanel>
          )}
          {activeModal === "editGrade" && (
            <FormPanel title="Notu Düzenle" onSubmit={handleUpdateGrade}>
              <SearchableSelect
                label="Ders"
                onChange={(value) =>
                  setGradeEditForm((form) => ({
                    ...form,
                    lesson_id: value,
                  }))
                }
                options={lessonOptions}
                placeholder="Ders ara"
                value={gradeEditForm.lesson_id}
              />
              <input
                onChange={(event) =>
                  setGradeEditForm((form) => ({
                    ...form,
                    exam_name: event.target.value,
                  }))
                }
                placeholder="1. Yazılı"
                required
                value={gradeEditForm.exam_name}
              />
              <input
                max="100"
                min="0"
                onChange={(event) =>
                  setGradeEditForm((form) => ({
                    ...form,
                    score: event.target.value,
                  }))
                }
                placeholder="85"
                required
                type="number"
                value={gradeEditForm.score}
              />
              <button className="primary-button" type="submit">
                Değişiklikleri Kaydet
              </button>
            </FormPanel>
          )}
          {activeModal === "attendance" && (
            <FormPanel
              title="Devamsızlık Gir"
              onSubmit={handleCreateAttendance}
            >
              {isAttendanceStudentLocked ? (
                <input
                  aria-label="Devamsızlık girilecek öğrenci"
                  readOnly
                  value={
                    selectedStudent
                      ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                      : ""
                  }
                />
              ) : (
                <SearchableSelect
                  label="Öğrenci"
                  onChange={(value) =>
                    setAttendanceForm((form) => ({
                      ...form,
                      student_id: value,
                    }))
                  }
                  options={studentOptions}
                  placeholder="Öğrenci ara"
                  value={attendanceForm.student_id}
                />
              )}
              <input
                onChange={(event) =>
                  setAttendanceForm((form) => ({
                    ...form,
                    date: event.target.value,
                  }))
                }
                required
                type="date"
                value={attendanceForm.date}
              />
              <SearchableSelect
                label="Durum"
                onChange={(value) =>
                  setAttendanceForm((form) => ({
                    ...form,
                    status: value,
                  }))
                }
                options={attendanceStatusOptions}
                placeholder="Durum ara"
                value={attendanceForm.status}
              />
              <button className="primary-button" type="submit">
                Kaydet
              </button>
            </FormPanel>
          )}
          {activeModal === "editAttendance" && (
            <FormPanel
              title="Devamsızlığı Düzenle"
              onSubmit={handleUpdateAttendance}
            >
              <input
                onChange={(event) =>
                  setAttendanceEditForm((form) => ({
                    ...form,
                    date: event.target.value,
                  }))
                }
                required
                type="date"
                value={attendanceEditForm.date}
              />
              <SearchableSelect
                label="Durum"
                onChange={(value) =>
                  setAttendanceEditForm((form) => ({
                    ...form,
                    status: value,
                  }))
                }
                options={attendanceStatusOptions}
                placeholder="Durum ara"
                value={attendanceEditForm.status}
              />
              <button className="primary-button" type="submit">
                Değişiklikleri Kaydet
              </button>
            </FormPanel>
          )}
          {(activeModal === "schedule" || activeModal === "editSchedule") && (
            <FormPanel
              title={
                activeModal === "schedule"
                  ? "Ders Programı Ekle"
                  : "Ders Programını Düzenle"
              }
              onSubmit={
                activeModal === "schedule"
                  ? handleCreateScheduleEntry
                  : handleUpdateScheduleEntry
              }
            >
              <SearchableSelect
                label="Sınıf"
                onChange={(value) =>
                  setScheduleForm((form) => ({ ...form, classroom_id: value }))
                }
                options={classroomOptions}
                placeholder="Sınıf ara"
                value={scheduleForm.classroom_id}
              />
              <SearchableSelect
                label="Ders"
                onChange={(value) =>
                  setScheduleForm((form) => ({ ...form, lesson_id: value }))
                }
                options={lessonOptions}
                placeholder="Ders ara"
                value={scheduleForm.lesson_id}
              />
              <SearchableSelect
                label="Gün"
                onChange={(value) =>
                  setScheduleForm((form) => ({ ...form, weekday: value }))
                }
                options={schoolWeekdayOptions}
                placeholder="Gün ara"
                value={scheduleForm.weekday}
              />
              <SearchableSelect
                label="Ders saati"
                onChange={(value) =>
                  setScheduleForm((form) => ({
                    ...form,
                    ...splitScheduleSlot(value),
                  }))
                }
                options={scheduleSlotOptions}
                placeholder="Ders saati ara"
                value={scheduleSlotValue(scheduleForm)}
              />
              <input
                onChange={(event) =>
                  setScheduleForm((form) => ({
                    ...form,
                    location: event.target.value,
                  }))
                }
                placeholder="Derslik"
                value={scheduleForm.location}
              />
              <button className="primary-button" type="submit">
                Kaydet
              </button>
            </FormPanel>
          )}
          {(activeModal === "homework" || activeModal === "editHomework") && (
            <FormPanel
              title={activeModal === "homework" ? "Ödev Ekle" : "Ödevi Düzenle"}
              onSubmit={
                activeModal === "homework"
                  ? handleCreateHomework
                  : handleUpdateHomework
              }
            >
              <SearchableSelect
                label="Sınıf"
                onChange={(value) =>
                  setHomeworkForm((form) => ({ ...form, classroom_id: value }))
                }
                options={classroomOptions}
                placeholder="Sınıf ara"
                value={homeworkForm.classroom_id}
              />
              <SearchableSelect
                label="Ders"
                onChange={(value) =>
                  setHomeworkForm((form) => ({ ...form, lesson_id: value }))
                }
                options={lessonOptions}
                placeholder="Ders ara"
                value={homeworkForm.lesson_id}
              />
              <input
                onChange={(event) =>
                  setHomeworkForm((form) => ({
                    ...form,
                    title: event.target.value,
                  }))
                }
                placeholder="Ödev başlığı"
                required
                value={homeworkForm.title}
              />
              <textarea
                onChange={(event) =>
                  setHomeworkForm((form) => ({
                    ...form,
                    description: event.target.value,
                  }))
                }
                placeholder="Açıklama"
                value={homeworkForm.description}
              />
              <input
                onChange={(event) =>
                  setHomeworkForm((form) => ({
                    ...form,
                    due_date: event.target.value,
                  }))
                }
                required
                type="date"
                value={homeworkForm.due_date}
              />
              <SearchableSelect
                label="Durum"
                onChange={(value) =>
                  setHomeworkForm((form) => ({ ...form, status: value }))
                }
                options={homeworkStatusOptions}
                placeholder="Durum ara"
                value={homeworkForm.status}
              />
              <button className="primary-button" type="submit">
                Kaydet
              </button>
            </FormPanel>
          )}
        </Modal>
      )}
    </main>
  );
}

function LoginPage({ error, onLogin, setError }) {
  const [form, setForm] = useState({
    email: "eda@example.com",
    password: "demo12345",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await onLogin(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Teacher AI</p>
          <h1>Öğretmen Paneli</h1>
          <p className="login-copy">
            Öğrenci verileri artık kullanıcı oturumu ile korunur.
          </p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            E-posta
            <input
              autoComplete="email"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              required
              type="email"
              value={form.email}
            />
          </label>
          <label>
            Parola
            <input
              autoComplete="current-password"
              minLength={8}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              required
              type="password"
              value={form.password}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button
            className="primary-button"
            disabled={isSubmitting}
            type="submit"
          >
            <Icon name="login" />{" "}
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Topbar({ currentTeacher, onLogout, onToggleMobileNav, setActivePage }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="topbar">
      <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
        <button
          aria-label="Menüyü aç"
          className="sidenav-toggle"
          onClick={onToggleMobileNav}
          type="button"
        >
          <Icon name="menu" />
        </button>
        <div className="product-title">Teacher AI</div>
      </div>
      <div />
      <div className="topbar-actions user-menu-wrap">
        <button
          className="user-menu-trigger"
          onClick={() => setIsUserMenuOpen((current) => !current)}
          type="button"
        >
          <span>{currentTeacher.full_name}</span>
          <span className="avatar">{currentTeacher.full_name.slice(0, 1)}</span>
          <Icon name="expand_more" />
        </button>
        {isUserMenuOpen && (
          <div className="user-dropdown">
            <button
              onClick={() => {
                setActivePage("profile");
                setIsUserMenuOpen(false);
              }}
              type="button"
            >
              <Icon name="person" /> Profil
            </button>
            <button onClick={onLogout} type="button">
              <Icon name="logout" /> Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function Sidebar({
  activePage,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  setActiveModal,
  setActivePage,
  toggleCollapsed,
}) {
  const sidenavClassName = [
    "sidenav",
    isCollapsed ? "collapsed" : "",
    isMobileOpen ? "mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={sidenavClassName}>
      <button
        aria-label={isCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        className="sidenav-collapse-button"
        onClick={toggleCollapsed}
        type="button"
      >
        <Icon name="chevron_left" />
      </button>
      <nav className="nav-menu">
        <NavItem
          active={activePage === "dashboard"}
          icon="dashboard"
          label="Kontrol Paneli"
          onClick={() => setActivePage("dashboard")}
        />
        <NavItem
          active={activePage === "classrooms"}
          icon="school"
          label="Sınıflarım"
          onClick={() => setActivePage("classrooms")}
        />
        <NavItem
          active={activePage === "students" || activePage === "studentDetail"}
          icon="groups"
          label="Öğrencilerim"
          onClick={() => setActivePage("students")}
        />
        <NavItem
          active={activePage === "gradebook"}
          icon="grade"
          label="Not Defteri"
          onClick={() => setActivePage("gradebook")}
        />
        <NavItem
          active={activePage === "attendance"}
          icon="calendar_today"
          label="Devamsızlık"
          onClick={() => setActivePage("attendance")}
        />
        <NavItem
          active={activePage === "schedule"}
          icon="calendar_month"
          label="Ders Programı"
          onClick={() => setActivePage("schedule")}
        />
        <NavItem
          active={activePage === "aiReports"}
          icon="auto_awesome"
          label="AI Raporları"
          onClick={() => setActivePage("aiReports")}
        />
      </nav>

      <button
        className="outline-button add-class-button"
        onClick={() => setActiveModal("classroom")}
        type="button"
      >
        <Icon name="add" /> <span>Sınıf Ekle</span>
      </button>
    </aside>
  );
}

function DashboardPage({
  aiOutputsByStudent,
  allStudents,
  classroomStudentCounts,
  classrooms,
  grades,
  handleGenerateWeeklySummary,
  isGeneratingWeeklySummary,
  lessons,
  scheduleEntries,
  setActivePage,
  setSelectedClassroomId,
  setSelectedStudentId,
  weeklySummary,
}) {
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  const lessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons],
  );
  const todayWeekday = (new Date().getDay() + 6) % 7;
  const todaySchedule = scheduleEntries.filter(
    (entry) => entry.weekday === todayWeekday,
  );
  const studentsForAnalysis = allStudents.filter(Boolean);
  const gradesByStudent = useMemo(() => {
    return grades.reduce((acc, grade) => {
      const current = acc.get(grade.student_id) || [];
      current.push(Number(grade.score));
      acc.set(grade.student_id, current);
      return acc;
    }, new Map());
  }, [grades]);
  const studentAverages = useMemo(() => {
    return studentsForAnalysis.map((student) => {
      const scores = gradesByStudent.get(student.id) || [];
      const average = scores.length
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
        : null;
      const aiOutputs = aiOutputsByStudent[student.id] || [];
      return {
        ...student,
        average,
        gradeCount: scores.length,
        hasReport: aiOutputs.some((output) => output.output_type === "report_comment"),
        hasParentMessage: aiOutputs.some((output) => output.output_type === "parent_message"),
      };
    });
  }, [studentsForAnalysis, gradesByStudent, aiOutputsByStudent]);
  const overallAverageValue = studentAverages
    .filter((student) => student.average !== null)
    .reduce((sum, student, _, list) => sum + student.average / list.length, 0);
  const overallAverage = overallAverageValue
    ? Math.round(overallAverageValue * 10) / 10
    : "-";
  const riskStudents = studentAverages.filter(
    (student) => student.average !== null && student.average < 70,
  );
  const missingGradeStudents = studentAverages.filter(
    (student) => student.gradeCount === 0,
  );
  const aiPendingStudents = studentAverages.filter(
    (student) => !student.hasReport || !student.hasParentMessage,
  );
  const classBreakdown = classrooms.map((classroom) => {
    const classStudents = studentAverages.filter(
      (student) => student.classroom_id === classroom.id,
    );
    const classAverageList = classStudents.filter((student) => student.average !== null);
    const classAverage = classAverageList.length
      ? Math.round(
          (classAverageList.reduce((sum, student) => sum + student.average, 0) /
            classAverageList.length) *
            10,
        ) / 10
      : "-";
    return {
      classroom,
      average: classAverage,
      riskCount: classStudents.filter((student) => student.average !== null && student.average < 70).length,
      studentCount: classroomStudentCounts[classroom.id] || classStudents.length,
    };
  });
  const attentionStudents = [
    ...riskStudents.map((student) => ({
      ...student,
      reason: `Ortalama ${student.average}`,
      tone: "warning",
    })),
    ...missingGradeStudents.map((student) => ({
      ...student,
      reason: "Henüz not kaydı yok",
      tone: "neutral",
    })),
  ].slice(0, 5);

  const trendPoints = useMemo(() => {
    if (!grades.length) return [];
    const sorted = [...grades].sort(
      (first, second) => new Date(first.created_at) - new Date(second.created_at),
    );
    const bucketCount = Math.min(7, sorted.length);
    const bucketSize = Math.ceil(sorted.length / bucketCount);
    const points = [];
    for (let index = 0; index < sorted.length; index += bucketSize) {
      const bucket = sorted.slice(index, index + bucketSize);
      const average =
        bucket.reduce((sum, grade) => sum + Number(grade.score), 0) / bucket.length;
      const lastDate = new Date(bucket[bucket.length - 1].created_at);
      points.push({
        average: Math.round(average * 10) / 10,
        label: lastDate.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
      });
    }
    return points;
  }, [grades]);

  const chartWidth = 760;
  const chartHeight = 320;
  const chartPadding = { top: 24, right: 24, bottom: 36, left: 44 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const chartPoints = trendPoints.map((point, index) => {
    const x =
      chartPadding.left +
      (trendPoints.length > 1
        ? (index / (trendPoints.length - 1)) * plotWidth
        : plotWidth / 2);
    const y =
      chartPadding.top + plotHeight - (Math.max(0, Math.min(100, point.average)) / 100) * plotHeight;
    return { ...point, x, y };
  });
  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const areaPath = chartPoints.length
    ? `${linePath} L${chartPoints[chartPoints.length - 1].x.toFixed(1)} ${(chartPadding.top + plotHeight).toFixed(1)} L${chartPoints[0].x.toFixed(1)} ${(chartPadding.top + plotHeight).toFixed(1)} Z`
    : "";
  const chartGridLines = [0, 25, 50, 75, 100];

  return (
    <>
      <div className="dashboard-grid">
        <section className="stats-overview">
          <StatCard
            icon="groups"
            label="Toplam Öğrenci"
            trend={`${classrooms.length} sınıf`}
            value={studentsForAnalysis.length}
          />
          <StatCard
            icon="priority_high"
            label="Riskli Öğrenci"
            trend={riskStudents.length ? "Takip önerilir" : "Risk görünmüyor"}
            trendDirection={riskStudents.length ? "down" : "up"}
            value={riskStudents.length}
          />
          <StatCard
            icon="analytics"
            label="Sınıf Ortalaması"
            trend={`${grades.length} not kaydı`}
            value={overallAverage}
          />
          <StatCard
            icon="auto_awesome"
            label="AI Bekleyen"
            trend="Rapor veya veli mesajı eksik"
            value={aiPendingStudents.length}
          />
        </section>

        <section className="chart-card">
          <div className="section-heading">
            <h2>Akademik Performans Eğilimi</h2>
            <span className="analysis-chip">
              {trendPoints.length ? "Son not kayıtları" : "Veri yok"}
            </span>
          </div>
          {chartPoints.length > 1 ? (
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="Akademik performans grafiği"
            >
              <defs>
                <linearGradient
                  id="dashboard-chart-fill"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {chartGridLines.map((value) => {
                const y = chartPadding.top + plotHeight - (value / 100) * plotHeight;
                return (
                  <g key={value}>
                    <line
                      x1={chartPadding.left}
                      x2={chartWidth - chartPadding.right}
                      y1={y}
                      y2={y}
                      stroke="#dce9ff"
                    />
                    <text
                      x={chartPadding.left - 10}
                      y={y + 4}
                      fontSize="11"
                      fill="#8a8fa3"
                      textAnchor="end"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}
              <path d={areaPath} fill="url(#dashboard-chart-fill)" />
              <path d={linePath} fill="none" stroke="#4338ca" strokeWidth="3" strokeLinecap="round" />
              {chartPoints.map((point) => (
                <g key={point.label + point.x}>
                  <circle
                    className="chart-tooltip-dot"
                    cx={point.x}
                    cy={point.y}
                    r="4.5"
                    fill="#ffffff"
                    stroke="#4338ca"
                    strokeWidth="2.5"
                  />
                  <text
                    x={point.x}
                    y={chartHeight - 10}
                    fontSize="11"
                    fill="#8a8fa3"
                    textAnchor="middle"
                  >
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          ) : (
            <EmptyState
              icon="show_chart"
              text="Grafik için henüz yeterli not kaydı yok. Not eklendikçe eğilim burada görünecek."
            />
          )}
        </section>

        <section className="analysis-card attention-card">
          <div className="section-heading">
            <h2>Dikkat Gerektiren Öğrenciler</h2>
            <span className="analysis-chip">{attentionStudents.length} kayıt</span>
          </div>
          {attentionStudents.map((student) => (
            <button
              className="analysis-row"
              key={`${student.id}-${student.reason}`}
              onClick={() => {
                setSelectedStudentId(student.id);
                setActivePage("studentDetail");
              }}
              type="button"
            >
              <span>
                <strong>{student.first_name} {student.last_name}</strong>
                <small>{classroomById.get(student.classroom_id)?.name || "Sınıf yok"}</small>
              </span>
              <em className={student.tone}>{student.reason}</em>
            </button>
          ))}
          {!attentionStudents.length && (
            <EmptyState
              icon="task_alt"
              text="Şu an dikkat gerektiren öğrenci görünmüyor."
            />
          )}
        </section>

        <section className="analysis-card classroom-breakdown-card">
          <div className="section-heading">
            <h2>Sınıf Kırılımı</h2>
            <span className="analysis-chip">Özet</span>
          </div>
          <div className="breakdown-table">
            <span>Sınıf</span>
            <span>Öğrenci</span>
            <span>Ortalama</span>
            <span>Riskli</span>
            {classBreakdown.map((item) => (
              <button
                className="breakdown-row"
                key={item.classroom.id}
                onClick={() => {
                  setSelectedClassroomId(item.classroom.id);
                  setActivePage("classroomDetail");
                }}
                type="button"
              >
                <strong>{item.classroom.name}</strong>
                <span>{item.studentCount}</span>
                <span>{item.average}</span>
                <span>{item.riskCount}</span>
              </button>
            ))}
          </div>
          {!classBreakdown.length && (
            <EmptyState
              actionLabel="Sınıf Ekle"
              icon="school"
              onAction={() => setActivePage("classrooms")}
              text="Henüz sınıf yok. İlk sınıfını oluşturarak başlayabilirsin."
            />
          )}
        </section>

        <aside className="dashboard-side">
          <section className="ai-insights">
            <div className="section-heading">
              <h2>AI Haftalık Özet</h2>
              <button
                className="outline-button compact"
                disabled={isGeneratingWeeklySummary}
                onClick={handleGenerateWeeklySummary}
                type="button"
              >
                {isGeneratingWeeklySummary ? "Hazırlanıyor" : "Oluştur"}
              </button>
            </div>
            {weeklySummary ? (
              <>
                <Insight
                  tone="success"
                  title={weeklySummary.title}
                  text={weeklySummary.summary}
                />
                {(weeklySummary.attention_points || [])
                  .slice(0, 2)
                  .map((item) => (
                    <Insight
                      key={item}
                      tone="warning"
                      title="Dikkat"
                      text={item}
                    />
                  ))}
              </>
            ) : (
              <EmptyState
                icon="auto_awesome"
                text="Haftalık özet henüz oluşturulmadı."
              />
            )}
          </section>
          <section className="schedule-card">
            <div className="section-heading">
              <h2>Bugünkü Dersler</h2>
              <button
                className="outline-button compact"
                onClick={() => setActivePage("schedule")}
                type="button"
              >
                Aç
              </button>
            </div>
            {todaySchedule.map((entry, index) => (
              <ScheduleItem
                color={index % 2 ? "secondary" : "primary"}
                key={entry.id}
                time={entry.start_time.slice(0, 5)}
                title={`${classroomById.get(entry.classroom_id)?.name || "Sınıf"} ${lessonById.get(entry.lesson_id)?.name || "Ders"}`}
                subtitle={entry.location || "Derslik belirtilmedi"}
              />
            ))}
            {!todaySchedule.length && (
              <EmptyState
                icon="event_available"
                text="Bugün için ders programı yok."
              />
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function ClassroomsPage(props) {
  const {
    classroomGradeFilter,
    classroomSearchTerm,
    classroomStudentCounts,
    classrooms,
    handleDeleteClassroom,
    setActiveModal,
    setActivePage,
    setClassroomEditForm,
    setClassroomGradeFilter,
    setClassroomSearchTerm,
    setEditingClassroom,
    setSelectedClassroomId,
  } = props;
  const gradeLevels = Array.from(
    new Set(classrooms.map((classroom) => classroom.grade_level)),
  ).sort((first, second) => Number(first) - Number(second));
  const visibleClassrooms = classrooms.filter((classroom) => {
    const matchesSearch = classroom.name
      .toLocaleLowerCase("tr")
      .includes(classroomSearchTerm.toLocaleLowerCase("tr"));
    const matchesGrade =
      classroomGradeFilter === "all" ||
      classroom.grade_level === classroomGradeFilter;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="wide-page">
      <section className="classroom-management-grid">
        {visibleClassrooms.map((classroom) => (
          <article
            className="classroom-card clickable"
            key={classroom.id}
            onClick={() => {
              setSelectedClassroomId(classroom.id);
              setActivePage("classroomDetail");
            }}
          >
            <div className="classroom-icon">
              <Icon name="science" />
            </div>
            <div>
              <h3>{classroom.name} Sınıfı</h3>
              <p>{classroomStudentCounts[classroom.id] || 0} öğrenci</p>
            </div>
            <div className="classroom-card-actions">
              <button
                aria-label={`${classroom.name} sınıfını düzenle`}
                className="icon-action"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingClassroom(classroom);
                  setClassroomEditForm(classroomToForm(classroom));
                  setActiveModal("editClassroom");
                }}
                type="button"
              >
                <Icon name="edit" />
              </button>
              <button
                aria-label={`${classroom.name} sınıfını sil`}
                className="icon-action danger-action"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteClassroom(classroom.id);
                }}
                type="button"
              >
                <Icon name="delete" />
              </button>
            </div>
          </article>
        ))}
        <button
          className="new-class-dashed"
          onClick={() => setActiveModal("classroom")}
          type="button"
        >
          <Icon name="add_circle" /> Yeni Sınıf
        </button>
      </section>
    </div>
  );
}

function ClassroomDetailPage(props) {
  const {
    classroomStudentOffset,
    classroomStudentPage,
    isStudentPickerOpen,
    searchTerm,
    selectedClassroom,
    selectedStudent,
    selectedStudentId,
    setActiveModal,
    setActivePage,
    setClassroomStudentOffset,
    setEditingStudent,
    setIsStudentPickerOpen,
    setSearchTerm,
    setSelectedStudentId,
    setStudentEditForm,
    students,
    handleDeleteStudent,
  } = props;
  const filteredClassStudents = students.filter((student) =>
    `${student.first_name} ${student.last_name}`
      .toLocaleLowerCase("tr")
      .includes(searchTerm.toLocaleLowerCase("tr")),
  );

  return (
    <div className="wide-page">
      <section className="main-column">
        <div className="class-title-row">
          <div>
            <button
              className="link-button back-link"
              onClick={() => setActivePage("classrooms")}
              type="button"
            >
              <Icon name="arrow_back" /> Sınıflarıma dön
            </button>
            <h1>
              {selectedClassroom
                ? `${selectedClassroom.name} Sınıfı`
                : "Sınıf seç"}
            </h1>
            <p>{classroomStudentPage.total} kayıtlı öğrenci</p>
          </div>
          <button
            className="primary-button"
            onClick={() => setActiveModal("student")}
            type="button"
          >
            <Icon name="person_add" /> Öğrenci Ekle
          </button>
        </div>
        <StudentSearch
          filteredStudents={filteredClassStudents}
          isStudentPickerOpen={isStudentPickerOpen}
          searchTerm={searchTerm}
          selectedStudent={selectedStudent}
          selectedStudentId={selectedStudentId}
          setIsStudentPickerOpen={setIsStudentPickerOpen}
          setSearchTerm={setSearchTerm}
          setSelectedStudentId={setSelectedStudentId}
        />
        <StudentTable
          handleDeleteStudent={handleDeleteStudent}
          selectedStudentId={selectedStudentId}
          setActiveModal={setActiveModal}
          setEditingStudent={setEditingStudent}
          setSelectedStudentId={setSelectedStudentId}
          setStudentEditForm={setStudentEditForm}
          students={classroomStudentPage.items}
        />
        <PaginationControls
          limit={classroomStudentPage.limit}
          offset={classroomStudentOffset}
          setOffset={setClassroomStudentOffset}
          total={classroomStudentPage.total}
        />
      </section>
    </div>
  );
}

function StudentsPage({
  classrooms,
  searchTerm,
  selectedStudentId,
  setActiveModal,
  setActivePage,
  setEditingStudent,
  setGradeForm,
  setSearchTerm,
  setSelectedStudentId,
  setStudentDirectoryOffset,
  setStudentEditForm,
  studentDirectoryOffset,
  studentDirectoryPage,
  handleDeleteStudent,
}) {
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  return (
    <div className="wide-page">
      <section className="hero-card">
        <div>
          <h1>Öğrencilerim</h1>
          <p>Öğrenci profilleri, öğretmen yorumu ve detay kayıtları.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => setActiveModal("student")}
          type="button"
        >
          <Icon name="person_add" /> Öğrenci Ekle
        </button>
      </section>

      <div className="student-search">
        <Icon name="search" />
        <input
          onChange={(event) => {
            setStudentDirectoryOffset(0);
            setSearchTerm(event.target.value);
          }}
          placeholder="Öğrenci ara"
          value={searchTerm}
        />
        {searchTerm && (
          <button
            aria-label="Öğrenci aramasını temizle"
            className="clear-search-button"
            onClick={() => {
              setStudentDirectoryOffset(0);
              setSearchTerm("");
            }}
            type="button"
          >
            <Icon name="close" />
          </button>
        )}
      </div>

      <section className="student-table-card">
        <div className="students-head">
          <span>Öğrenci</span>
          <span>Sınıf</span>
          <span>Öğretmen Yorumu</span>
          <span>İşlem</span>
        </div>
        {studentDirectoryPage.items.map((student) => (
          <div
            className={
              student.id === selectedStudentId
                ? "students-row active"
                : "students-row"
            }
            key={student.id}
            onClick={() => {
              setSelectedStudentId(student.id);
              setGradeForm((form) => ({
                ...form,
                student_id: String(student.id),
              }));
              setActivePage("studentDetail");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedStudentId(student.id);
                setGradeForm((form) => ({
                  ...form,
                  student_id: String(student.id),
                }));
                setActivePage("studentDetail");
              }
            }}
            role="button"
            tabIndex={0}
          >
            <span className="student-name">
              <span className="student-avatar">
                {student.first_name[0]}
                {student.last_name[0]}
              </span>
              <strong>
                {student.first_name} {student.last_name}
              </strong>
            </span>
            <span>{classroomById.get(student.classroom_id)?.name || "-"}</span>
            <span>{student.observation_notes || "Yorum girilmedi."}</span>
            <span className="row-actions">
              <button
                aria-label={`${student.first_name} ${student.last_name} öğrencisini düzenle`}
                className="icon-action"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingStudent(student);
                  setStudentEditForm({
                    first_name: student.first_name,
                    last_name: student.last_name,
                    parent_full_name: student.parent_full_name || "",
                    parent_phone: student.parent_phone || "",
                    parent_email: student.parent_email || "",
                    home_address: student.home_address || "",
                    observation_notes: student.observation_notes || "",
                  });
                  setActiveModal("editStudent");
                }}
                type="button"
              >
                <Icon name="edit" />
              </button>
              <button
                aria-label={`${student.first_name} ${student.last_name} öğrencisini sil`}
                className="icon-action danger-action"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteStudent(student.id);
                }}
                type="button"
              >
                <Icon name="delete" />
              </button>
            </span>
          </div>
        ))}
        {!studentDirectoryPage.items.length && (
          <EmptyState icon="person_search" text="Öğrenci bulunamadı." />
        )}
      </section>
      <PaginationControls
        limit={studentDirectoryPage.limit}
        offset={studentDirectoryOffset}
        setOffset={setStudentDirectoryOffset}
        total={studentDirectoryPage.total}
      />
    </div>
  );
}

function GradebookPage({
  gradeRecordOffset,
  gradeRecordPage,
  handleDeleteGrade,
  handleDeleteLesson,
  grades,
  lessons,
  selectedStudentId,
  setActiveModal,
  setEditingGrade,
  setEditingLesson,
  setGradeEditForm,
  setGradeForm,
  setGradeRecordOffset,
  setLessonEditForm,
  setSelectedStudentId,
  students,
}) {
  const currentStudentIds = useMemo(
    () => new Set(students.map((student) => student.id)),
    [students],
  );
  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );
  const lessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons],
  );
  const visibleGrades = useMemo(
    () => grades.filter((grade) => currentStudentIds.has(grade.student_id)),
    [currentStudentIds, grades],
  );
  const studentLessonAverages = useMemo(() => {
    const grouped = visibleGrades.reduce((acc, grade) => {
      const key = `${grade.student_id}:${grade.lesson_id}`;
      const current = acc.get(key) || { total: 0, count: 0 };
      current.total += Number(grade.score);
      current.count += 1;
      acc.set(key, current);
      return acc;
    }, new Map());

    return new Map(
      Array.from(grouped.entries()).map(([key, item]) => [
        key,
        Math.round((item.total / item.count) * 10) / 10,
      ]),
    );
  }, [visibleGrades]);
  const lessonColumns = lessons.length
    ? ` repeat(${lessons.length}, minmax(100px, 1fr))`
    : "";
  const gradebookColumns = `minmax(180px, 1.4fr)${lessonColumns} 100px`;

  return (
    <div className="wide-page">
      <section className="hero-card">
        <div>
          <h1>Not Defteri</h1>
          <p>Öğrenci ders notlarını ve sınıf performansını takip et.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setGradeForm((form) => ({
              ...form,
              student_id: selectedStudentId ? String(selectedStudentId) : "",
            }));
            setActiveModal("grade");
          }}
          type="button"
        >
          <Icon name="upload" /> Not Gir
        </button>
      </section>
      <section className="card record-card">
        <div className="section-heading">
          <h2>Dersler</h2>
          <button
            className="outline-button compact"
            onClick={() => setActiveModal("lesson")}
            type="button"
          >
            <Icon name="add" /> Ders Ekle
          </button>
        </div>
        <div className="lesson-list">
          {lessons.map((lesson) => (
            <div className="lesson-row" key={lesson.id}>
              <strong>{lesson.name}</strong>
              <span className="row-actions">
                <button
                  aria-label={`${lesson.name} dersini düzenle`}
                  className="icon-action"
                  onClick={() => {
                    setEditingLesson(lesson);
                    setLessonEditForm({ name: lesson.name });
                    setActiveModal("editLesson");
                  }}
                  type="button"
                >
                  <Icon name="edit" />
                </button>
                <button
                  aria-label={`${lesson.name} dersini sil`}
                  className="icon-action danger-action"
                  onClick={() => handleDeleteLesson(lesson.id)}
                  type="button"
                >
                  <Icon name="delete" />
                </button>
              </span>
            </div>
          ))}
          {!lessons.length && <p className="empty-note">Henüz ders yok.</p>}
        </div>
      </section>
      <section className="student-table-card gradebook-card">
        <div
          className="gradebook-head"
          style={{ gridTemplateColumns: gradebookColumns }}
        >
          <span>Öğrenci</span>
          {lessons.map((lesson) => (
            <span key={lesson.id}>{lesson.name}</span>
          ))}
          <span>Durum</span>
        </div>
        {students.map((student) => (
          <button
            className={
              student.id === selectedStudentId
                ? "gradebook-row active"
                : "gradebook-row"
            }
            style={{ gridTemplateColumns: gradebookColumns }}
            key={student.id}
            onClick={() => {
              setSelectedStudentId(student.id);
              setGradeForm((form) => ({
                ...form,
                student_id: String(student.id),
              }));
            }}
            type="button"
          >
            <strong>
              {student.first_name} {student.last_name}
            </strong>
            {lessons.map((lesson) => (
              <span key={lesson.id}>
                {studentLessonAverages.get(`${student.id}:${lesson.id}`) || "-"}
              </span>
            ))}
            <span className="status-chip inline">
              {student.id === selectedStudentId ? "Seçili" : "Seç"}
            </span>
          </button>
        ))}
      </section>
      <section className="student-table-card grade-record-card">
        <div className="record-head grade-record-head">
          <span>Öğrenci</span>
          <span>Kayıt</span>
          <span>Ders</span>
          <span>Puan</span>
          <span>İşlem</span>
        </div>
        {gradeRecordPage.items.map((grade) => (
          <div className="record-row grade-record-row" key={grade.id}>
            <strong>
              {studentById.get(grade.student_id)?.first_name}{" "}
              {studentById.get(grade.student_id)?.last_name}
            </strong>
            <strong>{grade.exam_name}</strong>
            <span>{lessonById.get(grade.lesson_id)?.name || "Ders"}</span>
            <span>{grade.score}</span>
            <span className="row-actions">
              <button
                aria-label={`${grade.exam_name} notunu düzenle`}
                className="icon-action"
                onClick={() => {
                  setEditingGrade(grade);
                  setGradeEditForm({
                    lesson_id: String(grade.lesson_id),
                    exam_name: grade.exam_name,
                    score: String(grade.score),
                  });
                  setActiveModal("editGrade");
                }}
                type="button"
              >
                <Icon name="edit" />
              </button>
              <button
                aria-label={`${grade.exam_name} notunu sil`}
                className="icon-action danger-action"
                onClick={() => handleDeleteGrade(grade.id)}
                type="button"
              >
                <Icon name="delete" />
              </button>
            </span>
          </div>
        ))}
        {!gradeRecordPage.items.length && (
          <p className="empty-note">Henüz not kaydı yok.</p>
        )}
      </section>
      <PaginationControls
        limit={gradeRecordPage.limit}
        offset={gradeRecordOffset}
        setOffset={setGradeRecordOffset}
        total={gradeRecordPage.total}
      />
    </div>
  );
}

function StudentDetailPage({
  attendanceRate,
  gradeAverages,
  overallAverage,
  profile,
  selectedStudent,
  selectedStudentId,
  setActiveModal,
  setActivePage,
  setEditingGrade,
  setEditingStudent,
  setGradeEditForm,
  setGradeForm,
  setStudentEditForm,
  handleDeleteGrade,
}) {
  const gradesByLesson = useMemo(() => {
    if (!profile?.grades?.length) return [];
    const grouped = profile.grades.reduce((acc, grade) => {
      const current = acc.get(grade.lesson_name) || [];
      current.push(grade);
      acc.set(grade.lesson_name, current);
      return acc;
    }, new Map());

    return Array.from(grouped.entries()).map(([lessonName, grades]) => ({
      lessonName,
      grades,
      average:
        Math.round(
          (grades.reduce((sum, grade) => sum + Number(grade.score), 0) /
            grades.length) *
            10,
        ) / 10,
    }));
  }, [profile]);

  if (!selectedStudent || !profile) {
    return (
      <section className="hero-card">
        <div>
          <h1>Öğrenci Detayı</h1>
          <p>Detayları görmek için Öğrencilerim listesinden bir öğrenci seç.</p>
        </div>
        <button
          className="outline-button"
          onClick={() => setActivePage("students")}
          type="button"
        >
          <Icon name="arrow_back" /> Öğrencilere Dön
        </button>
      </section>
    );
  }

  return (
    <div className="wide-page">
      <section className="student-detail-hero">
        <div>
          <button
            className="link-button back-link"
            onClick={() => setActivePage("students")}
            type="button"
          >
            <Icon name="arrow_back" /> Öğrencilere dön
          </button>
          <h1>
            {profile.first_name} {profile.last_name}
          </h1>
          <p>
            {profile.classroom.name} Sınıfı · Öğrenci kayıt no: {profile.id}
          </p>
        </div>
        <div className="student-detail-actions">
          <button
            className="outline-button"
            onClick={() => {
              setEditingStudent(selectedStudent);
              setStudentEditForm({
                first_name: selectedStudent.first_name,
                last_name: selectedStudent.last_name,
                parent_full_name: selectedStudent.parent_full_name || "",
                parent_phone: selectedStudent.parent_phone || "",
                parent_email: selectedStudent.parent_email || "",
                home_address: selectedStudent.home_address || "",
                observation_notes: selectedStudent.observation_notes || "",
              });
              setActiveModal("editStudent");
            }}
            type="button"
          >
            <Icon name="edit" /> Öğrenciyi Düzenle
          </button>
          <button
            className="primary-button"
            onClick={() => {
              setGradeForm((form) => ({
                ...form,
                student_id: String(selectedStudentId),
              }));
              setActiveModal("grade");
            }}
            type="button"
          >
            <Icon name="upload" /> Not Gir
          </button>
        </div>
      </section>

      <section className="student-detail-stats">
        <StatCard
          icon="analytics"
          label="Genel Ortalama"
          trend="Kayıtlı notlar"
          value={overallAverage}
        />
        <StatCard
          icon="menu_book"
          label="Ders Sayısı"
          trend="Not girilen"
          value={gradesByLesson.length}
        />
        <StatCard
          icon="fact_check"
          label="Devam Oranı"
          trend="Seçili öğrenci"
          value={attendanceRate}
        />
      </section>

      <section className="student-detail-grid">
        <div className="detail-main">
          <section className="student-table-card">
            <div className="detail-section-head">
              <h2>Ders ve Notlar</h2>
              <span>{profile.grades.length} kayıt</span>
            </div>
            {gradesByLesson.map((lessonGroup) => (
              <div className="lesson-grade-group" key={lessonGroup.lessonName}>
                <div className="lesson-grade-summary">
                  <strong>{lessonGroup.lessonName}</strong>
                  <span>Ortalama: {lessonGroup.average}</span>
                </div>
                {lessonGroup.grades.map((grade) => (
                  <div className="student-grade-row" key={grade.id}>
                    <span>{grade.exam_name}</span>
                    <strong>{grade.score}</strong>
                    <span className="row-actions">
                      <button
                        aria-label={`${grade.exam_name} notunu düzenle`}
                        className="icon-action"
                        onClick={() => {
                          setEditingGrade(grade);
                          setGradeEditForm({
                            lesson_id: String(grade.lesson_id),
                            exam_name: grade.exam_name,
                            score: String(grade.score),
                          });
                          setActiveModal("editGrade");
                        }}
                        type="button"
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        aria-label={`${grade.exam_name} notunu sil`}
                        className="icon-action danger-action"
                        onClick={() => handleDeleteGrade(grade.id)}
                        type="button"
                      >
                        <Icon name="delete" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {!gradesByLesson.length && (
              <p className="empty-note">Bu öğrenci için henüz not kaydı yok.</p>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <section className="card detail-note-card">
            <div className="detail-section-head">
              <h2>Veli ve İletişim</h2>
            </div>
            <div className="contact-summary-list">
              <span>
                <strong>Veli</strong>
                {profile.parent_full_name || "-"}
              </span>
              <span>
                <strong>Telefon</strong>
                {profile.parent_phone || "-"}
              </span>
              <span>
                <strong>E-posta</strong>
                {profile.parent_email || "-"}
              </span>
              <span>
                <strong>Adres</strong>
                {profile.home_address || "-"}
              </span>
            </div>
          </section>

          <section className="card detail-note-card">
            <div className="detail-section-head">
              <h2>Öğretmen Yorumu</h2>
            </div>
            <p>
              {profile.observation_notes || "Henüz öğretmen yorumu girilmedi."}
            </p>
          </section>

          <section className="card detail-note-card">
            <div className="detail-section-head">
              <h2>Ders Ortalamaları</h2>
            </div>
            <div className="average-chips detail-average-chips">
              {gradeAverages.map((item) => (
                <span key={item.lessonName}>
                  {item.lessonName}: {item.average}
                </span>
              ))}
              {!gradeAverages.length && <p>Henüz ortalama yok.</p>}
            </div>
          </section>

          <section className="card detail-note-card">
            <div className="detail-section-head">
              <h2>Devamsızlık</h2>
            </div>
            <div className="attendance-summary-list">
              <span>Var: {profile.attendance_summary.present}</span>
              <span>Yok: {profile.attendance_summary.absent}</span>
              <span>Mazeretli: {profile.attendance_summary.excused}</span>
              <span>Toplam: {profile.attendance_summary.total}</span>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function AttendancePage({
  attendanceRecordOffset,
  attendanceRecordPage,
  attendanceRate,
  filteredStudents,
  handleDeleteAttendance,
  isStudentPickerOpen,
  profile,
  searchTerm,
  selectedStudent,
  selectedStudentId,
  setActiveModal,
  setAttendanceEditForm,
  setAttendanceRecordOffset,
  setEditingAttendance,
  setAttendanceForm,
  setIsStudentPickerOpen,
  setSearchTerm,
  setSelectedStudentId,
}) {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const attendanceByDate = useMemo(
    () =>
      new Map(
        (profile?.attendance_records || []).map((attendance) => [
          attendance.date,
          attendance,
        ]),
      ),
    [profile],
  );
  const calendarDays = useMemo(
    () => buildMonthDays(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );

  function changeMonth(direction) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  function handleCalendarDayClick(date) {
    const dateValue = formatLocalDate(date);
    const attendance = attendanceByDate.get(dateValue);

    if (attendance) {
      setEditingAttendance(attendance);
      setAttendanceEditForm({
        date: attendance.date,
        status: attendance.status,
      });
      setActiveModal("editAttendance");
      return;
    }

    setAttendanceForm({
      student_id: selectedStudentId ? String(selectedStudentId) : "",
      date: dateValue,
      status: "present",
    });
    setActiveModal("attendance");
  }

  return (
    <div className="wide-page attendance-page">
      <div className="attendance-title">
        <h1>Devamsızlık Takibi</h1>
      </div>

      <section className="attendance-calendar-layout">
        <div className="attendance-calendar-section">
          <section className="attendance-toolbar">
            <div className="attendance-student-picker">
              <StudentSearch
                filteredStudents={filteredStudents}
                isStudentPickerOpen={isStudentPickerOpen}
                searchTerm={searchTerm}
                selectedStudent={selectedStudent}
                selectedStudentId={selectedStudentId}
                setIsStudentPickerOpen={setIsStudentPickerOpen}
                setSearchTerm={setSearchTerm}
                setSelectedStudentId={setSelectedStudentId}
              />
            </div>
            <div className="attendance-toolbar-actions">
              <div className="calendar-controls">
                <button
                  aria-label="Önceki ay"
                  className="icon-action"
                  onClick={() => changeMonth(-1)}
                  type="button"
                >
                  <Icon name="chevron_left" />
                </button>
                <strong>
                  {monthNames[visibleMonth.getMonth()]}{" "}
                  {visibleMonth.getFullYear()}
                </strong>
                <button
                  aria-label="Sonraki ay"
                  className="icon-action"
                  onClick={() => changeMonth(1)}
                  type="button"
                >
                  <Icon name="chevron_right" />
                </button>
              </div>
            </div>
          </section>

          <div className="attendance-calendar-card">
            <div className="calendar-weekdays">
              {weekDays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((date, index) =>
                date ? (
                  <button
                    className={
                      attendanceByDate.has(formatLocalDate(date))
                        ? `calendar-day ${attendanceByDate.get(formatLocalDate(date)).status}`
                        : "calendar-day"
                    }
                    key={formatLocalDate(date)}
                    onClick={() => handleCalendarDayClick(date)}
                    type="button"
                  >
                    <span>{date.getDate()}</span>
                    {attendanceByDate.has(formatLocalDate(date)) && (
                      <strong>
                        {
                          attendanceLabels[
                            attendanceByDate.get(formatLocalDate(date)).status
                          ]
                        }
                      </strong>
                    )}
                  </button>
                ) : (
                  <div className="calendar-day empty" key={`empty-${index}`} />
                ),
              )}
            </div>
          </div>
        </div>

        <aside className="attendance-summary-card">
          <h2>
            {selectedStudent
              ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
              : "Öğrenci seç"}
          </h2>
          <div className="attendance-summary-list">
            <span>Var: {profile?.attendance_summary?.present || 0}</span>
            <span>Yok: {profile?.attendance_summary?.absent || 0}</span>
            <span>Mazeretli: {profile?.attendance_summary?.excused || 0}</span>
            <span>Toplam: {profile?.attendance_summary?.total || 0}</span>
            <span>Devam Oranı: {attendanceRate}</span>
          </div>
        </aside>
      </section>

      <section className="student-table-card attendance-record-card">
        <div className="record-head">
          <span>Seçili Öğrenci Devamsızlıkları</span>
          <span>Tarih</span>
          <span>Durum</span>
          <span>İşlem</span>
        </div>
        {attendanceRecordPage.items.map((attendance) => (
          <div className="record-row" key={attendance.id}>
            <strong>
              {selectedStudent
                ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                : "Öğrenci"}
            </strong>
            <span>{attendance.date}</span>
            <span>{attendanceLabels[attendance.status]}</span>
            <span className="row-actions">
              <button
                aria-label={`${attendance.date} devamsızlık kaydını düzenle`}
                className="icon-action"
                onClick={() => {
                  setEditingAttendance(attendance);
                  setAttendanceEditForm({
                    date: attendance.date,
                    status: attendance.status,
                  });
                  setActiveModal("editAttendance");
                }}
                type="button"
              >
                <Icon name="edit" />
              </button>
              <button
                aria-label={`${attendance.date} devamsızlık kaydını sil`}
                className="icon-action danger-action"
                onClick={() => handleDeleteAttendance(attendance.id)}
                type="button"
              >
                <Icon name="delete" />
              </button>
            </span>
          </div>
        ))}
        {!attendanceRecordPage.items.length && (
          <p className="empty-note">
            {selectedStudent
              ? "Henüz devamsızlık kaydı yok."
              : "Öğrenci seçilmedi."}
          </p>
        )}
      </section>
      <PaginationControls
        limit={attendanceRecordPage.limit}
        offset={attendanceRecordOffset}
        setOffset={setAttendanceRecordOffset}
        total={attendanceRecordPage.total}
      />
    </div>
  );
}

function SchedulePage({
  classrooms,
  handleDeleteScheduleEntry,
  lessons,
  scheduleEntries,
  setActiveModal,
  setEditingScheduleEntry,
  setScheduleForm,
}) {
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  const lessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons],
  );
  const entryBySlot = useMemo(() => {
    const next = new Map();
    scheduleEntries.forEach((entry) => {
      next.set(
        `${entry.weekday}:${entry.start_time.slice(0, 5)}:${entry.end_time.slice(0, 5)}`,
        entry,
      );
    });
    return next;
  }, [scheduleEntries]);

  function openSlot(slot, weekday) {
    setScheduleForm({
      classroom_id: "",
      lesson_id: "",
      weekday: String(weekday),
      start_time: slot.start,
      end_time: slot.end,
      location: "",
    });
    setActiveModal("schedule");
  }

  function openEntry(entry) {
    setEditingScheduleEntry(entry);
    setScheduleForm({
      classroom_id: String(entry.classroom_id),
      lesson_id: String(entry.lesson_id),
      weekday: String(entry.weekday),
      start_time: entry.start_time.slice(0, 5),
      end_time: entry.end_time.slice(0, 5),
      location: entry.location || "",
    });
    setActiveModal("editSchedule");
  }

  return (
    <div className="wide-page">
      <section className="hero-card">
        <div>
          <h1>Ders Programı</h1>
          <p>
            Haftalık ders akışını sınıf, ders, saat ve derslik bazında takip et.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setScheduleForm({
              classroom_id: "",
              lesson_id: "",
              weekday: "0",
              start_time: "",
              end_time: "",
              location: "",
            });
            setActiveModal("schedule");
          }}
          type="button"
        >
          <Icon name="add" /> Ders Ekle
        </button>
      </section>

      <section className="school-schedule-card">
        <div className="school-schedule-grid">
          <div className="schedule-grid-head time-head">Saat</div>
          {schoolWeekDays.map((day) => (
            <div className="schedule-grid-head" key={day}>
              {day}
            </div>
          ))}
          {lessonSlots.map((slot) =>
            slot.part === "break" ? (
              <div className="schedule-break-row" key={slot.period}>
                <span>{slot.period}</span>
                <strong>
                  {slot.start} - {slot.end}
                </strong>
              </div>
            ) : (
              <ScheduleSlotRow
                classroomById={classroomById}
                entryBySlot={entryBySlot}
                handleDeleteScheduleEntry={handleDeleteScheduleEntry}
                key={slot.period}
                lessonById={lessonById}
                onOpenEntry={openEntry}
                onOpenSlot={openSlot}
                slot={slot}
              />
            ),
          )}
        </div>
      </section>
    </div>
  );
}

function ScheduleSlotRow({
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

function HomeworkPage({
  classroomOptions,
  classrooms,
  handleDeleteHomework,
  homeworkOffset,
  homeworkPage,
  homeworkStatusOptions,
  lessonOptions,
  lessons,
  setActiveModal,
  setEditingHomework,
  setHomeworkForm,
  setHomeworkOffset,
}) {
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  const lessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons],
  );

  return (
    <div className="wide-page">
      <section className="hero-card">
        <div>
          <h1>Ödev Takibi</h1>
          <p>Sınıf bazlı ödevleri, teslim tarihlerini ve durumlarını yönet.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setHomeworkForm({
              classroom_id: "",
              lesson_id: "",
              title: "",
              description: "",
              due_date: "",
              status: "assigned",
            });
            setActiveModal("homework");
          }}
          type="button"
        >
          <Icon name="assignment_add" /> Ödev Ekle
        </button>
      </section>

      <section className="student-table-card homework-card">
        <div className="record-head homework-record-head">
          <span>Ödev</span>
          <span>Sınıf</span>
          <span>Ders</span>
          <span>Teslim</span>
          <span>Durum</span>
          <span>İşlem</span>
        </div>
        {homeworkPage.items.map((homework) => (
          <div className="record-row homework-record-row" key={homework.id}>
            <strong>{homework.title}</strong>
            <span>{classroomById.get(homework.classroom_id)?.name || "-"}</span>
            <span>{lessonById.get(homework.lesson_id)?.name || "-"}</span>
            <span>{homework.due_date}</span>
            <span>{homeworkStatusLabels[homework.status]}</span>
            <span className="row-actions">
              <button
                aria-label={`${homework.title} ödevini düzenle`}
                className="icon-action"
                onClick={() => {
                  setEditingHomework(homework);
                  setHomeworkForm({
                    classroom_id: String(homework.classroom_id),
                    lesson_id: String(homework.lesson_id),
                    title: homework.title,
                    description: homework.description || "",
                    due_date: homework.due_date,
                    status: homework.status,
                  });
                  setActiveModal("editHomework");
                }}
                type="button"
              >
                <Icon name="edit" />
              </button>
              <button
                aria-label={`${homework.title} ödevini sil`}
                className="icon-action danger-action"
                onClick={() => handleDeleteHomework(homework.id)}
                type="button"
              >
                <Icon name="delete" />
              </button>
            </span>
          </div>
        ))}
        {!homeworkPage.items.length && (
          <p className="empty-note">Henüz ödev yok.</p>
        )}
      </section>
      <PaginationControls
        limit={homeworkPage.limit}
        offset={homeworkOffset}
        setOffset={setHomeworkOffset}
        total={homeworkPage.total}
      />
    </div>
  );
}

function AIReportsPage({
  filteredStudents,
  isStudentPickerOpen,
  profile,
  searchTerm,
  selectedStudent,
  selectedStudentId,
  setIsStudentPickerOpen,
  setSearchTerm,
  setSelectedStudentId,
}) {
  const [reportComment, setReportComment] = useState(null);
  const [reportCommentOutputId, setReportCommentOutputId] = useState(null);
  const [parentMessage, setParentMessage] = useState(null);
  const [parentMessageOutputId, setParentMessageOutputId] = useState(null);
  const [topicAnalysis, setTopicAnalysis] = useState(null);
  const [topicAnalysisOutputId, setTopicAnalysisOutputId] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingParentMessage, setIsGeneratingParentMessage] =
    useState(false);
  const [isGeneratingTopicAnalysis, setIsGeneratingTopicAnalysis] =
    useState(false);
  const [isSavingAIOutput, setIsSavingAIOutput] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiNotice, setAiNotice] = useState("");

  useEffect(() => {
    async function loadAIOutputs() {
      if (!selectedStudentId) {
        setReportComment(null);
        setReportCommentOutputId(null);
        setParentMessage(null);
        setParentMessageOutputId(null);
        setTopicAnalysis(null);
        setTopicAnalysisOutputId(null);
        return;
      }

      setAiError("");
      setAiNotice("");
      try {
        const outputs = await api.listAIOutputs(selectedStudentId);
        const latestReport = outputs.find(
          (output) => output.output_type === "report_comment",
        );
        const latestParentMessage = outputs.find(
          (output) => output.output_type === "parent_message",
        );
        const latestTopicAnalysis = outputs.find(
          (output) => output.output_type === "development_suggestion",
        );
        setReportComment(latestReport?.output_payload || null);
        setReportCommentOutputId(latestReport?.id || null);
        setParentMessage(latestParentMessage?.output_payload || null);
        setParentMessageOutputId(latestParentMessage?.id || null);
        setTopicAnalysis(latestTopicAnalysis?.output_payload || null);
        setTopicAnalysisOutputId(latestTopicAnalysis?.id || null);
      } catch (err) {
        setAiError(err.message);
      }
    }

    loadAIOutputs();
  }, [selectedStudentId]);

  function handleSelectStudent(studentId) {
    setSelectedStudentId(studentId);
    setReportComment(null);
    setReportCommentOutputId(null);
    setParentMessage(null);
    setParentMessageOutputId(null);
    setTopicAnalysis(null);
    setTopicAnalysisOutputId(null);
    setAiError("");
    setAiNotice("");
  }

  function updateReportComment(field, value) {
    setReportComment((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateReportCommentList(field, value) {
    updateReportComment(
      field,
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  function updateParentMessage(field, value) {
    setParentMessage((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateParentMessageList(field, value) {
    updateParentMessage(
      field,
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  function updateTopicAnalysis(field, value) {
    setTopicAnalysis((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateTopicAnalysisList(field, value) {
    updateTopicAnalysis(
      field,
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  async function generateReportComment() {
    if (!selectedStudentId) {
      setAiError("Önce bir öğrenci seçmelisin.");
      return;
    }

    setIsGeneratingReport(true);
    setAiError("");
    try {
      const output = await api.generateReportComment(selectedStudentId);
      setReportComment(output.output_payload);
      setReportCommentOutputId(output.id);
      setAiNotice("Karne yorumu oluşturuldu ve kaydedildi.");
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function generateParentMessage() {
    if (!selectedStudentId) {
      setAiError("Önce bir öğrenci seçmelisin.");
      return;
    }

    setIsGeneratingParentMessage(true);
    setAiError("");
    try {
      const output = await api.generateParentMessage(selectedStudentId);
      setParentMessage(output.output_payload);
      setParentMessageOutputId(output.id);
      setAiNotice("Veli mesajı hazırlandı ve kaydedildi.");
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsGeneratingParentMessage(false);
    }
  }

  async function generateTopicAnalysis() {
    if (!selectedStudentId) {
      setAiError("Önce bir öğrenci seçmelisin.");
      return;
    }

    setIsGeneratingTopicAnalysis(true);
    setAiError("");
    try {
      const output = await api.generateTopicAnalysis(selectedStudentId);
      setTopicAnalysis(output.output_payload);
      setTopicAnalysisOutputId(output.id);
      setAiNotice("Eksik konu analizi oluşturuldu ve kaydedildi.");
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsGeneratingTopicAnalysis(false);
    }
  }

  async function saveAIOutputEdits() {
    setIsSavingAIOutput(true);
    setAiError("");
    setAiNotice("");
    try {
      if (reportComment && reportCommentOutputId) {
        const output = await api.updateAIOutput(
          reportCommentOutputId,
          reportComment,
        );
        setReportComment(output.output_payload);
      }
      if (parentMessage && parentMessageOutputId) {
        const output = await api.updateAIOutput(
          parentMessageOutputId,
          parentMessage,
        );
        setParentMessage(output.output_payload);
      }
      if (topicAnalysis && topicAnalysisOutputId) {
        const output = await api.updateAIOutput(
          topicAnalysisOutputId,
          topicAnalysis,
        );
        setTopicAnalysis(output.output_payload);
      }
      setAiNotice("Düzenlemeler kaydedildi.");
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsSavingAIOutput(false);
    }
  }

  return (
    <div className="report-page">
      <section className="report-document">
        <h1>AI Karne Raporu</h1>
        <div className="report-student-picker">
          <StudentSearch
            filteredStudents={filteredStudents}
            isStudentPickerOpen={isStudentPickerOpen}
            searchTerm={searchTerm}
            selectedStudent={selectedStudent}
            selectedStudentId={selectedStudentId}
            setIsStudentPickerOpen={setIsStudentPickerOpen}
            setSearchTerm={setSearchTerm}
            setSelectedStudentId={handleSelectStudent}
          />
        </div>
        <p className="report-meta">
          Öğrenci:{" "}
          {selectedStudent
            ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
            : "Öğrenci seçilmedi"}
        </p>
        <div className="report-section">
          <h2>Karne Yorumu</h2>
          {reportComment ? (
            <div className="editable-ai-output">
              <label>
                Başlık
                <input
                  onChange={(event) =>
                    updateReportComment("title", event.target.value)
                  }
                  value={reportComment.title || ""}
                />
              </label>
              <label>
                Karne yorumu
                <textarea
                  onChange={(event) =>
                    updateReportComment("comment", event.target.value)
                  }
                  value={reportComment.comment || ""}
                />
              </label>
              <label>
                Güçlü yönler
                <textarea
                  onChange={(event) =>
                    updateReportCommentList("strengths", event.target.value)
                  }
                  value={(reportComment.strengths || []).join("\n")}
                />
              </label>
              <label>
                Gelişim alanları
                <textarea
                  onChange={(event) =>
                    updateReportCommentList("growth_areas", event.target.value)
                  }
                  value={(reportComment.growth_areas || []).join("\n")}
                />
              </label>
            </div>
          ) : (
            <p>Henüz karne yorumu oluşturulmadı.</p>
          )}
        </div>
        <div className="report-section">
          <h2>Eksik Konu Analizi</h2>
          {topicAnalysis ? (
            <div className="editable-ai-output">
              <label>
                Başlık
                <input
                  onChange={(event) =>
                    updateTopicAnalysis("title", event.target.value)
                  }
                  value={topicAnalysis.title || ""}
                />
              </label>
              <label>
                Özet
                <textarea
                  onChange={(event) =>
                    updateTopicAnalysis("summary", event.target.value)
                  }
                  value={topicAnalysis.summary || ""}
                />
              </label>
              <label>
                Eksik konular
                <textarea
                  onChange={(event) =>
                    updateTopicAnalysisList(
                      "missing_topics",
                      event.target.value,
                    )
                  }
                  value={(topicAnalysis.missing_topics || []).join("\n")}
                />
              </label>
              <label>
                Çalışma planı
                <textarea
                  onChange={(event) =>
                    updateTopicAnalysisList("practice_plan", event.target.value)
                  }
                  value={(topicAnalysis.practice_plan || []).join("\n")}
                />
              </label>
            </div>
          ) : (
            <p>Henüz eksik konu analizi oluşturulmadı.</p>
          )}
        </div>
        <div className="report-section">
          <h2>Veli Mesajı</h2>
          {parentMessage ? (
            <div className="editable-ai-output">
              <label>
                Konu
                <input
                  onChange={(event) =>
                    updateParentMessage("subject", event.target.value)
                  }
                  value={parentMessage.subject || ""}
                />
              </label>
              <label>
                Veli mesajı
                <textarea
                  onChange={(event) =>
                    updateParentMessage("message", event.target.value)
                  }
                  value={parentMessage.message || ""}
                />
              </label>
              <label>
                Sonraki adımlar
                <textarea
                  onChange={(event) =>
                    updateParentMessageList("next_steps", event.target.value)
                  }
                  value={(parentMessage.next_steps || []).join("\n")}
                />
              </label>
            </div>
          ) : (
            <p>Henüz veli mesajı hazırlanmadı.</p>
          )}
        </div>
      </section>
      <aside className="report-actions">
        <button
          className="primary-button full"
          disabled={isGeneratingReport}
          onClick={generateReportComment}
          type="button"
        >
          <Icon name="auto_awesome" />{" "}
          {isGeneratingReport ? "Oluşturuluyor..." : "Karne Yorumu Oluştur"}
        </button>
        <button
          className="outline-button full"
          disabled={isGeneratingParentMessage}
          onClick={generateParentMessage}
          type="button"
        >
          <Icon name="mail" />{" "}
          {isGeneratingParentMessage
            ? "Hazırlanıyor..."
            : "Veli Mesajı Hazırla"}
        </button>
        <button
          className="outline-button full"
          disabled={isGeneratingTopicAnalysis}
          onClick={generateTopicAnalysis}
          type="button"
        >
          <Icon name="psychology" />{" "}
          {isGeneratingTopicAnalysis
            ? "Analiz ediliyor..."
            : "Eksik Konu Analizi"}
        </button>
        <button
          className="outline-button full"
          onClick={() => window.print()}
          type="button"
        >
          <Icon name="download" /> PDF Dışa Aktar
        </button>
        <button
          className="outline-button full"
          disabled={
            isSavingAIOutput ||
            (!reportCommentOutputId &&
              !parentMessageOutputId &&
              !topicAnalysisOutputId)
          }
          onClick={saveAIOutputEdits}
          type="button"
        >
          <Icon name="save" />{" "}
          {isSavingAIOutput ? "Kaydediliyor..." : "Düzenlemeleri Kaydet"}
        </button>
        {aiNotice && <p className="empty-note success-note">{aiNotice}</p>}
        {aiError && <p className="empty-note">{aiError}</p>}
      </aside>
    </div>
  );
}

function ProfilePage({
  handleUpdateTeacherProfile,
  setTeacherProfileForm,
  teacherProfileForm,
}) {
  return (
    <div className="wide-page profile-page">
      <section className="hero-card">
        <div>
          <h1>Profil</h1>
          <p>Öğretmen hesabı ve giriş bilgileri.</p>
        </div>
      </section>
      <section className="student-table-card profile-card">
        <form className="profile-form" onSubmit={handleUpdateTeacherProfile}>
          <label>
            Ad soyad
            <input
              onChange={(event) =>
                setTeacherProfileForm((form) => ({
                  ...form,
                  full_name: event.target.value,
                }))
              }
              required
              value={teacherProfileForm.full_name}
            />
          </label>
          <label>
            E-posta
            <input
              onChange={(event) =>
                setTeacherProfileForm((form) => ({
                  ...form,
                  email: event.target.value,
                }))
              }
              required
              type="email"
              value={teacherProfileForm.email}
            />
          </label>
          <label>
            Yeni parola
            <input
              minLength={8}
              onChange={(event) =>
                setTeacherProfileForm((form) => ({
                  ...form,
                  password: event.target.value,
                }))
              }
              placeholder="Değiştirmek istemiyorsan boş bırak"
              type="password"
              value={teacherProfileForm.password}
            />
          </label>
          <button className="primary-button" type="submit">
            <Icon name="save" /> Profili Kaydet
          </button>
        </form>
      </section>
    </div>
  );
}

function PaginationControls({ limit, offset, setOffset, total }) {
  if (!total) return null;

  const start = offset + 1;
  const end = Math.min(offset + limit, total);
  const canGoBack = offset > 0;
  const canGoForward = offset + limit < total;

  return (
    <div className="pagination-controls">
      <span>
        {start}-{end} / {total}
      </span>
      <div>
        <button
          aria-label="Önceki sayfa"
          className="icon-action"
          disabled={!canGoBack}
          onClick={() => setOffset(Math.max(offset - limit, 0))}
          type="button"
        >
          <Icon name="chevron_left" />
        </button>
        <button
          aria-label="Sonraki sayfa"
          className="icon-action"
          disabled={!canGoForward}
          onClick={() => setOffset(offset + limit)}
          type="button"
        >
          <Icon name="chevron_right" />
        </button>
      </div>
    </div>
  );
}

function StudentSearch({
  filteredStudents,
  isStudentPickerOpen,
  searchTerm,
  selectedStudent,
  selectedStudentId,
  setIsStudentPickerOpen,
  setSearchTerm,
  setSelectedStudentId,
}) {
  const hasValue = Boolean(searchTerm || selectedStudentId);

  return (
    <div className="student-search">
      <Icon name="search" />
      <div className="student-combobox">
        <input
          aria-expanded={isStudentPickerOpen}
          aria-label="Öğrenci ara ve seç"
          onBlur={() =>
            window.setTimeout(() => setIsStudentPickerOpen(false), 140)
          }
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setIsStudentPickerOpen(true);
          }}
          onFocus={() => setIsStudentPickerOpen(true)}
          placeholder={
            selectedStudent
              ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
              : "Öğrenci ara"
          }
          value={searchTerm}
        />
        {hasValue && (
          <button
            aria-label="Öğrenci seçimini temizle"
            className="clear-search-button"
            onClick={() => {
              setSelectedStudentId(null);
              setSearchTerm("");
              setIsStudentPickerOpen(false);
            }}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <Icon name="close" />
          </button>
        )}
        {isStudentPickerOpen && (
          <div className="student-options" role="listbox">
            {filteredStudents.length ? (
              filteredStudents.map((student) => (
                <button
                  className={student.id === selectedStudentId ? "active" : ""}
                  key={student.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setSearchTerm(`${student.first_name} ${student.last_name}`);
                    setIsStudentPickerOpen(false);
                  }}
                  type="button"
                >
                  <strong>
                    {student.first_name} {student.last_name}
                  </strong>
                  <small>
                    {student.observation_notes || "Öğrenci profili"}
                  </small>
                </button>
              ))
            ) : (
              <div className="student-option-empty">Sonuç bulunamadı.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchableSelect({ label, onChange, options, placeholder, value }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const inputValue = isOpen ? query : selectedOption?.label || "";
  const filteredOptions = options.filter((option) =>
    option.label
      .toLocaleLowerCase("tr")
      .includes(query.toLocaleLowerCase("tr")),
  );
  const hasValue = Boolean(value || query);

  return (
    <div className="searchable-select">
      <label>{label}</label>
      <div className="searchable-select-control">
        <Icon name="search" />
        <input
          aria-expanded={isOpen}
          aria-label={`${label} ara ve seç`}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 140)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setIsOpen(true);
          }}
          placeholder={selectedOption?.label || placeholder}
          value={inputValue}
        />
        {hasValue ? (
          <button
            aria-label={`${label} seçimini temizle`}
            className="clear-search-button"
            onClick={() => {
              onChange("");
              setQuery("");
              setIsOpen(false);
            }}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <Icon name="close" />
          </button>
        ) : (
          <Icon name="expand_more" />
        )}
      </div>
      <input readOnly required type="hidden" value={value} />
      {isOpen && (
        <div className="searchable-select-options" role="listbox">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                className={option.value === value ? "active" : ""}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setQuery("");
                  setIsOpen(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="searchable-select-empty">Sonuç bulunamadı.</div>
          )}
        </div>
      )}
    </div>
  );
}

function StudentTable({
  handleDeleteStudent,
  selectedStudentId,
  setActiveModal,
  setEditingStudent,
  setSelectedStudentId,
  setStudentEditForm,
  students,
}) {
  return (
    <section className="student-table-card">
      <div className="table-head">
        <span>Öğrenci</span>
        <span>İşlem</span>
      </div>
      {students.map((student) => (
        <div
          className={
            student.id === selectedStudentId
              ? "student-row active"
              : "student-row"
          }
          key={student.id}
          onClick={() => setSelectedStudentId(student.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setSelectedStudentId(student.id);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <span className="student-name">
            <span className="student-avatar">
              {student.first_name[0]}
              {student.last_name[0]}
            </span>
            <span className="student-directory-info">
              <strong>
                {student.first_name} {student.last_name}
              </strong>
              {(student.parent_full_name ||
                student.parent_phone ||
                student.parent_email) && (
                <small>
                  {[
                    student.parent_full_name,
                    student.parent_phone,
                    student.parent_email,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              )}
            </span>
          </span>
          <span className="row-actions">
            <button
              aria-label={`${student.first_name} ${student.last_name} öğrencisini düzenle`}
              className="icon-action"
              onClick={(event) => {
                event.stopPropagation();
                setEditingStudent(student);
                setStudentEditForm({
                  first_name: student.first_name,
                  last_name: student.last_name,
                  parent_full_name: student.parent_full_name || "",
                  parent_phone: student.parent_phone || "",
                  parent_email: student.parent_email || "",
                  home_address: student.home_address || "",
                  observation_notes: student.observation_notes || "",
                });
                setActiveModal("editStudent");
              }}
              type="button"
            >
              <Icon name="edit" />
            </button>
            <button
              aria-label={`${student.first_name} ${student.last_name} öğrencisini sil`}
              className="icon-action danger-action"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteStudent(student.id);
              }}
              type="button"
            >
              <Icon name="delete" />
            </button>
          </span>
        </div>
      ))}
    </section>
  );
}

function StudentPreview({ gradeAverages, profile }) {
  return (
    <section className="student-preview">
      <div className="preview-header">
        <h2>
          Öğrenci Önizleme: {profile.first_name} {profile.last_name}
        </h2>
        <Icon name="person" />
      </div>
      <div className="preview-grid">
        <div className="trend-card">
          <h3>Not Eğilimi</h3>
          <svg
            viewBox="0 0 220 110"
            role="img"
            aria-label="Not eğilimi grafiği"
          >
            <path
              d="M10 88 L45 68 L80 78 L115 48 L155 38 L210 14 L210 105 L10 105 Z"
              fill="rgba(79,70,229,.12)"
            />
            <path
              d="M10 88 L45 68 L80 78 L115 48 L155 38 L210 14"
              fill="none"
              stroke="#4f46e5"
              strokeWidth="3"
            />
          </svg>
          <div className="average-chips">
            {gradeAverages.map((item) => (
              <span key={item.lessonName}>
                {item.lessonName}: {item.average}
              </span>
            ))}
          </div>
        </div>
        <div className="ai-card">
          <h3>
            <Icon name="lightbulb" /> Yapay Zeka İçgörüsü
          </h3>
          <p>
            {profile.first_name} için not ve devamsızlık verileri yorum
            üretimine hazır.
          </p>
        </div>
      </div>
    </section>
  );
}

function RightPanel({ selectedStudent, setActiveModal }) {
  return (
    <aside className="right-panel">
      <section className="quick-actions">
        <h2>Hızlı İşlemler</h2>
        <div className="quick-tabs">
          <button onClick={() => setActiveModal("student")} type="button">
            Öğrenci
          </button>
          <button onClick={() => setActiveModal("grade")} type="button">
            Not
          </button>
          <button onClick={() => setActiveModal("attendance")} type="button">
            Devam
          </button>
          <button type="button">AI</button>
        </div>
        <label>Hedef Öğrenci</label>
        <div className="selected-target">
          {selectedStudent
            ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
            : "Öğrenci seç"}
          <Icon name="expand_more" />
        </div>
        <button className="primary-button full" type="button">
          <Icon name="auto_awesome" /> Veli Mesajı Oluştur
        </button>
      </section>
      <section className="output-preview">
        <h3>
          <Icon name="auto_awesome" /> Çıktı Önizleme
        </h3>
        <p>
          “Sayın Velimiz, {selectedStudent?.first_name || "öğrencimiz"} son
          haftalarda ders içi katılımda ilerleme gösteriyor...”
        </p>
      </section>
    </aside>
  );
}

function StatCard({ icon, label, trend, trendDirection, value }) {
  const trendIcon =
    trendDirection === "up"
      ? "trending_up"
      : trendDirection === "down"
        ? "trending_down"
        : null;
  return (
    <div className="stat-card">
      <div className="stat-card-head">
        <span>{label}</span>
        <Icon name={icon} />
      </div>
      <strong>{value}</strong>
      <small>
        {trendIcon && (
          <span className={`stat-trend ${trendDirection}`}>
            <Icon name={trendIcon} />
          </span>
        )}
        {trend}
      </small>
    </div>
  );
}

function ScheduleItem({ color, subtitle, time, title }) {
  return (
    <div className={`schedule-item ${color}`}>
      <strong>{time}</strong>
      <div>
        <span>{title}</span>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}

function Icon({ name }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

function NavItem({ active = false, icon, label, onClick }) {
  return (
    <button
      className={active ? "nav-link active" : "nav-link"}
      onClick={onClick}
      type="button"
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function Insight({ text, title, tone }) {
  return (
    <div className={`insight ${tone}`}>
      <Icon name={tone === "warning" ? "warning" : "trending_up"} />
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

function StatusLine({ error, isLoading, notice }) {
  if (!isLoading && !notice && !error) return null;
  return (
    <div className="status-line">
      {isLoading && (
        <span>
          <span className="spinner" /> Yükleniyor
        </span>
      )}
      {notice && (
        <span className="success">
          <Icon name="check_circle" /> {notice}
        </span>
      )}
      {error && (
        <span className="danger">
          <Icon name="error" /> {error}
        </span>
      )}
    </div>
  );
}

function EmptyState({ actionLabel, icon = "inbox", onAction, text }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon name={icon} />
      </span>
      <p>{text}</p>
      {actionLabel && onAction && (
        <button className="link-button" onClick={onAction} type="button">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose} type="button">
          <Icon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}

function FormPanel({ children, onSubmit, title }) {
  return (
    <form className="form-panel" onSubmit={onSubmit}>
      <h2>{title}</h2>
      {children}
    </form>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
