const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// The access token lives only in memory now — never in localStorage/sessionStorage
// — so it isn't readable by an XSS payload after the fact. The long-lived refresh
// token is a separate httpOnly cookie the browser sends automatically; JS can't
// read it either. A page reload always starts silentRefresh() over from here.
let accessToken = null;

export function getAuthToken() {
  return accessToken;
}

export function setAuthToken(token) {
  accessToken = token;
}

const ERROR_TRANSLATIONS = {
  "Authentication required": "Oturum açmanız gerekiyor.",
  "Invalid email or password": "E-posta veya parola hatalı.",
  "Invalid or expired refresh token": "Oturum yenileme bilgisi geçersiz veya süresi dolmuş.",
  "Invalid or expired reset token": "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.",
  "Invalid or expired token": "Oturum süresi dolmuş veya geçersiz.",
  "AI output not found": "AI çıktısı bulunamadı.",
  "Assessment not found": "Değerlendirme bulunamadı.",
  "Assignment not found": "Atama bulunamadı.",
  "Attendance record not found": "Devamsızlık kaydı bulunamadı.",
  "Attendance session not found": "Devamsızlık oturumu bulunamadı.",
  "Classroom not found": "Sınıf bulunamadı.",
  "Curriculum outcome not found": "Kazanım bulunamadı.",
  "Grade not found": "Not kaydı bulunamadı.",
  "Homework not found": "Ödev bulunamadı.",
  "Lesson not found": "Ders bulunamadı.",
  "Password must contain at least one digit": "Parola en az bir rakam içermeli.",
  "Password must contain at least one letter": "Parola en az bir harf içermeli.",
  "Schedule entry not found": "Ders programı kaydı bulunamadı.",
  "Student not found": "Öğrenci bulunamadı.",
  "Student not found in this classroom": "Öğrenci bu sınıfta bulunamadı.",
  "Teacher email already exists": "Bu e-posta ile kayıtlı bir öğretmen zaten var.",
  "Teacher not found": "Öğretmen bulunamadı.",
  "Too many requests. Please try again later.": "Çok fazla deneme yaptınız. Lütfen biraz sonra tekrar deneyin.",
  "Kazanım seçilen dersle eşleşmiyor.": "Kazanım seçilen dersle eşleşmiyor.",
};

function translateErrorMessage(message) {
  if (!message) return "";
  const normalized = String(message).replace(/^Value error,\s*/i, "");
  return ERROR_TRANSLATIONS[normalized] || normalized;
}

// FastAPI validation errors (422) send `detail` as a list of {msg, loc, ...}
// objects rather than a string; flatten and localize them for the UI.
function formatErrorDetail(detail) {
  if (Array.isArray(detail)) {
    return detail
      .map((item) => translateErrorMessage(typeof item === "string" ? item : item.msg))
      .filter(Boolean)
      .join(" ");
  }
  return translateErrorMessage(detail);
}

async function performRequest(path, options) {
  const token = getAuthToken();
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
}

let refreshPromise = null;

