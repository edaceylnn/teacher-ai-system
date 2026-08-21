import { useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { initialsOf } from "../utils/helpers";

const RESULT_LIMIT = 5;

export default function Topbar({
  allStudents,
  classrooms,
  currentTeacher,
  onLogout,
  onToggleMobileNav,
  onToggleTheme,
  setActivePage,
  setSelectedClassroomId,
  setSelectedStudentId,
  teachersAdminList,
  theme,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const [firstName = "", lastName = ""] = currentTeacher.full_name.split(" ");

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("tr");

  const classroomsById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );

  const studentResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return allStudents
      .filter((student) =>
        `${student.first_name} ${student.last_name}`.toLocaleLowerCase("tr").includes(normalizedQuery),
      )
      .slice(0, RESULT_LIMIT);
  }, [allStudents, normalizedQuery]);

  const classroomResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return classrooms
      .filter((classroom) => classroom.name.toLocaleLowerCase("tr").includes(normalizedQuery))
      .slice(0, RESULT_LIMIT);
  }, [classrooms, normalizedQuery]);

  const teacherResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return teachersAdminList
      .filter((teacherItem) => teacherItem.full_name.toLocaleLowerCase("tr").includes(normalizedQuery))
      .slice(0, RESULT_LIMIT);
  }, [teachersAdminList, normalizedQuery]);

  const hasResults = studentResults.length > 0 || classroomResults.length > 0 || teacherResults.length > 0;
  const isDropdownOpen = isSearchFocused && normalizedQuery.length > 0;

  function closeSearch() {
    setIsSearchFocused(false);
    setSearchQuery("");
    searchInputRef.current?.blur();
  }

  function goToStudent(student) {
    setSelectedClassroomId(student.classroom_id);
    setSelectedStudentId(student.id);
    setActivePage("studentDetail");
    closeSearch();
  }

  function goToClassroom(classroom) {
    setSelectedClassroomId(classroom.id);
    setActivePage("classroomDetail");
    closeSearch();
  }

  function goToTeacher(teacherItem) {
    setActivePage(teacherItem.id === currentTeacher.id ? "profile" : "teachers");
    closeSearch();
  }

  return (
    <header className="topbar sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-4 md:pl-[264px] md:pr-8">
      <div className="flex items-center gap-4">
        <button
          aria-label="Menüyü aç"
          className="text-secondary md:hidden"
          onClick={onToggleMobileNav}
          type="button"
        >
          <Icon name="menu" />
        </button>
        <div className="relative hidden w-80 sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">
            search
          </span>
          <input
            className="w-full rounded-full border border-transparent bg-surface-container-low py-1.5 pl-10 pr-4 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:bg-surface focus:ring-0"
            onBlur={() => setIsSearchFocused(false)}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Öğrenci, sınıf veya öğretmen ara..."
            ref={searchInputRef}
            type="text"
            value={searchQuery}
          />
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-11 z-30 max-h-96 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
              {!hasResults && (
                <p className="px-4 py-3 font-body-md text-body-md text-secondary">Sonuç bulunamadı.</p>
              )}
              {studentResults.length > 0 && (
                <div className="py-1.5">
                  <p className="px-4 pb-1 pt-1.5 font-label-md text-label-md uppercase tracking-wider text-secondary">
                    Öğrenciler
                  </p>
                  {studentResults.map((student) => (
                    <button
                      className="flex w-full items-center gap-3 px-4 py-2 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low"
                      key={`student-${student.id}`}
                      onClick={() => goToStudent(student)}
                      onMouseDown={(event) => event.preventDefault()}
                      type="button"
                    >
                      <Icon className="text-secondary" name="person" />
                      <span>
                        <span className="block">
                          {student.first_name} {student.last_name}
                        </span>
                        {classroomsById.get(student.classroom_id) && (
                          <span className="block font-mono-sm text-mono-sm text-secondary">
                            {classroomsById.get(student.classroom_id).name}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {classroomResults.length > 0 && (
                <div className="border-t border-outline-variant py-1.5">
                  <p className="px-4 pb-1 pt-1.5 font-label-md text-label-md uppercase tracking-wider text-secondary">
                    Sınıflar
                  </p>
                  {classroomResults.map((classroom) => (
                    <button
                      className="flex w-full items-center gap-3 px-4 py-2 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low"
                      key={`classroom-${classroom.id}`}
                      onClick={() => goToClassroom(classroom)}
                      onMouseDown={(event) => event.preventDefault()}
                      type="button"
                    >
                      <Icon className="text-secondary" name="school" />
                      <span>{classroom.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {teacherResults.length > 0 && (
                <div className="border-t border-outline-variant py-1.5">
                  <p className="px-4 pb-1 pt-1.5 font-label-md text-label-md uppercase tracking-wider text-secondary">
                    Öğretmenler
                  </p>
                  {teacherResults.map((teacherItem) => (
                    <button
                      className="flex w-full items-center gap-3 px-4 py-2 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low"
                      key={`teacher-${teacherItem.id}`}
                      onClick={() => goToTeacher(teacherItem)}
                      onMouseDown={(event) => event.preventDefault()}
                      type="button"
                    >
                      <Icon className="text-secondary" name="supervisor_account" />
                      <span>
                        <span className="block">{teacherItem.full_name}</span>
                        {teacherItem.branch && (
                          <span className="block font-mono-sm text-mono-sm text-secondary">
                            {teacherItem.branch}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="relative flex items-center gap-4">
        <button
          aria-label={theme === "dark" ? "Açık moda geç" : "Koyu moda geç"}
          className="icon-action"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Açık moda geç" : "Koyu moda geç"}
          type="button"
        >
          <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} />
        </button>
        <button
          className="flex items-center gap-2"
          onClick={() => setIsUserMenuOpen((current) => !current)}
          type="button"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-primary-container font-label-md text-label-md text-on-primary">
            {initialsOf(firstName, lastName)}
          </span>
          <Icon name="expand_more" className="hidden sm:inline" />
        </button>
        {isUserMenuOpen && (
          <div className="absolute right-0 top-12 z-30 flex w-44 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
            <button
              className="flex items-center gap-2 px-4 py-2.5 font-label-md text-label-md text-on-surface hover:bg-surface-container-low"
              onClick={() => {
                setActivePage("profile");
                setIsUserMenuOpen(false);
              }}
              type="button"
            >
              <Icon name="person" /> Profil
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2.5 font-label-md text-label-md text-error hover:bg-error-container"
              onClick={onLogout}
              type="button"
            >
              <Icon name="logout" /> Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
