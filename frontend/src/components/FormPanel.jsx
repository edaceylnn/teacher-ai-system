export default function FormPanel({ children, onSubmit, title }) {
  return (
    <form className="form-panel" onSubmit={onSubmit}>
      <h2>{title}</h2>
      {children}
    </form>
  );
}
