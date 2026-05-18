import { Modal } from 'react-bootstrap'

export default function FormModal({ show, onHide, onSubmit, title, submitLabel = 'Save', children, loading }) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="modal-header-custom">
        <Modal.Title className="modal-title-custom">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '20px' }}>{children}</Modal.Body>
      <Modal.Footer style={{ borderTop: '1px solid #e5e7eb', padding: '12px 20px' }}>
        <button className="btn-outline-custom" onClick={onHide} disabled={loading}>Cancel</button>
        <button className="btn-primary-custom" onClick={onSubmit} disabled={loading}>
          {loading ? <><i className="bi bi-hourglass-split"></i> Saving...</> : submitLabel}
        </button>
      </Modal.Footer>
    </Modal>
  )
}