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
import CurriculumPage from "./pages/CurriculumPage";
import DashboardPage from "./pages/DashboardPage";
import ConfirmDialog from "./components/ConfirmDialog";
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

function ModalSection({ children, title }) {
  return (
    <section className="modal-form-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function FormField({ children, label }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

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
  const [classroomTodayAbsentCount, setClassroomTodayAbsentCount] = useState(0);
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
  const [teacherForm, setTeacherForm] = useState({
    full_name: "",
    email: "",
    title: "",
    branch: "",
    role: "teacher",
    password: "",
  });
  const [latestTeacherInviteLink, setLatestTeacherInviteLink] = useState("");
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
  const [confirmDialog, setConfirmDialog] = useState(null);
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
  const [assessments, setAssessments] = useState([]);
  const [curriculumOutcomes, setCurriculumOutcomes] = useState([]);
  const [curriculumForm, setCurriculumForm] = useState({
    lesson_id: "",
    grade_level: "",
    unit_title: "",
    code: "",
    outcome_text: "",
    source_name: "",
    source_url: "",
    version_label: "",
    is_active: true,
  });
  const [curriculumImportText, setCurriculumImportText] = useState("");
  const [editingCurriculumOutcome, setEditingCurriculumOutcome] = useState(null);
  const [assessmentForm, setAssessmentForm] = useState({
    classroom_id: "",
    lesson_id: "",
    curriculum_outcome_id: "",
    assessment_type: "sinav",
    title: "",
    description: "",
    date: "",
  });
  const [assessmentEditForm, setAssessmentEditForm] = useState({
    title: "",
    description: "",
    date: "",
    curriculum_outcome_id: "",
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
  const lessonOptions = useMemo(
    () =>
      lessons.map((lesson) => ({
        label: lesson.name,
        value: String(lesson.id),
      })),
    [lessons],
  );
  const curriculumOutcomeOptionsFor = useMemo(
    () => (lessonId, gradeLevel) =>
      curriculumOutcomes
        .filter(
          (outcome) =>
            outcome.is_active &&
            (!lessonId || String(outcome.lesson_id) === String(lessonId)) &&
            (!gradeLevel || outcome.grade_level === String(gradeLevel)),
        )
        .map((outcome) => ({
          label: `${outcome.code ? `${outcome.code} · ` : ""}${outcome.outcome_text}`,
          value: String(outcome.id),
        })),
    [curriculumOutcomes],
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
      const [classroomData, lessonData, gradeData, assignmentData, teachersData, curriculumData] = await Promise.all([
        api.listClassrooms(teacherId),
        api.listLessons(teacherId),
        api.listGrades(),
        api.listTeacherAssignments(teacherId),
        api.listTeachers(),
        api.listCurriculumOutcomes({ limit: 500, offset: 0, activeOnly: false }),
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
      setCurriculumOutcomes(curriculumData);
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

  async function loadClassroomTodayAttendanceSummary() {
    if (!selectedClassroomId) {
      setClassroomTodayAbsentCount(0);
      return;
    }

    const today = formatLocalDate(new Date());
    const sessions = await api.listAttendanceSessions({
      classroomId: selectedClassroomId,
      date: today,
      limit: 500,
      offset: 0,
    });

    if (!sessions.length) {
      setClassroomTodayAbsentCount(0);
      return;
    }

    const recordGroups = await Promise.all(
      sessions.map((session) => api.listAttendanceSessionRecords(session.id)),
    );
    const absentStudentIds = new Set();
    recordGroups.flat().forEach((record) => {
      if (record.status === "absent") absentStudentIds.add(record.student_id);
    });
    setClassroomTodayAbsentCount(absentStudentIds.size);
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

  async function loadCurriculumOutcomes() {
    setCurriculumOutcomes(await api.listCurriculumOutcomes({ limit: 500, offset: 0, activeOnly: false }));
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
      curriculum_outcome_id: "",
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
    loadClassroomTodayAttendanceSummary().catch((err) => setError(err.message));
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

  useEffect(() => {
    if (activePage !== "curriculum") return;
    setActivePage("dashboard");
  }, [activePage]);

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

  function requestDeleteConfirmation(options) {
    return new Promise((resolve) => {
      setConfirmDialog({
        cancelLabel: "Vazgeç",
        confirmLabel: "Sil",
        icon: "delete",
        ...options,
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
      });
    });
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
      const shouldDelete = await requestDeleteConfirmation({
        title: "Sınıf silinsin mi?",
        description: "Sınıfa bağlı öğrenciler de silinebilir.",
        confirmLabel: "Sınıfı Sil",
      });
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
      const shouldDelete = await requestDeleteConfirmation({
        title: "Öğrenci silinsin mi?",
        description: "Öğrenciye bağlı kayıtlar artık listelerde görünmez.",
        confirmLabel: "Öğrenciyi Sil",
      });
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

  async function handleDeleteStudents(studentIds) {
    const uniqueIds = Array.from(new Set(studentIds.map(Number))).filter(Boolean);
    if (!uniqueIds.length) return;

    await runAction(async () => {
      const shouldDelete = await requestDeleteConfirmation({
        title: `${uniqueIds.length} öğrenci silinsin mi?`,
        description: "Seçili öğrenciler ve bağlı kayıtları artık listelerde görünmez.",
        confirmLabel: "Seçili Öğrencileri Sil",
      });
      if (!shouldDelete) return;

      await Promise.all(uniqueIds.map((studentId) => api.deleteStudent(studentId)));
      if (uniqueIds.includes(selectedStudentId)) setSelectedStudentId(null);
      await Promise.all([
        loadInitialData(),
        loadGrades(),
        loadStudentDirectoryPage(),
        loadClassroomStudentPage(),
      ]);
      showNotice(`${uniqueIds.length} öğrenci silindi.`);
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
      const shouldDelete = await requestDeleteConfirmation({
        title: "Ders silinsin mi?",
        description: "Bu ders ve bağlı notlar silinir.",
        confirmLabel: "Dersi Sil",
      });
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

  async function handleCreateAssessment(event) {
    event.preventDefault();
    await runAction(async () => {
      const created = await api.createAssessment({
        classroom_id: Number(assessmentForm.classroom_id),
        lesson_id: Number(assessmentForm.lesson_id),
        curriculum_outcome_id: assessmentForm.curriculum_outcome_id ? Number(assessmentForm.curriculum_outcome_id) : null,
        assessment_type: assessmentForm.assessment_type,
        title: assessmentForm.title.trim(),
        description: assessmentForm.description.trim() || null,
        date: assessmentForm.date,
      });
      setAssessmentForm((form) => ({
        ...form,
        lesson_id: "",
        curriculum_outcome_id: "",
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
        curriculum_outcome_id: assessmentEditForm.curriculum_outcome_id
          ? Number(assessmentEditForm.curriculum_outcome_id)
          : null,
      });
      setEditingAssessment(null);
      setActiveModal(null);
      await loadAssessments();
      showNotice("Değerlendirme güncellendi.");
    });
  }

  async function handleDeleteAssessment(assessmentId) {
    await runAction(async () => {
      const shouldDelete = await requestDeleteConfirmation({
        title: "Değerlendirme silinsin mi?",
        description: "Bu değerlendirme ve tüm öğrenci kayıtları silinir.",
        confirmLabel: "Değerlendirmeyi Sil",
      });
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

  function curriculumPayloadFromForm() {
    return {
      lesson_id: Number(curriculumForm.lesson_id),
      grade_level: curriculumForm.grade_level.trim(),
      unit_title: curriculumForm.unit_title.trim() || null,
      code: curriculumForm.code.trim() || null,
      outcome_text: curriculumForm.outcome_text.trim(),
      source_name: curriculumForm.source_name.trim() || null,
      source_url: curriculumForm.source_url.trim() || null,
      version_label: curriculumForm.version_label.trim() || null,
      is_active: curriculumForm.is_active,
    };
  }

  async function handleCreateCurriculumOutcome(event) {
    event.preventDefault();
    await runAction(async () => {
      await api.createCurriculumOutcome(curriculumPayloadFromForm());
      setCurriculumForm({
        lesson_id: "",
        grade_level: "",
        unit_title: "",
        code: "",
        outcome_text: "",
        source_name: "",
        source_url: "",
        version_label: "",
        is_active: true,
      });
      setActiveModal(null);
      await loadCurriculumOutcomes();
      showNotice("Kazanım eklendi.");
    });
  }

  async function handleUpdateCurriculumOutcome(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!editingCurriculumOutcome) throw new Error("Düzenlenecek kazanım bulunamadı.");
      await api.updateCurriculumOutcome(editingCurriculumOutcome.id, curriculumPayloadFromForm());
      setEditingCurriculumOutcome(null);
      setActiveModal(null);
      await loadCurriculumOutcomes();
      await loadAssessments();
      showNotice("Kazanım güncellendi.");
    });
  }

  function parseCurriculumImportRows() {
    const rows = curriculumImportText
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);
    if (!rows.length) throw new Error("İçe aktarılacak satır bulunamadı.");
    const delimiter = rows[0].includes(";") ? ";" : ",";
    const headers = rows[0].split(delimiter).map((cell) => cell.trim().toLocaleLowerCase("tr"));
    const aliases = {
      lesson_id: ["lesson_id", "ders_id"],
      grade_level: ["grade_level", "sinif", "sınıf"],
      unit_title: ["unit_title", "unite", "ünite", "tema"],
      code: ["code", "kod", "kazanim_kodu", "kazanım_kodu"],
      outcome_text: ["outcome_text", "kazanim", "kazanım", "metin"],
      source_name: ["source_name", "kaynak", "kaynak_adi", "kaynak_adı"],
      source_url: ["source_url", "kaynak_url", "url"],
      version_label: ["version_label", "surum", "sürüm", "yil", "yıl"],
    };
    const indexFor = (field) => aliases[field].map((alias) => headers.indexOf(alias)).find((index) => index >= 0);
    const lessonIndex = indexFor("lesson_id");
    const gradeIndex = indexFor("grade_level");
    const textIndex = indexFor("outcome_text");
    if (lessonIndex === undefined || gradeIndex === undefined || textIndex === undefined) {
      throw new Error("CSV başlıklarında en az lesson_id, grade_level ve outcome_text olmalı.");
    }
    return rows.slice(1).map((row) => {
      const cells = row.split(delimiter).map((cell) => cell.trim());
      const valueFor = (field) => {
        const index = indexFor(field);
        return index === undefined ? "" : cells[index] || "";
      };
      return {
        lesson_id: Number(cells[lessonIndex]),
        grade_level: cells[gradeIndex],
        unit_title: valueFor("unit_title") || null,
        code: valueFor("code") || null,
        outcome_text: cells[textIndex],
        source_name: valueFor("source_name") || null,
        source_url: valueFor("source_url") || null,
        version_label: valueFor("version_label") || null,
        is_active: true,
      };
    });
  }

  async function handleImportCurriculumOutcomes(event) {
    event.preventDefault();
    await runAction(async () => {
      const outcomes = parseCurriculumImportRows();
      await api.bulkCreateCurriculumOutcomes(outcomes);
      setCurriculumImportText("");
      setActiveModal(null);
      await loadCurriculumOutcomes();
      showNotice(`${outcomes.length} kazanım içe aktarıldı.`);
    });
  }

  async function handleDeleteCurriculumOutcome(outcome) {
    const confirmed = await requestDeleteConfirmation({
      title: "Kazanım silinsin mi?",
      description: "Bağlı değerlendirmelerde kazanım seçimi boşalabilir.",
      confirmLabel: "Kazanımı Sil",
    });
    if (!confirmed) return;
    await runAction(async () => {
      await api.deleteCurriculumOutcome(outcome.id);
      await loadCurriculumOutcomes();
      await loadAssessments();
      showNotice("Kazanım silindi.");
    });
  }

  async function handleDeleteCurriculumOutcomes(outcomeIds) {
    const uniqueIds = Array.from(new Set(outcomeIds.map(Number))).filter(Boolean);
    if (!uniqueIds.length) return;

    await runAction(async () => {
      const confirmed = await requestDeleteConfirmation({
        title: `${uniqueIds.length} kazanım silinsin mi?`,
        description: "Bağlı değerlendirmelerde kazanım seçimi boşalabilir.",
        confirmLabel: "Seçili Kazanımları Sil",
      });
      if (!confirmed) return;

      await Promise.all(uniqueIds.map((outcomeId) => api.deleteCurriculumOutcome(outcomeId)));
      await loadCurriculumOutcomes();
      await loadAssessments();
      showNotice(`${uniqueIds.length} kazanım silindi.`);
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
      const shouldDelete = await requestDeleteConfirmation({
        title: "Program kaydı silinsin mi?",
        description: "Bu ders programı kaydı takvimden kaldırılır.",
        confirmLabel: "Kaydı Sil",
      });
      if (!shouldDelete) return;

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

  async function handleCreateTeacher(event) {
    event.preventDefault();
    await runAction(async () => {
      const payload = {
        full_name: teacherForm.full_name.trim(),
        email: teacherForm.email.trim(),
        role: teacherForm.role,
      };
      if (teacherForm.title.trim()) payload.title = teacherForm.title.trim();
      if (teacherForm.branch.trim()) payload.branch = teacherForm.branch.trim();
      if (teacherForm.password.trim()) payload.password = teacherForm.password.trim();

      const createdTeacher = await api.createTeacher(payload);
      setTeacherForm({ full_name: "", email: "", title: "", branch: "", role: "teacher", password: "" });
      await loadTeachersAdminList();
      if (createdTeacher.invitation_url) {
        setLatestTeacherInviteLink(createdTeacher.invitation_url);
        setActiveModal("teacherInvite");
        showNotice("Öğretmen daveti oluşturuldu.");
      } else {
        setLatestTeacherInviteLink("");
        setActiveModal(null);
        showNotice("Öğretmen oluşturuldu.");
      }
    });
  }

  async function handleDeleteTeacher(teacher) {
    if (teacher.id === currentTeacher?.id) {
      setError("Kendi hesabını bu listeden silemezsin.");
      return;
    }
    const confirmed = await requestDeleteConfirmation({
      title: "Öğretmen silinsin mi?",
      description: `${teacher.full_name} öğretmeni silinir ve aktif atamaları kaldırılır.`,
      confirmLabel: "Öğretmeni Sil",
    });
    if (!confirmed) return;

    await runAction(async () => {
      await api.deleteTeacher(teacher.id);
      await loadTeachersAdminList();
      showNotice("Öğretmen silindi.");
    });
  }

  async function handleDeleteTeachers(teacherIds) {
    const uniqueIds = Array.from(new Set(teacherIds.map(Number))).filter(
      (teacherId) => teacherId && teacherId !== currentTeacher?.id,
    );
    if (!uniqueIds.length) {
      setError("Silinebilecek öğretmen seçilmedi.");
      return;
    }

    await runAction(async () => {
      const confirmed = await requestDeleteConfirmation({
        title: `${uniqueIds.length} öğretmen silinsin mi?`,
        description: "Seçili öğretmenlerin aktif atamaları kaldırılır.",
        confirmLabel: "Seçili Öğretmenleri Sil",
      });
      if (!confirmed) return;

      await Promise.all(uniqueIds.map((teacherId) => api.deleteTeacher(teacherId)));
      await loadTeachersAdminList();
      showNotice(`${uniqueIds.length} öğretmen silindi.`);
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
    setCurriculumOutcomes([]);
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
        payload.password = teacherProfileForm.password.trim();
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
    handleCreateTeacher,
    handleCreateTeacherAssignment,
    handleDeleteTeacher,
    handleDeleteTeachers,
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
    classroomTodayAbsentCount,
    classrooms,
    classroomOptions,
    filteredStudents,
    gradeAverages,
    gradeCategoryLabels,
    gradeCategoryOptions,
    grades,
    assessments,
    curriculumOutcomes,
    curriculumForm,
    curriculumImportText,
    curriculumOutcomeOptionsFor,
    editingCurriculumOutcome,
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
    setCurriculumForm,
    setCurriculumImportText,
    setEditingCurriculumOutcome,
    handleCreateAssessment,
    handleUpdateAssessment,
    handleDeleteAssessment,
    handleCreateCurriculumOutcome,
    handleUpdateCurriculumOutcome,
    handleImportCurriculumOutcomes,
    handleDeleteCurriculumOutcome,
    handleDeleteCurriculumOutcomes,
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
    setIsStudentPickerOpen,
    setLessonEditForm,
    setScheduleForm,
    setSearchTerm,
    setSelectedClassroomId,
    setSelectedStudentId,
    setTeacherProfileForm,
    setTeacherForm,
    setStudentDirectoryClassroomId,
    setStudentDirectoryOffset,
    setStudentEditForm,
    setStudentForm,
    students,
    scheduleEntries,
    scheduleForm,
    scheduleSettings,
    teacherProfileForm,
    teacherForm,
    weeklySummary,
    weekdayOptions,
    handleDeleteClassroom,
    handleDeleteLesson,
    handleDeleteScheduleEntry,
    handleMoveScheduleEntry,
    handleDeleteStudent,
    handleDeleteStudents,
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

  const wideModalIds = new Set([
    "student",
    "editStudent",
    "schedule",
    "editSchedule",
    "newAssessment",
    "newHomework",
    "curriculumImport",
  ]);
  const standardModalIds = new Set([
    "grade",
    "editAssessment",
    "teacher",
    "teacherInvite",
    "assignTeacher",
    "curriculumOutcome",
    "editCurriculumOutcome",
  ]);
  const modalSize = wideModalIds.has(activeModal)
    ? "wide"
    : standardModalIds.has(activeModal)
      ? "standard"
      : "compact";

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
        {activePage === "curriculum" && <CurriculumPage {...shared} />}
        {activePage === "aiReports" && <AIReportsPage {...shared} />}
        {activePage === "profile" && <ProfilePage {...shared} />}
        {activePage === "settings" && <SettingsPage {...shared} />}
        {activePage === "teachers" && isAdminUser && <TeachersPage {...shared} />}
        <StatusLine isLoading={isLoading} notice={notice} error={error} />
      </section>
      </div>

      {activeModal && (
        <Modal onClose={() => setActiveModal(null)} size={modalSize}>
          {activeModal === "classroom" && (
            <FormPanel
              description="Yeni sınıf düzeyi ve şubesini oluştur."
              onCancel={() => setActiveModal(null)}
              onSubmit={handleCreateClassroom}
              submitLabel="Sınıfı Kaydet"
              title="Sınıf Ekle"
            >
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
            </FormPanel>
          )}
          {activeModal === "editClassroom" && (
            <FormPanel
              description="Sınıf düzeyi ve şube bilgisini güncelle."
              onCancel={() => setActiveModal(null)}
              onSubmit={handleUpdateClassroom}
              submitLabel="Değişiklikleri Kaydet"
              title="Sınıfı Düzenle"
            >
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
            </FormPanel>
          )}
          {activeModal === "student" && (
            <FormPanel
              description="Öğrenci ve veli bilgilerini girin."
              onCancel={() => setActiveModal(null)}
              onSubmit={handleCreateStudent}
              submitLabel="Öğrenciyi Kaydet"
              title="Öğrenci Ekle"
            >
              <ModalSection title="Öğrenci Bilgileri">
                <SearchableSelect
                  label="Sınıf"
                  onChange={(value) =>
                    setStudentForm((form) => ({ ...form, classroom_id: value }))
                  }
                  options={classroomOptions}
                  placeholder="Sınıf ara"
                  value={studentForm.classroom_id}
                />
                <div className="form-field-grid">
                  <FormField label="Ad">
                    <input
                      onChange={(event) =>
                        setStudentForm((form) => ({
                          ...form,
                          first_name: event.target.value,
                        }))
                      }
                      placeholder="Ada"
                      required
                      value={studentForm.first_name}
                    />
                  </FormField>
                  <FormField label="Soyad">
                    <input
                      onChange={(event) =>
                        setStudentForm((form) => ({
                          ...form,
                          last_name: event.target.value,
                        }))
                      }
                      placeholder="Yılmaz"
                      required
                      value={studentForm.last_name}
                    />
                  </FormField>
                </div>
              </ModalSection>
              <ModalSection title="Veli Bilgileri">
                <FormField label="Veli ad soyad">
                  <input
                    onChange={(event) =>
                      setStudentForm((form) => ({
                        ...form,
                        parent_full_name: event.target.value,
                      }))
                    }
                    placeholder="Ayşe Yılmaz"
                    value={studentForm.parent_full_name}
                  />
                </FormField>
                <div className="form-field-grid">
                  <FormField label="Veli telefon">
                    <input
                      onChange={(event) =>
                        setStudentForm((form) => ({
                          ...form,
                          parent_phone: event.target.value,
                        }))
                      }
                      placeholder="05xx xxx xx xx"
                      value={studentForm.parent_phone}
                    />
                  </FormField>
                  <FormField label="Veli e-posta">
                    <input
                      onChange={(event) =>
                        setStudentForm((form) => ({
                          ...form,
                          parent_email: event.target.value,
                        }))
                      }
                      placeholder="veli@ornek.com"
                      type="email"
                      value={studentForm.parent_email}
                    />
                  </FormField>
                </div>
              </ModalSection>
              <ModalSection title="İletişim">
                <FormField label="Ev adresi">
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
                </FormField>
              </ModalSection>
            </FormPanel>
          )}
          {activeModal === "editStudent" && (
            <FormPanel
              description="Öğrencinin temel ve veli bilgilerini güncelle."
              onCancel={() => setActiveModal(null)}
              onSubmit={handleUpdateStudent}
              submitLabel="Değişiklikleri Kaydet"
              title="Öğrenciyi Düzenle"
            >
              <ModalSection title="Öğrenci Bilgileri">
                <div className="form-field-grid">
                  <FormField label="Ad">
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
                  </FormField>
                  <FormField label="Soyad">
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
                  </FormField>
                </div>
              </ModalSection>
              <ModalSection title="Veli Bilgileri">
                <FormField label="Veli ad soyad">
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
                </FormField>
                <div className="form-field-grid">
                  <FormField label="Veli telefon">
                    <input
                      onChange={(event) =>
                        setStudentEditForm((form) => ({
                          ...form,
                          parent_phone: event.target.value,
                        }))
                      }
                      placeholder="05xx xxx xx xx"
                      value={studentEditForm.parent_phone}
                    />
                  </FormField>
                  <FormField label="Veli e-posta">
                    <input
                      onChange={(event) =>
                        setStudentEditForm((form) => ({
                          ...form,
                          parent_email: event.target.value,
                        }))
                      }
                      placeholder="veli@ornek.com"
                      type="email"
                      value={studentEditForm.parent_email}
                    />
                  </FormField>
                </div>
              </ModalSection>
              <ModalSection title="İletişim">
                <FormField label="Ev adresi">
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
                </FormField>
              </ModalSection>
            </FormPanel>
          )}
          {activeModal === "lesson" && (
            <FormPanel
              description="Sınıflarda kullanılacak yeni ders adını ekle."
              onCancel={() => setActiveModal(null)}
              onSubmit={handleCreateLesson}
              submitLabel="Dersi Kaydet"
              title="Ders Ekle"
            >
              <FormField label="Ders adı">
                <input
                  onChange={(event) =>
                    setLessonForm({ name: event.target.value })
                  }
                  placeholder="Matematik"
                  required
                  value={lessonForm.name}
                />
              </FormField>
            </FormPanel>
          )}
          {activeModal === "editLesson" && (
            <FormPanel
              description="Ders adını güncelle."
              onCancel={() => setActiveModal(null)}
              onSubmit={handleUpdateLesson}
              submitLabel="Değişiklikleri Kaydet"
              title="Dersi Düzenle"
            >
              <FormField label="Ders adı">
                <input
                  onChange={(event) =>
                    setLessonEditForm({ name: event.target.value })
                  }
                  placeholder="Matematik"
                  required
                  value={lessonEditForm.name}
                />
              </FormField>
            </FormPanel>
          )}
          {activeModal === "newAssessment" && (
            <FormPanel
              description="Değerlendirme türünü seçip sınıf için sonuç girişi hazırlayın."
              onCancel={() => setActiveModal(null)}
              onSubmit={handleCreateAssessment}
              submitLabel="Değerlendirmeyi Oluştur"
              title="Yeni Değerlendirme"
            >
              <ModalSection title="Kapsam">
                <SearchableSelect
                  label="Sınıf"
                  onChange={(value) =>
                    setAssessmentForm((form) => ({
                      ...form,
                      classroom_id: value,
                      lesson_id: "",
                      curriculum_outcome_id: "",
                    }))
                  }
                  options={classroomOptions}
                  placeholder="Sınıf ara"
                  value={assessmentForm.classroom_id}
                />
                <SearchableSelect
                  label="Ders"
                  onChange={(value) =>
                    setAssessmentForm((form) => ({ ...form, lesson_id: value, curriculum_outcome_id: "" }))
                  }
                  options={
                    assessmentForm.classroom_id
                      ? assignedLessonOptionsForClassroom(assessmentForm.classroom_id)
                      : lessonOptions
                  }
                  placeholder="Ders ara"
                  value={assessmentForm.lesson_id}
                />
                <SearchableSelect
                  label="Kazanım (opsiyonel)"
                  onChange={(value) => setAssessmentForm((form) => ({ ...form, curriculum_outcome_id: value }))}
                  options={curriculumOutcomeOptionsFor(
                    assessmentForm.lesson_id,
                    classrooms.find((classroom) => String(classroom.id) === String(assessmentForm.classroom_id))
                      ?.grade_level,
                  )}
                  placeholder="Kazanım ara"
                  required={false}
                  value={assessmentForm.curriculum_outcome_id}
                />
                <SearchableSelect
                  label="Değerlendirme Türü"
                  onChange={(value) => setAssessmentForm((form) => ({ ...form, assessment_type: value }))}
                  options={gradeCategoryOptions}
                  placeholder="Tür ara"
                  value={assessmentForm.assessment_type}
                />
              </ModalSection>
              <ModalSection title="Değerlendirme Detayı">
                <SearchableSelect
                  label="Kazanım (opsiyonel)"
                  onChange={(value) =>
                    setAssessmentEditForm((form) => ({ ...form, curriculum_outcome_id: value }))
                  }
                  options={curriculumOutcomeOptionsFor(
                    editingAssessment?.lesson_id,
                    classrooms.find((classroom) => classroom.id === editingAssessment?.classroom_id)?.grade_level,
                  )}
                  placeholder="Kazanım ara"
                  required={false}
                  value={assessmentEditForm.curriculum_outcome_id}
                />
                <FormField label="Başlık">
                  <input
                    onChange={(event) => setAssessmentForm((form) => ({ ...form, title: event.target.value }))}
                    placeholder="1. Yazılı, Okuma günlüğü..."
                    required
                    value={assessmentForm.title}
                  />
                </FormField>
                <FormField label="Açıklama">
                  <textarea
                    onChange={(event) => setAssessmentForm((form) => ({ ...form, description: event.target.value }))}
                    placeholder="Opsiyonel açıklama"
                    value={assessmentForm.description}
                  />
                </FormField>
                <FormField label="Tarih">
                  <input
                    onChange={(event) => setAssessmentForm((form) => ({ ...form, date: event.target.value }))}
                    required
                    type="date"
                    value={assessmentForm.date}
                  />
                </FormField>
              </ModalSection>
            </FormPanel>
          )}
          {activeModal === "editAssessment" && (
            <FormPanel
              description="Değerlendirme başlığı, açıklaması ve tarihini güncelle."
              onCancel={() => setActiveModal(null)}
              onSubmit={handleUpdateAssessment}
              submitLabel="Değişiklikleri Kaydet"
              title="Değerlendirmeyi Düzenle"
            >
              <p className="font-label-md text-label-md text-secondary">
                Sınıf: {classrooms.find((classroom) => classroom.id === editingAssessment?.classroom_id)?.name || "-"}
                {" · "}
                Ders: {lessons.find((lesson) => lesson.id === editingAssessment?.lesson_id)?.name || "-"}
                {" · "}
                Tür: {gradeCategoryLabels[editingAssessment?.assessment_type] || "-"}
              </p>
              <ModalSection title="Değerlendirme Detayı">
                <FormField label="Başlık">
                  <input
                    onChange={(event) => setAssessmentEditForm((form) => ({ ...form, title: event.target.value }))}
                    placeholder="1. Yazılı"
                    required
                    value={assessmentEditForm.title}
                  />
                </FormField>
                <FormField label="Açıklama">
                  <textarea
                    onChange={(event) =>
                      setAssessmentEditForm((form) => ({ ...form, description: event.target.value }))
                    }
                    placeholder="Opsiyonel açıklama"
                    value={assessmentEditForm.description}
                  />
                </FormField>
                <FormField label="Tarih">
                  <input
                    onChange={(event) => setAssessmentEditForm((form) => ({ ...form, date: event.target.value }))}
                    required
                    type="date"
                    value={assessmentEditForm.date}
                  />
                </FormField>
              </ModalSection>
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
              description="Sınıf, ders, gün ve saat bilgileriyle program kaydı oluştur."
              onCancel={() => setActiveModal(null)}
              submitLabel="Kaydet"
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
              <ModalSection title="Ders Bilgileri">
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
              </ModalSection>
              <ModalSection title="Zaman ve Yer">
                <div className="form-field-grid">
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
                </div>
                <FormField label="Derslik">
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
                </FormField>
              </ModalSection>
            </FormPanel>
          )}
          {activeModal === "newHomework" && (
            <FormPanel
              description={assessmentForm.assessment_type === "odev" ? "Sınıfa ödev tanımlayın ve teslim takibini başlatın." : "Ders içi performans değerlendirmesi oluşturun."}
              onCancel={() => setActiveModal(null)}
              submitLabel={assessmentForm.assessment_type === "odev" ? "Ödevi Kaydet" : "Kaydet"}
              title={assessmentForm.assessment_type === "odev" ? "Ödev Ekle" : "Ders İçi Performans Ekle"}
              onSubmit={handleCreateAssessment}
            >
              <ModalSection title="Kapsam">
                <SearchableSelect
                  label="Sınıf"
                  onChange={(value) =>
                    setAssessmentForm((form) => ({
                      ...form,
                      classroom_id: value,
                      lesson_id: "",
                      curriculum_outcome_id: "",
                    }))
                  }
                  options={classroomOptions}
                  placeholder="Sınıf ara"
                  value={assessmentForm.classroom_id}
                />
                <SearchableSelect
                  label="Ders"
                  onChange={(value) =>
                    setAssessmentForm((form) => ({ ...form, lesson_id: value, curriculum_outcome_id: "" }))
                  }
                  options={
                    assessmentForm.classroom_id
                      ? assignedLessonOptionsForClassroom(assessmentForm.classroom_id)
                      : lessonOptions
                  }
                  placeholder="Ders ara"
                  value={assessmentForm.lesson_id}
                />
                <SearchableSelect
                  label="Kazanım (opsiyonel)"
                  onChange={(value) => setAssessmentForm((form) => ({ ...form, curriculum_outcome_id: value }))}
                  options={curriculumOutcomeOptionsFor(
                    assessmentForm.lesson_id,
                    classrooms.find((classroom) => String(classroom.id) === String(assessmentForm.classroom_id))
                      ?.grade_level,
                  )}
                  placeholder="Kazanım ara"
                  required={false}
                  value={assessmentForm.curriculum_outcome_id}
                />
              </ModalSection>
              <ModalSection title="Detay">
                <FormField label="Başlık">
                  <input
                    onChange={(event) => setAssessmentForm((form) => ({ ...form, title: event.target.value }))}
                    placeholder={assessmentForm.assessment_type === "odev" ? "Okuma günlüğü" : "Başlık"}
                    required
                    value={assessmentForm.title}
                  />
                </FormField>
                <FormField label="Açıklama">
                  <textarea
                    onChange={(event) =>
                      setAssessmentForm((form) => ({ ...form, description: event.target.value }))
                    }
                    placeholder="Opsiyonel açıklama"
                    value={assessmentForm.description}
                  />
                </FormField>
                <FormField label={assessmentForm.assessment_type === "odev" ? "Teslim tarihi" : "Tarih"}>
                  <input
                    onChange={(event) => setAssessmentForm((form) => ({ ...form, date: event.target.value }))}
                    required
                    type="date"
                    value={assessmentForm.date}
                  />
                </FormField>
              </ModalSection>
            </FormPanel>
          )}
          {(activeModal === "curriculumOutcome" || activeModal === "editCurriculumOutcome") && (
            <FormPanel
              description="Okulun kullanma hakkı olan kazanımı kaynak bilgisiyle kaydet."
              onCancel={() => {
                setEditingCurriculumOutcome(null);
                setActiveModal(null);
              }}
              onSubmit={
                activeModal === "curriculumOutcome"
                  ? handleCreateCurriculumOutcome
                  : handleUpdateCurriculumOutcome
              }
              submitLabel={activeModal === "curriculumOutcome" ? "Kazanımı Kaydet" : "Değişiklikleri Kaydet"}
              title={activeModal === "curriculumOutcome" ? "Kazanım Ekle" : "Kazanımı Düzenle"}
            >
              <ModalSection title="Kapsam">
                <SearchableSelect
                  label="Ders"
                  onChange={(value) => setCurriculumForm((form) => ({ ...form, lesson_id: value }))}
                  options={lessonOptions}
                  placeholder="Ders ara"
                  value={curriculumForm.lesson_id}
                />
                <FormField label="Sınıf düzeyi">
                  <input
                    onChange={(event) => setCurriculumForm((form) => ({ ...form, grade_level: event.target.value }))}
                    placeholder="5"
                    required
                    value={curriculumForm.grade_level}
                  />
                </FormField>
                <FormField label="Ünite / tema">
                  <input
                    onChange={(event) => setCurriculumForm((form) => ({ ...form, unit_title: event.target.value }))}
                    placeholder="Kesirler"
                    value={curriculumForm.unit_title}
                  />
                </FormField>
              </ModalSection>
              <ModalSection title="Kazanım">
                <FormField label="Kazanım kodu">
                  <input
                    onChange={(event) => setCurriculumForm((form) => ({ ...form, code: event.target.value }))}
                    placeholder="M.5.1.2"
                    value={curriculumForm.code}
                  />
                </FormField>
                <FormField label="Kazanım metni">
                  <textarea
                    onChange={(event) => setCurriculumForm((form) => ({ ...form, outcome_text: event.target.value }))}
                    placeholder="Kazanım metni"
                    required
                    value={curriculumForm.outcome_text}
                  />
                </FormField>
              </ModalSection>
              <ModalSection title="Kaynak">
                <div className="form-field-grid">
                  <FormField label="Kaynak adı">
                    <input
                      onChange={(event) => setCurriculumForm((form) => ({ ...form, source_name: event.target.value }))}
                      placeholder="Okul kazanım listesi"
                      value={curriculumForm.source_name}
                    />
                  </FormField>
                  <FormField label="Sürüm / yıl">
                    <input
                      onChange={(event) =>
                        setCurriculumForm((form) => ({ ...form, version_label: event.target.value }))
                      }
                      placeholder="2026-2027"
                      value={curriculumForm.version_label}
                    />
                  </FormField>
                </div>
                <FormField label="Kaynak URL">
                  <input
                    onChange={(event) => setCurriculumForm((form) => ({ ...form, source_url: event.target.value }))}
                    placeholder="https://..."
                    type="url"
                    value={curriculumForm.source_url}
                  />
                </FormField>
                <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface">
                  <input
                    checked={curriculumForm.is_active}
                    onChange={(event) => setCurriculumForm((form) => ({ ...form, is_active: event.target.checked }))}
                    type="checkbox"
                  />
                  Aktif
                </label>
              </ModalSection>
            </FormPanel>
          )}
          {activeModal === "curriculumImport" && (
            <FormPanel
              description="Excel/Sheets tablosunu CSV olarak yapıştır. Başlıklar: lesson_id, grade_level, outcome_text, code, unit_title, source_name, source_url, version_label."
              onCancel={() => setActiveModal(null)}
              onSubmit={handleImportCurriculumOutcomes}
              submitLabel="İçe Aktar"
              title="Kazanımları Toplu İçe Aktar"
            >
              <ModalSection title="CSV">
                <p className="field-hint">
                  Ders ID bilgisini Kazanımlar sayfasındaki ders listesinden veya sistemdeki ders kayıtlarından alabilirsin. Noktalı virgül veya virgül ayracı desteklenir.
                </p>
                <FormField label="CSV içeriği">
                  <textarea
                    className="min-h-[260px] font-mono text-sm"
                    onChange={(event) => setCurriculumImportText(event.target.value)}
                    placeholder={"lesson_id;grade_level;code;unit_title;outcome_text;source_name;source_url;version_label\n1;5;M.5.1;Kesirler;Kesirleri karşılaştırır;Okul kazanım listesi;;2026-2027"}
                    required
                    value={curriculumImportText}
                  />
                </FormField>
              </ModalSection>
            </FormPanel>
          )}
          {activeModal === "teacher" && (
            <FormPanel
              description="Öğretmen hesabını oluştur. Şifre alanını boş bırakırsan öğretmene şifre belirleme daveti gönderilir."
              onCancel={() => setActiveModal(null)}
              onSubmit={handleCreateTeacher}
              submitLabel="Öğretmeni Kaydet"
              title="Öğretmen Davet Et"
            >
              <ModalSection title="Hesap">
                <FormField label="Ad soyad">
                  <input
                    autoComplete="name"
                    onChange={(event) => setTeacherForm((form) => ({ ...form, full_name: event.target.value }))}
                    placeholder="Ayşe Yılmaz"
                    required
                    value={teacherForm.full_name}
                  />
                </FormField>
                <FormField label="E-posta">
                  <input
                    autoComplete="email"
                    onChange={(event) => setTeacherForm((form) => ({ ...form, email: event.target.value }))}
                    placeholder="ogretmen@okul.edu.tr"
                    required
                    type="email"
                    value={teacherForm.email}
                  />
                </FormField>
              </ModalSection>
              <ModalSection title="Okul Bilgileri">
                <div className="form-field-grid">
                  <FormField label="Unvan">
                    <input
                      onChange={(event) => setTeacherForm((form) => ({ ...form, title: event.target.value }))}
                      placeholder="Sınıf Öğretmeni"
                      value={teacherForm.title}
                    />
                  </FormField>
                  <FormField label="Branş">
                    <input
                      onChange={(event) => setTeacherForm((form) => ({ ...form, branch: event.target.value }))}
                      placeholder="Matematik"
                      value={teacherForm.branch}
                    />
                  </FormField>
                </div>
                <FormField label="Rol">
                  <select
                    onChange={(event) => setTeacherForm((form) => ({ ...form, role: event.target.value }))}
                    value={teacherForm.role}
                  >
                    <option value="teacher">Öğretmen</option>
                    <option value="admin">Yönetici</option>
                  </select>
                </FormField>
              </ModalSection>
              <ModalSection title="Giriş">
                <FormField label="Başlangıç şifresi">
                  <input
                    autoComplete="new-password"
                    minLength={8}
                    onChange={(event) => setTeacherForm((form) => ({ ...form, password: event.target.value }))}
                    placeholder="Boş bırakılırsa davet linki gönderilir"
                    type="password"
                    value={teacherForm.password}
                  />
                </FormField>
                <p className="field-hint">
                  Şifre en az 8 karakter olmalı ve harf/rakam içermeli. Boş bırakırsan öğretmen link üzerinden kendi şifresini belirler.
                </p>
              </ModalSection>
            </FormPanel>
          )}
          {activeModal === "teacherInvite" && (
            <FormPanel
              description="SMTP ayarlıysa bu bağlantı öğretmene e-posta ile gönderilir. Lokal geliştirme ortamında bağlantıyı buradan kopyalayıp paylaşabilirsin."
              onCancel={() => {
                setLatestTeacherInviteLink("");
                setActiveModal(null);
              }}
              title="Davet Linki"
            >
              <ModalSection title="Şifre Belirleme Bağlantısı">
                <FormField label="Davet linki">
                  <input readOnly value={latestTeacherInviteLink} />
                </FormField>
                <div className="flex justify-end gap-2">
                  <button
                    className="btn btn-secondary btn-md"
                    onClick={() => {
                      navigator.clipboard?.writeText(latestTeacherInviteLink);
                      showNotice("Davet linki kopyalandı.");
                    }}
                    type="button"
                  >
                    <Icon name="content_copy" /> Linki Kopyala
                  </button>
                  <button
                    className="btn btn-primary btn-md"
                    onClick={() => {
                      setLatestTeacherInviteLink("");
                      setActiveModal(null);
                    }}
                    type="button"
                  >
                    Tamam
                  </button>
                </div>
              </ModalSection>
            </FormPanel>
          )}
          {activeModal === "assignTeacher" && (
            <FormPanel
              description="Öğretmeni sınıfa rehber veya ders sorumlusu olarak ata."
              onCancel={() => setActiveModal(null)}
              onSubmit={handleCreateTeacherAssignment}
              submitLabel="Atamayı Kaydet"
              title="Ders / Sınıf Ata"
            >
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
                required={false}
                value={assignmentForm.lesson_id}
              />
            </FormPanel>
          )}
        </Modal>
      )}
      {confirmDialog && (
        <Modal onClose={confirmDialog.onCancel} size="compact">
          <ConfirmDialog {...confirmDialog} />
        </Modal>
      )}
    </main>
  );
}
