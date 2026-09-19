import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { attendanceLabels } from "../constants";
import Button from "../components/Button";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import { avatarToneFor, initialsOf } from "../utils/helpers";

const AI_OUTPUT_LABELS = {
  report_comment: "Karne Yorumu",
  development_suggestion: "Eksik Konular",
  parent_message: "Veli Mesajı",
};

const ATTENDANCE_BADGE_CLASSES = {
  present: "badge-success",
  absent: "badge-danger",
  excused: "badge-warning",
};

const INFO_EMPTY = "Bilgi eklenmemiş";

function aiOutputSummary(outputType, payload) {
  if (outputType === "report_comment") return payload.comment;
  if (outputType === "development_suggestion") return payload.summary;
  if (outputType === "parent_message") return payload.message;
  return "";
}

function gradeTrend(grades) {
  if (grades.length < 2) return { label: "Trend için veri az", tone: "neutral" };
  const sorted = [...grades].sort((a, b) => (a.date > b.date ? 1 : -1));
  const previous = Number(sorted.at(-2).score);
  const latest = Number(sorted.at(-1).score);
  const diff = Math.round((latest - previous) * 10) / 10;
  if (diff > 0) return { label: `+${diff} son kayıt`, tone: "success" };
  if (diff < 0) return { label: `${diff} son kayıt`, tone: "danger" };
  return { label: "Değişim yok", tone: "neutral" };
}

function homeworkStatus(homework) {
  const dueDate = homework.due_date ? new Date(homework.due_date) : null;
  const submittedAt = homework.submitted_at ? new Date(homework.submitted_at) : null;
  if (homework.is_completed && dueDate && submittedAt && submittedAt > dueDate) {
    return { label: "Geç Teslim", className: "badge-warning" };
  }
  if (homework.is_completed) return { label: "Tamamlandı", className: "badge-success" };
  if (dueDate && dueDate < new Date()) return { label: "Eksik", className: "badge-danger" };
  return { label: "Bekliyor", className: "badge-neutral" };
}

