import { useMemo } from "react";
import EmptyState from "../components/EmptyState";
import Insight from "../components/Insight";
import ScheduleItem from "../components/ScheduleItem";
import StatCard from "../components/StatCard";

export default function DashboardPage({
  aiOutputsByStudent,
  allStudents,
  classroomStudentCounts,
  classrooms,
  grades,
  handleGenerateWeeklySummary,
  isGeneratingWeeklySummary,
  lessons,
  scheduleEntries,
  setActivePage,
  setSelectedClassroomId,
  setSelectedStudentId,
  weeklySummary,
}) {
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms],
  );
  const lessonById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson])),
    [lessons],
  );
  const todayWeekday = (new Date().getDay() + 6) % 7;
  const todaySchedule = scheduleEntries.filter(
    (entry) => entry.weekday === todayWeekday,
  );
  const studentsForAnalysis = allStudents.filter(Boolean);
  const gradesByStudent = useMemo(() => {
    return grades.reduce((acc, grade) => {
      const current = acc.get(grade.student_id) || [];
      current.push(Number(grade.score));
      acc.set(grade.student_id, current);
      return acc;
    }, new Map());
  }, [grades]);
  const studentAverages = useMemo(() => {
    return studentsForAnalysis.map((student) => {
      const scores = gradesByStudent.get(student.id) || [];
      const average = scores.length
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
        : null;
      const aiOutputs = aiOutputsByStudent[student.id] || [];
      return {
        ...student,
        average,
        gradeCount: scores.length,
        hasReport: aiOutputs.some((output) => output.output_type === "report_comment"),
        hasParentMessage: aiOutputs.some((output) => output.output_type === "parent_message"),
      };
    });
  }, [studentsForAnalysis, gradesByStudent, aiOutputsByStudent]);
  const overallAverageValue = studentAverages
    .filter((student) => student.average !== null)
    .reduce((sum, student, _, list) => sum + student.average / list.length, 0);
  const overallAverage = overallAverageValue
    ? Math.round(overallAverageValue * 10) / 10
    : "-";
  const riskStudents = studentAverages.filter(
    (student) => student.average !== null && student.average < 70,
  );
  const missingGradeStudents = studentAverages.filter(
    (student) => student.gradeCount === 0,
  );
  const aiPendingStudents = studentAverages.filter(
    (student) => !student.hasReport || !student.hasParentMessage,
  );
  const classBreakdown = classrooms.map((classroom) => {
    const classStudents = studentAverages.filter(
      (student) => student.classroom_id === classroom.id,
    );
    const classAverageList = classStudents.filter((student) => student.average !== null);
    const classAverage = classAverageList.length
      ? Math.round(
          (classAverageList.reduce((sum, student) => sum + student.average, 0) /
            classAverageList.length) *
            10,
        ) / 10
      : "-";
    return {
      classroom,
      average: classAverage,
      riskCount: classStudents.filter((student) => student.average !== null && student.average < 70).length,
      studentCount: classroomStudentCounts[classroom.id] || classStudents.length,
    };
  });
  const attentionStudents = [
    ...riskStudents.map((student) => ({
      ...student,
      reason: `Ortalama ${student.average}`,
      tone: "danger",
    })),
    ...missingGradeStudents.map((student) => ({
      ...student,
      reason: "Henüz not kaydı yok",
      tone: "neutral",
    })),
  ].slice(0, 5);

  const trendPoints = useMemo(() => {
    if (!grades.length) return [];
    const sorted = [...grades].sort(
      (first, second) => new Date(first.created_at) - new Date(second.created_at),
    );
    const bucketCount = Math.min(7, sorted.length);
    const bucketSize = Math.ceil(sorted.length / bucketCount);
    const points = [];
    for (let index = 0; index < sorted.length; index += bucketSize) {
      const bucket = sorted.slice(index, index + bucketSize);
      const average =
        bucket.reduce((sum, grade) => sum + Number(grade.score), 0) / bucket.length;
      const lastDate = new Date(bucket[bucket.length - 1].created_at);
      points.push({
        average: Math.round(average * 10) / 10,
        label: lastDate.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
      });
    }
    return points;
  }, [grades]);

  const chartWidth = 760;
  const chartHeight = 260;
  const chartPadding = { top: 24, right: 24, bottom: 36, left: 44 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const chartPoints = trendPoints.map((point, index) => {
    const x =
      chartPadding.left +
      (trendPoints.length > 1
        ? (index / (trendPoints.length - 1)) * plotWidth
        : plotWidth / 2);
    const y =
      chartPadding.top + plotHeight - (Math.max(0, Math.min(100, point.average)) / 100) * plotHeight;
    return { ...point, x, y };
  });
  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const areaPath = chartPoints.length
    ? `${linePath} L${chartPoints[chartPoints.length - 1].x.toFixed(1)} ${(chartPadding.top + plotHeight).toFixed(1)} L${chartPoints[0].x.toFixed(1)} ${(chartPadding.top + plotHeight).toFixed(1)} Z`
    : "";
  const chartGridLines = [0, 25, 50, 75, 100];

  return (
    <div className="wide-page">
      <div className="grid grid-cols-1 gap-card-gap md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="groups"
          label="Toplam Öğrenci"
          trend={`${classrooms.length} sınıf`}
          value={studentsForAnalysis.length}
        />
        <StatCard
          icon="priority_high"
          label="Riskli Öğrenci"
          trend={riskStudents.length ? "Takip önerilir" : "Risk görünmüyor"}
          trendDirection={riskStudents.length ? "down" : "up"}
          value={riskStudents.length}
        />
        <StatCard
          icon="analytics"
          label="Sınıf Ortalaması"
          trend={`${grades.length} not kaydı`}
          value={overallAverage}
        />
        <StatCard
          icon="auto_awesome"
          label="AI Bekleyen"
          trend="Rapor veya veli mesajı eksik"
          value={aiPendingStudents.length}
        />
      </div>

      <div className="grid grid-cols-1 gap-card-gap lg:grid-cols-3">
        <div className="flex flex-col gap-card-gap lg:col-span-2">
          <section className="card p-6">
            <div className="section-heading">
              <h2>Akademik Performans Eğilimi</h2>
              <span className="analysis-chip">
                {trendPoints.length ? "Son not kayıtları" : "Veri yok"}
              </span>
            </div>
            {chartPoints.length > 1 ? (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Akademik performans grafiği">
                <defs>
                  <linearGradient id="dashboard-chart-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {chartGridLines.map((value) => {
                  const y = chartPadding.top + plotHeight - (value / 100) * plotHeight;
                  return (
                    <g key={value}>
                      <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke="#e5e7eb" />
                      <text x={chartPadding.left - 10} y={y + 4} fontSize="11" fill="#777587" textAnchor="end">
                        {value}
                      </text>
                    </g>
                  );
                })}
                <path d={areaPath} fill="url(#dashboard-chart-fill)" />
                <path d={linePath} fill="none" stroke="#3525cd" strokeWidth="3" strokeLinecap="round" />
                {chartPoints.map((point) => (
                  <g key={point.label + point.x}>
                    <circle cx={point.x} cy={point.y} r="4.5" fill="#ffffff" stroke="#3525cd" strokeWidth="2.5" />
                    <text x={point.x} y={chartHeight - 10} fontSize="11" fill="#777587" textAnchor="middle">
                      {point.label}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <EmptyState icon="show_chart" text="Grafik için henüz yeterli not kaydı yok. Not eklendikçe eğilim burada görünecek." />
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="section-heading border-b border-outline-variant bg-surface-bright p-5">
              <h2>Dikkat Gerektiren Öğrenciler</h2>
              <span className="analysis-chip">{attentionStudents.length} kayıt</span>
            </div>
            <div className="divide-y divide-outline-variant">
              {attentionStudents.map((student) => (
                <button
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface-container-low"
                  key={`${student.id}-${student.reason}`}
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setActivePage("studentDetail");
                  }}
                  type="button"
                >
                  <span>
                    <strong className="block font-body-md text-body-md font-medium text-on-surface">
                      {student.first_name} {student.last_name}
                    </strong>
                    <small className="font-body-md text-body-md text-secondary">
                      {classroomById.get(student.classroom_id)?.name || "Sınıf yok"}
                    </small>
                  </span>
                  <span className={`badge ${student.tone === "danger" ? "badge-danger" : "badge-neutral"}`}>
                    {student.reason}
                  </span>
                </button>
              ))}
            </div>
            {!attentionStudents.length && (
              <EmptyState icon="task_alt" text="Şu an dikkat gerektiren öğrenci görünmüyor." />
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="section-heading border-b border-outline-variant bg-surface-bright p-5">
              <h2>Sınıf Kırılımı</h2>
              <span className="analysis-chip">Özet</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low font-label-md text-label-md uppercase tracking-wider text-secondary">
                    <th className="p-4 font-medium">Sınıf</th>
                    <th className="p-4 font-medium">Öğrenci</th>
                    <th className="p-4 font-medium">Ortalama</th>
                    <th className="p-4 font-medium">Riskli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant font-body-md text-body-md text-on-surface">
                  {classBreakdown.map((item) => (
                    <tr
                      className="cursor-pointer transition-colors hover:bg-surface-container-low"
                      key={item.classroom.id}
                      onClick={() => {
                        setSelectedClassroomId(item.classroom.id);
                        setActivePage("classroomDetail");
                      }}
                    >
                      <td className="p-4 font-medium">{item.classroom.name}</td>
                      <td className="p-4">{item.studentCount}</td>
                      <td className="p-4">{item.average}</td>
                      <td className="p-4">{item.riskCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!classBreakdown.length && (
              <EmptyState
                actionLabel="Sınıf Ekle"
                icon="school"
                onAction={() => setActivePage("classrooms")}
                text="Henüz sınıf yok. İlk sınıfını oluşturarak başlayabilirsin."
              />
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-card-gap">
          <section className="card p-6">
            <div className="section-heading">
              <h2>AI Haftalık Özet</h2>
              <button
                className="outline-button compact"
                disabled={isGeneratingWeeklySummary}
                onClick={handleGenerateWeeklySummary}
                type="button"
              >
                {isGeneratingWeeklySummary ? "Hazırlanıyor" : "Oluştur"}
              </button>
            </div>
            {weeklySummary ? (
              <div className="flex flex-col gap-3">
                <Insight tone="success" title={weeklySummary.title} text={weeklySummary.summary} />
                {(weeklySummary.attention_points || []).slice(0, 2).map((item) => (
                  <Insight key={item} tone="warning" title="Dikkat" text={item} />
                ))}
              </div>
            ) : (
              <EmptyState icon="auto_awesome" text="Haftalık özet henüz oluşturulmadı." />
            )}
          </section>
          <section className="card overflow-hidden">
            <div className="section-heading border-b border-outline-variant bg-surface-bright p-5">
              <h2>Bugünkü Dersler</h2>
              <button className="outline-button compact" onClick={() => setActivePage("schedule")} type="button">
                Aç
              </button>
            </div>
            <div className="flex flex-col gap-3 p-4">
              {todaySchedule.map((entry, index) => (
                <ScheduleItem
                  color={index % 2 ? "secondary" : "primary"}
                  key={entry.id}
                  time={entry.start_time.slice(0, 5)}
                  title={`${classroomById.get(entry.classroom_id)?.name || "Sınıf"} ${lessonById.get(entry.lesson_id)?.name || "Ders"}`}
                  subtitle={entry.location || "Derslik belirtilmedi"}
                />
              ))}
              {!todaySchedule.length && <EmptyState icon="event_available" text="Bugün için ders programı yok." />}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
