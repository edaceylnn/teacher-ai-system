import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { attendanceLabels } from "../constants";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import StatCard from "../components/StatCard";
import { avatarToneFor, initialsOf } from "../utils/helpers";

const AI_OUTPUT_LABELS = {
  report_comment: "Karne Yorumu",
  development_suggestion: "Eksik Konu Analizi",
  parent_message: "Veli Mesajı",
};

const ATTENDANCE_BADGE_CLASSES = {
  present: "badge-success",
  absent: "badge-danger",
  excused: "badge-warning",
};

const TABS = [
  { id: "overview", label: "Genel Bakış", icon: "dashboard" },
  { id: "assessments", label: "Değerlendirmeler", icon: "school" },
  { id: "attendance", label: "Devamsızlık", icon: "fact_check" },
  { id: "homework", label: "Ödevler", icon: "assignment" },
  { id: "ai", label: "AI Analizi", icon: "auto_awesome" },
  { id: "parent", label: "Veli Bilgileri", icon: "family_restroom" },
];

function aiOutputSummary(outputType, payload) {
  if (outputType === "report_comment") return payload.comment;
  if (outputType === "development_suggestion") return payload.summary;
  if (outputType === "parent_message") return payload.message;
  return "";
}

export default function StudentDetailPage({
  currentTeacher,
  gradeCategoryLabels,
  overallAverage,
  profile,
  selectedStudent,
  selectedStudentId,
  setActiveModal,
  setActivePage,
  setEditingStudent,
  setStudentEditForm,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ subject: "", message: "" });
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageNotice, setMessageNotice] = useState("");
  const [messageError, setMessageError] = useState("");
  const [aiOutputs, setAiOutputs] = useState([]);
  const [assessmentLessonFilter, setAssessmentLessonFilter] = useState("");
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState("");

  useEffect(() => {
    setActiveTab("overview");
    setAssessmentLessonFilter("");
    setAssessmentTypeFilter("");
  }, [selectedStudentId]);

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

  const sortedGrades = useMemo(() => {
    if (!profile?.grades?.length) return [];
    return [...profile.grades].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [profile]);

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

  const assessmentLessonOptions = useMemo(() => {
    const names = new Set(profile?.grades?.map((grade) => grade.lesson_name) || []);
    return Array.from(names);
  }, [profile]);

  const filteredGrades = useMemo(
    () =>
      sortedGrades.filter(
        (grade) =>
          (!assessmentLessonFilter || grade.lesson_name === assessmentLessonFilter) &&
          (!assessmentTypeFilter || grade.category === assessmentTypeFilter),
      ),
    [sortedGrades, assessmentLessonFilter, assessmentTypeFilter],
  );

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
  const attendanceRateValue = attendanceSummary.total
    ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100)
    : null;
  const attendanceRate = attendanceRateValue === null ? "-" : `%${attendanceRateValue}`;
  const absentRatio = attendanceSummary.total
    ? Math.round((attendanceSummary.absent / attendanceSummary.total) * 100)
    : 0;
  const excusedRatio = attendanceSummary.total
    ? Math.round((attendanceSummary.excused / attendanceSummary.total) * 100)
    : 0;
  const completedHomeworkCount = profile.homeworks.filter((homework) => homework.is_completed).length;
  const recentGrades = sortedGrades.slice(0, 5);

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

      <nav className="no-print flex flex-wrap gap-1 border-b border-outline-variant">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              className={`flex items-center gap-2 border-b-2 px-3 py-2 font-label-md text-label-md transition-colors ${
                isActive
                  ? "border-primary font-bold text-primary"
                  : "border-transparent text-secondary hover:text-primary"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <Icon name={tab.icon} className="text-[18px]" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "overview" && (
        <div className="flex flex-col gap-gutter">
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
            <StatCard icon="analytics" label="Genel Değerlendirme Ortalaması" trend="Kayıtlı sonuçlar" value={overallAverage} />
            <StatCard icon="fact_check" label="Devam Oranı" trend={`${attendanceSummary.total} kayıt`} value={attendanceRate} />
            <StatCard
              icon="assignment_turned_in"
              label="Ödev Tamamlama"
              trend="Tamamlanan/Toplam"
              value={`${completedHomeworkCount}/${profile.homeworks.length}`}
            />
          </div>

          <section className="card overflow-hidden">
            <div className="section-heading border-b border-outline-variant bg-surface-bright p-5">
              <h2>Son Değerlendirmeler</h2>
              <span className="analysis-chip">{recentGrades.length} kayıt</span>
            </div>
            <ul className="divide-y divide-outline-variant/50">
              {recentGrades.map((grade) => (
                <li className="flex items-center justify-between gap-3 p-4" key={grade.id}>
                  <div>
                    <p className="font-body-md text-body-md font-medium text-on-surface">
                      {grade.exam_name} <span className="status-chip">{gradeCategoryLabels[grade.category]}</span>
                    </p>
                    <p className="font-label-md text-label-md text-secondary">
                      {grade.lesson_name} · {grade.date}
                    </p>
                  </div>
                  <strong className="font-mono-sm text-mono-sm text-on-surface">{grade.score}</strong>
                </li>
              ))}
              {!recentGrades.length && <p className="empty-note">Bu öğrenci için henüz değerlendirme kaydı yok.</p>}
            </ul>
          </section>

          <section className="card p-5">
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
        </div>
      )}

      {activeTab === "assessments" && (
        <section className="card overflow-hidden">
          <div className="section-heading flex-wrap gap-3 border-b border-outline-variant bg-surface-bright p-5">
            <h2>Değerlendirmeler</h2>
            <div className="flex flex-wrap gap-2">
              <select
                className="filter-select"
                onChange={(event) => setAssessmentLessonFilter(event.target.value)}
                value={assessmentLessonFilter}
              >
                <option value="">Tüm Dersler</option>
                {assessmentLessonOptions.map((lessonName) => (
                  <option key={lessonName} value={lessonName}>
                    {lessonName}
                  </option>
                ))}
              </select>
              <select
                className="filter-select"
                onChange={(event) => setAssessmentTypeFilter(event.target.value)}
                value={assessmentTypeFilter}
              >
                <option value="">Tüm Türler</option>
                {Object.entries(gradeCategoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {gradesByLesson.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-outline-variant p-4">
              {gradesByLesson.map((lessonGroup) => (
                <span className="badge badge-neutral" key={lessonGroup.lessonName}>
                  {lessonGroup.lessonName}: {lessonGroup.average}
                </span>
              ))}
            </div>
          )}
          <ul className="divide-y divide-outline-variant/50">
            {filteredGrades.map((grade) => (
              <li className="flex items-center justify-between gap-3 p-4" key={grade.id}>
                <div>
                  <p className="font-body-md text-body-md font-medium text-on-surface">
                    {grade.exam_name} <span className="status-chip">{gradeCategoryLabels[grade.category]}</span>
                  </p>
                  <p className="font-label-md text-label-md text-secondary">
                    {grade.lesson_name} · {grade.date}
                  </p>
                </div>
                <strong className="font-mono-sm text-mono-sm text-on-surface">{grade.score}</strong>
              </li>
            ))}
            {!filteredGrades.length && (
              <p className="empty-note">
                {profile.grades.length ? "Filtreyle eşleşen değerlendirme yok." : "Bu öğrenci için henüz değerlendirme kaydı yok."}
              </p>
            )}
          </ul>
        </section>
      )}

      {activeTab === "attendance" && (
        <div className="flex flex-col gap-gutter">
          <section className="card p-5">
            <h3 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
              <Icon name="calendar_clock" className="text-secondary" /> Devamsızlık Özeti
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-outline-variant/60 p-3 text-center">
                <p className="font-headline-md text-[20px] text-on-surface">{attendanceSummary.total}</p>
                <p className="font-label-md text-label-md text-secondary">Toplam</p>
              </div>
              <div className="rounded-lg border border-outline-variant/60 p-3 text-center">
                <p className="font-headline-md text-[20px] text-on-surface">{attendanceSummary.present}</p>
                <p className="font-label-md text-label-md text-secondary">Var</p>
              </div>
              <div className="rounded-lg border border-outline-variant/60 p-3 text-center">
                <p className="font-headline-md text-[20px] text-error">{attendanceSummary.absent}</p>
                <p className="font-label-md text-label-md text-secondary">Yok</p>
              </div>
              <div className="rounded-lg border border-outline-variant/60 p-3 text-center">
                <p className="font-headline-md text-[20px] text-on-surface">{attendanceSummary.excused}</p>
                <p className="font-label-md text-label-md text-secondary">Mazeretli</p>
              </div>
            </div>
            <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full bg-amber-400" style={{ width: `${excusedRatio}%` }} />
              <div className="h-full bg-error" style={{ width: `${absentRatio}%` }} />
            </div>
            <p className="mt-2 text-right font-label-md text-label-md text-secondary">Devam oranı: {attendanceRate}</p>
          </section>

          <section className="card overflow-hidden">
            <div className="section-heading border-b border-outline-variant bg-surface-bright p-5">
              <h2>Devamsızlık Geçmişi</h2>
              <span className="analysis-chip">{profile.attendance_records.length} kayıt</span>
            </div>
            <ul className="divide-y divide-outline-variant/50">
              {[...profile.attendance_records]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((record) => (
                  <li className="flex items-center justify-between gap-3 p-4" key={record.id}>
                    <div>
                      <p className="font-body-md text-body-md font-medium text-on-surface">{record.date}</p>
                      <p className="font-label-md text-label-md text-secondary">
                        {record.lesson_name || "Genel"}
                        {record.start_time ? ` · ${record.start_time.slice(0, 5)}` : ""}
                      </p>
                    </div>
                    <span className={`badge ${ATTENDANCE_BADGE_CLASSES[record.status]}`}>
                      {attendanceLabels[record.status]}
                    </span>
                  </li>
                ))}
              {!profile.attendance_records.length && (
                <p className="empty-note">Bu öğrenci için henüz devamsızlık kaydı yok.</p>
              )}
            </ul>
          </section>
        </div>
      )}

      {activeTab === "homework" && (
        <section className="card overflow-hidden">
          <div className="section-heading border-b border-outline-variant bg-surface-bright p-5">
            <h2>Ödevler</h2>
            <span className="analysis-chip">
              {completedHomeworkCount}/{profile.homeworks.length} tamamladı
            </span>
          </div>
          <ul className="divide-y divide-outline-variant/50">
            {profile.homeworks.map((homework) => (
              <li className="flex items-center justify-between gap-3 p-4" key={homework.id}>
                <div>
                  <p className="font-body-md text-body-md font-medium text-on-surface">{homework.title}</p>
                  <p className="font-label-md text-label-md text-secondary">
                    {homework.lesson_name} · Teslim: {homework.due_date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {homework.score !== null && homework.score !== undefined && (
                    <strong className="font-mono-sm text-mono-sm text-on-surface">{homework.score}</strong>
                  )}
                  <span className={`badge ${homework.is_completed ? "badge-success" : "badge-neutral"}`}>
                    {homework.is_completed ? "Yaptı" : "Yapmadı"}
                  </span>
                </div>
              </li>
            ))}
            {!profile.homeworks.length && <p className="empty-note">Bu öğrenci için ödev kaydı yok.</p>}
          </ul>
        </section>
      )}

      {activeTab === "ai" && (
        <section className="print-section card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
            <Icon name="auto_awesome" className="text-primary" /> AI Analizi
          </h3>
          <div className="flex flex-col gap-3">
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
      )}

      {activeTab === "parent" && (
        <section className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
            <Icon name="family_restroom" className="text-secondary" /> Veli ve İletişim
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="sm:col-span-2">
              <p className="mb-0.5 font-label-md text-label-md text-secondary">Adres</p>
              <p className="font-body-md text-body-md text-on-surface">{profile.home_address || "-"}</p>
            </div>
          </div>
        </section>
      )}

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
