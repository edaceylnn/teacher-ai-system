import Icon from "./Icon";

export default function RightPanel({ selectedStudent, setActiveModal }) {
  return (
    <aside className="right-panel">
      <section className="quick-actions">
        <h2>Hızlı İşlemler</h2>
        <div className="quick-tabs">
          <button onClick={() => setActiveModal("student")} type="button">
            Öğrenci
          </button>
          <button onClick={() => setActiveModal("grade")} type="button">
            Not
          </button>
          <button onClick={() => setActiveModal("attendance")} type="button">
            Devam
          </button>
          <button type="button">AI</button>
        </div>
        <label>Hedef Öğrenci</label>
        <div className="selected-target">
          {selectedStudent
            ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
            : "Öğrenci seç"}
          <Icon name="expand_more" />
        </div>
        <button className="primary-button full" type="button">
          <Icon name="auto_awesome" /> Veli Mesajı Oluştur
        </button>
      </section>
      <section className="output-preview">
        <h3>
          <Icon name="auto_awesome" /> Çıktı Önizleme
        </h3>
        <p>
          “Sayın Velimiz, {selectedStudent?.first_name || "öğrencimiz"} son
          haftalarda ders içi katılımda ilerleme gösteriyor...”
        </p>
      </section>
    </aside>
  );
}
