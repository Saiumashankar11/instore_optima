// StatusBadge.jsx
// Renders a small coloured pill label that visually communicates a record's
// status at a glance.  It is used inside DataTable cells across Orders,
// Payments, Invoices, Stock Movement, and other pages.
// The colour is determined by looking up the status string in MAP; unknown
// statuses fall back to a neutral grey ('secondary') so the component never
// crashes on unexpected values.

// MAP translates every known status string to one of five semantic variant names
// that correspond to CSS classes:
//   success   → green   (good / completed states)
//   warning   → amber   (needs attention)
//   danger    → red     (failed / overdue / cancelled states)
//   info      → blue    (in-progress / informational)
//   secondary → grey    (neutral / inactive)
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
  IN:         'success',  // stock movement received
  OUT:        'danger',   // stock movement dispatched
  ADJUSTMENT: 'warning',  // manual stock adjustment
}

// Props:
//   status – the status string to display (e.g. "Pending", "Paid", "IN").
export default function StatusBadge({ status }) {
  // Look up the variant; unknown statuses default to 'secondary' (grey).
  const variant = MAP[status] || 'secondary'
  // The CSS class badge-{variant} applies the matching colour from the stylesheet.
  return <span className={`badge-custom badge-${variant}`}>{status}</span>
}