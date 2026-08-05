import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { api } from "./api";
import "./styles.css";

const DEMO_TEACHER_ID = 1;

const attendanceLabels = {
  present: "Var",
  absent: "Yok",
  excused: "Mazeretli",
};

const gradeLevelOptions = Array.from({ length: 12 }, (_, index) =>
  String(index + 1),
);
const sectionOptions = ["A", "B", "C", "D", "E", "F"];

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

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [classroomSearchTerm, setClassroomSearchTerm] = useState("");
  const [classroomGradeFilter, setClassroomGradeFilter] = useState("all");
  const [classrooms, setClassrooms] = useState([]);
  const [classroomStudentCounts, setClassroomStudentCounts] = useState({});
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [grades, setGrades] = useState([]);
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
  const [studentForm, setStudentForm] = useState({ first_name: "", last_name: "" });
  const [studentEditForm, setStudentEditForm] = useState({
    first_name: "",
    last_name: "",
    observation_notes: "",
  });
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
    date: "",
    status: "present",
  });
  const [attendanceEditForm, setAttendanceEditForm] = useState({
    date: "",
    status: "present",
  });
  const [editingAttendance, setEditingAttendance] = useState(null);

  const selectedClassroom = classrooms.find(
    (classroom) => classroom.id === selectedClassroomId,
  );
  const selectedStudent = allStudents.find(
    (student) => student.id === selectedStudentId,
  );
  const filteredStudents = allStudents.filter((student) =>
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

  async function loadInitialData() {
    setIsLoading(true);
    setError("");
    try {
      const [classroomData, lessonData, gradeData] = await Promise.all([
        api.listClassrooms(DEMO_TEACHER_ID),
        api.listLessons(DEMO_TEACHER_ID),
        api.listGrades(),
      ]);
      const studentLists = await Promise.all(
        classroomData.map((classroom) => api.listStudents(classroom.id)),
      );
      const studentCounts = classroomData.reduce((acc, classroom, index) => {
        acc[classroom.id] = studentLists[index].length;
        return acc;
      }, {});
      const allStudentData = studentLists.flat();
      setClassrooms(classroomData);
      setClassroomStudentCounts(studentCounts);
      setAllStudents(allStudentData);
      setLessons(lessonData);
      setGrades(gradeData);
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

    const studentData = await api.listStudents(classroomId);
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
      [classroomId]: studentData.length,
    }));
    setSelectedStudentId((current) => {
      if (studentData.some((student) => student.id === current)) return current;
      return null;
    });
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

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadStudents(selectedClassroomId).catch((err) => setError(err.message));
    setSearchTerm("");
  }, [selectedClassroomId]);

  useEffect(() => {
    loadProfile(selectedStudentId).catch((err) => setError(err.message));
  }, [selectedStudentId]);

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
        teacher_id: DEMO_TEACHER_ID,
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
        observation_notes: null,
      });
      setStudents((current) => [...current, created]);
      setAllStudents((current) => [...current, created]);
      setClassroomStudentCounts((current) => ({
        ...current,
        [selectedClassroomId]: (current[selectedClassroomId] || 0) + 1,
      }));
      setStudentForm({ first_name: "", last_name: "" });
      setSelectedStudentId(created.id);
      setActiveModal(null);
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
        observation_notes: studentEditForm.observation_notes.trim() || null,
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
      setStudentEditForm({ first_name: "", last_name: "", observation_notes: "" });
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
      const nextStudents = students.filter((student) => student.id !== studentId);
      setStudents(nextStudents);
      setAllStudents((current) =>
        current.filter((student) => student.id !== studentId),
      );
      await loadGrades();
      setClassroomStudentCounts((current) => ({
        ...current,
        [selectedClassroomId]: Math.max((current[selectedClassroomId] || 1) - 1, 0),
      }));
      if (selectedStudentId === studentId) {
        setSelectedStudentId(nextStudents[0]?.id || null);
      }
      showNotice("Öğrenci silindi.");
    });
  }

  async function handleCreateLesson(event) {
    event.preventDefault();
    await runAction(async () => {
      const created = await api.createLesson({
        teacher_id: DEMO_TEACHER_ID,
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
      const shouldDelete = window.confirm("Bu ders ve bağlı notlar silinsin mi?");
      if (!shouldDelete) return;

      await api.deleteLesson(lessonId);
      setLessons((current) => current.filter((lesson) => lesson.id !== lessonId));
      await loadGrades();
      if (selectedStudentId) await loadProfile(selectedStudentId);
      showNotice("Ders silindi.");
    });
  }

  async function handleCreateGrade(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!gradeForm.student_id) throw new Error("Önce bir öğrenci seçmelisin.");
      await api.createGrade({
        student_id: Number(gradeForm.student_id),
        lesson_id: Number(gradeForm.lesson_id),
        exam_name: gradeForm.exam_name.trim(),
        score: gradeForm.score,
      });
      setGradeForm({ student_id: "", lesson_id: "", exam_name: "", score: "" });
      setActiveModal(null);
      setSelectedStudentId(Number(gradeForm.student_id));
      await loadGrades();
      await loadProfile(Number(gradeForm.student_id));
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
      if (selectedStudentId) await loadProfile(selectedStudentId);
      showNotice("Not silindi.");
    });
  }

  async function handleCreateAttendance(event) {
    event.preventDefault();
    await runAction(async () => {
      if (!selectedStudentId) throw new Error("Önce bir öğrenci seçmelisin.");
      await api.createAttendance({
        student_id: selectedStudentId,
        date: attendanceForm.date,
        status: attendanceForm.status,
      });
      setAttendanceForm({ date: "", status: "present" });
      setActiveModal(null);
      await loadProfile(selectedStudentId);
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
      showNotice("Devamsızlık güncellendi.");
    });
  }

  async function handleDeleteAttendance(attendanceId) {
    await runAction(async () => {
      const shouldDelete = window.confirm("Bu devamsızlık kaydı silinsin mi?");
      if (!shouldDelete) return;

      await api.deleteAttendance(attendanceId);
      await loadProfile(selectedStudentId);
      showNotice("Devamsızlık silindi.");
    });
  }

  const shared = {
    activePage,
    allStudents,
    attendanceRate,
    classroomGradeFilter,
    classroomSearchTerm,
    classroomStudentCounts,
    classrooms,
    filteredStudents,
    gradeAverages,
    grades,
    isStudentPickerOpen,
    lessons,
    overallAverage,
    profile,
    searchTerm,
    selectedClassroom,
    selectedClassroomId,
    selectedStudent,
    selectedStudentId,
    setActiveModal,
    setActivePage,
    setAttendanceEditForm,
    setClassroomGradeFilter,
    setClassroomSearchTerm,
    setClassroomEditForm,
    setEditingAttendance,
    setEditingClassroom,
    setEditingGrade,
    setEditingLesson,
    setEditingStudent,
    setGradeEditForm,
    setGradeForm,
    setIsStudentPickerOpen,
    setLessonEditForm,
    setSearchTerm,
    setSelectedClassroomId,
    setSelectedStudentId,
    setStudentEditForm,
    students,
    handleDeleteAttendance,
    handleDeleteClassroom,
    handleDeleteGrade,
    handleDeleteLesson,
    handleDeleteStudent,
  };

  return (
    <main>
      <Topbar setActiveModal={setActiveModal} />
      <Sidebar
        activePage={activePage}
        selectedClassroom={selectedClassroom}
        setActiveModal={setActiveModal}
        setActivePage={setActivePage}
      />

      <section className="page">
        {activePage === "dashboard" && <DashboardPage {...shared} />}
        {activePage === "classrooms" && <ClassroomsPage {...shared} />}
        {activePage === "classroomDetail" && (
          <ClassroomDetailPage {...shared} />
        )}
        {activePage === "students" && <StudentsPage {...shared} />}
        {activePage === "gradebook" && <GradebookPage {...shared} />}
        {activePage === "studentDetail" && <StudentDetailPage {...shared} />}
        {activePage === "attendance" && <AttendancePage {...shared} />}
        {activePage === "aiReports" && <AIReportsPage {...shared} />}
        {activePage === "settings" && <SettingsPage />}
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
              <textarea
                onChange={(event) =>
                  setStudentEditForm((form) => ({
                    ...form,
                    observation_notes: event.target.value,
                  }))
                }
                placeholder="Gözlem notu"
                value={studentEditForm.observation_notes}
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
              <select
                onChange={(event) =>
                  setGradeForm((form) => ({
                    ...form,
                    student_id: event.target.value,
                  }))
                }
                required
                value={gradeForm.student_id}
              >
                <option value="">Öğrenci seç</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </option>
                ))}
              </select>
              <select
                onChange={(event) =>
                  setGradeForm((form) => ({
                    ...form,
                    lesson_id: event.target.value,
                  }))
                }
                required
                value={gradeForm.lesson_id}
              >
                <option value="">Ders seç</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.name}
                  </option>
                ))}
              </select>
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
              <select
                onChange={(event) =>
                  setGradeEditForm((form) => ({
                    ...form,
                    lesson_id: event.target.value,
                  }))
                }
                required
                value={gradeEditForm.lesson_id}
              >
                <option value="">Ders seç</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.name}
                  </option>
                ))}
              </select>
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
              <select
                onChange={(event) =>
                  setAttendanceForm((form) => ({
                    ...form,
                    status: event.target.value,
                  }))
                }
                value={attendanceForm.status}
              >
                <option value="present">Var</option>
                <option value="absent">Yok</option>
                <option value="excused">Mazeretli</option>
              </select>
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
              <select
                onChange={(event) =>
                  setAttendanceEditForm((form) => ({
                    ...form,
                    status: event.target.value,
                  }))
                }
                value={attendanceEditForm.status}
              >
                <option value="present">Var</option>
                <option value="absent">Yok</option>
                <option value="excused">Mazeretli</option>
              </select>
              <button className="primary-button" type="submit">
                Değişiklikleri Kaydet
              </button>
            </FormPanel>
          )}
        </Modal>
      )}
    </main>
  );
}

