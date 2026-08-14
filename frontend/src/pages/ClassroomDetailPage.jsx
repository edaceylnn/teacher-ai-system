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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <button
            aria-label="Sınıflarıma dön"
            className="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container-low"
            onClick={() => setActivePage("classrooms")}
            type="button"
          >
            <Icon name="arrow_back" />
          </button>
          <h1 className="flex items-center gap-3 font-headline-lg text-headline-lg text-on-surface">
            {selectedClassroom ? `${selectedClassroom.name}` : "Sınıf seç"}
            <span className="rounded-full bg-secondary-container px-2.5 py-0.5 font-label-md text-label-md uppercase tracking-wider text-on-secondary-container">
              {classroomStudentPage.total} Öğrenci
            </span>
          </h1>
        </div>
        <button className="primary-button" onClick={() => setActiveModal("student")} type="button">
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
    </div>
  );
}
