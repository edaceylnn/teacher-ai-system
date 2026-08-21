// Frontend-side mirror of the backend's TeacherAssignment permission rules
// (backend/app/api/deps.py) — used to hide what a teacher can't act on
// anyway, never as the actual security boundary (the API enforces that).
// An assignment with `lesson_id == null` is a rehber (homeroom) row: full
// roster + general view, no grade-editing rights. `lesson_id` set is a
// branş (subject) row: view AND edit, scoped to that classroom+lesson.

export function assignedClassroomIds(assignments) {
  return new Set(assignments.filter((assignment) => assignment.is_active).map((assignment) => assignment.classroom_id));
}

export function homeroomClassroomIds(assignments) {
  return new Set(
    assignments
      .filter((assignment) => assignment.is_active && assignment.lesson_id === null)
      .map((assignment) => assignment.classroom_id),
  );
}

// (classroomId, lessonId) pairs this teacher can actually grade/edit.
export function assignedSubjectPairs(assignments) {
  return new Set(
    assignments
      .filter((assignment) => assignment.is_active && assignment.lesson_id !== null)
      .map((assignment) => `${assignment.classroom_id}:${assignment.lesson_id}`),
  );
}

// Matches the exact classroom+lesson combination a teacher is assigned to
// teach — write-level access (creating/editing a grade, homework, schedule
// entry). A homeroom assignment alone does not satisfy this.
export function canAccessClassSubject(assignments, classroomId, lessonId) {
  return assignedSubjectPairs(assignments).has(`${classroomId}:${lessonId}`);
}

// Broader: can this teacher at least VIEW records in this classroom, either
// because they're its rehber or because they teach some subject there.
export function canViewClassroom(assignments, classroomId) {
  return assignedClassroomIds(assignments).has(classroomId);
}

// The lessons a teacher may actually grade for one classroom — for the Not
// Defteri "Ders" dropdown (madde 6): a teacher never sees a subject they
// aren't assigned to, even in a class whose roster they can otherwise see.
export function assignedLessonsForClassroom(assignments, classroomId, lessons) {
  const pairs = assignedSubjectPairs(assignments);
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const seen = new Set();
  const result = [];
  assignments
    .filter((assignment) => assignment.is_active && assignment.classroom_id === classroomId && assignment.lesson_id !== null)
    .forEach((assignment) => {
      if (seen.has(assignment.lesson_id) || !pairs.has(`${classroomId}:${assignment.lesson_id}`)) return;
      const lesson = lessonById.get(assignment.lesson_id);
      if (!lesson) return;
      seen.add(assignment.lesson_id);
      result.push(lesson);
    });
  return result;
}

export function isAdmin(teacher) {
  return teacher?.role === "admin";
}

// Roster management (add/edit/delete a student, change a classroom's own
// fields) is homeroom-only on the backend (ensure_classroom_homeroom_access)
// — a subject-only teacher can view the roster but not manage it. Mirrored
// here so those controls aren't shown to someone who'd just get a 403.
export function canManageRoster(teacher, assignments, classroomId) {
  if (isAdmin(teacher)) return true;
  if (classroomId === null || classroomId === undefined) return false;
  return homeroomClassroomIds(assignments).has(classroomId);
}