function Topbar({ setActiveModal }) {
  return (
    <header className="topbar">
      <div className="product-title">Teacher AI</div>
    </header>
  );
}

function Sidebar({
  activePage,
  selectedClassroom,
  setActiveModal,
  setActivePage,
}) {
  return (
    <aside className="sidenav">
      <div className="campus-card">
        <div className="campus-icon">
          <Icon name="account_balance" />
        </div>
        <div>
          <h2>Ana Kampüs</h2>
          <p>
            {selectedClassroom
              ? `${selectedClassroom.grade_level}. Sınıf`
              : "Sınıf seçilmedi"}
          </p>
        </div>
      </div>

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
          active={activePage === "aiReports"}
          icon="auto_awesome"
          label="AI Raporları"
          onClick={() => setActivePage("aiReports")}
        />
        <NavItem
          active={activePage === "settings"}
          icon="settings"
          label="Ayarlar"
          onClick={() => setActivePage("settings")}
        />
      </nav>

      <button
        className="outline-button add-class-button"
        onClick={() => setActiveModal("classroom")}
        type="button"
      >
        <Icon name="add" /> Sınıf Ekle
      </button>

      <div className="sidenav-footer">
        <NavItem icon="help" label="Yardım Merkezi" />
        <NavItem icon="logout" label="Çıkış Yap" />
      </div>
    </aside>
  );
}

