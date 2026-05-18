import { Modal } from 'react-bootstrap'

export default function ConfirmModal({ show, onHide, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger', loading }) {
  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton className="modal-header-custom">
        <Modal.Title className="modal-title-custom">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '16px 20px', fontSize: 14, color: '#374151' }}>{message}</Modal.Body>
      <Modal.Footer style={{ borderTop: '1px solid #e5e7eb', padding: '12px 20px' }}>
        <button className="btn-outline-custom" onClick={onHide} disabled={loading}>Cancel</button>
        <button
          className="btn-primary-custom"
          style={{ background: variant === 'danger' ? '#dc2626' : '#4f46e5' }}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Please wait...' : confirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  )
}