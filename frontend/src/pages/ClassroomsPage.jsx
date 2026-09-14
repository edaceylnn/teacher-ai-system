import { classroomToForm } from "../utils/helpers";
import Icon from "../components/Icon";

export default function ClassroomsPage(props) {
  const {
    classroomGradeFilter,
    classroomSearchTerm,
    classroomStudentCounts,
    classrooms,
    grades,
    handleDeleteClassroom,
    lessons,
    scheduleEntries,
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
  const todayWeekday = (new Date().getDay() + 6) % 7;
  const classroomMetrics = new Map(
    classrooms.map((classroom) => {
      const classGrades = grades.filter((grade) => grade.classroom_id === classroom.id);
      const average = classGrades.length
        ? Math.round((classGrades.reduce((sum, grade) => sum + Number(grade.score), 0) / classGrades.length) * 10) / 10
        : null;
      const lessonIds = new Set([
        ...classGrades.map((grade) => grade.lesson_id),
        ...scheduleEntries
          .filter((entry) => entry.classroom_id === classroom.id)
          .map((entry) => entry.lesson_id),
      ]);
      const todayLessonCount = scheduleEntries.filter(
        (entry) => entry.classroom_id === classroom.id && entry.weekday === todayWeekday,
      ).length;
      return [
        classroom.id,
        {
          average,
          lessonCount: lessonIds.size || lessons.filter((lesson) => lesson.classroom_id === classroom.id).length,
          todayLessonCount,
        },
      ];
    }),
  );

  return (
    <div className="wide-page">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Sınıflarım</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Aktif dönemdeki tüm sınıflarını buradan yönetebilirsin.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-outline" />
            <input
              className="filter-input"
              onChange={(event) => setClassroomSearchTerm(event.target.value)}
              placeholder="Sınıf ara"
              type="text"
              value={classroomSearchTerm}
            />
          </div>
          <select
            className="filter-select"
            onChange={(event) => setClassroomGradeFilter(event.target.value)}
            value={classroomGradeFilter}
          >
            <option value="all">Tüm Seviyeler</option>
            {gradeLevels.map((gradeLevel) => (
              <option key={gradeLevel} value={gradeLevel}>
                {gradeLevel}. Sınıflar
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-card-gap md:grid-cols-2 xl:grid-cols-3">
        {visibleClassrooms.map((classroom) => (
          <article
            className="group relative flex min-h-[220px] cursor-pointer flex-col rounded-xl bg-surface-container-lowest p-container-padding shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-18px_rgba(15,23,42,0.35)]"
            key={classroom.id}
            onClick={() => {
              setSelectedClassroomId(classroom.id);
              setActivePage("classroomDetail");
            }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-low text-secondary">
                <Icon name="school" className="text-[28px]" />
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface">{classroom.name} Sınıfı</h3>
            <p className="mb-4 font-label-md text-label-md text-secondary">{classroom.grade_level}. Sınıf</p>
            <div className="mt-auto grid grid-cols-3 gap-3 rounded-lg bg-surface-container-low p-3">
              <Metric label="Öğrenci" value={classroomStudentCounts[classroom.id] || 0} />
              <Metric label="Ort." value={classroomMetrics.get(classroom.id)?.average ?? "-"} />
              <Metric label="Bugün" value={`${classroomMetrics.get(classroom.id)?.todayLessonCount || 0} ders`} />
            </div>
            <p className="mt-3 font-label-md text-label-md text-on-surface-variant">
              {classroomMetrics.get(classroom.id)?.lessonCount || 0} ders kayıtlı
            </p>
          </article>
        ))}
        <button
          className="group flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface p-container-padding text-on-surface-variant transition-all duration-200 hover:border-primary hover:bg-surface-container-lowest hover:text-primary"
          onClick={() => setActiveModal("classroom")}
          type="button"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low transition-colors group-hover:bg-primary-container/10">
            <Icon name="add" className="text-[28px]" />
          </div>
          <span className="font-headline-md text-headline-md">Yeni Sınıf</span>
          <span className="mt-1 font-body-md text-body-md opacity-70">Sisteme yeni bir sınıf ekle</span>
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <span className="min-w-0">
      <strong className="block truncate font-title-md text-title-md text-on-surface">{value}</strong>
      <small className="block truncate font-label-md text-label-md text-secondary">{label}</small>
    </span>
  );
}
