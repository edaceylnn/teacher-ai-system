import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import StatCard from "../components/StatCard";
import { avatarToneFor, initialsOf } from "../utils/helpers";

const AI_OUTPUT_LABELS = {
  report_comment: "Karne Yorumu",
  development_suggestion: "Eksik Konu Analizi",
  parent_message: "Veli Mesajı",
};

function aiOutputSummary(outputType, payload) {
  if (outputType === "report_comment") return payload.comment;
  if (outputType === "development_suggestion") return payload.summary;
  if (outputType === "parent_message") return payload.message;
  return "";
}

export default function StudentDetailPage({
  attendanceRate,
  currentTeacher,
  gradeAverages,
  overallAverage,
  profile,
  selectedStudent,
  selectedStudentId,
  setActiveModal,
  setActivePage,
  setEditingGrade,
  setEditingStudent,
  setGradeEditForm,
  setGradeForm,
  setStudentEditForm,
  handleDeleteGrade,
}) {
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ subject: "", message: "" });
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageNotice, setMessageNotice] = useState("");
  const [messageError, setMessageError] = useState("");
  const [aiOutputs, setAiOutputs] = useState([]);

  useEffect(() => {
    if (!selectedStudentId) {
      setAiOutputs([]);
      return;
    }
    let isActive = true;
    api
      .listAIOutputs(selectedStudentId)
      .then((outputs) => {
        if (isActive) setAiOutputs(outputs);
      })
      .catch(() => {
        if (isActive) setAiOutputs([]);
      });
    return () => {
      isActive = false;
    };
  }, [selectedStudentId]);

  const gradesByLesson = useMemo(() => {
    if (!profile?.grades?.length) return [];
    const grouped = profile.grades.reduce((acc, grade) => {
      const current = acc.get(grade.lesson_name) || [];
      current.push(grade);
      acc.set(grade.lesson_name, current);
      return acc;
    }, new Map());

    return Array.from(grouped.entries()).map(([lessonName, grades]) => ({
      lessonName,
      grades,
      average:
        Math.round(
          (grades.reduce((sum, grade) => sum + Number(grade.score), 0) /
            grades.length) *
            10,
        ) / 10,
    }));
  }, [profile]);

  if (!selectedStudent || !profile) {
    return (
      <section className="hero-card">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Öğrenci Detayı</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Detayları görmek için Öğrencilerim listesinden bir öğrenci seç.
          </p>
        </div>
        <button className="outline-button" onClick={() => setActivePage("students")} type="button">
          <Icon name="arrow_back" /> Öğrencilere Dön
        </button>
      </section>
    );
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    setIsSendingMessage(true);
    setMessageError("");
    setMessageNotice("");
    try {
      await api.sendParentMessage(selectedStudentId, messageForm);
      setMessageNotice("Mesaj veliye gönderildi.");
      setMessageForm({ subject: "", message: "" });
    } catch (err) {
      setMessageError(err.message);
    } finally {
      setIsSendingMessage(false);
    }
  }

  const attendanceSummary = profile.attendance_summary;
  const absentRatio = attendanceSummary.total
    ? Math.round((attendanceSummary.absent / attendanceSummary.total) * 100)
    : 0;
  const excusedRatio = attendanceSummary.total
    ? Math.round((attendanceSummary.excused / attendanceSummary.total) * 100)
    : 0;

  return (
    <div className="wide-page">
      <button
        className="no-print mb-2 inline-flex w-fit items-center gap-1 font-label-md text-label-md text-secondary transition-colors hover:text-primary"
        onClick={() => setActivePage("students")}
        type="button"
      >
        <Icon name="arrow_back" className="text-[16px]" /> Öğrencilere dön
      </button>
      <div className="mb-5 hidden border-b border-outline-variant pb-4 print:flex print:items-end print:justify-between">
        <div>
          <p className="font-headline-md text-headline-md font-bold text-primary">Teacher AI</p>
          <p className="font-label-md text-label-md uppercase tracking-wider text-secondary">
            Öğrenci Profil Raporu
          </p>
        </div>
        <div className="text-right font-mono-sm text-mono-sm text-secondary">
          <p>
            Oluşturulma:{" "}
            {new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
          {currentTeacher?.full_name && <p>Öğretmen: {currentTeacher.full_name}</p>}
        </div>
      </div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center print:break-inside-avoid">
        <div className="flex items-center gap-5">
          <div
            className={`avatar-circle h-20 w-20 border-2 border-surface-container-high text-2xl print:h-14 print:w-14 print:text-base ${avatarToneFor(selectedStudentId)}`}
          >
            {initialsOf(profile.first_name, profile.last_name)}
          </div>
          <div>
            <h1 className="mb-1 font-headline-lg text-headline-lg tracking-tight text-on-surface">
              {profile.first_name} {profile.last_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="badge badge-neutral bg-secondary-container text-on-secondary-container">
                Sınıf: {profile.classroom.name}
              </span>
              <span className="font-body-md text-body-md text-secondary">Öğrenci No: #{profile.id}</span>
            </div>
          </div>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button className="outline-button" onClick={() => window.print()} type="button">
            <Icon name="picture_as_pdf" /> Profili PDF Olarak İndir
          </button>
          <button
            className="outline-button"
            onClick={() => {
              setEditingStudent(selectedStudent);
              setStudentEditForm({
                first_name: selectedStudent.first_name,
                last_name: selectedStudent.last_name,
                parent_full_name: selectedStudent.parent_full_name || "",
                parent_phone: selectedStudent.parent_phone || "",
                parent_email: selectedStudent.parent_email || "",
                home_address: selectedStudent.home_address || "",
                observation_notes: selectedStudent.observation_notes || "",
              });
              setActiveModal("editStudent");
            }}
            type="button"
          >
            <Icon name="edit" /> Düzenle
          </button>
          <button
            className="primary-button"
            onClick={() => {
              setGradeForm((form) => ({ ...form, student_id: String(selectedStudentId) }));
              setActiveModal("grade");
            }}
            type="button"
          >
            <Icon name="upload" /> Not Gir
          </button>
          <button
            className="primary-button"
            disabled={!selectedStudent.parent_email}
            onClick={() => {
              setMessageNotice("");
              setMessageError("");
              setIsMessageModalOpen(true);
            }}
            title={selectedStudent.parent_email ? "" : "Bu öğrenci için veli e-postası yok"}
            type="button"
          >
            <Icon name="chat" /> Mesaj Gönder
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <StatCard icon="analytics" label="Genel Ortalama" trend="Kayıtlı notlar" value={overallAverage} />
        <StatCard icon="menu_book" label="Ders Sayısı" trend="Not girilen" value={gradesByLesson.length} />
        <StatCard icon="fact_check" label="Devam Oranı" trend="Seçili öğrenci" value={attendanceRate} />
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <div className="flex flex-col gap-gutter lg:col-span-8">
          <section className="card overflow-hidden print:break-inside-avoid">
            <div className="section-heading border-b border-outline-variant bg-surface-bright p-5">
              <h2>Ders ve Notlar</h2>
              <span className="analysis-chip">{profile.grades.length} kayıt</span>
            </div>
            <div className="flex flex-col divide-y divide-outline-variant">
              {gradesByLesson.map((lessonGroup) => (
                <div className="p-5" key={lessonGroup.lessonName}>
                  <div className="mb-3 flex items-center justify-between">
                    <strong className="font-body-md text-body-md font-medium text-on-surface">
                      {lessonGroup.lessonName}
                    </strong>
                    <span className="font-label-md text-label-md text-primary">Ortalama: {lessonGroup.average}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {lessonGroup.grades.map((grade) => (
                      <div
                        className="flex items-center justify-between rounded-lg border border-outline-variant/60 px-3 py-2"
                        key={grade.id}
                      >
                        <span className="font-body-md text-body-md text-on-surface">{grade.exam_name}</span>
                        <span className="flex items-center gap-3">
                          <strong className="font-mono-sm text-mono-sm text-on-surface">{grade.score}</strong>
                          <span className="row-actions no-print">
                            <button
                              aria-label={`${grade.exam_name} notunu düzenle`}
                              className="icon-action"
                              onClick={() => {
                                setEditingGrade(grade);
                                setGradeEditForm({
                                  lesson_id: String(grade.lesson_id),
                                  exam_name: grade.exam_name,
                                  score: String(grade.score),
                                });
                                setActiveModal("editGrade");
                              }}
                              type="button"
                            >
                              <Icon name="edit" />
                            </button>
                            <button
                              aria-label={`${grade.exam_name} notunu sil`}
                              className="icon-action danger-action"
                              onClick={() => handleDeleteGrade(grade.id)}
                              type="button"
                            >
                              <Icon name="delete" />
                            </button>
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!gradesByLesson.length && <p className="empty-note">Bu öğrenci için henüz not kaydı yok.</p>}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-gutter lg:col-span-4 print:grid print:grid-cols-2 print:gap-4">
          <section className="card p-5 print:break-inside-avoid">
            <h3 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
              <Icon name="family_restroom" className="text-secondary" /> Veli ve İletişim
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-0.5 font-label-md text-label-md text-secondary">Veli</p>
                <p className="font-body-md text-body-md font-medium text-on-surface">
                  {profile.parent_full_name || "-"}
                </p>
              </div>
              <div>
                <p className="mb-0.5 font-label-md text-label-md text-secondary">Telefon</p>
                <p className="font-body-md text-body-md text-on-surface">{profile.parent_phone || "-"}</p>
              </div>
              <div>
                <p className="mb-0.5 font-label-md text-label-md text-secondary">Veli E-posta</p>
                <p className="font-body-md text-body-md text-on-surface">{profile.parent_email || "-"}</p>
              </div>
              <div>
                <p className="mb-0.5 font-label-md text-label-md text-secondary">Öğrenci E-posta</p>
                <p className="font-body-md text-body-md text-on-surface">{selectedStudent.email || "-"}</p>
              </div>
              <div>
                <p className="mb-0.5 font-label-md text-label-md text-secondary">Adres</p>
                <p className="font-body-md text-body-md text-on-surface">{profile.home_address || "-"}</p>
              </div>
            </div>
          </section>

          <section className="card p-5 print:break-inside-avoid">
            <h3 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
              <Icon name="comment" className="text-secondary" /> Öğretmen Yorumu
            </h3>
            <div className="relative rounded-md border border-surface-container-high bg-surface-container-low p-4">
              <Icon name="format_quote" className="absolute right-2 top-2 text-[24px] text-surface-variant" />
              <p className="relative z-10 font-body-md text-body-md leading-relaxed text-on-surface-variant">
                {profile.observation_notes || "Henüz öğretmen yorumu girilmedi."}
              </p>
            </div>
          </section>

          <section className="card p-5 print:break-inside-avoid">
            <h3 className="mb-4 font-headline-md text-headline-md text-on-surface">Ders Ortalamaları</h3>
            <div className="flex flex-wrap gap-2">
              {gradeAverages.map((item) => (
                <span className="badge badge-neutral" key={item.lessonName}>
                  {item.lessonName}: {item.average}
                </span>
              ))}
              {!gradeAverages.length && <p className="font-body-md text-body-md text-secondary">Henüz ortalama yok.</p>}
            </div>
          </section>

          <section className="card p-5 print:break-inside-avoid">
            <h3 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
              <Icon name="calendar_clock" className="text-secondary" /> Devamsızlık Özeti
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-body-md text-body-md text-on-surface">Var</span>
                <span className="font-headline-md text-[20px] text-on-surface">{attendanceSummary.present} Gün</span>
              </div>
              <div className="flex items-center justify-between border-t border-outline-variant pt-3">
                <span className="font-body-md text-body-md text-on-surface">Mazeretli</span>
                <span className="font-headline-md text-[20px] text-on-surface">{attendanceSummary.excused} Gün</span>
              </div>
              <div className="flex items-center justify-between border-t border-outline-variant pt-3">
                <span className="font-body-md text-body-md text-on-surface">Yok</span>
                <span className="font-headline-md text-[20px] text-error">{attendanceSummary.absent} Gün</span>
              </div>
            </div>
            <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full bg-amber-400" style={{ width: `${excusedRatio}%` }} />
              <div className="h-full bg-error" style={{ width: `${absentRatio}%` }} />
            </div>
            <p className="mt-2 text-right font-label-md text-label-md text-secondary">
              Toplam kayıt: {attendanceSummary.total} gün
            </p>
          </section>

          <section className="print-section card p-5 print:col-span-2 print:break-inside-avoid">
            <h3 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
              <Icon name="auto_awesome" className="text-primary" /> AI Analizi
            </h3>
            <div className="flex flex-col gap-3 print:grid print:grid-cols-3 print:gap-3">
              {["report_comment", "development_suggestion", "parent_message"].map((outputType) => {
                const output = aiOutputs.find((item) => item.output_type === outputType);
                return (
                  <div className="rounded-md border border-outline-variant/60 p-3" key={outputType}>
                    <p className="mb-1 font-label-md text-label-md uppercase tracking-wider text-secondary">
                      {AI_OUTPUT_LABELS[outputType]}
                    </p>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      {output ? aiOutputSummary(outputType, output.output_payload) : "Henüz oluşturulmadı."}
                    </p>
                  </div>
                );
              })}
              <button
                className="no-print link-button self-start"
                onClick={() => setActivePage("aiReports")}
                type="button"
              >
                AI Raporları sayfasında düzenle
              </button>
            </div>
          </section>
        </aside>
      </div>

      {isMessageModalOpen && (
        <Modal onClose={() => setIsMessageModalOpen(false)}>
          <form className="form-panel" onSubmit={handleSendMessage}>
            <h2>Veliye Mesaj Gönder</h2>
            <p className="font-body-md text-body-md text-secondary">
              Alıcı: {selectedStudent.parent_email}
            </p>
            <input
              onChange={(event) =>
                setMessageForm((form) => ({ ...form, subject: event.target.value }))
              }
              placeholder="Konu"
              required
              value={messageForm.subject}
            />
            <textarea
              onChange={(event) =>
                setMessageForm((form) => ({ ...form, message: event.target.value }))
              }
              placeholder="Mesajınız"
              required
              value={messageForm.message}
            />
            {messageError && <p className="form-error">{messageError}</p>}
            {messageNotice && <p className="empty-note success-note">{messageNotice}</p>}
            <button className="primary-button" disabled={isSendingMessage} type="submit">
              <Icon name="send" /> {isSendingMessage ? "Gönderiliyor..." : "Gönder"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
