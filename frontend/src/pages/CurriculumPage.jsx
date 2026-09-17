import { useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import Icon from "../components/Icon";

export default function CurriculumPage({
  curriculumOutcomes,
  handleDeleteCurriculumOutcome,
  handleDeleteCurriculumOutcomes,
  lessonOptions,
  lessons,
  setActiveModal,
  setCurriculumForm,
  setEditingCurriculumOutcome,
}) {
  const [lessonFilter, setLessonFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOutcomeIds, setSelectedOutcomeIds] = useState([]);

  const lessonById = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson])), [lessons]);
  const gradeOptions = useMemo(
    () =>
      Array.from(new Set(curriculumOutcomes.map((outcome) => outcome.grade_level)))
        .filter(Boolean)
        .sort((first, second) => Number(first) - Number(second) || first.localeCompare(second, "tr")),
    [curriculumOutcomes],
  );
  const filteredOutcomes = useMemo(() => {
    const query = searchTerm.toLocaleLowerCase("tr");
    return curriculumOutcomes.filter((outcome) => {
      const matchesLesson = !lessonFilter || String(outcome.lesson_id) === lessonFilter;
      const matchesGrade = !gradeFilter || outcome.grade_level === gradeFilter;
      const haystack = [outcome.code, outcome.unit_title, outcome.outcome_text, outcome.source_name]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr");
      return matchesLesson && matchesGrade && (!query || haystack.includes(query));
    });
  }, [curriculumOutcomes, gradeFilter, lessonFilter, searchTerm]);
  const filteredOutcomeIds = useMemo(
    () => filteredOutcomes.map((outcome) => outcome.id),
    [filteredOutcomes],
  );
  const selectedVisibleIds = selectedOutcomeIds.filter((outcomeId) =>
    filteredOutcomeIds.includes(outcomeId),
  );
  const isAllFilteredSelected =
    filteredOutcomeIds.length > 0 &&
    filteredOutcomeIds.every((outcomeId) => selectedOutcomeIds.includes(outcomeId));

  useEffect(() => {
    const visibleIds = new Set(filteredOutcomeIds);
    setSelectedOutcomeIds((current) => current.filter((outcomeId) => visibleIds.has(outcomeId)));
  }, [filteredOutcomeIds]);

  function openCreate() {
    setCurriculumForm({
      lesson_id: "",
      grade_level: "",
      unit_title: "",
      code: "",
      outcome_text: "",
      source_name: "",
      source_url: "",
      version_label: "",
      is_active: true,
    });
    setActiveModal("curriculumOutcome");
  }

  function openEdit(outcome) {
    setEditingCurriculumOutcome(outcome);
    setCurriculumForm({
      lesson_id: String(outcome.lesson_id),
      grade_level: outcome.grade_level,
      unit_title: outcome.unit_title || "",
      code: outcome.code || "",
      outcome_text: outcome.outcome_text,
      source_name: outcome.source_name || "",
      source_url: outcome.source_url || "",
      version_label: outcome.version_label || "",
      is_active: outcome.is_active,
    });
    setActiveModal("editCurriculumOutcome");
  }

  return (
    <div className="wide-page">
      <section className="gradebook-header">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Kazanımlar</h1>
          <p className="mt-1 font-body-md text-body-md text-secondary">
            Okulun kullandığı kazanım listesini kaynak bilgisiyle yönet, değerlendirme ve ödevlere bağla.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setActiveModal("curriculumImport")} size="md" variant="secondary">
            <Icon name="upload_file" /> Toplu İçe Aktar
          </Button>
          <Button onClick={openCreate} size="md" variant="primary">
            <Icon name="add" /> Kazanım Ekle
          </Button>
        </div>
      </section>

      <section className="gradebook-toolbar" aria-label="Kazanım filtreleri">
        <label htmlFor="curriculum-search">
          <span>Arama</span>
          <input
            className="filter-select"
            id="curriculum-search"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Kod, ünite veya metin ara"
            value={searchTerm}
          />
        </label>
        <label htmlFor="curriculum-lesson">
          <span>Ders</span>
          <select
            className="filter-select"
            id="curriculum-lesson"
            onChange={(event) => setLessonFilter(event.target.value)}
            value={lessonFilter}
          >
            <option value="">Tüm Dersler</option>
            {lessonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="curriculum-grade">
          <span>Sınıf</span>
          <select
            className="filter-select"
            id="curriculum-grade"
            onChange={(event) => setGradeFilter(event.target.value)}
            value={gradeFilter}
          >
            <option value="">Tüm Sınıflar</option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}. sınıf
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="gradebook-list-panel">
        <div className="gradebook-list-head">
          <div className="flex min-w-0 items-start gap-3">
            {filteredOutcomes.length > 0 && (
              <input
                aria-label="Filtrelenen kazanımları seç"
                checked={isAllFilteredSelected}
                className="mt-1"
                onChange={(event) => {
                  setSelectedOutcomeIds(event.target.checked ? filteredOutcomeIds : []);
                }}
                type="checkbox"
              />
            )}
            <div className="min-w-0">
              <h2>Kazanım Havuzu</h2>
              <p>Resmi içerik gömülmez; okulun girdiği içerikler kaynak bilgisiyle saklanır.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedVisibleIds.length > 0 && (
              <Button
                onClick={async () => {
                  await handleDeleteCurriculumOutcomes(selectedVisibleIds);
                  setSelectedOutcomeIds([]);
                }}
                size="sm"
                variant="danger"
              >
                <Icon name="delete" /> Seçili Sil ({selectedVisibleIds.length})
              </Button>
            )}
            <span>{filteredOutcomes.length} kayıt</span>
          </div>
        </div>
        <ul className="gradebook-assessment-list">
          {filteredOutcomes.map((outcome) => (
            <li className="gradebook-assessment-row" key={outcome.id}>
              <div className="gradebook-assessment-main">
                <input
                  aria-label={`${outcome.code || "Kazanım"} seç`}
                  checked={selectedOutcomeIds.includes(outcome.id)}
                  onChange={(event) => {
                    setSelectedOutcomeIds((current) =>
                      event.target.checked
                        ? [...current, outcome.id]
                        : current.filter((outcomeId) => outcomeId !== outcome.id),
                    );
                  }}
                  type="checkbox"
                />
                <div className="gradebook-assessment-icon">
                  <Icon name="flag" />
                </div>
                <div className="min-w-0">
                  <p className="gradebook-assessment-title">
                    <span>{outcome.code || "Kodsuz"}</span>
                    <span aria-hidden="true">—</span>
                    <span>{outcome.outcome_text}</span>
                  </p>
                  <p className="gradebook-assessment-meta">
                    <span>{outcome.grade_level}. sınıf</span>
                    <span>•</span>
                    <span>{lessonById.get(outcome.lesson_id)?.name || "Ders"}</span>
                    {outcome.unit_title && (
                      <>
                        <span>•</span>
                        <span>{outcome.unit_title}</span>
                      </>
                    )}
                    {outcome.source_name && (
                      <>
                        <span>•</span>
                        <span>{outcome.source_name}</span>
                      </>
                    )}
                    {!outcome.is_active && (
                      <>
                        <span>•</span>
                        <span>Pasif</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="gradebook-row-actions">
                <Button onClick={() => openEdit(outcome)} size="sm" variant="secondary">
                  Düzenle
                </Button>
                <Button onClick={() => handleDeleteCurriculumOutcome(outcome)} size="sm" tone="danger" variant="ghost">
                  Sil
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {!filteredOutcomes.length && <p className="empty-note">Henüz kazanım kaydı yok.</p>}
      </section>
    </div>
  );
}
