import Icon from "../components/Icon";
import PaginationControls from "../components/PaginationControls";
import StudentSearch from "../components/StudentSearch";
import StudentTable from "../components/StudentTable";

export default function ClassroomDetailPage(props) {
  const {
    classroomStudentOffset,
    classroomStudentPage,
    isStudentPickerOpen,
    searchTerm,
    selectedClassroom,
    selectedStudent,
    selectedStudentId,
    setActiveModal,
    setActivePage,
    setClassroomStudentOffset,
    setEditingStudent,
    setIsStudentPickerOpen,
    setSearchTerm,
    setSelectedStudentId,
    setStudentEditForm,
    students,
    handleDeleteStudent,
  } = props;
  const filteredClassStudents = students.filter((student) =>
    `${student.first_name} ${student.last_name}`
      .toLocaleLowerCase("tr")
      .includes(searchTerm.toLocaleLowerCase("tr")),
  );

  return (
    <div className="wide-page">
      <section className="main-column">
        <div className="class-title-row">
          <div>
            <button
              className="link-button back-link"
              onClick={() => setActivePage("classrooms")}
              type="button"
            >
              <Icon name="arrow_back" /> Sınıflarıma dön
            </button>
            <h1>
              {selectedClassroom
                ? `${selectedClassroom.name} Sınıfı`
                : "Sınıf seç"}
            </h1>
            <p>{classroomStudentPage.total} kayıtlı öğrenci</p>
          </div>
          <button
            className="primary-button"
            onClick={() => setActiveModal("student")}
            type="button"
          >
            <Icon name="person_add" /> Öğrenci Ekle
          </button>
        </div>
        <StudentSearch
          filteredStudents={filteredClassStudents}
          isStudentPickerOpen={isStudentPickerOpen}
          searchTerm={searchTerm}
          selectedStudent={selectedStudent}
          selectedStudentId={selectedStudentId}
          setIsStudentPickerOpen={setIsStudentPickerOpen}
          setSearchTerm={setSearchTerm}
          setSelectedStudentId={setSelectedStudentId}
        />
        <StudentTable
          handleDeleteStudent={handleDeleteStudent}
          selectedStudentId={selectedStudentId}
          setActiveModal={setActiveModal}
          setEditingStudent={setEditingStudent}
          setSelectedStudentId={setSelectedStudentId}
          setStudentEditForm={setStudentEditForm}
          students={classroomStudentPage.items}
        />
        <PaginationControls
          limit={classroomStudentPage.limit}
          offset={classroomStudentOffset}
          setOffset={setClassroomStudentOffset}
          total={classroomStudentPage.total}
        />
      </section>
    </div>
  );
}
