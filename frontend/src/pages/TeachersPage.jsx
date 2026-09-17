import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { avatarToneFor, initialsOf } from "../utils/helpers";

const VISIBLE_ASSIGNMENT_COUNT = 2;

function assignmentLabel(assignment) {
  return assignment.lesson_name
    ? `${assignment.classroom_name} · ${assignment.lesson_name}`
    : `${assignment.classroom_name} · Rehber Öğretmenlik`;
}

export default function TeachersPage({
  currentTeacher,
  handleDeleteTeacher,
  handleDeleteTeachers,
  handleRemoveTeacherAssignment,
  setActiveModal,
  setAssignmentForm,
  setTeacherForm,
  teachersAdminList,
}) {
  const [openPopoverTeacherId, setOpenPopoverTeacherId] = useState(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const popoverRef = useRef(null);
  const deletableTeacherIds = useMemo(
    () =>
      teachersAdminList
        .filter((teacher) => teacher.id !== currentTeacher?.id)
        .map((teacher) => teacher.id),
    [currentTeacher?.id, teachersAdminList],
  );
  const selectedVisibleIds = selectedTeacherIds.filter((teacherId) =>
    deletableTeacherIds.includes(teacherId),
  );
  const isAllVisibleSelected =
    deletableTeacherIds.length > 0 &&
    deletableTeacherIds.every((teacherId) => selectedTeacherIds.includes(teacherId));

  useEffect(() => {
    if (!openPopoverTeacherId) return undefined;
    function handleOutsideClick(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpenPopoverTeacherId(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openPopoverTeacherId]);

  useEffect(() => {
    const visibleIds = new Set(deletableTeacherIds);
    setSelectedTeacherIds((current) => current.filter((teacherId) => visibleIds.has(teacherId)));
  }, [deletableTeacherIds]);

  return (
    <div className="wide-page">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Öğretmenler</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Öğretmenleri, branşlarını ve sınıf/ders atamalarını yönet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setTeacherForm({ full_name: "", email: "", title: "", branch: "", role: "teacher", password: "" });
              setActiveModal("teacher");
            }}
            size="md"
            variant="primary"
          >
            <Icon name="person_add" /> Öğretmen Davet Et
          </Button>
          <Button
            onClick={() => {
              setAssignmentForm({ teacher_id: "", classroom_id: "", lesson_id: "" });
              setActiveModal("assignTeacher");
            }}
            size="md"
            variant="secondary"
          >
            <Icon name="add" /> Ders / Sınıf Ata
          </Button>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-low font-label-md text-label-md uppercase tracking-wider text-secondary">
              <tr>
                <th className="w-12 border-b border-outline-variant p-4">
                  {deletableTeacherIds.length > 0 && (
                    <input
                      aria-label="Silinebilecek öğretmenleri seç"
                      checked={isAllVisibleSelected}
                      onChange={(event) => {
                        setSelectedTeacherIds(event.target.checked ? deletableTeacherIds : []);
                      }}
                      type="checkbox"
                    />
                  )}
                </th>
                <th className="border-b border-outline-variant p-4">Öğretmen</th>
                <th className="border-b border-outline-variant p-4">Branş</th>
                <th className="border-b border-outline-variant p-4">Atamalar</th>
                <th className="border-b border-outline-variant p-4">Rol</th>
                <th className="border-b border-outline-variant p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {selectedVisibleIds.length > 0 && (
                      <Button
                        onClick={async () => {
                          await handleDeleteTeachers(selectedVisibleIds);
                          setSelectedTeacherIds([]);
                        }}
                        size="sm"
                        variant="danger"
                      >
                        <Icon name="delete" /> Seçili Sil ({selectedVisibleIds.length})
                      </Button>
                    )}
                    <span>İşlem</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {teachersAdminList.map((teacher) => {
                const [firstName = "", lastName = ""] = teacher.full_name.split(" ");
                const visibleAssignments = teacher.assignments.slice(0, VISIBLE_ASSIGNMENT_COUNT);
                const hiddenAssignments = teacher.assignments.slice(VISIBLE_ASSIGNMENT_COUNT);
                const canDeleteTeacher = teacher.id !== currentTeacher?.id;
                return (
                  <tr className="border-b border-outline-variant/50 align-top transition-colors hover:bg-surface-container-low" key={teacher.id}>
                    <td className="p-4">
                      {canDeleteTeacher && (
                        <input
                          aria-label={`${teacher.full_name} seç`}
                          checked={selectedTeacherIds.includes(teacher.id)}
                          onChange={(event) => {
                            setSelectedTeacherIds((current) =>
                              event.target.checked
                                ? [...current, teacher.id]
                                : current.filter((teacherId) => teacherId !== teacher.id),
                            );
                          }}
                          type="checkbox"
                        />
                      )}
                    </td>
                    <td className="flex items-center gap-3 p-4">
                      <span className={`avatar-circle h-9 w-9 text-xs ${avatarToneFor(teacher.id)}`}>
                        {initialsOf(firstName, lastName)}
                      </span>
                      <span>
                        <span className="block font-body-md text-body-md font-medium text-on-surface">
                          {teacher.full_name}
                        </span>
                        <span className="block font-mono-sm text-mono-sm text-secondary">{teacher.email}</span>
                      </span>
                    </td>
                    <td className="p-4 font-body-md text-body-md text-on-surface">
                      {teacher.branch || <span className="text-secondary">Branş belirtilmemiş</span>}
                    </td>
                    <td className="p-4">
                      {teacher.assignments.length ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {visibleAssignments.map((assignment) => (
                            <span className="teacher-assignment-chip" key={assignment.id} title={assignmentLabel(assignment)}>
                              {assignment.classroom_name}
                              <button
                                aria-label={`${assignmentLabel(assignment)} atamasını kaldır`}
                                onClick={() => handleRemoveTeacherAssignment(assignment.id)}
                                type="button"
                              >
                                <Icon className="text-[13px]" name="close" />
                              </button>
                            </span>
                          ))}
                          {hiddenAssignments.length > 0 && (
                            <div className="relative" ref={openPopoverTeacherId === teacher.id ? popoverRef : null}>
                              <button
                                aria-expanded={openPopoverTeacherId === teacher.id}
                                className="teacher-assignment-more"
                                onClick={() =>
                                  setOpenPopoverTeacherId((current) => (current === teacher.id ? null : teacher.id))
                                }
                                type="button"
                              >
                                +{hiddenAssignments.length} atama
                              </button>
                              {openPopoverTeacherId === teacher.id && (
                                <div className="teacher-assignment-popover">
                                  {hiddenAssignments.map((assignment) => (
                                    <div className="teacher-assignment-popover-row" key={assignment.id}>
                                      <span className="truncate">{assignmentLabel(assignment)}</span>
                                      <button
                                        aria-label={`${assignmentLabel(assignment)} atamasını kaldır`}
                                        onClick={() => handleRemoveTeacherAssignment(assignment.id)}
                                        type="button"
                                      >
                                        <Icon className="text-[15px]" name="close" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="font-body-md text-body-md text-secondary">Henüz ders veya sınıf ataması yok.</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`badge ${teacher.role === "admin" ? "badge-success" : "badge-neutral"}`}>
                        {teacher.role === "admin" ? "Yönetici" : "Öğretmen"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                      <Button
                        aria-label={`${teacher.full_name} için ders/sınıf ata`}
                        onClick={() => {
                          setAssignmentForm({ teacher_id: String(teacher.id), classroom_id: "", lesson_id: "" });
                          setActiveModal("assignTeacher");
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Ata
                      </Button>
                        {canDeleteTeacher && (
                          <Button
                            aria-label={`${teacher.full_name} öğretmenini sil`}
                            onClick={() => handleDeleteTeacher(teacher)}
                            size="sm"
                            variant="danger"
                          >
                            Sil
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!teachersAdminList.length && <p className="empty-note">Henüz öğretmen yok.</p>}
      </section>
    </div>
  );
}
