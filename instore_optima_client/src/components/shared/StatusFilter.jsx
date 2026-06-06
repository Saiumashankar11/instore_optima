// StatusFilter.jsx
// A compact dropdown that lets users filter a data table by status value.
// Placed next to the SearchBar in the table toolbar on pages like Orders,
// Payments, and Invoices.
// This is a controlled component — the parent stores the selected value and
// passes both the current value and an onChange callback as props.

// Compact status filter dropdown used across Orders / Payments / Invoices tables.
// `options` is an array of status strings; empty value means "All".

// Props:
//   value    – currently selected status string ('' means "show all").
//   onChange – called with the new status string whenever the selection changes.
//   options  – array of status strings to populate the dropdown (e.g. ['Pending','Paid']).
//   allLabel – label text for the "show everything" option (defaults to 'All statuses').
export default function StatusFilter({ value, onChange, options, allLabel = 'All statuses' }) {
  return (
    // status-filter-wrap uses position: relative so the funnel icon overlays the select.
    <div className="status-filter-wrap">
      {/* Funnel icon overlaid on the left of the select element */}
      <i className="bi bi-funnel status-filter-icon"></i>
      <select
        className="form-control-custom status-filter-select"
        value={value}
        onChange={e => onChange(e.target.value)} // unwrap the event and pass just the string
      >
        {/* The empty-string option acts as "no filter — show all" */}
        <option value="">{allLabel}</option>
        {/* One option per status value supplied by the parent */}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
