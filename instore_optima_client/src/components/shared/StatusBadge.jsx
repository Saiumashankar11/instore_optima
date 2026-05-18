const MAP = {
  Pending:    'warning',
  Processing: 'info',
  Completed:  'success',
  Cancelled:  'danger',
  Active:     'success',
  Inactive:   'secondary',
  Failed:     'danger',
  Refunded:   'secondary',
  Draft:      'secondary',
  Issued:     'info',
  Paid:       'success',
  Overdue:    'danger',
  Approved:   'success',
  Rejected:   'danger',
  Delivered:  'success',
  IN:         'success',
  OUT:        'danger',
  ADJUSTMENT: 'warning',
}

export default function StatusBadge({ status }) {
  const variant = MAP[status] || 'secondary'
  return <span className={`badge-custom badge-${variant}`}>{status}</span>
}