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

export const api = {
  listClassrooms: (teacherId) => request(`/classrooms?teacher_id=${teacherId}`),
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
  listStudents: (classroomId) => request(`/students?classroom_id=${classroomId}`),
  createStudent: (payload) =>
    request("/students", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getStudentProfile: (studentId) => request(`/students/${studentId}/profile`),
  listLessons: (teacherId) => request(`/lessons?teacher_id=${teacherId}`),
  createLesson: (payload) =>
    request("/lessons", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createGrade: (payload) =>
    request("/grades", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createAttendance: (payload) =>
    request("/attendance-records", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
