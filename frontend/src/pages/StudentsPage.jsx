import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
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
  const [openMenuId, setOpenMenuId] = useState(null);
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  const gradesByStudent = useMemo(() => buildGradesByStudent(grades), [grades]);
  const canAddStudent =
    isAdmin(currentTeacher) || homeroomClassroomIds(teacherAssignments).size > 0;
  const canGoBack = studentDirectoryOffset > 0;
  const canGoForward = studentDirectoryOffset + studentDirectoryPage.limit < studentDirectoryPage.total;

  function openStudentDetail(student) {
    setSelectedStudentId(student.id);
    setGradeForm((form) => ({ ...form, student_id: String(student.id) }));
    setActivePage("studentDetail");
    setOpenMenuId(null);
  }

  function openEditStudent(student) {
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
    setOpenMenuId(null);
  }

  return (
    <div className="wide-page students-page">
      <div className="students-header">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Öğrencilerim</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Tüm sınıflardaki öğrencilerini yönet ve performanslarını takip et.
          </p>
        </div>
      </div>

      <div className="students-toolbar">
        <div className="students-search">
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
        <select
          className="filter-select students-class-filter"
          onChange={(event) => {
            setStudentDirectoryOffset(0);
            setStudentDirectoryClassroomId(event.target.value);
          }}
          value={studentDirectoryClassroomId}
        >
          <option value="">Tüm Sınıflar</option>
          {classroomOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {canAddStudent && (
          <button
            className="primary-button compact students-add-button"
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

      <section className="students-table-panel">
        <div className="overflow-x-auto">
          <table className="students-table w-full border-collapse text-left">
            <thead>
              <tr>
                <th>Öğrenci</th>
                <th>Sınıf</th>
                <th>
                  <span
                    className="inline-flex items-center gap-1"
                    title="Not ortalamasına göre hesaplanır: 85+ Başarılı, 70-84 Ortalama, 70 altı Riskli. Not yoksa Not yok gösterilir."
                  >
                    Akademik Durum
                    <Icon name="info" className="text-[15px] text-outline" />
                  </span>
                </th>
                <th className="hidden sm:table-cell">
                  Son Yorum
                </th>
                <th className="text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {studentDirectoryPage.items.map((student) => {
                const average = averageOfScores(gradesByStudent.get(student.id) || []);
                const status = performanceStatus(average);
                const canManage = canManageRoster(currentTeacher, teacherAssignments, student.classroom_id);
                return (
                  <tr
                    className={`students-row ${
                      student.id === selectedStudentId ? "bg-surface-container-low" : ""
                    }`}
                    key={student.id}
                    onClick={() => openStudentDetail(student)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`avatar-circle h-8 w-8 shrink-0 text-[11px] ${avatarToneFor(student.id)}`}>
                          {initialsOf(student.first_name, student.last_name)}
                        </div>
                        <div>
                          <p className="font-body-md text-body-md font-medium text-on-surface">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className={`font-mono-sm text-mono-sm ${student.email ? "text-secondary" : "students-muted"}`}>
                            {student.email || "E-posta yok"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="font-body-md text-body-md text-on-surface">
                        {classroomById.get(student.classroom_id)?.name || "-"}
                      </p>
                      <p className="font-mono-sm text-mono-sm text-secondary">#{student.id}</p>
                    </td>
                    <td>
                      <span
                        className={`badge text-[10px] ${status.label === "Not yok" ? "students-muted-badge" : ""} ${
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
                    <td className="hidden sm:table-cell">
                      <span
                        className={`students-comment ${student.observation_notes ? "" : "students-muted"}`}
                        title={student.observation_notes || "Yorum girilmedi."}
                      >
                        {student.observation_notes || "Yorum girilmedi."}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="student-row-menu">
                        <button
                          aria-expanded={openMenuId === student.id}
                          aria-label={`${student.first_name} ${student.last_name} işlemleri`}
                          className="student-row-menu-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId((current) => (current === student.id ? null : student.id));
                          }}
                          type="button"
                        >
                          •••
                        </button>
                        {openMenuId === student.id && (
                          <div className="student-row-menu-popover" onClick={(event) => event.stopPropagation()}>
                            <button onClick={() => openStudentDetail(student)} type="button">Detay Görüntüle</button>
                            {canManage && <button onClick={() => openEditStudent(student)} type="button">Düzenle</button>}
                            {canManage && (
                              <button
                                className="danger"
                                onClick={() => {
                                  handleDeleteStudent(student.id);
                                  setOpenMenuId(null);
                                }}
                                type="button"
                              >
                                Sil
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!studentDirectoryPage.items.length && <EmptyState icon="person_search" text="Öğrenci bulunamadı." />}
        {studentDirectoryPage.total > 0 && (
          <div className="students-pagination">
            <span>{studentDirectoryPage.total} öğrenci</span>
            <div>
              <button
                aria-label="Önceki sayfa"
                className="icon-action"
                disabled={!canGoBack}
                onClick={() => setStudentDirectoryOffset(Math.max(studentDirectoryOffset - studentDirectoryPage.limit, 0))}
                type="button"
              >
                <Icon name="chevron_left" />
              </button>
              <button
                aria-label="Sonraki sayfa"
                className="icon-action"
                disabled={!canGoForward}
                onClick={() => setStudentDirectoryOffset(studentDirectoryOffset + studentDirectoryPage.limit)}
                type="button"
              >
                <Icon name="chevron_right" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
