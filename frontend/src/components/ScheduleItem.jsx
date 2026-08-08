export default function ScheduleItem({ color, subtitle, time, title }) {
  return (
    <div className={`schedule-item ${color}`}>
      <strong>{time}</strong>
      <div>
        <span>{title}</span>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}
