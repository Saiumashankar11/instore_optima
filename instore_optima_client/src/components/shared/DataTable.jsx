// DataTable.jsx
// A generic, reusable table component used across many pages (Products, Stock,
// Orders, Users, etc.).  It handles three non-data states — loading spinner,
// error banner, and empty state — before rendering the actual table, so each
// page doesn't have to duplicate that logic.

// Props:
//   columns  – array of column descriptor objects:
//                { key: string,   // property name on each row object
//                  label: string, // column header text
//                  render?: fn    // optional custom cell renderer: (row) => JSX }
//   data     – array of row objects fetched from the API.
//   loading  – boolean; shows a spinner while data is being fetched.
//   error    – error string; shows a red alert if the fetch failed.
//   emptyMsg – text shown when data is an empty array (no records exist).
export default function DataTable({ columns, data, loading, error, emptyMsg = 'No records found.' }) {
  // Show a three-dot animated spinner while the API request is in flight.
  if (loading) return (
    <div className="loading-spinner"><span/><span/><span/></div>
  )
  // Show a red error banner if the fetch failed.
  if (error) return (
    <div style={{ padding: '16px 18px' }}>
      <div className="alert alert-danger">
        <i className="bi bi-exclamation-circle me-2"></i>{error}
      </div>
    </div>
  )
  // Show a friendly empty-state illustration when no rows exist.
  if (!data?.length) return (
    <div className="empty-state">
      <i className="bi bi-inbox"></i>
      <p>{emptyMsg}</p>
    </div>
  )
  return (
    // overflowX: auto lets the table scroll horizontally on small screens.
    <div style={{ overflowX: 'auto' }}>
      <table className="custom-table">
        <thead>
          {/* Render one <th> per column using the column's label */}
          <tr>{columns.map(col => <th key={col.key}>{col.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            // _rowClass lets the caller pass a CSS class per row (e.g. to
            // highlight low-stock rows in a different colour).
            <tr key={i} className={row._rowClass || ''}>
              {columns.map(col => (
                <td key={col.key}>
                  {/* If the column has a custom render function use it;
                      otherwise display the raw field value (or "—" if missing). */}
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}