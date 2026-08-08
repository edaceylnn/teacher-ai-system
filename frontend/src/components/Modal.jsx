import Icon from "./Icon";

export default function Modal({ children, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose} type="button">
          <Icon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}
