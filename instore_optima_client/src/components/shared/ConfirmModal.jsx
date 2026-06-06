// ConfirmModal.jsx
// A reusable "are you sure?" confirmation dialog built on top of
// React-Bootstrap's Modal component.
// It is used throughout the app whenever a destructive or irreversible action
// (like deleting a record) requires explicit user confirmation.

// Modal is the React-Bootstrap dialog component.
import { Modal } from 'react-bootstrap'

// Props:
//   show         – boolean; true renders the dialog.
//   onHide       – callback when the user dismisses without confirming.
//   onConfirm    – callback when the user clicks the confirm button.
//   title        – heading text shown in the modal header.
//   message      – descriptive body text explaining what the action does.
//   confirmLabel – label for the confirm button (defaults to 'Confirm').
//   variant      – colour theme: 'danger' (red), 'success' (green), or any
//                  other value (indigo).  Defaults to 'danger'.
//   loading      – when true, both buttons are disabled and the label changes
//                  to 'Please wait...' to prevent duplicate submissions.
export default function ConfirmModal({ show, onHide, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger', loading }) {
  return (
    // size="sm" keeps the dialog compact; centered vertically centres it.
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton className="modal-header-custom">
        <Modal.Title className="modal-title-custom">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '16px 20px', fontSize: 14, color: '#374151' }}>{message}</Modal.Body>
      <Modal.Footer style={{ borderTop: '1px solid #e5e7eb', padding: '12px 20px' }}>
        {/* Cancel — dismisses without doing anything */}
        <button className="btn-outline-custom" onClick={onHide} disabled={loading}>Cancel</button>
        {/* Confirm — background colour driven by the 'variant' prop */}
        <button
          className="btn-primary-custom"
          style={{ background: variant === 'danger' ? '#dc2626' : variant === 'success' ? '#059669' : '#4f46e5' }}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Please wait...' : confirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  )
}