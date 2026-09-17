import { useEffect } from "react";

// Closes an open row-action ("•••") popover when the user clicks anywhere
// outside it — every popover's trigger + panel pair lives inside an element
// matching `selector` (default: the shared .student-row-menu wrapper used by
// StudentTable/StudentsPage/HomeworkPage/GradebookPage), so a single
// document-level listener works regardless of which row is open. No-ops
// (and detaches) whenever nothing is open.
export function useCloseOnOutsideClick(isOpen, onClose, selector = ".student-row-menu") {
  useEffect(() => {
    if (!isOpen) return undefined;
    function handleClick(event) {
      if (!event.target.closest(selector)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose, selector]);
}
