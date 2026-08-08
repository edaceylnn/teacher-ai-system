import { useMemo } from "react";
import { homeworkStatusLabels, homeworkStatusOptions } from "../constants";
import Icon from "../components/Icon";
import PaginationControls from "../components/PaginationControls";

export default function HomeworkPage({
  classroomOptions,
  classrooms,
  handleDeleteHomework,
  homeworkOffset,
  homeworkPage,
  homeworkStatusOptions,
  lessonOptions,
  lessons,
  setActiveModal,
  setEditingHomework,
  setHomeworkForm,
  setHomeworkOffset,
}) {
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  const lessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons],
  );

  return (
    <div className="wide-page">
      <section className="hero-card">
        <div>
          <h1>Ödev Takibi</h1>
          <p>Sınıf bazlı ödevleri, teslim tarihlerini ve durumlarını yönet.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            setHomeworkForm({
              classroom_id: "",
              lesson_id: "",
              title: "",
              description: "",
              due_date: "",
              status: "assigned",
            });
            setActiveModal("homework");
          }}
          type="button"
        >
          <Icon name="assignment_add" /> Ödev Ekle
        </button>
      </section>

      <section className="student-table-card homework-card">
        <div className="record-head homework-record-head">
          <span>Ödev</span>
          <span>Sınıf</span>
          <span>Ders</span>
          <span>Teslim</span>
          <span>Durum</span>
          <span>İşlem</span>
        </div>
        {homeworkPage.items.map((homework) => (
          <div className="record-row homework-record-row" key={homework.id}>
            <strong>{homework.title}</strong>
            <span>{classroomById.get(homework.classroom_id)?.name || "-"}</span>
            <span>{lessonById.get(homework.lesson_id)?.name || "-"}</span>
            <span>{homework.due_date}</span>
            <span>{homeworkStatusLabels[homework.status]}</span>
            <span className="row-actions">
              <button
                aria-label={`${homework.title} ödevini düzenle`}
                className="icon-action"
                onClick={() => {
                  setEditingHomework(homework);
                  setHomeworkForm({
                    classroom_id: String(homework.classroom_id),
                    lesson_id: String(homework.lesson_id),
                    title: homework.title,
                    description: homework.description || "",
                    due_date: homework.due_date,
                    status: homework.status,
                  });
                  setActiveModal("editHomework");
                }}
                type="button"
              >
                <Icon name="edit" />
              </button>
              <button
                aria-label={`${homework.title} ödevini sil`}
                className="icon-action danger-action"
                onClick={() => handleDeleteHomework(homework.id)}
                type="button"
              >
                <Icon name="delete" />
              </button>
            </span>
          </div>
        ))}
        {!homeworkPage.items.length && (
          <p className="empty-note">Henüz ödev yok.</p>
        )}
      </section>
      <PaginationControls
        limit={homeworkPage.limit}
        offset={homeworkOffset}
        setOffset={setHomeworkOffset}
        total={homeworkPage.total}
      />
    </div>
  );
}
