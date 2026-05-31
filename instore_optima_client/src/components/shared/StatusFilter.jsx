// Compact status filter dropdown used across Orders / Payments / Invoices tables.
// `options` is an array of status strings; empty value means "All".
export default function StatusFilter({ value, onChange, options, allLabel = 'All statuses' }) {
  return (
    <div className="status-filter-wrap">
      <i className="bi bi-funnel status-filter-icon"></i>
      <select
        className="form-control-custom status-filter-select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">{allLabel}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