function silentRefresh() {
  if (!refreshPromise) {
    refreshPromise = performRequest("/auth/refresh", { method: "POST" })
      .then((response) => {
        if (!response.ok) throw new Error("Oturum yenilenemedi.");
        return response.json();
      })
      .then((session) => {
        setAuthToken(session.access_token);
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request(path, options = {}, isRetry = false) {
  const response = await performRequest(path, options);

  if (response.status === 401 && !isRetry && path !== "/auth/login" && path !== "/auth/refresh") {
    try {
      await silentRefresh();
    } catch {
      setAuthToken(null);
      throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
    }
    return request(path, options, true);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(formatErrorDetail(errorBody.detail) || "API isteği başarısız oldu.");
  }

  if (response.status === 204 || response.status === 202) {
    return null;
  }

  return response.json();
}

function buildQuery(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function pageItems(page) {
  return Array.isArray(page) ? page : page.items;
}

function normalizePage(page, fallbackLimit = 25, fallbackOffset = 0) {
  if (!Array.isArray(page)) return page;
  return {
    items: page,
    total: page.length,
    limit: fallbackLimit,
    offset: fallbackOffset,
  };
}

export const api = {
  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getCurrentTeacher: () => request("/auth/me"),
  refreshSession: () => silentRefresh(),
  logout: () => request("/auth/logout", { method: "POST" }),
  requestPasswordReset: (email) =>
    request("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  confirmPasswordReset: (token, newPassword) =>
    request("/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    }),
  updateTeacher: (teacherId, payload) =>
    request(`/teachers/${teacherId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  listClassroomsPage: (teacherId, pagination = {}) =>
    request(
      `/classrooms${buildQuery({
        teacher_id: teacherId,
        limit: pagination.limit,
        offset: pagination.offset,
      })}`,
    ).then((page) =>
      normalizePage(page, pagination.limit, pagination.offset),
    ),
  listClassrooms: async (teacherId, pagination = { limit: 500, offset: 0 }) =>
    pageItems(await api.listClassroomsPage(teacherId, pagination)),
  createClassroom: (payload) =>
    request("/classrooms", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateClassroom: (classroomId, payload) =>
    request(`/classrooms/${classroomId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteClassroom: (classroomId) =>
    request(`/classrooms/${classroomId}`, {
      method: "DELETE",
    }),
  listStudentsPage: (classroomId, pagination = {}) =>
    request(
      `/students${buildQuery({
        classroom_id: classroomId,
        search: pagination.search,
        limit: pagination.limit,
        offset: pagination.offset,
      })}`,
    ).then((page) =>
      normalizePage(page, pagination.limit, pagination.offset),
    ),
  createStudent: (payload) =>
    request("/students", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateStudent: (studentId, payload) =>
    request(`/students/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteStudent: (studentId) =>
    request(`/students/${studentId}`, {
      method: "DELETE",
    }),
  getStudentProfile: (studentId) => request(`/students/${studentId}/profile`),
  sendParentMessage: (studentId, payload) =>
    request(`/students/${studentId}/message`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listLessonsPage: (teacherId, pagination = {}) =>
    request(
      `/lessons${buildQuery({
        teacher_id: teacherId,
        limit: pagination.limit,
        offset: pagination.offset,
      })}`,
    ).then((page) =>
      normalizePage(page, pagination.limit, pagination.offset),
    ),
  listLessons: async (teacherId, pagination = { limit: 500, offset: 0 }) =>
    pageItems(await api.listLessonsPage(teacherId, pagination)),
  createLesson: (payload) =>
    request("/lessons", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLesson: (lessonId, payload) =>
    request(`/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteLesson: (lessonId) =>
    request(`/lessons/${lessonId}`, {
      method: "DELETE",
    }),
  listGradesPage: (pagination = {}) =>
    request(
      `/grades${buildQuery({
        student_id: pagination.studentId,
        lesson_id: pagination.lessonId,
        classroom_id: pagination.classroomId,
        limit: pagination.limit,
        offset: pagination.offset,
      })}`,
    ).then((page) =>
      normalizePage(page, pagination.limit, pagination.offset),
    ),
  listGrades: async (pagination = { limit: 500, offset: 0 }) =>
    pageItems(await api.listGradesPage(pagination)),
  listAssessmentsPage: (pagination = {}) =>
    request(
      `/assessments${buildQuery({
        classroom_id: pagination.classroomId,
        lesson_id: pagination.lessonId,
        assessment_type: pagination.assessmentType,
        student_id: pagination.studentId,
        limit: pagination.limit,
        offset: pagination.offset,
      })}`,
    ).then((page) =>
      normalizePage(page, pagination.limit, pagination.offset),
    ),
  listAssessments: async (pagination = { limit: 500, offset: 0 }) => {
    // Guards against the classroom having more assessments than fit in one
    // page — keeps paging until every item is fetched rather than trusting
    // a single large limit.
    const limit = pagination.limit || 500;
    let offset = pagination.offset || 0;
    let items = [];
    for (;;) {
      const page = await api.listAssessmentsPage({ ...pagination, limit, offset });
      items = items.concat(page.items);
      if (items.length >= page.total || !page.items.length) break;
      offset += limit;
    }
    return items;
  },
  createAssessment: (payload) =>
    request("/assessments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAssessment: (assessmentId, payload) =>
    request(`/assessments/${assessmentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAssessment: (assessmentId) =>
    request(`/assessments/${assessmentId}`, {
      method: "DELETE",
    }),
  listAssessmentRecords: (assessmentId) =>
    request(`/assessments/${assessmentId}/records`),
  bulkUpsertAssessmentRecords: (assessmentId, records) =>
    request(`/assessments/${assessmentId}/records`, {
      method: "PUT",
      body: JSON.stringify({ records }),
    }),
  listCurriculumOutcomesPage: (pagination = {}) =>
    request(
      `/curriculum-outcomes${buildQuery({
        lesson_id: pagination.lessonId,
        grade_level: pagination.gradeLevel,
        search: pagination.search,
        active_only: pagination.activeOnly,
        limit: pagination.limit,
        offset: pagination.offset,
      })}`,
    ).then((page) => normalizePage(page, pagination.limit, pagination.offset)),
  listCurriculumOutcomes: async (pagination = { limit: 500, offset: 0, activeOnly: false }) => {
    const limit = pagination.limit || 500;
    let offset = pagination.offset || 0;
    let items = [];
    for (;;) {
      const page = await api.listCurriculumOutcomesPage({ ...pagination, limit, offset });
      items = items.concat(page.items);
      if (items.length >= page.total || !page.items.length) break;
      offset += limit;
    }
    return items;
  },
  createCurriculumOutcome: (payload) =>
    request("/curriculum-outcomes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  bulkCreateCurriculumOutcomes: (outcomes) =>
    request("/curriculum-outcomes/bulk", {
      method: "POST",
      body: JSON.stringify({ outcomes }),
    }),
  updateCurriculumOutcome: (outcomeId, payload) =>
    request(`/curriculum-outcomes/${outcomeId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteCurriculumOutcome: (outcomeId) =>
    request(`/curriculum-outcomes/${outcomeId}`, {
      method: "DELETE",
    }),
  listAttendanceSessionsPage: (pagination = {}) =>
    request(
      `/attendance-sessions${buildQuery({
        classroom_id: pagination.classroomId,
        lesson_id: pagination.lessonId,
        date: pagination.date,
        limit: pagination.limit,
        offset: pagination.offset,
      })}`,
    ).then((page) =>
      normalizePage(page, pagination.limit, pagination.offset),
    ),
  listAttendanceSessions: async (pagination = { limit: 50, offset: 0 }) =>
    pageItems(await api.listAttendanceSessionsPage(pagination)),
  createAttendanceSession: (payload) =>
    request("/attendance-sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listAttendanceSessionRecords: (sessionId) =>
    request(`/attendance-sessions/${sessionId}/records`),
  bulkUpsertAttendanceSessionRecords: (sessionId, records) =>
    request(`/attendance-sessions/${sessionId}/records`, {
      method: "PUT",
      body: JSON.stringify({ records }),
    }),
  listScheduleEntriesPage: (teacherId, pagination = {}) =>
    request(
      `/schedule-entries${buildQuery({
        teacher_id: teacherId,
        weekday: pagination.weekday,
        limit: pagination.limit,
        offset: pagination.offset,
      })}`,
    ).then((page) =>
      normalizePage(page, pagination.limit, pagination.offset),
    ),
  createScheduleEntry: (payload) =>
    request("/schedule-entries", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateScheduleEntry: (entryId, payload) =>
    request(`/schedule-entries/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteScheduleEntry: (entryId) =>
    request(`/schedule-entries/${entryId}`, {
      method: "DELETE",
    }),
  getScheduleSettings: () => request("/school-schedule-settings"),
  saveScheduleSettings: (payload) =>
    request("/school-schedule-settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  generateReportComment: (studentId) =>
    request("/ai/report-comments", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId }),
    }),
  generateParentMessage: (studentId) =>
    request("/ai/parent-messages", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId }),
    }),
  generateTopicAnalysis: (studentId) =>
    request("/ai/topic-analyses", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId }),
    }),
  generateWeeklySummary: (teacherId, classroomId) =>
    request("/ai/weekly-summaries", {
      method: "POST",
      body: JSON.stringify({ teacher_id: teacherId, classroom_id: classroomId }),
    }),
  generateLessonPlan: (payload) =>
    request("/ai/lesson-plans", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listAIOutputs: (studentId) => request(`/ai/outputs?student_id=${studentId}`),
  updateAIOutput: (outputId, outputPayload) =>
    request(`/ai/outputs/${outputId}`, {
      method: "PATCH",
      body: JSON.stringify({ output_payload: outputPayload }),
    }),
  // Admin sees every teacher + their assignment summary; a regular teacher
  // gets back just themselves (see GET /teachers on the backend).
  listTeachers: () => request("/teachers"),
  createTeacher: (payload) =>
    request("/teachers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteTeacher: (teacherId) =>
    request(`/teachers/${teacherId}`, {
      method: "DELETE",
    }),
  listTeacherAssignmentsPage: (teacherId, pagination = {}) =>
    request(
      `/teacher-assignments${buildQuery({
        teacher_id: teacherId,
        limit: pagination.limit,
        offset: pagination.offset,
      })}`,
    ).then((page) => normalizePage(page, pagination.limit, pagination.offset)),
  listTeacherAssignments: async (teacherId, pagination = { limit: 500, offset: 0 }) =>
    pageItems(await api.listTeacherAssignmentsPage(teacherId, pagination)),
  createTeacherAssignment: (payload) =>
    request("/teacher-assignments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTeacherAssignment: (assignmentId, payload) =>
    request(`/teacher-assignments/${assignmentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
