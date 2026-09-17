import { useEffect, useMemo, useState } from "react";
import Button from "./Button";
import Icon from "./Icon";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";
import { avatarToneFor, enrollmentStatusLabels, initialsOf } from "../utils/helpers";

export default function StudentTable({
  canManage,
  handleDeleteStudent,
  handleDeleteStudents,
  selectedStudentId,
  setActiveModal,
  setActivePage,
  setEditingStudent,
  setSelectedStudentId,
  setStudentEditForm,
  students,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  useCloseOnOutsideClick(openMenuId !== null, () => setOpenMenuId(null));
  const visibleStudentIds = useMemo(() => students.map((student) => student.id), [students]);
  const selectedVisibleIds = selectedStudentIds.filter((studentId) => visibleStudentIds.includes(studentId));
  const isAllVisibleSelected =
    canManage &&
    visibleStudentIds.length > 0 &&
    visibleStudentIds.every((studentId) => selectedStudentIds.includes(studentId));

  useEffect(() => {
    const visibleIds = new Set(visibleStudentIds);
    setSelectedStudentIds((current) => current.filter((studentId) => visibleIds.has(studentId)));
  }, [visibleStudentIds]);

  function openEditModal(student) {
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
    <section className="student-roster-table">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {canManage && (
                <th className="w-12">
                  {visibleStudentIds.length > 0 && (
                    <input
                      aria-label="Görünen öğrencileri seç"
                      checked={isAllVisibleSelected}
                      onChange={(event) => {
                        setSelectedStudentIds(event.target.checked ? visibleStudentIds : []);
                      }}
                      type="checkbox"
                    />
                  )}
                </th>
              )}
              <th className="w-20">No</th>
              <th>Ad Soyad</th>
              <th>Veli</th>
              <th>Durum</th>
              <th className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {selectedVisibleIds.length > 0 && (
                    <Button
                      onClick={async () => {
                        await handleDeleteStudents(selectedVisibleIds);
                        setSelectedStudentIds([]);
                      }}
                      size="sm"
                      variant="danger"
                    >
                      <Icon name="delete" /> Seçili Sil ({selectedVisibleIds.length})
                    </Button>
                  )}
                  <span>İşlemler</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                className={`group ${
                  student.id === selectedStudentId ? "selected" : ""
                }`}
                key={student.id}
                onClick={() => {
                  setSelectedStudentId(student.id);
                  setActivePage("studentDetail");
                }}
              >
                {canManage && (
                  <td onClick={(event) => event.stopPropagation()}>
                    <input
                      aria-label={`${student.first_name} ${student.last_name} seç`}
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={(event) => {
                        setSelectedStudentIds((current) =>
                          event.target.checked
                            ? [...current, student.id]
                            : current.filter((studentId) => studentId !== student.id),
                        );
                      }}
                      type="checkbox"
                    />
                  </td>
                )}
                <td className="font-mono-sm text-mono-sm text-secondary">#{student.id}</td>
                <td>
                  <div className="student-roster-name">
                    <span className={`avatar-circle h-7 w-7 text-[11px] ${avatarToneFor(student.id)}`}>
                      {initialsOf(student.first_name, student.last_name)}
                    </span>
                    <span>{student.first_name} {student.last_name}</span>
                  </div>
                </td>
                <td className="text-secondary">{student.parent_full_name || "Veli eklenmemiş"}</td>
                <td>
                  <span
                    className={`badge ${
                      student.enrollment_status === "reported" ? "badge-warning" : "badge-success"
                    }`}
                  >
                    {enrollmentStatusLabels[student.enrollment_status] || "Aktif"}
                  </span>
                </td>
                <td className="text-right">
                  {canManage ? (
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
                          <button onClick={() => openEditModal(student)} type="button">Düzenle</button>
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
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-body-md text-body-md text-secondary">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!students.length && <p className="empty-note">Bu sınıfta henüz öğrenci yok.</p>}
    </section>
  );
}
