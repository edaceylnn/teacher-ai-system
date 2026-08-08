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

  return (
    <div className="report-page">
      <section className="report-document">
        <h1>AI Karne Raporu</h1>
        <div className="report-student-picker">
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
        <p className="report-meta">
          Öğrenci:{" "}
          {selectedStudent
            ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
            : "Öğrenci seçilmedi"}
        </p>
        <div className="report-section">
          <h2>Karne Yorumu</h2>
          {reportComment ? (
            <div className="editable-ai-output">
              <label>
                Başlık
                <input
                  onChange={(event) =>
                    updateReportComment("title", event.target.value)
                  }
                  value={reportComment.title || ""}
                />
              </label>
              <label>
                Karne yorumu
                <textarea
                  onChange={(event) =>
                    updateReportComment("comment", event.target.value)
                  }
                  value={reportComment.comment || ""}
                />
              </label>
              <label>
                Güçlü yönler
                <textarea
                  onChange={(event) =>
                    updateReportCommentList("strengths", event.target.value)
                  }
                  value={(reportComment.strengths || []).join("\n")}
                />
              </label>
              <label>
                Gelişim alanları
                <textarea
                  onChange={(event) =>
                    updateReportCommentList("growth_areas", event.target.value)
                  }
                  value={(reportComment.growth_areas || []).join("\n")}
                />
              </label>
            </div>
          ) : (
            <p>Henüz karne yorumu oluşturulmadı.</p>
          )}
        </div>
        <div className="report-section">
          <h2>Eksik Konu Analizi</h2>
          {topicAnalysis ? (
            <div className="editable-ai-output">
              <label>
                Başlık
                <input
                  onChange={(event) =>
                    updateTopicAnalysis("title", event.target.value)
                  }
                  value={topicAnalysis.title || ""}
                />
              </label>
              <label>
                Özet
                <textarea
                  onChange={(event) =>
                    updateTopicAnalysis("summary", event.target.value)
                  }
                  value={topicAnalysis.summary || ""}
                />
              </label>
              <label>
                Eksik konular
                <textarea
                  onChange={(event) =>
                    updateTopicAnalysisList(
                      "missing_topics",
                      event.target.value,
                    )
                  }
                  value={(topicAnalysis.missing_topics || []).join("\n")}
                />
              </label>
              <label>
                Çalışma planı
                <textarea
                  onChange={(event) =>
                    updateTopicAnalysisList("practice_plan", event.target.value)
                  }
                  value={(topicAnalysis.practice_plan || []).join("\n")}
                />
              </label>
            </div>
          ) : (
            <p>Henüz eksik konu analizi oluşturulmadı.</p>
          )}
        </div>
        <div className="report-section">
          <h2>Veli Mesajı</h2>
          {parentMessage ? (
            <div className="editable-ai-output">
              <label>
                Konu
                <input
                  onChange={(event) =>
                    updateParentMessage("subject", event.target.value)
                  }
                  value={parentMessage.subject || ""}
                />
              </label>
              <label>
                Veli mesajı
                <textarea
                  onChange={(event) =>
                    updateParentMessage("message", event.target.value)
                  }
                  value={parentMessage.message || ""}
                />
              </label>
              <label>
                Sonraki adımlar
                <textarea
                  onChange={(event) =>
                    updateParentMessageList("next_steps", event.target.value)
                  }
                  value={(parentMessage.next_steps || []).join("\n")}
                />
              </label>
            </div>
          ) : (
            <p>Henüz veli mesajı hazırlanmadı.</p>
          )}
        </div>
      </section>
      <aside className="report-actions">
        <button
          className="primary-button full"
          disabled={isGeneratingReport}
          onClick={generateReportComment}
          type="button"
        >
          <Icon name="auto_awesome" />{" "}
          {isGeneratingReport ? "Oluşturuluyor..." : "Karne Yorumu Oluştur"}
        </button>
        <button
          className="outline-button full"
          disabled={isGeneratingParentMessage}
          onClick={generateParentMessage}
          type="button"
        >
          <Icon name="mail" />{" "}
          {isGeneratingParentMessage
            ? "Hazırlanıyor..."
            : "Veli Mesajı Hazırla"}
        </button>
        <button
          className="outline-button full"
          disabled={isGeneratingTopicAnalysis}
          onClick={generateTopicAnalysis}
          type="button"
        >
          <Icon name="psychology" />{" "}
          {isGeneratingTopicAnalysis
            ? "Analiz ediliyor..."
            : "Eksik Konu Analizi"}
        </button>
        <button
          className="outline-button full"
          onClick={() => window.print()}
          type="button"
        >
          <Icon name="download" /> PDF Dışa Aktar
        </button>
        <button
          className="outline-button full"
          disabled={
            isSavingAIOutput ||
            (!reportCommentOutputId &&
              !parentMessageOutputId &&
              !topicAnalysisOutputId)
          }
          onClick={saveAIOutputEdits}
          type="button"
        >
          <Icon name="save" />{" "}
          {isSavingAIOutput ? "Kaydediliyor..." : "Düzenlemeleri Kaydet"}
        </button>
        {aiNotice && <p className="empty-note success-note">{aiNotice}</p>}
        {aiError && <p className="empty-note">{aiError}</p>}
      </aside>
    </div>
  );
}
