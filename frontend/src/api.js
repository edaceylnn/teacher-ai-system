const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || "API istegi basarisiz oldu.");
  }

  if (response.status === 204) {
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
  listStudents: async (classroomId, pagination = { limit: 500, offset: 0 }) =>
    pageItems(await api.listStudentsPage(classroomId, pagination)),
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
  createGrade: (payload) =>
    request("/grades", {
      method: "POST",
      body: JSON.stringify(payload),
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
  updateGrade: (gradeId, payload) =>
    request(`/grades/${gradeId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteGrade: (gradeId) =>
    request(`/grades/${gradeId}`, {
      method: "DELETE",
    }),
  createAttendance: (payload) =>
    request("/attendance-records", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listAttendancePage: (pagination = {}) =>
    request(
      `/attendance-records${buildQuery({
        student_id: pagination.studentId,
        limit: pagination.limit,
        offset: pagination.offset,
      })}`,
    ).then((page) =>
      normalizePage(page, pagination.limit, pagination.offset),
    ),
  updateAttendance: (attendanceId, payload) =>
    request(`/attendance-records/${attendanceId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAttendance: (attendanceId) =>
    request(`/attendance-records/${attendanceId}`, {
      method: "DELETE",
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
  listHomeworksPage: (teacherId, pagination = {}) =>
    request(
      `/homeworks${buildQuery({
        teacher_id: teacherId,
        classroom_id: pagination.classroomId,
        limit: pagination.limit,
        offset: pagination.offset,
      })}`,
    ).then((page) =>
      normalizePage(page, pagination.limit, pagination.offset),
    ),
  createHomework: (payload) =>
    request("/homeworks", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateHomework: (homeworkId, payload) =>
    request(`/homeworks/${homeworkId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteHomework: (homeworkId) =>
    request(`/homeworks/${homeworkId}`, {
      method: "DELETE",
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
  generateWeeklySummary: (teacherId, classroomId) =>
    request("/ai/weekly-summaries", {
      method: "POST",
      body: JSON.stringify({ teacher_id: teacherId, classroom_id: classroomId }),
    }),
  listAIOutputs: (studentId) => request(`/ai/outputs?student_id=${studentId}`),
  updateAIOutput: (outputId, outputPayload) =>
    request(`/ai/outputs/${outputId}`, {
      method: "PATCH",
      body: JSON.stringify({ output_payload: outputPayload }),
    }),
};