function DashboardPage({
  classrooms,
  lessons,
  setActiveModal,
  setActivePage,
  students,
}) {
  return (
    <>
      <section className="hero-card">
        <div>
          <h1>Günaydın, Öğretmenim</h1>
          <p>İşte bugünkü sınıflarınızın özeti.</p>
        </div>
        <div className="hero-actions">
          <button
            className="primary-button"
            onClick={() => setActiveModal("student")}
            type="button"
          >
            <Icon name="person_add" /> Öğrenci Ekle
          </button>
          <button
            className="outline-button"
            onClick={() => setActiveModal("grade")}
            type="button"
          >
            <Icon name="upload" /> Not Gir
          </button>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="stats-overview">
          <StatCard
            icon="groups"
            label="Toplam Öğrenci"
            trend="+2 bu ay"
            value={students.length}
          />
          <StatCard
            icon="fact_check"
            label="Ortalama Devam"
            trend="İstikrarlı"
            value="%94"
          />
          <StatCard
            icon="analytics"
            label="Sınıf Ortalaması"
            trend="Son 7 gün"
            value="78.5"
          />
          <StatCard
            icon="description"
            label="Üretilen Raporlar"
            trend="AI destekli"
            value="24"
          />
        </section>

        <section className="chart-card">
          <div className="section-heading">
            <h2>Akademik Performans Eğilimi</h2>
            <button className="outline-button compact" type="button">
              Bu Dönem
            </button>
          </div>
          <svg
            viewBox="0 0 760 320"
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
            {[60, 100, 140, 180, 220, 260].map((y) => (
              <line key={y} x1="45" x2="730" y1={y} y2={y} stroke="#dce9ff" />
            ))}
            <path
              d="M45 235 L150 218 L255 188 L365 202 L480 165 L595 170 L730 142 L730 280 L45 280 Z"
              fill="url(#dashboard-chart-fill)"
            />
            <path
              d="M45 235 L150 218 L255 188 L365 202 L480 165 L595 170 L730 142"
              fill="none"
              stroke="#3525cd"
              strokeWidth="3"
            />
          </svg>
        </section>

        <aside className="dashboard-side">
          <section className="ai-insights">
            <div className="section-heading">
              <h2>AI Öngörüleri</h2>
              <span className="count-pill">3 Yeni</span>
            </div>
            <Insight
              tone="warning"
              title="Not Düşüşü"
              text="Bir öğrencinin son notları sınıf ortalamasının altında."
            />
            <Insight
              tone="success"
              title="Başarı Artışı"
              text="Matematik ortalaması geçen aya göre yükseldi."
            />
          </section>
          <section className="schedule-card">
            <h2>Günün Programı</h2>
            <ScheduleItem
              color="primary"
              time="09:00"
              title="10-A Matematik"
              subtitle="Sınıf 104"
            />
            <ScheduleItem
              color="secondary"
              time="11:30"
              title="5-A Türkçe"
              subtitle="Derslik 2"
            />
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
    isStudentPickerOpen,
    searchTerm,
    selectedClassroom,
    selectedStudent,
    selectedStudentId,
    setActiveModal,
    setActivePage,
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
            <p>{students.length} kayıtlı öğrenci</p>
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
          students={students}
        />
      </section>
    </div>
  );
}

