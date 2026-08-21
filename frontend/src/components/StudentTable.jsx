import Icon from "./Icon";
import { enrollmentStatusLabels } from "../utils/helpers";

export default function StudentTable({
  handleDeleteStudent,
  selectedStudentId,
  setActiveModal,
  setEditingStudent,
  setSelectedStudentId,
  setStudentEditForm,
  students,
}) {
  return (
    <section className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th className="w-16 py-3 px-6 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">No</th>
              <th className="py-3 px-6 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Ad Soyad</th>
              <th className="py-3 px-6 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Veli</th>
              <th className="py-3 px-6 font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">Durum</th>
              <th className="py-3 px-6 text-right font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant font-body-md text-body-md text-on-surface">
            {students.map((student) => (
              <tr
                className={`group cursor-pointer transition-colors hover:bg-surface-bright ${
                  student.id === selectedStudentId ? "bg-surface-container-low" : ""
                }`}
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
              >
                <td className="py-4 px-6 text-secondary">{student.id}</td>
                <td className="py-4 px-6 font-medium">
                  {student.first_name} {student.last_name}
                </td>
                <td className="py-4 px-6 text-secondary">{student.parent_full_name || "-"}</td>
                <td className="py-4 px-6">
                  <span
                    className={`badge ${
                      student.enrollment_status === "reported" ? "badge-warning" : "badge-success"
                    }`}
                  >
                    {enrollmentStatusLabels[student.enrollment_status] || "Aktif"}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="row-actions">
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
                  </div>
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
