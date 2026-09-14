import { useState } from "react";
import { avatarToneFor, enrollmentStatusLabels, initialsOf } from "../utils/helpers";

export default function StudentTable({
  canManage,
  handleDeleteStudent,
  selectedStudentId,
  setActiveModal,
  setActivePage,
  setEditingStudent,
  setSelectedStudentId,
  setStudentEditForm,
  students,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);

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
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="w-20">No</th>
              <th>Ad Soyad</th>
              <th>Veli</th>
              <th>Durum</th>
              <th className="w-16 text-right">İşlemler</th>
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
