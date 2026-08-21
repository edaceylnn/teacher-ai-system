import { useMemo } from "react";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import PaginationControls from "../components/PaginationControls";
import {
  averageOfScores,
  avatarToneFor,
  buildGradesByStudent,
  initialsOf,
  performanceStatus,
} from "../utils/helpers";
import { canManageRoster, homeroomClassroomIds, isAdmin } from "../utils/permissions";

export default function StudentsPage({
  classrooms,
  classroomOptions,
  currentTeacher,
  grades,
  searchTerm,
  selectedStudentId,
  setActiveModal,
  setActivePage,
  setEditingStudent,
  setGradeForm,
  setSearchTerm,
  setSelectedStudentId,
  setStudentDirectoryClassroomId,
  setStudentDirectoryOffset,
  setStudentEditForm,
  setStudentForm,
  studentDirectoryClassroomId,
  studentDirectoryOffset,
  studentDirectoryPage,
  teacherAssignments,
  handleDeleteStudent,
}) {
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  const gradesByStudent = useMemo(() => buildGradesByStudent(grades), [grades]);
  const canAddStudent =
    isAdmin(currentTeacher) || homeroomClassroomIds(teacherAssignments).size > 0;

  return (
    <div className="wide-page">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Öğrencilerim</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Tüm sınıflardaki öğrencilerini yönet ve performanslarını takip et.
          </p>
        </div>
        {canAddStudent && (
          <button
            className="primary-button"
            onClick={() => {
              setStudentForm((form) => ({ ...form, classroom_id: studentDirectoryClassroomId || "" }));
              setActiveModal("student");
            }}
            type="button"
          >
            <Icon name="person_add" /> Öğrenci Ekle
          </button>
        )}
      </div>

      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-outline" />
          <input
            className="filter-input w-full"
            onChange={(event) => {
              setStudentDirectoryOffset(0);
              setSearchTerm(event.target.value);
            }}
            placeholder="İsim veya numara ile ara..."
            value={searchTerm}
          />
          {searchTerm && (
            <button
              aria-label="Öğrenci aramasını temizle"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-error"
              onClick={() => {
                setStudentDirectoryOffset(0);
                setSearchTerm("");
              }}
              type="button"
            >
              <Icon name="close" className="text-sm" />
            </button>
          )}
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <select
            className="filter-select flex-1 sm:w-40"
            onChange={(event) => setStudentDirectoryClassroomId(event.target.value)}
            value={studentDirectoryClassroomId}
          >
            <option value="">Tüm Sınıflar</option>
            {classroomOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="py-3 px-4 font-label-md text-label-md uppercase tracking-wider text-secondary">Öğrenci</th>
                <th className="py-3 px-4 font-label-md text-label-md uppercase tracking-wider text-secondary">Sınıf / No</th>
                <th className="py-3 px-4 font-label-md text-label-md uppercase tracking-wider text-secondary">Durum</th>
                <th className="hidden py-3 px-4 font-label-md text-label-md uppercase tracking-wider text-secondary sm:table-cell">
                  Son Yorum
                </th>
                <th className="py-3 px-4 text-right font-label-md text-label-md uppercase tracking-wider text-secondary">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {studentDirectoryPage.items.map((student) => {
                const average = averageOfScores(gradesByStudent.get(student.id) || []);
                const status = performanceStatus(average);
                const canManage = canManageRoster(currentTeacher, teacherAssignments, student.classroom_id);
                return (
                  <tr
                    className={`group cursor-pointer transition-colors hover:bg-surface-bright ${
                      student.id === selectedStudentId ? "bg-surface-container-low" : ""
                    }`}
                    key={student.id}
                    onClick={() => {
                      setSelectedStudentId(student.id);
                      setGradeForm((form) => ({ ...form, student_id: String(student.id) }));
                      setActivePage("studentDetail");
                    }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`avatar-circle h-8 w-8 shrink-0 ${avatarToneFor(student.id)}`}>
                          {initialsOf(student.first_name, student.last_name)}
                        </div>
                        <div>
                          <p className="font-body-md text-body-md font-medium text-on-surface">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="font-mono-sm text-mono-sm text-secondary">{student.email || "E-posta yok"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-body-md text-body-md text-on-surface">
                        {classroomById.get(student.classroom_id)?.name || "-"}
                      </p>
                      <p className="font-mono-sm text-mono-sm text-secondary">#{student.id}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`badge text-[10px] ${
                          status.tone === "danger"
                            ? "badge-danger"
                            : status.tone === "success"
                              ? "badge-success"
                              : "badge-neutral"
                        }`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="hidden max-w-xs truncate py-3 px-4 font-body-md text-body-md text-secondary sm:table-cell">
                      {student.observation_notes || "Yorum girilmedi."}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canManage && (
                        <span className="row-actions justify-end opacity-0 transition-opacity group-hover:opacity-100">
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
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!studentDirectoryPage.items.length && <EmptyState icon="person_search" text="Öğrenci bulunamadı." />}
        <PaginationControls
          limit={studentDirectoryPage.limit}
          offset={studentDirectoryOffset}
          setOffset={setStudentDirectoryOffset}
          total={studentDirectoryPage.total}
        />
      </section>
    </div>
  );
}
