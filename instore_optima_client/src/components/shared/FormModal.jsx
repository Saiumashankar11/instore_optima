// FormModal.jsx
// A generic modal wrapper for create/edit forms used across the whole app
// (e.g. Add Product, Edit Supplier, Create Purchase Order).
// Callers pass their specific form fields as children — FormModal just
// provides the header, footer buttons, and loading state handling so each
// page doesn't need to repeat that boilerplate.

// Modal is the React-Bootstrap dialog component.
import { Modal } from 'react-bootstrap'

// Props:
//   show        – boolean; true makes the modal visible.
//   onHide      – callback when the modal is dismissed (closes without saving).
//   onSubmit    – callback when the user clicks the save/submit button.
//   title       – heading shown in the modal header (e.g. "Add Product").
//   submitLabel – label for the primary action button (defaults to 'Save').
//   children    – the form fields rendered inside the modal body.
//   loading     – when true, buttons are disabled and the label shows "Saving..."
//                 to prevent double-submissions while the API call is in flight.
export default function FormModal({ show, onHide, onSubmit, title, submitLabel = 'Save', children, loading }) {
  return (
    // centered vertically centres the dialog on screen.
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="modal-header-custom">
        <Modal.Title className="modal-title-custom">{title}</Modal.Title>
      </Modal.Header>
      {/* children contains the page-specific form inputs */}
      <Modal.Body style={{ padding: '20px' }}>{children}</Modal.Body>
      <Modal.Footer style={{ borderTop: '1px solid #e5e7eb', padding: '12px 20px' }}>
        {/* Cancel button — dismisses the modal without calling onSubmit */}
        <button className="btn-outline-custom" onClick={onHide} disabled={loading}>Cancel</button>
        {/* Save button — shows a spinner icon and "Saving..." while the API call runs */}
        <button className="btn-primary-custom" onClick={onSubmit} disabled={loading}>
          {loading ? <><i className="bi bi-hourglass-split"></i> Saving...</> : submitLabel}
        </button>
      </Modal.Footer>
    </Modal>
  )
}