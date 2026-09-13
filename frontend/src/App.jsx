import { useState, useEffect, useMemo } from "react";
import { api, setAuthToken } from "./api";
import { DEMO_TEACHER_ID, TABLE_PAGE_SIZE, emptyStudentEditForm, emptyStudentForm, gradeCategoryLabels, gradeCategoryOptions, gradeLevelOptions, schoolWeekdayOptions, sectionOptions, weekdayOptions } from "./constants";
import { buildClassroomName, formatLocalDate, scheduleSlotValue, splitScheduleSlot } from "./utils/helpers";
import { buildLessonSlots, loadStoredScheduleSettings, persistScheduleSettings, validateScheduleSettings } from "./utils/scheduleSettings";
import { assignedLessonsForClassroom, isAdmin as isAdminTeacher } from "./utils/permissions";
import AIReportsPage from "./pages/AIReportsPage";
import AttendancePage from "./pages/AttendancePage";
import ClassroomDetailPage from "./pages/ClassroomDetailPage";
import ClassroomsPage from "./pages/ClassroomsPage";
import DashboardPage from "./pages/DashboardPage";
import FormPanel from "./components/FormPanel";
import GradebookPage from "./pages/GradebookPage";
import Icon from "./components/Icon";
import HomeworkPage from "./pages/HomeworkPage";
import LoginPage from "./pages/LoginPage";
import Modal from "./components/Modal";
import ProfilePage from "./pages/ProfilePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SchedulePage from "./pages/SchedulePage";
import SearchableSelect from "./components/SearchableSelect";
import SettingsPage from "./pages/SettingsPage";
import TeachersPage from "./pages/TeachersPage";
import Sidebar from "./components/Sidebar";
import StatusLine from "./components/StatusLine";
import StudentDetailPage from "./pages/StudentDetailPage";
import StudentsPage from "./pages/StudentsPage";
import Topbar from "./components/Topbar";

