import { classroomToForm } from "../utils/helpers";
import Icon from "../components/Icon";

export default function ClassroomsPage(props) {
  const {
    classroomGradeFilter,
    classroomSearchTerm,
    classroomStudentCounts,
    classrooms,
    handleDeleteClassroom,
    setActiveModal,
    setActivePage,
    setClassroomEditForm,
    setClassroomGradeFilter,
    setClassroomSearchTerm,
    setEditingClassroom,
    setSelectedClassroomId,
  } = props;
  const gradeLevels = Array.from(
    new Set(classrooms.map((classroom) => classroom.grade_level)),
  ).sort((first, second) => Number(first) - Number(second));
  const visibleClassrooms = classrooms.filter((classroom) => {
    const matchesSearch = classroom.name
      .toLocaleLowerCase("tr")
      .includes(classroomSearchTerm.toLocaleLowerCase("tr"));
    const matchesGrade =
      classroomGradeFilter === "all" ||
      classroom.grade_level === classroomGradeFilter;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="wide-page">
      <section className="classroom-management-grid">
        {visibleClassrooms.map((classroom) => (
          <article
            className="classroom-card clickable"
            key={classroom.id}
            onClick={() => {
              setSelectedClassroomId(classroom.id);
              setActivePage("classroomDetail");
            }}
          >
            <div className="classroom-icon">
              <Icon name="science" />
            </div>
            <div>
              <h3>{classroom.name} Sınıfı</h3>
              <p>{classroomStudentCounts[classroom.id] || 0} öğrenci</p>
            </div>
            <div className="classroom-card-actions">
              <button
                aria-label={`${classroom.name} sınıfını düzenle`}
                className="icon-action"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingClassroom(classroom);
                  setClassroomEditForm(classroomToForm(classroom));
                  setActiveModal("editClassroom");
                }}
                type="button"
              >
                <Icon name="edit" />
              </button>
              <button
                aria-label={`${classroom.name} sınıfını sil`}
                className="icon-action danger-action"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteClassroom(classroom.id);
                }}
                type="button"
              >
                <Icon name="delete" />
              </button>
            </div>
          </article>
        ))}
        <button
          className="new-class-dashed"
          onClick={() => setActiveModal("classroom")}
          type="button"
        >
          <Icon name="add_circle" /> Yeni Sınıf
        </button>
      </section>
    </div>
  );
}