function StudentsPage({
  allStudents,
  classrooms,
  filteredStudents,
  searchTerm,
  selectedStudentId,
  setActiveModal,
  setActivePage,
  setEditingStudent,
  setGradeForm,
  setSearchTerm,
  setSelectedStudentId,
  setStudentEditForm,
  handleDeleteStudent,
}) {
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  const visibleStudents = searchTerm ? filteredStudents : allStudents;

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
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Öğrenci ara"
          value={searchTerm}
        />
      </div>

      <section className="student-table-card">
        <div className="students-head">
          <span>Öğrenci</span>
          <span>Sınıf</span>
          <span>Öğretmen Yorumu</span>
          <span>İşlem</span>
        </div>
        {visibleStudents.map((student) => (
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
        {!visibleStudents.length && (
          <p className="empty-note">Öğrenci bulunamadı.</p>
        )}
      </section>
    </div>
  );
}

function GradebookPage({
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
        <div className="gradebook-head" style={{ gridTemplateColumns: gradebookColumns }}>
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
        {visibleGrades.map((grade) => (
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
        {!visibleGrades.length && <p className="empty-note">Henüz not kaydı yok.</p>}
      </section>
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
              <h2>Öğretmen Yorumu</h2>
            </div>
            <p>{profile.observation_notes || "Henüz öğretmen yorumu girilmedi."}</p>
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
  handleDeleteAttendance,
  profile,
  selectedStudent,
  setActiveModal,
  setAttendanceEditForm,
  setEditingAttendance,
  students,
}) {
  return (
    <div className="wide-page">
      <section className="hero-card">
        <div>
          <h1>Devamsızlık Takibi</h1>
          <p>Öğrencilerin günlük yoklama ve mazeret durumlarını yönet.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => setActiveModal("attendance")}
          type="button"
        >
          <Icon name="event_available" /> Devamsızlık Gir
        </button>
      </section>
      <section className="student-table-card">
        <div className="attendance-head">
          <span>Öğrenci</span>
          <span>Son Kayıt</span>
          <span>Durum</span>
          <span>Toplam</span>
        </div>
        {students.map((student) => (
          <div className="attendance-row" key={student.id}>
            <strong>
              {student.first_name} {student.last_name}
            </strong>
            <span>
              {selectedStudent?.id === student.id &&
              profile?.attendance_records[0]?.date
                ? profile.attendance_records[0].date
                : "Kayıt yok"}
            </span>
            <span className="attendance-ok">● Düzenli</span>
            <span>
              {selectedStudent?.id === student.id
                ? profile?.attendance_summary?.total || 0
                : 0}
            </span>
          </div>
        ))}
      </section>
      <section className="student-table-card attendance-record-card">
        <div className="record-head">
          <span>Seçili Öğrenci Devamsızlıkları</span>
          <span>Tarih</span>
          <span>Durum</span>
          <span>İşlem</span>
        </div>
        {profile?.attendance_records?.map((attendance) => (
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
        {!profile?.attendance_records?.length && (
          <p className="empty-note">
            {selectedStudent
              ? "Henüz devamsızlık kaydı yok."
              : "Öğrenci seçilmedi."}
          </p>
        )}
      </section>
    </div>
  );
}

function AIReportsPage({ profile, selectedStudent }) {
  return (
    <div className="report-page">
      <section className="report-document">
        <h1>AI Karne Raporu</h1>
        <p className="report-meta">
          Öğrenci:{" "}
          {selectedStudent
            ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
            : "Öğrenci seçilmedi"}
        </p>
        <div className="report-section">
          <h2>Akademik Özet</h2>
          <p>
            Öğrencinin not, devamsızlık ve öğretmen gözlem verileri karne yorumu
            üretimi için hazırlanmıştır.
          </p>
        </div>
        <div className="report-section">
          <h2>Öğretmen Gözlemi</h2>
          <p>{profile?.observation_notes || "Henüz gözlem notu girilmedi."}</p>
        </div>
      </section>
      <aside className="report-actions">
        <button className="primary-button full" type="button">
          <Icon name="auto_awesome" /> Karne Yorumu Oluştur
        </button>
        <button className="outline-button full" type="button">
          <Icon name="mail" /> Veli Mesajı Hazırla
        </button>
        <button className="outline-button full" type="button">
          <Icon name="download" /> PDF Dışa Aktar
        </button>
      </aside>
    </div>
  );
}

function SettingsPage() {
  return (
    <section className="hero-card">
      <div>
        <h1>Ayarlar</h1>
        <p>Kullanıcı, sınıf ve yapay zeka tercihleri burada yönetilecek.</p>
      </div>
    </section>
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
        <Icon name="expand_more" />
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
        <span>Son Notlar</span>
        <span>Devam</span>
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
            <strong>
              {student.first_name} {student.last_name}
            </strong>
          </span>
          <span className="grade-pills">
            <b>A</b>
            <b>B+</b>
          </span>
          <span className="attendance-ok">● %98</span>
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

function StatCard({ icon, label, trend, value }) {
  return (
    <div className="stat-card">
      <div className="stat-card-head">
        <span>{label}</span>
        <Icon name={icon} />
      </div>
      <strong>{value}</strong>
      <small>{trend}</small>
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
      {isLoading && <span>Yükleniyor</span>}
      {notice && <span className="success">{notice}</span>}
      {error && <span className="danger">{error}</span>}
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
