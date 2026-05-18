export default function DataTable({ columns, data, loading, error, emptyMsg = 'No records found.' }) {
  if (loading) return (
    <div className="loading-spinner"><span/><span/><span/></div>
  )
  if (error) return (
    <div style={{ padding: '16px 18px' }}>
      <div className="alert alert-danger">
        <i className="bi bi-exclamation-circle me-2"></i>{error}
      </div>
    </div>
  )
  if (!data?.length) return (
    <div className="empty-state">
      <i className="bi bi-inbox"></i>
      <p>{emptyMsg}</p>
    </div>
  )
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="custom-table">
        <thead>
          <tr>{columns.map(col => <th key={col.key}>{col.label}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={row._rowClass || ''}>
              {columns.map(col => (
                <td key={col.key}>
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