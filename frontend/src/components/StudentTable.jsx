import Icon from "./Icon";

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
    <section className="student-table-card">
      <div className="table-head">
        <span>Öğrenci</span>
        <span>İşlem</span>
      </div>
      {students.map((student) => (
        <div
          className={
            student.id === selectedStudentId
              ? "student-row active"
              : "student-row"
          }
          key={student.id}
          onClick={() => setSelectedStudentId(student.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setSelectedStudentId(student.id);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <span className="student-name">
            <span className="student-avatar">
              {student.first_name[0]}
              {student.last_name[0]}
            </span>
            <span className="student-directory-info">
              <strong>
                {student.first_name} {student.last_name}
              </strong>
              {(student.parent_full_name ||
                student.parent_phone ||
                student.parent_email) && (
                <small>
                  {[
                    student.parent_full_name,
                    student.parent_phone,
                    student.parent_email,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              )}
            </span>
          </span>
          <span className="row-actions">
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
        </div>
      ))}
    </section>
  );
}
