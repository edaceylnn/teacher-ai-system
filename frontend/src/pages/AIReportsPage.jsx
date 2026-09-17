import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Button from "../components/Button";
import Icon from "../components/Icon";
import StudentSearch from "../components/StudentSearch";
import {
  avatarToneFor,
  averageOfScores,
  buildGradesByStudent,
  initialsOf,
  performanceStatus,
} from "../utils/helpers";

function ReportList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="ai-report-list">
      {items.map((item, index) => (
        <li key={index}>
          <Icon name="check_circle" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AIReportsPage({
  classrooms,
  filteredStudents,
  grades,
  isStudentPickerOpen,
  searchTerm,
  selectedStudent,
  selectedStudentId,
  setIsStudentPickerOpen,
  setSearchTerm,
  setSelectedStudentId,
}) {
  const [reportComment, setReportComment] = useState(null);
  const [reportCommentOutputId, setReportCommentOutputId] = useState(null);
  const [parentMessage, setParentMessage] = useState(null);
  const [parentMessageOutputId, setParentMessageOutputId] = useState(null);
  const [topicAnalysis, setTopicAnalysis] = useState(null);
  const [topicAnalysisOutputId, setTopicAnalysisOutputId] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingParentMessage, setIsGeneratingParentMessage] =
    useState(false);
  const [isGeneratingTopicAnalysis, setIsGeneratingTopicAnalysis] =
    useState(false);
  const [isSavingAIOutput, setIsSavingAIOutput] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiNotice, setAiNotice] = useState("");
  const [editingReportComment, setEditingReportComment] = useState(false);
  const [editingTopicAnalysis, setEditingTopicAnalysis] = useState(false);
  const [editingParentMessage, setEditingParentMessage] = useState(false);
  const [isParentMessageCopied, setIsParentMessageCopied] = useState(false);

  const gradesByStudent = useMemo(() => buildGradesByStudent(grades || []), [grades]);
  const classroomById = useMemo(
    () => new Map((classrooms || []).map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  const studentAverage = selectedStudent
    ? averageOfScores(gradesByStudent.get(selectedStudent.id) || [])
    : null;
  const studentStatus = performanceStatus(studentAverage);
  const studentClassroomName = selectedStudent
    ? classroomById.get(selectedStudent.classroom_id)?.name
    : null;

  useEffect(() => {
    async function loadAIOutputs() {
      if (!selectedStudentId) {
        setReportComment(null);
        setReportCommentOutputId(null);
        setParentMessage(null);
        setParentMessageOutputId(null);
        setTopicAnalysis(null);
        setTopicAnalysisOutputId(null);
        setIsDirty(false);
        setEditingReportComment(false);
        setEditingTopicAnalysis(false);
        setEditingParentMessage(false);
        return;
      }

      setAiError("");
      setAiNotice("");
      try {
        const outputs = await api.listAIOutputs(selectedStudentId);
        const latestReport = outputs.find(
          (output) => output.output_type === "report_comment",
        );
        const latestParentMessage = outputs.find(
          (output) => output.output_type === "parent_message",
        );
        const latestTopicAnalysis = outputs.find(
          (output) => output.output_type === "development_suggestion",
        );
        setReportComment(latestReport?.output_payload || null);
        setReportCommentOutputId(latestReport?.id || null);
        setParentMessage(latestParentMessage?.output_payload || null);
        setParentMessageOutputId(latestParentMessage?.id || null);
        setTopicAnalysis(latestTopicAnalysis?.output_payload || null);
        setTopicAnalysisOutputId(latestTopicAnalysis?.id || null);
        setIsDirty(false);
        setEditingReportComment(false);
        setEditingTopicAnalysis(false);
        setEditingParentMessage(false);
      } catch (err) {
        setAiError(err.message);
      }
    }

    loadAIOutputs();
  }, [selectedStudentId]);

  function handleSelectStudent(studentId) {
    setSelectedStudentId(studentId);
    setReportComment(null);
    setReportCommentOutputId(null);
    setParentMessage(null);
    setParentMessageOutputId(null);
    setTopicAnalysis(null);
    setTopicAnalysisOutputId(null);
    setAiError("");
    setAiNotice("");
    setIsDirty(false);
    setEditingReportComment(false);
    setEditingTopicAnalysis(false);
    setEditingParentMessage(false);
    setIsParentMessageCopied(false);
  }

  function updateReportComment(field, value) {
    setReportComment((current) => ({
      ...current,
      [field]: value,
    }));
    setIsDirty(true);
  }

  function updateReportCommentList(field, value) {
    updateReportComment(
      field,
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  function updateParentMessage(field, value) {
    setParentMessage((current) => ({
      ...current,
      [field]: value,
    }));
    setIsDirty(true);
  }

  function updateParentMessageList(field, value) {
    updateParentMessage(
      field,
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  function updateTopicAnalysis(field, value) {
    setTopicAnalysis((current) => ({
      ...current,
      [field]: value,
    }));
    setIsDirty(true);
  }

  function updateTopicAnalysisList(field, value) {
    updateTopicAnalysis(
      field,
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  async function generateReportComment() {
    if (!selectedStudentId) {
      setAiError("Önce bir öğrenci seçmelisin.");
      return;
    }

    setIsGeneratingReport(true);
    setAiError("");
    try {
      const output = await api.generateReportComment(selectedStudentId);
      setReportComment(output.output_payload);
      setReportCommentOutputId(output.id);
      setEditingReportComment(false);
      setAiNotice("Karne yorumu oluşturuldu ve kaydedildi.");
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function generateParentMessage() {
    if (!selectedStudentId) {
      setAiError("Önce bir öğrenci seçmelisin.");
      return;
    }

    setIsGeneratingParentMessage(true);
    setAiError("");
    try {
      const output = await api.generateParentMessage(selectedStudentId);
      setParentMessage(output.output_payload);
      setParentMessageOutputId(output.id);
      setEditingParentMessage(false);
      setAiNotice("Veli mesajı hazırlandı ve kaydedildi.");
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsGeneratingParentMessage(false);
    }
  }

  async function generateTopicAnalysis() {
    if (!selectedStudentId) {
      setAiError("Önce bir öğrenci seçmelisin.");
      return;
    }

    setIsGeneratingTopicAnalysis(true);
    setAiError("");
    try {
      const output = await api.generateTopicAnalysis(selectedStudentId);
      setTopicAnalysis(output.output_payload);
      setTopicAnalysisOutputId(output.id);
      setEditingTopicAnalysis(false);
      setAiNotice("Eksik konu analizi oluşturuldu ve kaydedildi.");
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsGeneratingTopicAnalysis(false);
    }
  }

  async function saveAIOutputEdits() {
    setIsSavingAIOutput(true);
    setAiError("");
    setAiNotice("");
    try {
      if (reportComment && reportCommentOutputId) {
        const output = await api.updateAIOutput(
          reportCommentOutputId,
          reportComment,
        );
        setReportComment(output.output_payload);
      }
      if (parentMessage && parentMessageOutputId) {
        const output = await api.updateAIOutput(
          parentMessageOutputId,
          parentMessage,
        );
        setParentMessage(output.output_payload);
      }
      if (topicAnalysis && topicAnalysisOutputId) {
        const output = await api.updateAIOutput(
          topicAnalysisOutputId,
          topicAnalysis,
        );
        setTopicAnalysis(output.output_payload);
      }
      setIsDirty(false);
      setEditingReportComment(false);
      setEditingTopicAnalysis(false);
      setEditingParentMessage(false);
      setAiNotice("Düzenlemeler kaydedildi.");
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsSavingAIOutput(false);
    }
  }

  async function handleCopyParentMessage() {
    if (!parentMessage) return;
    const lines = [parentMessage.subject || "", "", parentMessage.message || ""];
    if (parentMessage.next_steps?.length) {
      lines.push("", "Sonraki Adımlar:", ...parentMessage.next_steps.map((step) => `- ${step}`));
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setIsParentMessageCopied(true);
      setTimeout(() => setIsParentMessageCopied(false), 2000);
    } catch {
      setAiError("Mesaj panoya kopyalanamadı.");
    }
  }

  const fieldInputClass =
    "w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30";
  const fieldTextareaClass = `${fieldInputClass} min-h-24 resize-y`;

  return (
    <div className="wide-page flex-row flex-wrap items-start lg:flex-nowrap">
      <section className="flex min-w-0 flex-1 flex-col gap-card-gap">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">AI Karne Raporu</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            {selectedStudent
              ? `${selectedStudent.first_name} ${selectedStudent.last_name} için yapay zeka destekli rapor.`
              : "Rapor oluşturmak için bir öğrenci seç."}
          </p>
        </div>
        <div className="max-w-sm">
          <StudentSearch
            filteredStudents={filteredStudents}
            isStudentPickerOpen={isStudentPickerOpen}
            searchTerm={searchTerm}
            selectedStudent={selectedStudent}
            selectedStudentId={selectedStudentId}
            setIsStudentPickerOpen={setIsStudentPickerOpen}
            setSearchTerm={setSearchTerm}
            setSelectedStudentId={handleSelectStudent}
          />
        </div>

        {selectedStudent && (
          <div className="ai-student-summary">
            <span className={`avatar-circle h-10 w-10 text-sm ${avatarToneFor(selectedStudent.id)}`}>
              {initialsOf(selectedStudent.first_name, selectedStudent.last_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-body-md text-body-md font-medium text-on-surface">
                {selectedStudent.first_name} {selectedStudent.last_name}
              </p>
              <p className="truncate font-label-md text-label-md text-secondary">
                {studentClassroomName || "Sınıf atanmamış"}
                {selectedStudent.email ? ` · ${selectedStudent.email}` : ""}
              </p>
            </div>
            <div className="ai-student-summary-stat">
              <span>Not Ort.</span>
              <strong>{studentAverage ?? "-"}</strong>
            </div>
            <span className={`badge ai-student-summary-status ${studentStatus.tone === "success" ? "badge-success" : studentStatus.tone === "danger" ? "badge-danger" : "badge-neutral"}`}>
              {studentStatus.label}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <section className="ai-output-card">
            <div className="ai-output-card-head">
              <span className="ai-output-icon tone-primary">
                <Icon name="edit_note" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="ai-output-card-title">Karne Yorumu</p>
                <p className="ai-output-card-subtitle">Genel performans değerlendirmesi</p>
              </div>
              <div className="ai-output-card-actions">
                {reportComment && (
                  <>
                    <Button
                      aria-label={editingReportComment ? "Görüntüle" : "Düzenle"}
                      onClick={() => setEditingReportComment((current) => !current)}
                      size="sm"
                      title={editingReportComment ? "Görüntüle" : "Düzenle"}
                      variant="icon"
                    >
                      <Icon name={editingReportComment ? "visibility" : "edit"} />
                    </Button>
                    <Button
                      aria-label="Yeniden oluştur"
                      disabled={isGeneratingReport}
                      onClick={generateReportComment}
                      size="sm"
                      title="Yeniden Oluştur"
                      variant="icon"
                    >
                      <Icon name="autorenew" />
                    </Button>
                  </>
                )}
                <span className={`status-chip ${reportComment ? "text-primary" : ""}`}>
                  {reportComment ? "AI oluşturdu" : "Bekliyor"}
                </span>
              </div>
            </div>
            {reportComment ? (
              editingReportComment ? (
                <div className="flex flex-col gap-3">
                  <input
                    className={fieldInputClass}
                    onChange={(event) => updateReportComment("title", event.target.value)}
                    placeholder="Başlık"
                    value={reportComment.title || ""}
                  />
                  <textarea
                    className={fieldTextareaClass}
                    onChange={(event) => updateReportComment("comment", event.target.value)}
                    placeholder="Karne yorumu"
                    value={reportComment.comment || ""}
                  />
                  <textarea
                    className={fieldTextareaClass}
                    onChange={(event) => updateReportCommentList("strengths", event.target.value)}
                    placeholder="Güçlü yönler (her satıra bir madde)"
                    value={(reportComment.strengths || []).join("\n")}
                  />
                  <textarea
                    className={fieldTextareaClass}
                    onChange={(event) => updateReportCommentList("growth_areas", event.target.value)}
                    placeholder="Gelişim alanları (her satıra bir madde)"
                    value={(reportComment.growth_areas || []).join("\n")}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {reportComment.title && <h4 className="ai-report-title">{reportComment.title}</h4>}
                  {reportComment.comment && <p className="ai-report-paragraph">{reportComment.comment}</p>}
                  {reportComment.strengths?.length > 0 && (
                    <div className="ai-report-section">
                      <h5 className="ai-report-heading">Güçlü Yönler</h5>
                      <ReportList items={reportComment.strengths} />
                    </div>
                  )}
                  {reportComment.growth_areas?.length > 0 && (
                    <div className="ai-report-section">
                      <h5 className="ai-report-heading">Gelişim Alanları</h5>
                      <ReportList items={reportComment.growth_areas} />
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="ai-output-empty">
                <p className="font-body-md text-body-md text-secondary">Henüz karne yorumu oluşturulmadı.</p>
                <Button disabled={isGeneratingReport} onClick={generateReportComment} size="sm" variant="secondary">
                  <Icon name="auto_awesome" /> {isGeneratingReport ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
              </div>
            )}
          </section>

          <section className="ai-output-card">
            <div className="ai-output-card-head">
              <span className="ai-output-icon tone-tertiary">
                <Icon name="troubleshoot" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="ai-output-card-title">Eksik Konu Analizi</p>
                <p className="ai-output-card-subtitle">Eksik konular ve çalışma önerileri</p>
              </div>
              <div className="ai-output-card-actions">
                {topicAnalysis && (
                  <>
                    <Button
                      aria-label={editingTopicAnalysis ? "Görüntüle" : "Düzenle"}
                      onClick={() => setEditingTopicAnalysis((current) => !current)}
                      size="sm"
                      title={editingTopicAnalysis ? "Görüntüle" : "Düzenle"}
                      variant="icon"
                    >
                      <Icon name={editingTopicAnalysis ? "visibility" : "edit"} />
                    </Button>
                    <Button
                      aria-label="Yeniden oluştur"
                      disabled={isGeneratingTopicAnalysis}
                      onClick={generateTopicAnalysis}
                      size="sm"
                      title="Yeniden Oluştur"
                      variant="icon"
                    >
                      <Icon name="autorenew" />
                    </Button>
                  </>
                )}
                <span className={`status-chip ${topicAnalysis ? "text-primary" : ""}`}>
                  {topicAnalysis ? "AI oluşturdu" : "Bekliyor"}
                </span>
              </div>
            </div>
            {topicAnalysis ? (
              editingTopicAnalysis ? (
                <div className="flex flex-col gap-3">
                  <input
                    className={fieldInputClass}
                    onChange={(event) => updateTopicAnalysis("title", event.target.value)}
                    placeholder="Başlık"
                    value={topicAnalysis.title || ""}
                  />
                  <textarea
                    className={fieldTextareaClass}
                    onChange={(event) => updateTopicAnalysis("summary", event.target.value)}
                    placeholder="Özet"
                    value={topicAnalysis.summary || ""}
                  />
                  <textarea
                    className={fieldTextareaClass}
                    onChange={(event) => updateTopicAnalysisList("missing_topics", event.target.value)}
                    placeholder="Eksik konular (her satıra bir madde)"
                    value={(topicAnalysis.missing_topics || []).join("\n")}
                  />
                  <textarea
                    className={fieldTextareaClass}
                    onChange={(event) => updateTopicAnalysisList("practice_plan", event.target.value)}
                    placeholder="Öneriler (her satıra bir madde)"
                    value={(topicAnalysis.practice_plan || []).join("\n")}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {topicAnalysis.title && <h4 className="ai-report-title">{topicAnalysis.title}</h4>}
                  {topicAnalysis.summary && <p className="ai-report-paragraph">{topicAnalysis.summary}</p>}
                  {topicAnalysis.missing_topics?.length > 0 && (
                    <div className="ai-report-section">
                      <h5 className="ai-report-heading">Eksik Konular</h5>
                      <ReportList items={topicAnalysis.missing_topics} />
                    </div>
                  )}
                  {topicAnalysis.practice_plan?.length > 0 && (
                    <div className="ai-report-section">
                      <h5 className="ai-report-heading">Öneriler</h5>
                      <ReportList items={topicAnalysis.practice_plan} />
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="ai-output-empty">
                <p className="font-body-md text-body-md text-secondary">Henüz eksik konu analizi oluşturulmadı.</p>
                <Button disabled={isGeneratingTopicAnalysis} onClick={generateTopicAnalysis} size="sm" variant="secondary">
                  <Icon name="auto_awesome" /> {isGeneratingTopicAnalysis ? "Analiz ediliyor..." : "Oluştur"}
                </Button>
              </div>
            )}
          </section>

          <section className="ai-output-card">
            <div className="ai-output-card-head">
              <span className="ai-output-icon tone-secondary">
                <Icon name="mail" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="ai-output-card-title">Veli Mesajı</p>
                <p className="ai-output-card-subtitle">Veliye gönderilecek taslak mesaj</p>
              </div>
              <div className="ai-output-card-actions">
                {parentMessage && (
                  <>
                    <Button
                      aria-label={isParentMessageCopied ? "Kopyalandı" : "Kopyala"}
                      onClick={handleCopyParentMessage}
                      size="sm"
                      title={isParentMessageCopied ? "Kopyalandı" : "Kopyala"}
                      variant="icon"
                    >
                      <Icon name={isParentMessageCopied ? "check" : "content_copy"} />
                    </Button>
                    <Button
                      aria-label={editingParentMessage ? "Görüntüle" : "Düzenle"}
                      onClick={() => setEditingParentMessage((current) => !current)}
                      size="sm"
                      title={editingParentMessage ? "Görüntüle" : "Düzenle"}
                      variant="icon"
                    >
                      <Icon name={editingParentMessage ? "visibility" : "edit"} />
                    </Button>
                    <Button
                      aria-label="Yeniden oluştur"
                      disabled={isGeneratingParentMessage}
                      onClick={generateParentMessage}
                      size="sm"
                      title="Yeniden Oluştur"
                      variant="icon"
                    >
                      <Icon name="autorenew" />
                    </Button>
                  </>
                )}
                <span className={`status-chip ${parentMessage ? "text-primary" : ""}`}>
                  {parentMessage ? "AI oluşturdu" : "Bekliyor"}
                </span>
              </div>
            </div>
            {parentMessage ? (
              editingParentMessage ? (
                <div className="flex flex-col gap-3">
                  <input
                    className={fieldInputClass}
                    onChange={(event) => updateParentMessage("subject", event.target.value)}
                    placeholder="Konu"
                    value={parentMessage.subject || ""}
                  />
                  <textarea
                    className={fieldTextareaClass}
                    onChange={(event) => updateParentMessage("message", event.target.value)}
                    placeholder="Veli mesajı"
                    value={parentMessage.message || ""}
                  />
                  <textarea
                    className={fieldTextareaClass}
                    onChange={(event) => updateParentMessageList("next_steps", event.target.value)}
                    placeholder="Sonraki adımlar (her satıra bir madde)"
                    value={(parentMessage.next_steps || []).join("\n")}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {parentMessage.subject && <h4 className="ai-report-title">{parentMessage.subject}</h4>}
                  {parentMessage.message && <p className="ai-report-paragraph">{parentMessage.message}</p>}
                  {parentMessage.next_steps?.length > 0 && (
                    <div className="ai-report-section">
                      <h5 className="ai-report-heading">Sonraki Adımlar</h5>
                      <ReportList items={parentMessage.next_steps} />
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="ai-output-empty">
                <p className="font-body-md text-body-md text-secondary">Henüz veli mesajı hazırlanmadı.</p>
                <Button disabled={isGeneratingParentMessage} onClick={generateParentMessage} size="sm" variant="secondary">
                  <Icon name="auto_awesome" /> {isGeneratingParentMessage ? "Hazırlanıyor..." : "Oluştur"}
                </Button>
              </div>
            )}
          </section>
        </div>
      </section>

      <aside className="flex w-full flex-col gap-3 lg:w-56 lg:shrink-0">
        <div className="card sticky top-20 p-4">
          <h3 className="mb-3 font-label-md text-label-md uppercase tracking-wider text-secondary">Aksiyonlar</h3>
          <Button
            disabled={isSavingAIOutput || !isDirty}
            fullWidth
            onClick={saveAIOutputEdits}
            size="sm"
            variant="secondary"
          >
            <Icon name="save" /> {isSavingAIOutput ? "Kaydediliyor..." : "Kaydet"}
          </Button>
          {aiNotice && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-secondary-fixed-dim bg-secondary-container p-2.5">
              <Icon className="text-on-secondary-container" name="info" />
              <p className="font-mono-sm text-mono-sm text-on-secondary-container">{aiNotice}</p>
            </div>
          )}
          {aiError && <p className="form-error mt-3">{aiError}</p>}
        </div>
      </aside>
    </div>
  );
}