function EmptyPanel({ icon, title, text, action }) {
  return (
    <div className="student-empty-panel">
      <span className="student-empty-icon">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
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
      trend: gradeTrend(grades),
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
        <Button onClick={() => setActivePage("students")} size="md" variant="secondary">
          <Icon name="arrow_back" /> Öğrencilere Dön
        </Button>
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
  const completedHomeworkCount = profile.homeworks.filter((homework) => homework.is_completed).length;
  const homeworkCompletionRate = profile.homeworks.length
    ? `${Math.round((completedHomeworkCount / profile.homeworks.length) * 100)}%`
    : "-";
  const recentGrades = sortedGrades.slice(0, 4);
  const recentActivities = [
    ...sortedGrades.slice(0, 3).map((grade) => ({
      id: `grade-${grade.id}`,
      icon: "school",
      title: `${grade.exam_name} sonucu girildi`,
      meta: `${grade.lesson_name} · ${grade.score} puan · ${grade.date}`,
    })),
    ...[...profile.attendance_records]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 2)
      .map((record) => ({
        id: `attendance-${record.id}`,
        icon: "fact_check",
        title: `Devamsızlık: ${attendanceLabels[record.status]}`,
        meta: `${record.lesson_name || "Genel"} · ${record.date}`,
      })),
  ].slice(0, 5);
  const aiOutputByType = new Map(aiOutputs.map((output) => [output.output_type, output]));
  const tabCounts = {
    overview: null,
    assessments: profile.grades.length,
    attendance: profile.attendance_records.length,
    homework: profile.homeworks.length,
    ai: aiOutputs.length,
    parent: null,
  };
  const tabs = [
    { id: "overview", label: "Genel Bakış", icon: "dashboard" },
    { id: "assessments", label: "Değerlendirmeler", icon: "school" },
    { id: "attendance", label: "Devamsızlık", icon: "fact_check" },
    { id: "homework", label: "Ödevler", icon: "assignment" },
    { id: "ai", label: "AI Analizi", icon: "auto_awesome" },
    { id: "parent", label: "Veli Bilgileri", icon: "family_restroom" },
  ];

  return (
    <div className="wide-page student-detail-page">
      <button
        className="no-print student-back-link"
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

      <header className="student-profile-header print:break-inside-avoid">
        <div className="student-profile-main">
          <div
            className={`avatar-circle h-16 w-16 text-xl print:h-14 print:w-14 print:text-base ${avatarToneFor(selectedStudentId)}`}
          >
            {initialsOf(profile.first_name, profile.last_name)}
          </div>
          <div>
            <p className="student-profile-kicker">Öğrenci Profili</p>
            <h1>{profile.first_name} {profile.last_name}</h1>
            <div className="student-profile-meta">
              <span>{profile.classroom.name}</span>
              <span>Öğrenci No #{profile.id}</span>
              <span>{selectedStudent.email || "E-posta yok"}</span>
            </div>
          </div>
        </div>
        <div className="no-print student-profile-actions">
          <Button onClick={() => window.print()} size="sm" variant="secondary">
            <Icon name="picture_as_pdf" /> PDF
          </Button>
          <Button
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
            size="sm"
            variant="secondary"
          >
            <Icon name="edit" /> Düzenle
          </Button>
          <Button
            disabled={!selectedStudent.parent_email}
            onClick={() => {
              setMessageNotice("");
              setMessageError("");
              setIsMessageModalOpen(true);
            }}
            size="sm"
            title={selectedStudent.parent_email ? "" : "Bu öğrenci için veli e-postası yok"}
            variant="primary"
          >
            <Icon name="chat" /> Mesaj Gönder
          </Button>
        </div>
      </header>

      <nav className="no-print student-tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              className={isActive ? "active" : ""}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <Icon name={tab.icon} className="text-[18px]" />
              {tab.label}
              {tabCounts[tab.id] !== null && <span className="tab-count">{tabCounts[tab.id]}</span>}
            </button>
          );
        })}
      </nav>

      {activeTab === "overview" && (
        <div className="student-tab-content">
          <section className="student-metric-grid">
            <article>
              <span>Ortalama</span>
              <strong>{overallAverage}</strong>
              <small>{profile.grades.length} değerlendirme</small>
            </article>
            <article>
              <span>Devam Oranı</span>
              <strong>{attendanceRate}</strong>
              <small>{attendanceSummary.total} yoklama kaydı</small>
            </article>
            <article>
              <span>Ödev Tamamlama</span>
              <strong>{homeworkCompletionRate}</strong>
              <small>{completedHomeworkCount}/{profile.homeworks.length} tamamlandı</small>
            </article>
          </section>

          <div className="student-two-column">
            <section className="student-panel">
              <div className="student-panel-head">
                <h2>Öğretmen Yorumu</h2>
              </div>
              <p className="student-note">
                {profile.observation_notes || "Henüz öğretmen yorumu girilmedi."}
              </p>
            </section>

            <section className="student-panel">
              <div className="student-panel-head">
                <h2>Son Aktiviteler</h2>
                <span>{recentActivities.length} kayıt</span>
              </div>
              <div className="student-activity-list">
                {recentActivities.map((activity) => (
                  <div className="student-activity-item" key={activity.id}>
                    <Icon name={activity.icon} />
                    <div>
                      <strong>{activity.title}</strong>
                      <p>{activity.meta}</p>
                    </div>
                  </div>
                ))}
                {!recentActivities.length && (
                  <EmptyPanel
                    icon="history"
                    title="Henüz aktivite yok"
                    text="Değerlendirme, yoklama veya ödev kaydı geldikçe burada özetlenir."
                  />
                )}
              </div>
            </section>
          </div>

          <section className="student-panel">
            <div className="student-panel-head">
              <h2>Son Değerlendirmeler</h2>
              <span>{recentGrades.length} kayıt</span>
            </div>
            <div className="student-list">
              {recentGrades.map((grade) => (
                <div className="student-list-row" key={grade.id}>
                  <div>
                    <strong>{grade.exam_name}</strong>
                    <p>{grade.lesson_name} · {grade.date}</p>
                  </div>
                  <span className="status-chip">{gradeCategoryLabels[grade.category]}</span>
                  <b>{grade.score}</b>
                </div>
              ))}
              {!recentGrades.length && (
                <EmptyPanel
                  icon="school"
                  title="Değerlendirme yok"
                  text="Bu öğrenci için henüz sınav veya performans sonucu girilmedi."
                />
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === "assessments" && (
        <div className="student-tab-content">
          <section className="student-panel">
            <div className="student-panel-head">
              <h2>Ders Ortalamaları</h2>
              <span>{gradesByLesson.length} ders</span>
            </div>
            <div className="lesson-average-grid">
              {gradesByLesson.map((lessonGroup) => (
                <article key={lessonGroup.lessonName}>
                  <span>{lessonGroup.lessonName}</span>
                  <strong>{lessonGroup.average}</strong>
                  <small className={lessonGroup.trend.tone}>{lessonGroup.trend.label}</small>
                </article>
              ))}
              {!gradesByLesson.length && (
                <EmptyPanel
                  icon="analytics"
                  title="Ders ortalaması yok"
                  text="Ders bazlı ortalamalar değerlendirme kayıtlarından hesaplanır."
                />
              )}
            </div>
          </section>

          <section className="student-panel">
            <div className="student-panel-head assessment-head">
              <h2>Sınav ve Değerlendirme Kayıtları</h2>
              <div className="student-filter-row">
                <select
                  className="filter-select"
                  onChange={(event) => setAssessmentLessonFilter(event.target.value)}
                  value={assessmentLessonFilter}
                >
                  <option value="">Tüm Dersler</option>
                  {assessmentLessonOptions.map((lessonName) => (
                    <option key={lessonName} value={lessonName}>{lessonName}</option>
                  ))}
                </select>
                <select
                  className="filter-select"
                  onChange={(event) => setAssessmentTypeFilter(event.target.value)}
                  value={assessmentTypeFilter}
                >
                  <option value="">Tüm Türler</option>
                  {Object.entries(gradeCategoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="student-list">
              {filteredGrades.map((grade) => (
                <div className="student-list-row" key={grade.id}>
                  <div>
                    <strong>{grade.exam_name}</strong>
                    <p>{grade.lesson_name} · {grade.date}</p>
                  </div>
                  <span className="status-chip">{gradeCategoryLabels[grade.category]}</span>
                  <b>{grade.score}</b>
                </div>
              ))}
              {!filteredGrades.length && (
                <EmptyPanel
                  icon="filter_alt"
                  title={profile.grades.length ? "Filtreyle eşleşen kayıt yok" : "Değerlendirme yok"}
                  text={profile.grades.length ? "Ders veya tür filtresini değiştirerek tekrar deneyin." : "Bu öğrenci için henüz değerlendirme kaydı yok."}
                />
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="student-tab-content">
          <section className="student-metric-grid four">
            <article>
              <span>Toplam</span>
              <strong>{attendanceSummary.total}</strong>
              <small>Yoklama kaydı</small>
            </article>
            <article>
              <span>Geldi</span>
              <strong>{attendanceSummary.present}</strong>
              <small>{attendanceRate} devam</small>
            </article>
            <article>
              <span>Gelmedi</span>
              <strong>{attendanceSummary.absent}</strong>
              <small>Devamsızlık</small>
            </article>
            <article>
              <span>Mazeretli</span>
              <strong>{attendanceSummary.excused}</strong>
              <small>İzinli kayıt</small>
            </article>
          </section>

          <section className="student-panel">
            <div className="student-panel-head">
              <h2>Devamsızlık Geçmişi</h2>
              <span>{profile.attendance_records.length} kayıt</span>
            </div>
            <div className="student-list">
              {[...profile.attendance_records]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((record) => (
                  <div className="student-list-row" key={record.id}>
                    <div>
                      <strong>{record.date}</strong>
                      <p>{record.lesson_name || "Genel"}{record.start_time ? ` · ${record.start_time.slice(0, 5)}` : ""}</p>
                    </div>
                    <span className={`badge ${ATTENDANCE_BADGE_CLASSES[record.status]}`}>
                      {attendanceLabels[record.status]}
                    </span>
                  </div>
                ))}
              {!profile.attendance_records.length && (
                <EmptyPanel
                  icon="fact_check"
                  title="Devamsızlık kaydı yok"
                  text="Yoklama kayıtları işlendiğinde burada durum badge'leriyle görünür."
                />
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === "homework" && (
        <section className="student-panel">
          <div className="student-panel-head">
            <h2>Ödevler</h2>
            <span>{completedHomeworkCount}/{profile.homeworks.length} tamamlandı</span>
          </div>
          <div className="student-list">
            {profile.homeworks.map((homework) => {
              const status = homeworkStatus(homework);
              return (
                <div className="student-list-row" key={homework.id}>
                  <div>
                    <strong>{homework.title}</strong>
                    <p>{homework.lesson_name} · Teslim: {homework.due_date}</p>
                  </div>
                  {homework.score !== null && homework.score !== undefined && <b>{homework.score}</b>}
                  <span className={`badge ${status.className}`}>{status.label}</span>
                </div>
              );
            })}
            {!profile.homeworks.length && (
              <EmptyPanel
                icon="assignment"
                title="Ödev kaydı yok"
                text="Ödevler ve teslim durumları girildiğinde bu ekranda listelenir."
              />
            )}
          </div>
        </section>
      )}

      {activeTab === "ai" && (
        <section className="print-section student-panel">
          <div className="student-panel-head">
            <h2>AI Analizi</h2>
            <span>{aiOutputs.length} çıktı</span>
          </div>
          {aiOutputs.length === 0 ? (
            <EmptyPanel
              icon="auto_awesome"
              title="Henüz AI analizi oluşturulmadı"
              text="Karne yorumu, eksik konular ve veli mesajı için öğrencinin mevcut verilerinden taslak oluşturabilirsiniz."
              action={
                <Button onClick={() => setActivePage("aiReports")} size="sm" variant="primary">
                  <Icon name="auto_awesome" /> Analiz Oluştur
                </Button>
              }
            />
          ) : (
            <div className="ai-analysis-grid">
              {["report_comment", "development_suggestion", "parent_message"].map((outputType) => {
                const output = aiOutputByType.get(outputType);
                return (
                  <article key={outputType}>
                    <h3>{AI_OUTPUT_LABELS[outputType]}</h3>
                    <p>{output ? aiOutputSummary(outputType, output.output_payload) : "Henüz oluşturulmadı."}</p>
                    {!output && (
                      <Button onClick={() => setActivePage("aiReports")} size="sm" tone="primary" variant="ghost">
                        Analiz Oluştur
                      </Button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "parent" && (
        <div className="student-two-column">
          <section className="student-panel">
            <div className="student-panel-head">
              <h2>Veli Bilgileri</h2>
            </div>
            <dl className="student-info-list">
              <div>
                <dt>Veli</dt>
                <dd>{profile.parent_full_name || INFO_EMPTY}</dd>
              </div>
              <div>
                <dt>Telefon</dt>
                <dd>{profile.parent_phone || INFO_EMPTY}</dd>
              </div>
              <div>
                <dt>Veli E-posta</dt>
                <dd>{profile.parent_email || INFO_EMPTY}</dd>
              </div>
            </dl>
          </section>
          <section className="student-panel">
            <div className="student-panel-head">
              <h2>Öğrenci İletişim</h2>
            </div>
            <dl className="student-info-list">
              <div>
                <dt>Öğrenci E-posta</dt>
                <dd>{selectedStudent.email || INFO_EMPTY}</dd>
              </div>
              <div>
                <dt>Adres</dt>
                <dd>{profile.home_address || INFO_EMPTY}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {isMessageModalOpen && (
        <Modal onClose={() => setIsMessageModalOpen(false)}>
          <form className="form-panel" onSubmit={handleSendMessage}>
            <div className="form-panel-header">
              <h2>Veliye Mesaj Gönder</h2>
              <p>Alıcı: {selectedStudent.parent_email}</p>
            </div>
            <div className="form-panel-body">
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
            </div>
            <div className="form-panel-footer">
              <Button disabled={isSendingMessage} size="md" type="submit" variant="primary">
                <Icon name="send" /> {isSendingMessage ? "Gönderiliyor..." : "Gönder"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
