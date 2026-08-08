import Icon from "./Icon";

export default function StudentPreview({ gradeAverages, profile }) {
  return (
    <section className="student-preview">
      <div className="preview-header">
        <h2>
          Öğrenci Önizleme: {profile.first_name} {profile.last_name}
        </h2>
        <Icon name="person" />
      </div>
      <div className="preview-grid">
        <div className="trend-card">
          <h3>Not Eğilimi</h3>
          <svg
            viewBox="0 0 220 110"
            role="img"
            aria-label="Not eğilimi grafiği"
          >
            <path
              d="M10 88 L45 68 L80 78 L115 48 L155 38 L210 14 L210 105 L10 105 Z"
              fill="rgba(79,70,229,.12)"
            />
            <path
              d="M10 88 L45 68 L80 78 L115 48 L155 38 L210 14"
              fill="none"
              stroke="#4f46e5"
              strokeWidth="3"
            />
          </svg>
          <div className="average-chips">
            {gradeAverages.map((item) => (
              <span key={item.lessonName}>
                {item.lessonName}: {item.average}
              </span>
            ))}
          </div>
        </div>
        <div className="ai-card">
          <h3>
            <Icon name="lightbulb" /> Yapay Zeka İçgörüsü
          </h3>
          <p>
            {profile.first_name} için not ve devamsızlık verileri yorum
            üretimine hazır.
          </p>
        </div>
      </div>
    </section>
  );
}