export default function App() {
  const [resetToken] = useState(() => {
    if (window.location.pathname !== "/reset-password") return null;
    return new URLSearchParams(window.location.search).get("token");
  });
  // Mirrors the inline script in index.html, which applies the same stored
  // (or system) preference before React mounts to avoid a light-theme flash.
  const [theme, setTheme] = useState(() => {
    const stored = window.localStorage.getItem("teacherAi.theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [teacherProfileForm, setTeacherProfileForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
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
  const [studentDirectoryClassroomId, setStudentDirectoryClassroomId] = useState("");
  const [classroomStudentPage, setClassroomStudentPage] = useState({
    items: [],
    total: 0,
    limit: TABLE_PAGE_SIZE,
    offset: 0,
  });
  const [classroomStudentOffset, setClassroomStudentOffset] = useState(0);
  const [lessons, setLessons] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [activeAttendanceSession, setActiveAttendanceSession] = useState(null);
  const [attendanceRecordsDraft, setAttendanceRecordsDraft] = useState({});
  const [isLoadingAttendanceRecords, setIsLoadingAttendanceRecords] = useState(false);
  const [isSavingAttendanceRecords, setIsSavingAttendanceRecords] = useState(false);
  const [quickActionEntry, setQuickActionEntry] = useState(null);
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [teachersAdminList, setTeachersAdminList] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({
    teacher_id: "",
    classroom_id: "",
    lesson_id: "",
  });
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
    category: "sinav",
  });
  const [assessments, setAssessments] = useState([]);
  const [assessmentForm, setAssessmentForm] = useState({
    classroom_id: "",
    lesson_id: "",
    assessment_type: "sinav",
    title: "",
    description: "",
    date: "",
  });
  const [assessmentEditForm, setAssessmentEditForm] = useState({
    title: "",
    description: "",
    date: "",
  });
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [activeAssessmentId, setActiveAssessmentId] = useState(null);
  const [assessmentRecordsDraft, setAssessmentRecordsDraft] = useState({});
  const [isLoadingAssessmentRecords, setIsLoadingAssessmentRecords] = useState(false);
  const [isSavingAssessmentRecords, setIsSavingAssessmentRecords] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    classroom_id: "",
    lesson_id: "",
    weekday: "0",
    start_time: "",
    end_time: "",
    location: "",
  });
  const [editingScheduleEntry, setEditingScheduleEntry] = useState(null);
  const [scheduleSettings, setScheduleSettings] = useState(() => loadStoredScheduleSettings());

  useEffect(() => {
    persistScheduleSettings(scheduleSettings);
  }, [scheduleSettings]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      window.localStorage.setItem("teacherAi.theme", theme);
    } catch {
      // ignore (e.g. private browsing can throw on write)
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  // Single source of truth for the school's timetable: every period time
  // shown anywhere (Ders Programı's grid, the "Ders saati" picker in the
  // add/edit modal) is derived from scheduleSettings here, never hard-coded.
  const lessonSlots = useMemo(() => buildLessonSlots(scheduleSettings), [scheduleSettings]);
  const scheduleSlotOptions = useMemo(
    () =>
      lessonSlots
        .filter((slot) => slot.part !== "break")
        .map((slot) => ({
          label: `${slot.period} · ${slot.start} - ${slot.end}`,
          value: `${slot.start}|${slot.end}`,
        })),
    [lessonSlots],
  );

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
  const isAdminUser = isAdminTeacher(currentTeacher);
  const assignedLessonOptionsForClassroom = useMemo(
    () => (classroomId) =>
      assignedLessonsForClassroom(teacherAssignments, Number(classroomId), lessons).map((lesson) => ({
        label: lesson.name,
        value: String(lesson.id),
      })),
    [teacherAssignments, lessons],
  );
  const teacherId = currentTeacher?.id || DEMO_TEACHER_ID;

  useEffect(() => {
    // The access token never survives a reload (kept in memory only), so on
    // mount we always try to mint a fresh one from the httpOnly refresh cookie.
    let isActive = true;
    api
      .refreshSession()
      .then(() => {
        if (!isActive) return null;
        return api.getCurrentTeacher();
      })
      .then((teacher) => {
        if (isActive && teacher) {
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
        if (isActive) setCurrentTeacher(null);
      })
      .finally(() => {
        if (isActive) setIsCheckingAuth(false);
      });

    return () => {
      isActive = false;
    };
    // Runs once on mount only — re-authentication after logout happens via a
    // fresh load of the login page, not by re-running this effect.
  }, []);

  async function loadInitialData() {
    setIsLoading(true);
    setError("");
    try {
      const [classroomData, lessonData, gradeData, assignmentData, teachersData] = await Promise.all([
        api.listClassrooms(teacherId),
        api.listLessons(teacherId),
        api.listGrades(),
        api.listTeacherAssignments(teacherId),
        api.listTeachers(),
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
      setTeacherAssignments(assignmentData);
      setTeachersAdminList(teachersData);
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
    const page = await api.listStudentsPage(studentDirectoryClassroomId || null, {
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

  async function loadAssessments() {
    if (!selectedClassroomId) {
      setAssessments([]);
      return;
    }
    setAssessments(await api.listAssessments({ classroomId: selectedClassroomId, limit: 500, offset: 0 }));
  }

  async function loadAttendanceSessionRecords(sessionId) {
    setIsLoadingAttendanceRecords(true);
    try {
      const records = await api.listAttendanceSessionRecords(sessionId);
      const byStudentId = new Map(records.map((record) => [record.student_id, record]));
      const draft = {};
      students.forEach((student) => {
        draft[student.id] = { status: byStudentId.get(student.id)?.status || null };
      });
      setAttendanceRecordsDraft(draft);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingAttendanceRecords(false);
    }
  }

  // Tasarım gereği burada tutulan handler ileride Ders Programı'ndaki bir
  // ders slotuna tıklanınca da (schedule_entry_id vererek) çağrılabilecek
  // şekilde bağımsız parametrelerle çalışır — sayfa state'ine bağımlı değil.
  async function openOrCreateAttendanceSession({ classroomId, lessonId, date, scheduleEntryId, startTime }) {
    await runAction(async () => {
      const existingSessions = await api.listAttendanceSessions({
        classroomId,
        lessonId,
        date,
        limit: 50,
        offset: 0,
      });
      const session =
        (scheduleEntryId
          ? existingSessions.find((item) => item.schedule_entry_id === scheduleEntryId)
          : existingSessions[0]) ||
        (await api.createAttendanceSession({
          classroom_id: classroomId,
          lesson_id: lessonId,
          date,
          schedule_entry_id: scheduleEntryId || null,
          start_time: startTime || null,
        }));
      setActiveAttendanceSession(session);
      await loadAttendanceSessionRecords(session.id);
    });
  }

  function closeAttendanceSession() {
    setActiveAttendanceSession(null);
    setAttendanceRecordsDraft({});
  }

  function handleMarkAllPresent() {
    setAttendanceRecordsDraft((draft) => {
      const next = { ...draft };
      students.forEach((student) => {
        next[student.id] = { status: "present" };
      });
      return next;
    });
  }

  async function handleSaveAttendanceRecords() {
    if (!activeAttendanceSession) return;
    const unmarked = students.filter((student) => !attendanceRecordsDraft[student.id]?.status);
    if (unmarked.length) {
      setError(
        `${unmarked.length} öğrenci için durum seçilmedi: ${unmarked
          .map((student) => `${student.first_name} ${student.last_name}`)
          .join(", ")}`,
      );
      return;
    }
    setIsSavingAttendanceRecords(true);
    await runAction(async () => {
      const records = students.map((student) => ({
        student_id: student.id,
        status: attendanceRecordsDraft[student.id].status,
      }));
      await api.bulkUpsertAttendanceSessionRecords(activeAttendanceSession.id, records);
      showNotice("Yoklama kaydedildi.");
    });
    setIsSavingAttendanceRecords(false);
  }

  // Ders Programı'ndaki bir ders slotunun hızlı işlem menüsünden (Yoklama
  // Al / Değerlendirme Gir / Ödev Ver / Ders İçi Performans Gir) çağrılır —
  // hepsi mevcut Not Defteri/Ödevler/Devamsızlık akışlarını, o ScheduleEntry
  // context'iyle (sınıf, ders, saat) önceden doldurarak reuse eder; yeni bir
  // state/veri modeli oluşturmaz.
  function handleScheduleQuickAction(entry, action) {
    setActiveModal(null);
    setQuickActionEntry(null);
    const dateValue = formatLocalDate(new Date());

    if (action === "attendance") {
      setSelectedClassroomId(entry.classroom_id);
      setActivePage("attendance");
      openOrCreateAttendanceSession({
        classroomId: entry.classroom_id,
        lessonId: entry.lesson_id,
        date: dateValue,
        scheduleEntryId: entry.id,
        startTime: entry.start_time.slice(0, 5),
      });
      return;
    }

    const typeByAction = {
      assessment: "sinav",
      homework: "odev",
      performance: "ders_ici_performans",
    };
    setAssessmentForm((form) => ({
      ...form,
      classroom_id: String(entry.classroom_id),
      lesson_id: String(entry.lesson_id),
      assessment_type: typeByAction[action],
      title: "",
      description: "",
      date: dateValue,
    }));
    setActiveModal(action === "assessment" ? "newAssessment" : "newHomework");
  }

  async function loadScheduleEntries() {
    const page = await api.listScheduleEntriesPage(teacherId, {
      limit: 500,
      offset: 0,
    });
    setScheduleEntries(page.items);
  }

  async function loadTeachersAdminList() {
    setTeachersAdminList(await api.listTeachers());
  }

  useEffect(() => {
    if (!currentTeacher) return;
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeacher]);

  useEffect(() => {
    loadStudents(selectedClassroomId).catch((err) => setError(err.message));
    setClassroomStudentOffset(0);
    setSearchTerm("");
  }, [selectedClassroomId]);

  useEffect(() => {
    if (!selectedStudentId) {
      loadProfile(null).catch((err) => setError(err.message));
      return;
    }
    // Not Defteri/Ödevler/Devamsızlık'ta yapılan değişiklikler bu sayfaya
    // dönüldüğünde görünsün diye selectedStudentId aynı kalsa bile Öğrenci
    // Detay'a her girişte profili tazele.
    if (activePage !== "studentDetail") return;
    loadProfile(selectedStudentId).catch((err) => setError(err.message));
  }, [selectedStudentId, activePage]);

  useEffect(() => {
    if (activePage !== "students") return;
    loadStudentDirectoryPage().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, searchTerm, studentDirectoryOffset, studentDirectoryClassroomId]);

  useEffect(() => {
    setStudentDirectoryOffset(0);
  }, [studentDirectoryClassroomId]);

  useEffect(() => {
    if (activePage !== "classroomDetail") return;
    loadClassroomStudentPage().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, selectedClassroomId, classroomStudentOffset]);

  useEffect(() => {
    if (activePage !== "gradebook" && activePage !== "homework") return;
    setActiveAssessmentId(null);
    setAssessmentRecordsDraft({});
    loadAssessments().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, selectedClassroomId]);

  useEffect(() => {
    if (activePage !== "attendance") return;
    setActiveAttendanceSession(null);
    setAttendanceRecordsDraft({});
  }, [activePage, selectedClassroomId]);

  useEffect(() => {
    if (activePage !== "schedule") return;
    loadScheduleEntries().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  useEffect(() => {
    if (activePage !== "teachers" || !isAdminUser) return;
    loadTeachersAdminList().catch((err) => setError(err.message));
  }, [activePage, isAdminUser]);

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
      const classroomId = Number(studentForm.classroom_id) || null;
      if (!classroomId) throw new Error("Bir sınıf seçmelisin.");
      const created = await api.createStudent({
        classroom_id: classroomId,
        first_name: studentForm.first_name.trim(),
        last_name: studentForm.last_name.trim(),
        parent_full_name: studentForm.parent_full_name.trim() || null,
        parent_phone: studentForm.parent_phone.trim() || null,
        parent_email: studentForm.parent_email.trim() || null,
        home_address: studentForm.home_address.trim() || null,
        observation_notes: null,
      });
      setAllStudents((current) => [...current, created]);
      if (classroomId === selectedClassroomId) {
        setStudents((current) => [...current, created]);
      }
      setClassroomStudentCounts((current) => ({
        ...current,
        [classroomId]: (current[classroomId] || 0) + 1,
      }));
      setStudentForm(emptyStudentForm);
      setSelectedStudentId(created.id);
      setActiveModal(null);
      if (classroomId === selectedClassroomId) {
        await loadClassroomStudentPage();
      }
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
      const studentId = Number(gradeForm.student_id);
      if (!studentId) throw new Error("Önce bir öğrenci seçmelisin.");
      await api.createGrade({
        student_id: studentId,
        lesson_id: Number(gradeForm.lesson_id),
        exam_name: gradeForm.exam_name.trim(),
        score: gradeForm.score,
        category: gradeForm.category,
      });
      setGradeForm({ student_id: "", lesson_id: "", exam_name: "", score: "", category: "sinav" });
      setActiveModal(null);
      setSelectedStudentId(studentId);
      await loadGrades();
      await loadProfile(studentId);
      showNotice("Not kaydedildi.");
    });
  }

  async function handleCreateAssessment(event) {
    event.preventDefault();
    await runAction(async () => {
      const created = await api.createAssessment({
        classroom_id: Number(assessmentForm.classroom_id),
        lesson_id: Number(assessmentForm.lesson_id),
        assessment_type: assessmentForm.assessment_type,
        title: assessmentForm.title.trim(),
        description: assessmentForm.description.trim() || null,
        date: assessmentForm.date,
      });
      setAssessmentForm((form) => ({
        ...form,
        lesson_id: "",
        title: "",
        description: "",
        date: "",
      }));
      setActiveModal(null);
      await loadAssessments();
      await openAssessmentForEntry(created);
      showNotice("Değerlendirme oluşturuldu.");
    });
  }

  async function handleUpdateAssessment(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!editingAssessment) throw new Error("Düzenlenecek değerlendirme bulunamadı.");
      // Sınıf/ders/tür değiştirilemez — kayıtlar bu üçlüye göre girildiği
      // için değişmesi mevcut öğrenci sonuçlarını anlamsız kılar.
      await api.updateAssessment(editingAssessment.id, {
        title: assessmentEditForm.title.trim(),
        description: assessmentEditForm.description.trim() || null,
        date: assessmentEditForm.date,
      });
      setEditingAssessment(null);
      setActiveModal(null);
      await loadAssessments();
      showNotice("Değerlendirme güncellendi.");
    });
  }

  async function handleDeleteAssessment(assessmentId) {
    await runAction(async () => {
      const shouldDelete = window.confirm("Bu değerlendirme ve tüm öğrenci kayıtları silinsin mi?");
      if (!shouldDelete) return;

      await api.deleteAssessment(assessmentId);
      if (activeAssessmentId === assessmentId) {
        setActiveAssessmentId(null);
        setAssessmentRecordsDraft({});
      }
      await loadAssessments();
      showNotice("Değerlendirme silindi.");
    });
  }

  async function openAssessmentForEntry(assessment) {
    setActiveAssessmentId(assessment.id);
    setIsLoadingAssessmentRecords(true);
    try {
      const records = await api.listAssessmentRecords(assessment.id);
      const recordByStudentId = new Map(records.map((record) => [record.student_id, record]));
      // Hydrate every roster student, not just ones with an existing
      // record, so the table always reflects the full classroom.
      const draft = {};
      students.forEach((student) => {
        const record = recordByStudentId.get(student.id);
        draft[student.id] = {
          score: record?.score == null ? "" : String(record.score),
          is_completed: Boolean(record?.is_completed),
        };
      });
      setAssessmentRecordsDraft(draft);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingAssessmentRecords(false);
    }
  }

  function closeAssessmentEntry() {
    setActiveAssessmentId(null);
    setAssessmentRecordsDraft({});
  }

  async function handleSaveAssessmentRecords() {
    if (!activeAssessmentId) return;
    const isHomework = assessments.find((assessment) => assessment.id === activeAssessmentId)?.assessment_type === "odev";
    setIsSavingAssessmentRecords(true);
    await runAction(async () => {
      const records = Object.entries(assessmentRecordsDraft).map(([studentId, draft]) => ({
        student_id: Number(studentId),
        score: draft.score === "" ? null : draft.score,
        is_completed: isHomework ? draft.is_completed : null,
      }));
      await api.bulkUpsertAssessmentRecords(activeAssessmentId, records);
      showNotice("Notlar kaydedildi.");
    });
    setIsSavingAssessmentRecords(false);
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

  async function handleMoveScheduleEntry(entry, updates) {
    await runAction(async () => {
      await api.updateScheduleEntry(entry.id, {
        classroom_id: entry.classroom_id,
        lesson_id: entry.lesson_id,
        weekday: updates.weekday,
        start_time: updates.start_time,
        end_time: updates.end_time,
        location: entry.location,
      });
      await loadScheduleEntries();
      showNotice("Ders programı güncellendi.");
    });
  }

  async function handleCreateTeacherAssignment(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!assignmentForm.teacher_id || !assignmentForm.classroom_id) {
        throw new Error("Öğretmen ve sınıf seçmelisin.");
      }
      await api.createTeacherAssignment({
        teacher_id: Number(assignmentForm.teacher_id),
        classroom_id: Number(assignmentForm.classroom_id),
        lesson_id: assignmentForm.lesson_id ? Number(assignmentForm.lesson_id) : null,
      });
      setAssignmentForm({ teacher_id: "", classroom_id: "", lesson_id: "" });
      setActiveModal(null);
      await loadTeachersAdminList();
      showNotice("Atama oluşturuldu.");
    });
  }

  async function handleRemoveTeacherAssignment(assignmentId) {
    await runAction(async () => {
      await api.updateTeacherAssignment(assignmentId, { is_active: false });
      await loadTeachersAdminList();
      showNotice("Atama kaldırıldı.");
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
    const teacher = await api.getCurrentTeacher();
    setCurrentTeacher(teacher);
    setTeacherProfileForm({
      full_name: teacher.full_name,
      email: teacher.email,
      password: "",
    });
    showNotice("Giriş yapıldı.");
  }

  function handleLogout() {
    api.logout().catch(() => {});
    setAuthToken(null);
    setCurrentTeacher(null);
    setError("");
    setNotice("");
    setClassrooms([]);
    setStudents([]);
    setAllStudents([]);
    setAiOutputsByStudent({});
    setLessons([]);
    setTeacherAssignments([]);
    setGrades([]);
    setScheduleEntries([]);
    setAssessments([]);
    setProfile(null);
    setSelectedClassroomId(null);
    setSelectedStudentId(null);
    setActivePage("dashboard");
  }

  function handleUpdateScheduleSettings(nextSettings) {
    if (validateScheduleSettings(nextSettings).length > 0) return;
    setScheduleSettings(nextSettings);
    showNotice("Ders saatleri başarıyla güncellendi.");
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
    assignedLessonOptionsForClassroom,
    assignmentForm,
    currentTeacher,
    handleCreateTeacherAssignment,
    handleRemoveTeacherAssignment,
    isAdminUser,
    setAssignmentForm,
    teacherAssignments,
    teachersAdminList,
    activeAttendanceSession,
    attendanceRecordsDraft,
    isLoadingAttendanceRecords,
    isSavingAttendanceRecords,
    openOrCreateAttendanceSession,
    closeAttendanceSession,
    handleMarkAllPresent,
    handleSaveAttendanceRecords,
    setAttendanceRecordsDraft,
    quickActionEntry,
    setQuickActionEntry,
    handleScheduleQuickAction,
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
    gradeCategoryLabels,
    gradeCategoryOptions,
    grades,
    assessments,
    assessmentForm,
    assessmentEditForm,
    editingAssessment,
    activeAssessmentId,
    assessmentRecordsDraft,
    isLoadingAssessmentRecords,
    isSavingAssessmentRecords,
    setAssessmentForm,
    setAssessmentEditForm,
    setEditingAssessment,
    setAssessmentRecordsDraft,
    handleCreateAssessment,
    handleUpdateAssessment,
    handleDeleteAssessment,
    openAssessmentForEntry,
    closeAssessmentEntry,
    handleSaveAssessmentRecords,
    isStudentPickerOpen,
    handleUpdateScheduleSettings,
    handleUpdateTeacherProfile,
    isGeneratingWeeklySummary,
    lessonOptions,
    lessonSlots,
    lessons,
    overallAverage,
    profile,
    searchTerm,
    selectedClassroom,
    selectedClassroomId,
    selectedStudent,
    selectedStudentId,
    studentDirectoryClassroomId,
    studentDirectoryOffset,
    studentDirectoryPage,
    setActiveModal,
    setActivePage,
    setClassroomGradeFilter,
    setClassroomSearchTerm,
    setClassroomEditForm,
    setClassroomStudentOffset,
    setEditingClassroom,
    setEditingLesson,
    setEditingScheduleEntry,
    setEditingStudent,
    setGradeForm,
    setIsStudentPickerOpen,
    setLessonEditForm,
    setScheduleForm,
    setSearchTerm,
    setSelectedClassroomId,
    setSelectedStudentId,
    setTeacherProfileForm,
    setStudentDirectoryClassroomId,
    setStudentDirectoryOffset,
    setStudentEditForm,
    setStudentForm,
    students,
    scheduleEntries,
    scheduleForm,
    scheduleSettings,
    teacherProfileForm,
    weeklySummary,
    weekdayOptions,
    handleDeleteClassroom,
    handleDeleteLesson,
    handleDeleteScheduleEntry,
    handleMoveScheduleEntry,
    handleDeleteStudent,
    handleGenerateWeeklySummary,
  };

  if (resetToken) {
    return (
      <ResetPasswordPage
        onDone={() => {
          window.history.replaceState({}, "", "/");
          window.location.reload();
        }}
        token={resetToken}
      />
    );
  }

  if (isCheckingAuth) {
    return <StatusLine error="" isLoading notice="" />;
  }

  if (!currentTeacher) {
    return (
      <LoginPage error={error} onLogin={handleLogin} setError={setError} />
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Sidebar
        activePage={activePage}
        isAdminUser={isAdminUser}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        setActivePage={(page) => {
          setActivePage(page);
          setIsMobileNavOpen(false);
        }}
      />
      <div className="app-content-shell flex min-h-screen flex-col md:ml-[240px]">
        <Topbar
          allStudents={allStudents}
          classrooms={classrooms}
          currentTeacher={currentTeacher}
          onLogout={handleLogout}
          onToggleMobileNav={() => setIsMobileNavOpen((current) => !current)}
          onToggleTheme={toggleTheme}
          setActivePage={setActivePage}
          setSelectedClassroomId={setSelectedClassroomId}
          setSelectedStudentId={setSelectedStudentId}
          teachersAdminList={teachersAdminList}
          theme={theme}
        />

      <section className="page flex-1 p-4 md:p-container-padding">
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
        {activePage === "homework" && <HomeworkPage {...shared} />}
        {activePage === "aiReports" && <AIReportsPage {...shared} />}
        {activePage === "profile" && <ProfilePage {...shared} />}
        {activePage === "settings" && <SettingsPage {...shared} />}
        {activePage === "teachers" && isAdminUser && <TeachersPage {...shared} />}
        <StatusLine isLoading={isLoading} notice={notice} error={error} />
      </section>
      </div>

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
              <SearchableSelect
                label="Sınıf"
                onChange={(value) =>
                  setStudentForm((form) => ({ ...form, classroom_id: value }))
                }
                options={classroomOptions}
                placeholder="Sınıf ara"
                value={studentForm.classroom_id}
              />
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
              <SearchableSelect
                label="Ders"
                onChange={(value) =>
                  setGradeForm((form) => ({
                    ...form,
                    lesson_id: value,
                  }))
                }
                // Sadece bu sınıfta atanmış olduğun dersler — madde 6:
                // vermediğin bir ders dropdown'da bile görünmemeli.
                options={selectedClassroomId ? assignedLessonOptionsForClassroom(selectedClassroomId) : lessonOptions}
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
                step="0.1"
                type="number"
                value={gradeForm.score}
              />
              <SearchableSelect
                label="Kategori"
                onChange={(value) =>
                  setGradeForm((form) => ({
                    ...form,
                    category: value,
                  }))
                }
                options={gradeCategoryOptions}
                placeholder="Kategori ara"
                value={gradeForm.category}
              />
              <button className="primary-button" type="submit">
                Notu Kaydet
              </button>
            </FormPanel>
          )}
          {activeModal === "newAssessment" && (
            <FormPanel title="Yeni Değerlendirme" onSubmit={handleCreateAssessment}>
              <SearchableSelect
                label="Sınıf"
                onChange={(value) =>
                  setAssessmentForm((form) => ({ ...form, classroom_id: value, lesson_id: "" }))
                }
                options={classroomOptions}
                placeholder="Sınıf ara"
                value={assessmentForm.classroom_id}
              />
              <SearchableSelect
                label="Ders"
                onChange={(value) => setAssessmentForm((form) => ({ ...form, lesson_id: value }))}
                options={
                  assessmentForm.classroom_id
                    ? assignedLessonOptionsForClassroom(assessmentForm.classroom_id)
                    : lessonOptions
                }
                placeholder="Ders ara"
                value={assessmentForm.lesson_id}
              />
              <SearchableSelect
                label="Değerlendirme Türü"
                onChange={(value) => setAssessmentForm((form) => ({ ...form, assessment_type: value }))}
                options={gradeCategoryOptions}
                placeholder="Tür ara"
                value={assessmentForm.assessment_type}
              />
              <input
                onChange={(event) => setAssessmentForm((form) => ({ ...form, title: event.target.value }))}
                placeholder="1. Yazılı"
                required
                value={assessmentForm.title}
              />
              <textarea
                onChange={(event) => setAssessmentForm((form) => ({ ...form, description: event.target.value }))}
                placeholder="Açıklama (opsiyonel)"
                value={assessmentForm.description}
              />
              <input
                onChange={(event) => setAssessmentForm((form) => ({ ...form, date: event.target.value }))}
                required
                type="date"
                value={assessmentForm.date}
              />
              <button className="primary-button" type="submit">
                Değerlendirmeyi Oluştur
              </button>
            </FormPanel>
          )}
          {activeModal === "editAssessment" && (
            <FormPanel title="Değerlendirmeyi Düzenle" onSubmit={handleUpdateAssessment}>
              <p className="font-label-md text-label-md text-secondary">
                Sınıf: {classrooms.find((classroom) => classroom.id === editingAssessment?.classroom_id)?.name || "-"}
                {" · "}
                Ders: {lessons.find((lesson) => lesson.id === editingAssessment?.lesson_id)?.name || "-"}
                {" · "}
                Tür: {gradeCategoryLabels[editingAssessment?.assessment_type] || "-"}
              </p>
              <input
                onChange={(event) => setAssessmentEditForm((form) => ({ ...form, title: event.target.value }))}
                placeholder="1. Yazılı"
                required
                value={assessmentEditForm.title}
              />
              <textarea
                onChange={(event) =>
                  setAssessmentEditForm((form) => ({ ...form, description: event.target.value }))
                }
                placeholder="Açıklama (opsiyonel)"
                value={assessmentEditForm.description}
              />
              <input
                onChange={(event) => setAssessmentEditForm((form) => ({ ...form, date: event.target.value }))}
                required
                type="date"
                value={assessmentEditForm.date}
              />
              <button className="primary-button" type="submit">
                Değişiklikleri Kaydet
              </button>
            </FormPanel>
          )}
          {activeModal === "scheduleQuickActions" && quickActionEntry && (
            <div className="flex flex-col gap-1">
              <h2 className="mb-2 font-headline-sm text-headline-sm text-on-surface">
                {classrooms.find((classroom) => classroom.id === quickActionEntry.classroom_id)?.name || "Sınıf"} —{" "}
                {lessons.find((lesson) => lesson.id === quickActionEntry.lesson_id)?.name || "Ders"}
              </h2>
              <p className="mb-2 font-label-md text-label-md text-secondary">
                {quickActionEntry.start_time?.slice(0, 5)} – {quickActionEntry.end_time?.slice(0, 5)}
              </p>
              <button
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
                onClick={() => handleScheduleQuickAction(quickActionEntry, "attendance")}
                type="button"
              >
                <Icon name="fact_check" /> Yoklama Al
              </button>
              <button
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
                onClick={() => handleScheduleQuickAction(quickActionEntry, "assessment")}
                type="button"
              >
                <Icon name="history_edu" /> Değerlendirme Gir
              </button>
              <button
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
                onClick={() => handleScheduleQuickAction(quickActionEntry, "homework")}
                type="button"
              >
                <Icon name="assignment" /> Ödev Ver
              </button>
              <button
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
                onClick={() => handleScheduleQuickAction(quickActionEntry, "performance")}
                type="button"
              >
                <Icon name="insights" /> Ders İçi Performans Gir
              </button>
            </div>
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
                options={
                  scheduleForm.classroom_id
                    ? assignedLessonOptionsForClassroom(scheduleForm.classroom_id)
                    : lessonOptions
                }
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
          {activeModal === "newHomework" && (
            <FormPanel
              title={assessmentForm.assessment_type === "odev" ? "Ödev Ekle" : "Ders İçi Performans Ekle"}
              onSubmit={handleCreateAssessment}
            >
              <SearchableSelect
                label="Sınıf"
                onChange={(value) =>
                  setAssessmentForm((form) => ({ ...form, classroom_id: value, lesson_id: "" }))
                }
                options={classroomOptions}
                placeholder="Sınıf ara"
                value={assessmentForm.classroom_id}
              />
              <SearchableSelect
                label="Ders"
                onChange={(value) => setAssessmentForm((form) => ({ ...form, lesson_id: value }))}
                options={
                  assessmentForm.classroom_id
                    ? assignedLessonOptionsForClassroom(assessmentForm.classroom_id)
                    : lessonOptions
                }
                placeholder="Ders ara"
                value={assessmentForm.lesson_id}
              />
              <input
                onChange={(event) => setAssessmentForm((form) => ({ ...form, title: event.target.value }))}
                placeholder={assessmentForm.assessment_type === "odev" ? "Ödev başlığı" : "Başlık"}
                required
                value={assessmentForm.title}
              />
              <textarea
                onChange={(event) =>
                  setAssessmentForm((form) => ({ ...form, description: event.target.value }))
                }
                placeholder="Açıklama (opsiyonel)"
                value={assessmentForm.description}
              />
              <input
                onChange={(event) => setAssessmentForm((form) => ({ ...form, date: event.target.value }))}
                required
                type="date"
                value={assessmentForm.date}
              />
              <button className="primary-button" type="submit">
                {assessmentForm.assessment_type === "odev" ? "Ödevi Kaydet" : "Kaydet"}
              </button>
            </FormPanel>
          )}
          {activeModal === "assignTeacher" && (
            <FormPanel title="Ders / Sınıf Ata" onSubmit={handleCreateTeacherAssignment}>
              <SearchableSelect
                label="Öğretmen"
                onChange={(value) =>
                  setAssignmentForm((form) => ({ ...form, classroom_id: "", lesson_id: "", teacher_id: value }))
                }
                options={teachersAdminList.map((teacher) => ({
                  label: teacher.full_name,
                  value: String(teacher.id),
                }))}
                placeholder="Öğretmen ara"
                value={assignmentForm.teacher_id}
              />
              <SearchableSelect
                label="Sınıf"
                onChange={(value) =>
                  setAssignmentForm((form) => ({ ...form, lesson_id: "", classroom_id: value }))
                }
                options={classroomOptions}
                placeholder="Sınıf ara"
                value={assignmentForm.classroom_id}
              />
              <SearchableSelect
                label="Ders (boş bırakılırsa rehber ataması olur)"
                onChange={(value) =>
                  setAssignmentForm((form) => ({ ...form, lesson_id: value }))
                }
                options={lessonOptions}
                placeholder="Ders ara"
                value={assignmentForm.lesson_id}
              />
              <button className="primary-button" type="submit">
                Ata
              </button>
            </FormPanel>
          )}
        </Modal>
      )}
    </main>
  );
}
