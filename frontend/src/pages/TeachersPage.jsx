import Icon from "../components/Icon";
import { avatarToneFor, initialsOf } from "../utils/helpers";

export default function TeachersPage({
  handleRemoveTeacherAssignment,
  setActiveModal,
  setAssignmentForm,
  teachersAdminList,
}) {
  return (
    <div className="wide-page">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Öğretmenler</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Öğretmenleri, branşlarını ve sınıf/ders atamalarını yönet.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setAssignmentForm({ teacher_id: "", classroom_id: "", lesson_id: "" });
            setActiveModal("assignTeacher");
          }}
          type="button"
        >
          <Icon name="add" /> Ders / Sınıf Ata
        </button>
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-container-low font-label-md text-label-md uppercase tracking-wider text-secondary">
              <tr>
                <th className="border-b border-outline-variant p-4">Öğretmen</th>
                <th className="border-b border-outline-variant p-4">Branş</th>
                <th className="border-b border-outline-variant p-4">Atamalar</th>
                <th className="border-b border-outline-variant p-4">Rol</th>
                <th className="border-b border-outline-variant p-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {teachersAdminList.map((teacher) => {
                const [firstName = "", lastName = ""] = teacher.full_name.split(" ");
                return (
                  <tr className="border-b border-outline-variant/50 align-top" key={teacher.id}>
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
                    <td className="p-4 font-body-md text-body-md text-on-surface">{teacher.branch || "—"}</td>
                    <td className="p-4">
                      {teacher.assignments.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {teacher.assignments.map((assignment) => (
                            <span className="badge badge-neutral gap-1.5" key={assignment.id}>
                              {assignment.classroom_name}
                              {assignment.lesson_name ? ` · ${assignment.lesson_name}` : " · Rehber"}
                              <button
                                aria-label={`${assignment.classroom_name} atamasını kaldır`}
                                className="text-secondary hover:text-error"
                                onClick={() => handleRemoveTeacherAssignment(assignment.id)}
                                type="button"
                              >
                                <Icon className="text-[13px]" name="close" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-body-md text-body-md text-secondary">Atama yok</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`badge ${teacher.role === "admin" ? "badge-success" : "badge-neutral"}`}>
                        {teacher.role === "admin" ? "Yönetici" : "Öğretmen"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        className="outline-button compact"
                        onClick={() => {
                          setAssignmentForm({ teacher_id: String(teacher.id), classroom_id: "", lesson_id: "" });
                          setActiveModal("assignTeacher");
                        }}
                        type="button"
                      >
                        Ata
                      </button>
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
