import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import PaginationControls from "../components/PaginationControls";
import StudentTable from "../components/StudentTable";
import { canManageRoster } from "../utils/permissions";

export default function ClassroomDetailPage(props) {
  const {
    classroomStudentOffset,
    classroomStudentPage,
    classroomTodayAbsentCount,
    currentTeacher,
    selectedClassroom,
    selectedStudentId,
    setActiveModal,
    setActivePage,
    setClassroomStudentOffset,
    setEditingStudent,
    setSelectedStudentId,
    setStudentEditForm,
    setStudentForm,
    students,
    teacherAssignments,
    handleDeleteStudent,
  } = props;
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState("name-asc");
  const canManage = canManageRoster(currentTeacher, teacherAssignments, selectedClassroom?.id);
  const activeStudentCount = students.filter((student) => student.enrollment_status !== "reported").length;
  const visibleStudents = useMemo(() => {
    const normalizedSearch = tableSearchTerm.trim().toLocaleLowerCase("tr");
    const filtered = students.filter((student) => {
      const fullName = `${student.first_name} ${student.last_name}`.toLocaleLowerCase("tr");
      const matchesSearch = !normalizedSearch || fullName.includes(normalizedSearch);
      const matchesStatus = statusFilter === "all" || student.enrollment_status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((first, second) => {
      if (sortMode === "number-asc") return Number(first.id) - Number(second.id);
      if (sortMode === "status") {
        return (first.enrollment_status || "").localeCompare(second.enrollment_status || "", "tr");
      }
      const firstName = `${first.first_name} ${first.last_name}`;
      const secondName = `${second.first_name} ${second.last_name}`;
      return sortMode === "name-desc"
        ? secondName.localeCompare(firstName, "tr")
        : firstName.localeCompare(secondName, "tr");
    });
  }, [sortMode, statusFilter, students, tableSearchTerm]);
  const paginatedStudents = visibleStudents.slice(
    classroomStudentOffset,
    classroomStudentOffset + classroomStudentPage.limit,
  );

  return (
    <div className="wide-page classroom-detail-page">
      <header className="classroom-detail-header">
        <div>
          <nav className="classroom-breadcrumb" aria-label="Sayfa konumu">
            <button onClick={() => setActivePage("classrooms")} type="button">Sınıflarım</button>
            <Icon name="chevron_right" className="text-[18px]" />
            <span>{selectedClassroom?.name || "Sınıf seç"}</span>
          </nav>
          <div className="mt-3">
            <h1>{selectedClassroom ? `${selectedClassroom.name} Sınıfı` : "Sınıf seç"}</h1>
            <p>2026–2027 • {classroomStudentPage.total} öğrenci</p>
          </div>
        </div>
        {canManage && (
          <button
            className="primary-button compact"
            onClick={() => {
              setStudentForm((form) => ({
                ...form,
                classroom_id: selectedClassroom ? String(selectedClassroom.id) : "",
              }));
              setActiveModal("student");
            }}
            type="button"
          >
            <Icon name="person_add" /> Öğrenci Ekle
          </button>
        )}
      </header>

      <section className="classroom-summary-grid" aria-label="Sınıf özeti">
        <article>
          <span>Toplam Öğrenci</span>
          <strong>{classroomStudentPage.total}</strong>
        </article>
        <article>
          <span>Aktif Öğrenci</span>
          <strong>{activeStudentCount}</strong>
        </article>
        <article>
          <span>Bugün Devamsız</span>
          <strong>{classroomTodayAbsentCount}</strong>
        </article>
      </section>

      <section className="classroom-table-panel">
        <div className="classroom-table-toolbar">
          <label className="classroom-filter-field classroom-filter-search">
            <span>Öğrenci Ara</span>
            <div>
              <Icon name="search" />
              <input
                onChange={(event) => {
                  setTableSearchTerm(event.target.value);
                  setClassroomStudentOffset(0);
                }}
                placeholder="Ad soyad"
                type="search"
                value={tableSearchTerm}
              />
            </div>
          </label>
          <label className="classroom-filter-field">
            <span>Durum Filtresi</span>
            <select
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setClassroomStudentOffset(0);
              }}
              value={statusFilter}
            >
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="reported">Raporlu</option>
            </select>
          </label>
          <label className="classroom-filter-field">
            <span>Sırala</span>
            <select
              onChange={(event) => {
                setSortMode(event.target.value);
                setClassroomStudentOffset(0);
              }}
              value={sortMode}
            >
              <option value="name-asc">Ad A-Z</option>
              <option value="name-desc">Ad Z-A</option>
              <option value="number-asc">No artan</option>
              <option value="status">Durum</option>
            </select>
          </label>
        </div>
      <StudentTable
        canManage={canManage}
        handleDeleteStudent={handleDeleteStudent}
        selectedStudentId={selectedStudentId}
        setActiveModal={setActiveModal}
        setActivePage={setActivePage}
        setEditingStudent={setEditingStudent}
        setSelectedStudentId={setSelectedStudentId}
        setStudentEditForm={setStudentEditForm}
          students={paginatedStudents}
      />
      <PaginationControls
        limit={classroomStudentPage.limit}
        offset={classroomStudentOffset}
        setOffset={setClassroomStudentOffset}
          total={visibleStudents.length}
      />
      </section>
    </div>
  );
}
