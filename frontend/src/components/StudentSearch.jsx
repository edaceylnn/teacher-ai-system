import Icon from "./Icon";

export default function StudentSearch({
  filteredStudents,
  isStudentPickerOpen,
  searchTerm,
  selectedStudent,
  selectedStudentId,
  setIsStudentPickerOpen,
  setSearchTerm,
  setSelectedStudentId,
}) {
  const hasValue = Boolean(searchTerm || selectedStudentId);

  return (
    <div className="student-search">
      <Icon name="search" />
      <div className="student-combobox">
        <input
          aria-expanded={isStudentPickerOpen}
          aria-label="Öğrenci ara ve seç"
          onBlur={() =>
            window.setTimeout(() => setIsStudentPickerOpen(false), 140)
          }
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setIsStudentPickerOpen(true);
          }}
          onFocus={() => setIsStudentPickerOpen(true)}
          placeholder={
            selectedStudent
              ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
              : "Öğrenci ara"
          }
          value={searchTerm}
        />
        {hasValue && (
          <button
            aria-label="Öğrenci seçimini temizle"
            className="clear-search-button"
            onClick={() => {
              setSelectedStudentId(null);
              setSearchTerm("");
              setIsStudentPickerOpen(false);
            }}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <Icon name="close" />
          </button>
        )}
        {isStudentPickerOpen && (
          <div className="student-options" role="listbox">
            {filteredStudents.length ? (
              filteredStudents.map((student) => (
                <button
                  className={student.id === selectedStudentId ? "active" : ""}
                  key={student.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setSearchTerm(`${student.first_name} ${student.last_name}`);
                    setIsStudentPickerOpen(false);
                  }}
                  type="button"
                >
                  <strong>
                    {student.first_name} {student.last_name}
                  </strong>
                  <small>
                    {student.observation_notes || "Öğrenci profili"}
                  </small>
                </button>
              ))
            ) : (
              <div className="student-option-empty">Sonuç bulunamadı.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
