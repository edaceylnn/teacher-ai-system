import { useState, useEffect } from "react";
import { api } from "../api";
import Icon from "../components/Icon";
import StudentSearch from "../components/StudentSearch";

export default function AIReportsPage({
  filteredStudents,
  isStudentPickerOpen,
  profile,
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
  const [aiError, setAiError] = useState("");
  const [aiNotice, setAiNotice] = useState("");

  useEffect(() => {
    async function loadAIOutputs() {
      if (!selectedStudentId) {
        setReportComment(null);
        setReportCommentOutputId(null);
        setParentMessage(null);
        setParentMessageOutputId(null);
        setTopicAnalysis(null);
        setTopicAnalysisOutputId(null);
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
  }

  function updateReportComment(field, value) {
    setReportComment((current) => ({
      ...current,
      [field]: value,
    }));
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
      setAiNotice("Düzenlemeler kaydedildi.");
    } catch (err) {
      setAiError(err.message);
    } finally {
      setIsSavingAIOutput(false);
    }
  }

  const fieldLabelClass = "font-label-md text-label-md uppercase tracking-wider text-on-surface flex items-center gap-2";
  const fieldInputClass =
    "w-full rounded border border-outline-variant px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";
  const fieldTextareaClass = `${fieldInputClass} min-h-24 resize-y`;

  return (
    <div className="wide-page flex-row flex-wrap items-start lg:flex-nowrap">
      <section className="flex flex-1 flex-col gap-card-gap">
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

        <div className="card flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-2">
            <label className={fieldLabelClass}>
              <Icon name="edit_note" className="text-primary" /> Karne Yorumu
            </label>
            {reportComment ? (
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
              <p className="font-body-md text-body-md text-secondary">Henüz karne yorumu oluşturulmadı.</p>
            )}
          </div>

          <div className="border-t border-outline-variant" />

          <div className="flex flex-col gap-2">
            <label className={fieldLabelClass}>
              <Icon name="troubleshoot" className="text-tertiary" /> Eksik Konu Analizi
            </label>
            {topicAnalysis ? (
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
                  placeholder="Çalışma planı (her satıra bir madde)"
                  value={(topicAnalysis.practice_plan || []).join("\n")}
                />
              </div>
            ) : (
              <p className="font-body-md text-body-md text-secondary">Henüz eksik konu analizi oluşturulmadı.</p>
            )}
          </div>

          <div className="border-t border-outline-variant" />

          <div className="flex flex-col gap-2">
            <label className={fieldLabelClass}>
              <Icon name="mail" className="text-secondary" /> Veli Mesajı
            </label>
            {parentMessage ? (
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
              <p className="font-body-md text-body-md text-secondary">Henüz veli mesajı hazırlanmadı.</p>
            )}
          </div>
        </div>
      </section>

      <aside className="flex w-full flex-col gap-3 lg:w-80 lg:shrink-0">
        <div className="card sticky top-20 p-5">
          <h3 className="mb-4 font-headline-md text-headline-md text-on-surface">Aksiyonlar</h3>
          <div className="flex flex-col gap-3">
            <button className="primary-button full" disabled={isGeneratingReport} onClick={generateReportComment} type="button">
              <Icon name="auto_awesome" /> {isGeneratingReport ? "Oluşturuluyor..." : "Karne Yorumu Oluştur"}
            </button>
            <p className="text-center font-mono-sm text-mono-sm text-secondary">
              Yapay zeka desteği ile taslak oluştur.
            </p>
            <div className="border-t border-outline-variant" />
            <button
              className="outline-button full"
              disabled={isGeneratingParentMessage}
              onClick={generateParentMessage}
              type="button"
            >
              <Icon name="mail" /> {isGeneratingParentMessage ? "Hazırlanıyor..." : "Veli Mesajı Hazırla"}
            </button>
            <button
              className="outline-button full"
              disabled={isGeneratingTopicAnalysis}
              onClick={generateTopicAnalysis}
              type="button"
            >
              <Icon name="psychology" /> {isGeneratingTopicAnalysis ? "Analiz ediliyor..." : "Eksik Konu Analizi"}
            </button>
            <button
              className="outline-button full"
              disabled={
                isSavingAIOutput ||
                (!reportCommentOutputId && !parentMessageOutputId && !topicAnalysisOutputId)
              }
              onClick={saveAIOutputEdits}
              type="button"
            >
              <Icon name="save" /> {isSavingAIOutput ? "Kaydediliyor..." : "Düzenlemeleri Kaydet"}
            </button>
          </div>
          {aiNotice && (
            <div className="mt-4 flex items-start gap-2 rounded border border-secondary-fixed-dim bg-secondary-container p-3">
              <Icon name="info" className="text-on-secondary-container" />
              <p className="font-mono-sm text-mono-sm text-on-secondary-container">{aiNotice}</p>
            </div>
          )}
          {aiError && <p className="form-error mt-4">{aiError}</p>}
        </div>
      </aside>
    </div>
  );
}
