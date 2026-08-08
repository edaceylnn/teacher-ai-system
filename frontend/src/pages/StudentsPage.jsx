import { useMemo } from "react";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import PaginationControls from "../components/PaginationControls";

export default function StudentsPage({
  classrooms,
  searchTerm,
  selectedStudentId,
  setActiveModal,
  setActivePage,
  setEditingStudent,
  setGradeForm,
  setSearchTerm,
  setSelectedStudentId,
  setStudentDirectoryOffset,
  setStudentEditForm,
  studentDirectoryOffset,
  studentDirectoryPage,
  handleDeleteStudent,
}) {
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  return (
    <div className="wide-page">
      <section className="hero-card">
        <div>
          <h1>Öğrencilerim</h1>
          <p>Öğrenci profilleri, öğretmen yorumu ve detay kayıtları.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => setActiveModal("student")}
          type="button"
        >
          <Icon name="person_add" /> Öğrenci Ekle
        </button>
      </section>

      <div className="student-search">
        <Icon name="search" />
        <input
          onChange={(event) => {
            setStudentDirectoryOffset(0);
            setSearchTerm(event.target.value);
          }}
          placeholder="Öğrenci ara"
          value={searchTerm}
        />
        {searchTerm && (
          <button
            aria-label="Öğrenci aramasını temizle"
            className="clear-search-button"
            onClick={() => {
              setStudentDirectoryOffset(0);
              setSearchTerm("");
            }}
            type="button"
          >
            <Icon name="close" />
          </button>
        )}
      </div>

      <section className="student-table-card">
        <div className="students-head">
          <span>Öğrenci</span>
          <span>Sınıf</span>
          <span>Öğretmen Yorumu</span>
          <span>İşlem</span>
        </div>
        {studentDirectoryPage.items.map((student) => (
          <div
            className={
              student.id === selectedStudentId
                ? "students-row active"
                : "students-row"
            }
            key={student.id}
            onClick={() => {
              setSelectedStudentId(student.id);
              setGradeForm((form) => ({
                ...form,
                student_id: String(student.id),
              }));
              setActivePage("studentDetail");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedStudentId(student.id);
                setGradeForm((form) => ({
                  ...form,
                  student_id: String(student.id),
                }));
                setActivePage("studentDetail");
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
              <strong>
                {student.first_name} {student.last_name}
              </strong>
            </span>
            <span>{classroomById.get(student.classroom_id)?.name || "-"}</span>
            <span>{student.observation_notes || "Yorum girilmedi."}</span>
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
        {!studentDirectoryPage.items.length && (
          <EmptyState icon="person_search" text="Öğrenci bulunamadı." />
        )}
      </section>
      <PaginationControls
        limit={studentDirectoryPage.limit}
        offset={studentDirectoryOffset}
        setOffset={setStudentDirectoryOffset}
        total={studentDirectoryPage.total}
      />
    </div>
  );
}
